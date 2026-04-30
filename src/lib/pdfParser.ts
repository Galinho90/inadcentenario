export interface Debtor {
  unidade: string;
  nome: string;
  total: number;
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
// Linha de total: "Total 300,00 300,00" — pega o último valor da linha
const TOTAL_RE = /\btotal\b/i;

/** Faz parsing do texto extraído em uma lista de devedores. */
export function parseDebtors(text: string): Debtor[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Identifica linhas de cabeçalho (unidade + nome)
  const headers: { idx: number; unidade: string; nome: string }[] = [];
  lines.forEach((l, i) => {
    const m = l.match(HEADER_RE);
    if (m) {
      const nome = m[2].trim();
      // Filtra ruído: nome precisa parecer um nome (ao menos 2 palavras com letras)
      const words = nome.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w));
      if (words.length >= 2) {
        headers.push({ idx: i, unidade: m[1], nome });
      }
    }
  });

  const debtors: Debtor[] = [];
  // Mapa de unidade -> índices das ocorrências de cabeçalho (pode haver duplicidade quando o nome aparece "isolado" em outra página)
  for (let h = 0; h < headers.length; h++) {
    const { unidade, nome, idx } = headers[h];
    const end = headers[h + 1]?.idx ?? lines.length;
    const block = lines.slice(idx + 1, end);

    let total = 0;
    for (const l of block) {
      if (!TOTAL_RE.test(l)) continue;
      const matches = l.match(new RegExp(BRL_RE.source, "g"));
      if (matches && matches.length) {
        // Último valor da linha "Total" é o total final
        total = parseBRL(matches[matches.length - 1]);
        break;
      }
    }

    if (total > 0) {
      debtors.push({ unidade, nome, total });
    }
  }

  // Deduplica por (unidade+nome) somando valores caso o relatório tenha cabeçalho repetido
  const map = new Map<string, Debtor>();
  for (const d of debtors) {
    const key = `${d.unidade}|${d.nome.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.total = Math.max(existing.total, d.total);
    } else {
      map.set(key, { ...d });
    }
  }

  return Array.from(map.values());
}

