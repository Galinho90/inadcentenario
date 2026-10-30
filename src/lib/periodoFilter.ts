import type { Debtor } from "./pdfParser";

/** Identificador de um mês de vencimento no formato "AAAA-MM" (ex.: "2025-05"). */
export type ChavePeriodo = string;

export interface Periodo {
  /** Chave "AAAA-MM". */
  chave: ChavePeriodo;
  /** Rótulo exibido, ex.: "Maio/2025". */
  label: string;
  ano: number;
  /** Mês de 1 a 12. */
  mes: number;
  /** Quantidade de boletos com vencimento no mês. */
  boletos: number;
  /** Soma dos valores dos boletos do mês. */
  total: number;
}

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Converte o vencimento "DD/MM/AA" do relatório na chave "AAAA-MM".
 * Retorna null quando a data não é reconhecível.
 */
export function chavePeriodo(vencimento: string): ChavePeriodo | null {
  const partes = String(vencimento ?? "").trim().split("/");
  if (partes.length !== 3) return null;

  const dia = Number.parseInt(partes[0], 10);
  const mes = Number.parseInt(partes[1], 10);
  let ano = Number.parseInt(partes[2], 10);

  if (!dia || !mes || mes < 1 || mes > 12 || !ano) return null;
  if (ano < 50) ano += 2000;
  else if (ano < 100) ano += 1900;

  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/** Rótulo legível de uma chave "AAAA-MM" (ex.: "Maio/2025"). */
export function rotuloPeriodo(chave: ChavePeriodo): string {
  const [ano, mes] = String(chave ?? "").split("-").map((p) => Number.parseInt(p, 10));
  const nome = NOMES_MESES[mes - 1] ?? "";
  return `${nome}/${ano}`;
}

/**
 * Lista os meses de vencimento disponíveis na base, do mais recente para o
 * mais antigo, com a quantidade de boletos e o total de cada mês.
 */
export function listarPeriodos(debtors: Debtor[]): Periodo[] {
  const mapa = new Map<ChavePeriodo, Periodo>();

  for (const d of debtors ?? []) {
    for (const b of d.boletos ?? []) {
      const chave = chavePeriodo(b.vencimento);
      if (!chave) continue;

      const existente = mapa.get(chave);
      if (existente) {
        existente.boletos += 1;
        existente.total += Number(b.total) || 0;
        continue;
      }

      const [ano, mes] = chave.split("-").map((p) => Number.parseInt(p, 10));
      mapa.set(chave, {
        chave,
        label: rotuloPeriodo(chave),
        ano,
        mes,
        boletos: 1,
        total: Number(b.total) || 0,
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.ano - a.ano || b.mes - a.mes);
}

export interface Recorte {
  /** Devedores do recorte (sem quem não tem boleto no período). */
  debtors: Debtor[];
  /** Soma dos valores do recorte. */
  total: number;
  /** Quantidade de boletos do recorte. */
  boletos: number;
  /** Meses disponíveis na base completa (independe do recorte). */
  periodos: Periodo[];
}

/**
 * Recorta a inadimplência pelo mês de vencimento dos boletos: mantém apenas
 * as taxas que venceram no mês escolhido, recalcula o total de cada morador
 * com os boletos desse mês e descarta quem não tem boleto nele.
 *
 * Com `chave` nula devolve a base inteira sem alteração.
 */
export function recortarPorPeriodo(
  debtors: Debtor[],
  chave: ChavePeriodo | null
): Recorte {
  const lista = debtors ?? [];
  const periodos = listarPeriodos(lista);

  if (!chave) {
    let total = 0;
    let boletos = 0;
    for (const d of lista) {
      total += Number(d.total) || 0;
      boletos += d.boletos?.length ?? 0;
    }
    return { debtors: lista, total, boletos, periodos };
  }

  const recorte: Debtor[] = [];
  let total = 0;
  let boletos = 0;

  for (const d of lista) {
    const doMes = (d.boletos ?? []).filter(
      (b) => chavePeriodo(b.vencimento) === chave
    );
    if (!doMes.length) continue;

    const soma = doMes.reduce((acc, b) => acc + (Number(b.total) || 0), 0);
    recorte.push({ ...d, boletos: doMes, total: soma });
    total += soma;
    boletos += doMes.length;
  }

  return { debtors: recorte, total, boletos, periodos };
}
