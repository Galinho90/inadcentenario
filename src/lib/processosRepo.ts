import { supabase } from "@/integrations/supabase/client";
import type { Debtor } from "./pdfParser";
import { getBoletoAtraso } from "./pdfParser";
import { getJudicialSettings } from "./settings";
import { chaveMorador, removerSufixoNotificacao } from "./chaveMorador";

/** @deprecated use settings — mantido apenas como fallback. */
export const JUDICIAL_MIN_BOLETOS = 3;
/** @deprecated use settings — mantido apenas como fallback. */
export const JUDICIAL_MIN_ATRASO_DIAS = 30;

export type ProcessoTipo = "judicial" | "extrajudicial";

export interface ProcessoJudicial {
  id: string;
  unidade: string;
  nome: string;
  numero_processo: string;
  chave_processo: string | null;
  observacoes: string | null;
  tipo: ProcessoTipo;
  updated_at: string;
}

/** Devedor é elegível à cobrança extrajudicial (1-2 boletos com atraso > min). */
export function isExtrajudicial(
  d: Debtor,
  opts?: { minBoletos?: number; minAtrasoDias?: number }
): boolean {
  const cfg = getJudicialSettings();
  const minA = opts?.minAtrasoDias ?? cfg.minAtrasoDias;
  const minB = opts?.minBoletos ?? cfg.minBoletos;
  const overdue = countOverdueBoletos(d, minA);
  return overdue >= 1 && overdue < minB;
}

/** Quantos boletos do devedor estão com atraso acima do limite configurado. */
export function countOverdueBoletos(d: Debtor, minAtrasoDias?: number): number {
  const min = minAtrasoDias ?? getJudicialSettings().minAtrasoDias;
  return d.boletos.filter((b) => getBoletoAtraso(b) > min).length;
}

/** Devedor é elegível à cobrança judicial conforme as configurações. */
export function isJudicial(
  d: Debtor,
  opts?: { minBoletos?: number; minAtrasoDias?: number }
): boolean {
  const cfg = getJudicialSettings();
  const minB = opts?.minBoletos ?? cfg.minBoletos;
  const minA = opts?.minAtrasoDias ?? cfg.minAtrasoDias;
  return countOverdueBoletos(d, minA) >= minB;
}

export async function listProcessos(): Promise<ProcessoJudicial[]> {
  const { data, error } = await supabase
    .from("processos_judiciais")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProcessoJudicial[];
}

/**
 * Localiza um processo já cadastrado para o mesmo morador, comparando pela
 * chave normalizada (unidade + nome sem sufixo de notificação), de modo que
 * variações de grafia não criem processos duplicados.
 */
async function findProcessoByChave(
  unidade: string,
  nome: string
): Promise<ProcessoJudicial | null> {
  const chave = chaveMorador(unidade, nome);

  const { data, error } = await supabase
    .from("processos_judiciais")
    .select("*")
    .eq("unidade", unidade);
  if (error) throw error;

  const candidatos = (data ?? []) as ProcessoJudicial[];
  const exato = candidatos.find((p) => chaveMorador(p.unidade, p.nome) === chave);
  if (exato) return exato;

  // A unidade pode estar grafada de outra forma ("0409" x "04 09"):
  // nesse caso varremos a tabela inteira antes de concluir que não existe.
  const { data: todos, error: erroTodos } = await supabase
    .from("processos_judiciais")
    .select("*");
  if (erroTodos) throw erroTodos;

  const lista = (todos ?? []) as ProcessoJudicial[];
  return lista.find((p) => chaveMorador(p.unidade, p.nome) === chave) ?? null;
}

export async function upsertProcesso(input: {
  unidade: string;
  nome: string;
  numero_processo: string;
  chave_processo?: string | null;
  observacoes?: string | null;
  tipo?: ProcessoTipo;
}): Promise<void> {
  const nomeLimpo = removerSufixoNotificacao(input.nome);
  const existente = await findProcessoByChave(input.unidade, input.nome);

  const payload = {
    unidade: input.unidade,
    nome: nomeLimpo,
    numero_processo: input.numero_processo,
    chave_processo: input.chave_processo ?? null,
    observacoes: input.observacoes ?? null,
    tipo: input.tipo ?? "judicial",
  };

  if (existente) {
    const { error } = await supabase
      .from("processos_judiciais")
      .update(payload)
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("processos_judiciais").insert(payload);
  if (error) throw error;
}

export async function deleteProcesso(unidade: string, nome: string): Promise<void> {
  const chave = chaveMorador(unidade, nome);

  const { data, error } = await supabase
    .from("processos_judiciais")
    .select("id, unidade, nome");
  if (error) throw error;

  const ids = ((data ?? []) as Array<{ id: string; unidade: string; nome: string }>)
    .filter((p) => chaveMorador(p.unidade, p.nome) === chave)
    .map((p) => p.id);

  if (!ids.length) return;

  const { error: erroDelete } = await supabase
    .from("processos_judiciais")
    .delete()
    .in("id", ids);
  if (erroDelete) throw erroDelete;
}

/**
 * Mapa rápido por chave "unidade|nome" normalizada.
 * Havendo mais de um processo para a mesma chave, mantém o mais recente.
 */
export function indexByKey(list: ProcessoJudicial[]): Map<string, ProcessoJudicial> {
  const m = new Map<string, ProcessoJudicial>();
  list.forEach((p) => {
    const chave = chaveMorador(p.unidade, p.nome);
    const atual = m.get(chave);
    if (!atual || (p.updated_at ?? "") > (atual.updated_at ?? "")) {
      m.set(chave, p);
    }
  });
  return m;
}
