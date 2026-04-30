import * as pdfjsLib from "pdfjs-dist";
// Vite worker import
// @ts-ignore
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

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

/** Extrai texto de um PDF preservando quebras de linha por item Y. */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];

    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      const str = item.str ?? "";
      if (lastY === null) {
        line = str;
      } else if (Math.abs(y - lastY) < 2) {
        line += " " + str;
      } else {
        lines.push(line);
        line = str;
      }
      lastY = y;
    }
    if (line) lines.push(line);
    fullText += lines.join("\n") + "\n";
  }

  return fullText;
}

const UNIT_RE = /\b(\d{2}\s\d{2})\b/;
const BRL_RE = /([\d]{1,3}(?:\.\d{3})*,\d{2})/;
const TOTAL_RE = /total[^\n]*?([\d]{1,3}(?:\.\d{3})*,\d{2})/i;

/** Faz parsing do texto extraído em uma lista de devedores. */
export function parseDebtors(text: string): Debtor[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Identifica índices que iniciam um bloco (linha com unidade)
  const blockStarts: number[] = [];
  lines.forEach((l, i) => {
    if (UNIT_RE.test(l)) blockStarts.push(i);
  });

  const debtors: Debtor[] = [];

  for (let b = 0; b < blockStarts.length; b++) {
    const start = blockStarts[b];
    const end = blockStarts[b + 1] ?? lines.length;
    const block = lines.slice(start, end);

    const unitMatch = block[0].match(UNIT_RE);
    if (!unitMatch) continue;
    const unidade = unitMatch[1];

    // Nome: primeira string textual no bloco (sem dígitos predominantes, sem "total")
    let nome = "";
    // Tenta o restante da própria linha da unidade primeiro
    const restOfUnitLine = block[0].replace(UNIT_RE, "").trim();
    const candidateInline = stripNonName(restOfUnitLine);
    if (isLikelyName(candidateInline)) {
      nome = candidateInline;
    } else {
      for (let i = 1; i < block.length; i++) {
        const candidate = stripNonName(block[i]);
        if (isLikelyName(candidate)) {
          nome = candidate;
          break;
        }
      }
    }

    // Total: linha contendo "total" + valor BR; fallback: maior valor do bloco
    let total = 0;
    for (let i = block.length - 1; i >= 0; i--) {
      const m = block[i].match(TOTAL_RE);
      if (m) {
        total = parseBRL(m[1]);
        break;
      }
    }
    if (total === 0) {
      const values: number[] = [];
      block.forEach((l) => {
        const matches = l.match(new RegExp(BRL_RE.source, "g"));
        if (matches) matches.forEach((v) => values.push(parseBRL(v)));
      });
      if (values.length) total = Math.max(...values);
    }

    if (nome && total > 0) {
      debtors.push({ unidade, nome, total });
    }
  }

  return debtors;
}

function stripNonName(s: string): string {
  return s
    .replace(BRL_RE, "")
    .replace(/R\$/g, "")
    .replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isLikelyName(s: string): boolean {
  if (!s || s.length < 3) return false;
  if (/total|vencimento|valor|histórico|historico|saldo|juros|multa|condom|taxa/i.test(s))
    return false;
  // Deve ter pelo menos duas palavras com letras
  const words = s.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w));
  if (words.length < 2) return false;
  // Não pode ser majoritariamente dígitos
  const digits = (s.match(/\d/g) || []).length;
  return digits / s.length < 0.3;
}
