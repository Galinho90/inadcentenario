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

// Cabeçalho do bloco: "12 01 - MARIA JOSE DA SILVA"
const HEADER_RE = /\b(\d{2}\s\d{2})\s*[-–]\s*(.+?)\s*$/;
const BRL_RE = /([\d]{1,3}(?:\.\d{3})*,\d{2})/;
const TOTAL_RE = /\btotal\b/i;
// Linha de boleto: "25/12/25 18 131180 180,00 180,00"
const BOLETO_RE =
  /^(\d{2}\/\d{2}\/\d{2,4})\s+(\d+)\s+(\S+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/;

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
