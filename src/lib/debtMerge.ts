/**
 * Regras de mesclagem de dívidas entre relatórios.
 *
 * A identidade de um devedor é composta por `unidade` + `nome` (sem diferenciar
 * maiúsculas/minúsculas e normalizando espaços), para que o mesmo morador
 * seja reconhecido mesmo com pequenas variações de digitação no PDF.
 */

function normalize(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Chave de identificação de um devedor: `unidade|nome`. */
export function debtorKey(unidade: string, nome: string): string {
  return `${normalize(unidade)}|${normalize(nome)}`;
}

export interface MergePlan<A, N> {
  /** Dívidas que não existiam no relatório anterior — devem ser criadas. */
  criados: N[];
  /** Dívidas que já existiam — devem ser sobrescritas com os novos valores. */
  atualizados: Array<{ anterior: A; novo: N }>;
  /** Dívidas do relatório anterior que não existem mais no novo PDF. */
  removidos: A[];
}

/**
 * Compara a base atual com a base do novo PDF e devolve o plano de
 * sobrescrita/criação/remoção. Nada é enviado ao banco aqui — é lógica pura.
 */
export function planDebtMerge<
  A extends { unidade: string; nome: string },
  N extends { unidade: string; nome: string },
>(atuais: A[], novos: N[]): MergePlan<A, N> {
  const indice = new Map<string, A>();
  for (const atual of atuais) {
    indice.set(debtorKey(atual.unidade, atual.nome), atual);
  }

  // Deduplica o PDF novo (mantém a última ocorrência) para nunca criar
  // duplicidade de devedor a partir de linhas repetidas no relatório.
  const indiceNovo = new Map<string, N>();
  for (const novo of novos) {
    indiceNovo.set(debtorKey(novo.unidade, novo.nome), novo);
  }

  const criados: N[] = [];
  const atualizados: MergePlan<A, N>["atualizados"] = [];

  for (const [chave, novo] of indiceNovo) {
    const anterior = indice.get(chave);
    if (anterior) {
      indice.delete(chave);
      atualizados.push({ anterior, novo });
    } else {
      criados.push(novo);
    }
  }

  return {
    criados,
    atualizados,
    removidos: Array.from(indice.values()),
  };
}
