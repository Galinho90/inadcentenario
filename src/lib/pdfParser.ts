export interface Boleto {
  vencimento: string;
  atraso: number;
  codigo: string;
  principal: number;
  total: number;
}

export interface Debtor {
  unidade: string;
  nome: string;
  total: number;
  boletos: Boleto[];
}

/** Converte "1.234,56" -> 1234.56 */
export function parseBRL(value: string): number {
  const clean = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseVencimentoDate(vencimento: string): Date | null {
  const parts = vencimento.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (year < 50) year += 2000;
  else if (year < 100) year += 1900;
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  return date;
}

/** Calcula o atraso em dias com base na data de vencimento vs hoje. */
export function calcAtrasoDias(vencimento: string): number {
  const due = parseVencimentoDate(vencimento);
  if (!due) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** Retorna o atraso dinâmico de um boleto (atualiza conforme os dias passam). */
export function getBoletoAtraso(b: Boleto): number {
  return calcAtrasoDias(b.vencimento);
}

// Cabeçalho do bloco: "12 01 - MARIA JOSE DA SILVA"
const HEADER_RE = /\b(\d{2}\s\d{2})\s*[-–]\s*(.+?)\s*$/;
const BRL_RE = /([\d]{1,3}(?:\.\d{3})*,\d{2})/;
const TOTAL_RE = /\btotal\b/i;
// Linha de boleto: "25/12/25 18 131180 180,00 180,00"
const BOLETO_RE =
  /^(\d{2}\/\d{2}\/\d{2,4})\s+(\d+)\s+(\S+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/;
// Remove trechos como "3° Notificação", "2ª notificacao", "1o Notif." do nome
const NOTIF_STRIP_RE = /\s*\d+\s*[°ºoa]?\s*notifica[cç][aã]o\.?.*$/i;

/** Limpa o nome extraído do cabeçalho removendo sufixos de notificação. */
function cleanNome(raw: string): string {
  return raw.replace(NOTIF_STRIP_RE, "").replace(/\s{2,}/g, " ").trim();
}


export interface PdfPreview {
  titulo: string | null;
  colunas: string | null;
  totalLinhas: number;
  unidades: { unidade: string; nome: string }[];
  boletos: Boleto[];
  amostraTexto: string;
}

/** Extrai uma prévia do conteúdo detectado para validação visual antes do parse final. */
export function buildPreview(text: string, limit = 5): PdfPreview {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const titulo = lines.find((l) => /inadimpl/i.test(l)) ?? null;
  const colunas =
    lines.find(
      (l) =>
        /vencimento/i.test(l) &&
        /atraso/i.test(l) &&
        /principal/i.test(l) &&
        /total/i.test(l)
    ) ?? null;

  const unidades: { unidade: string; nome: string }[] = [];
  const boletos: Boleto[] = [];

  for (const l of lines) {
    if (unidades.length < limit) {
      const m = l.match(HEADER_RE);
      if (m) {
        const nome = m[2].trim();
        const words = nome.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w));
        if (words.length >= 2) unidades.push({ unidade: m[1], nome });
      }
    }
    if (boletos.length < limit) {
      if (/notifica[cç][aã]o/i.test(l)) continue;
      const bm = l.match(BOLETO_RE);
      if (bm) {
        boletos.push({
          vencimento: bm[1],
          atraso: parseInt(bm[2], 10),
          codigo: bm[3],
          principal: parseBRL(bm[4]),
          total: parseBRL(bm[5]),
        });
      }
    }
    if (unidades.length >= limit && boletos.length >= limit) break;
  }

  return {
    titulo,
    colunas,
    totalLinhas: lines.length,
    unidades,
    boletos,
    amostraTexto: lines.slice(0, 40).join("\n"),
  };
}


export class PdfValidationError extends Error {
  constructor(message: string, public details?: string[]) {
    super(message);
    this.name = "PdfValidationError";
  }
}

/**
 * Valida se o texto extraído corresponde a um relatório de inadimplência
 * no formato esperado (Controller Condomínios). Lança PdfValidationError
 * com uma lista de problemas caso não seja compatível.
 */
export function validateReportText(text: string): void {
  const problems: string[] = [];
  const normalized = text.toLowerCase();

  if (!text || text.trim().length < 50) {
    throw new PdfValidationError(
      "PDF vazio ou sem texto extraível. Ele pode ser uma imagem escaneada.",
      ["Nenhum texto legível encontrado no arquivo."]
    );
  }

  // Marcador de relatório
  if (!/inadimpl/i.test(normalized)) {
    problems.push('Título esperado ausente: o relatório deve conter "Inadimplentes".');
  }

  // Colunas obrigatórias da tabela de boletos
  const requiredColumns = ["vencimento", "atraso", "principal", "total"];
  const missingCols = requiredColumns.filter((c) => !normalized.includes(c));
  if (missingCols.length) {
    problems.push(
      `Colunas esperadas não encontradas: ${missingCols.join(", ")}.`
    );
  }

  // Pelo menos uma unidade no padrão "NN NN - NOME"
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hasUnidade = lines.some((l) => HEADER_RE.test(l));
  if (!hasUnidade) {
    problems.push(
      'Nenhuma unidade no padrão esperado (ex: "12 01 - NOME DO MORADOR").'
    );
  }

  // Pelo menos uma linha de boleto
  const hasBoleto = lines.some((l) => BOLETO_RE.test(l));
  if (!hasBoleto) {
    problems.push(
      "Nenhuma linha de boleto reconhecida (data, atraso, código, principal, total)."
    );
  }

  if (problems.length) {
    throw new PdfValidationError(
      "O arquivo não parece ser um relatório de inadimplência no formato esperado.",
      problems
    );
  }
}


/** Faz parsing do texto extraído em uma lista de devedores com seus boletos. */
export function parseDebtors(text: string): Debtor[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const headers: { idx: number; unidade: string; nome: string }[] = [];
  lines.forEach((l, i) => {
    const m = l.match(HEADER_RE);
    if (m) {
      const nome = m[2].trim();
      const words = nome.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w));
      if (words.length >= 2) {
        headers.push({ idx: i, unidade: m[1], nome });
      }
    }
  });

  const debtors: Debtor[] = [];
  for (let h = 0; h < headers.length; h++) {
    const { unidade, nome, idx } = headers[h];
    const end = headers[h + 1]?.idx ?? lines.length;
    const block = lines.slice(idx + 1, end);

    let total = 0;
    const boletos: Boleto[] = [];

    for (const l of block) {
      // Ignora linhas de notificação (ex: "3° Notificação", "2ª notificacao")
      if (/notifica[cç][aã]o/i.test(l)) continue;
      // Linha de boleto
      const bm = l.match(BOLETO_RE);
      if (bm) {
        boletos.push({
          vencimento: bm[1],
          atraso: parseInt(bm[2], 10),
          codigo: bm[3],
          principal: parseBRL(bm[4]),
          total: parseBRL(bm[5]),
        });
        continue;
      }
      // Linha de total
      if (TOTAL_RE.test(l)) {
        const matches = l.match(new RegExp(BRL_RE.source, "g"));
        if (matches && matches.length) {
          total = parseBRL(matches[matches.length - 1]);
        }
      }
    }

    // Fallback: se não achou linha "Total", soma os boletos
    if (total === 0 && boletos.length) {
      total = boletos.reduce((acc, b) => acc + b.total, 0);
    }

    if (total > 0) {
      debtors.push({ unidade, nome, total, boletos });
    }
  }

  // Deduplica por (unidade+nome) preservando o conjunto com mais boletos
  const map = new Map<string, Debtor>();
  for (const d of debtors) {
    const key = `${d.unidade}|${d.nome.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || d.boletos.length > existing.boletos.length) {
      map.set(key, { ...d });
    }
  }

  return Array.from(map.values());
}
