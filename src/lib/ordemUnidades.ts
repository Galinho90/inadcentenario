/**
 * Ordenação da lista de inadimplentes por bloco e apartamento.
 *
 * O campo `unidade` segue o padrão "NN NN" (ex.: "04 09"), onde:
 *  - o primeiro número é o APARTAMENTO;
 *  - o segundo número é o BLOCO.
 *
 * A ordenação pedida é: blocos em ordem crescente (01, 02, ... 15) e, dentro
 * de cada bloco, apartamentos em ordem crescente.
 *
 * Unidades que não seguem o padrão não são descartadas: ficam no fim da
 * lista, preservando o registro.
 */

/** Partes interpretadas de uma unidade. */
export interface UnidadePartes {
  /** Apartamento (primeiro número da unidade). */
  apartamento: number;
  /** Bloco (segundo número da unidade). */
  bloco: number;
  /** false quando a unidade não pôde ser interpretada. */
  valida: boolean;
}

/** Valor usado para empurrar unidades ininterpretáveis para o fim da lista. */
const ULTIMO = Number.MAX_SAFE_INTEGER;

/**
 * Interpreta uma unidade no formato "NN NN".
 *
 * - "04 09" / "04-09"  -> apartment 04, bloco 09
 * - "0409"             -> apartment 04, bloco 09
 * - "09"               -> apartment 0, bloco 09 (sem apartamento informado)
 * - "" / "abc"         -> inválida (fica no fim da lista)
 */
export function partesUnidade(unidade: string): UnidadePartes {
  const digitos = String(unidade ?? "").match(/\d+/g);

  if (!digitos || digitos.length === 0) {
    return { apartamento: ULTIMO, bloco: ULTIMO, valida: false };
  }

  if (digitos.length >= 2) {
    return {
      apartamento: Number.parseInt(digitos[0], 10),
      bloco: Number.parseInt(digitos[1], 10),
      valida: true,
    };
  }

  const unico = digitos[0];

  if (unico.length === 4) {
    return {
      apartamento: Number.parseInt(unico.slice(0, 2), 10),
      bloco: Number.parseInt(unico.slice(2), 10),
      valida: true,
    };
  }

  if (unico.length === 2) {
    return { apartamento: 0, bloco: Number.parseInt(unico, 10), valida: true };
  }

  return { apartamento: ULTIMO, bloco: ULTIMO, valida: false };
}

/**
 * Compara duas unidades: primeiro pelo bloco (crescente), depois pelo
 * apartamento (crescente). Retorna valor negativo quando `a` vem antes.
 */
export function compararUnidades(a: string, b: string): number {
  const pa = partesUnidade(a);
  const pb = partesUnidade(b);

  if (pa.bloco !== pb.bloco) return pa.bloco - pb.bloco;
  if (pa.apartamento !== pb.apartamento) return pa.apartamento - pb.apartamento;

  return 0;
}

/**
 * Ordena uma cópia da lista de inadimplentes por bloco e apartamento.
 * A ordenação é estável: registros com a mesma unidade mantêm a ordem original.
 */
export function ordenarPorUnidade<T extends { unidade: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => compararUnidades(a.unidade, b.unidade));
}
