/**
 * Chave estável para identificar um morador (unidade + nome).
 *
 * O relatório em PDF e o cadastro de processos judiciais nem sempre usam a
 * mesma grafia do mesmo morador: há diferenças de caixa, acentos, espaços
 * extras e o sufixo de notificação ("3° Notificação") que aparece em algumas
 * linhas do relatório.
 *
 * Comparar sempre por esta chave evita perder o vínculo do processo cadastrado
 * quando a grafia muda e evita criar processos duplicados.
 */

/** Remove o sufixo de notificação ("3° Notificação", "1o Notif.") do fim do texto. */
export function removerSufixoNotificacao(valor: string): string {
  return String(valor ?? "")
    .replace(/\s*\d+\s*(?:[°ºªoa]\.?)?\s*notif(?:ic(?:a(?:[cç][aã]o)?)?)?\.?.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Normaliza texto: sem acentos, sem espaços extras, em minúsculas. */
export function normalizarTexto(valor: string): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Chave "unidade|nome" normalizada, para comparar devedores e processos. */
export function chaveMorador(unidade: string, nome: string): string {
  const un = normalizarTexto(unidade);
  const no = normalizarTexto(removerSufixoNotificacao(nome));
  return `${un}|${no}`;
}
