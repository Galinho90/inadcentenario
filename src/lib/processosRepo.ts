import { supabase } from "@/integrations/supabase/client";
import type { Debtor } from "./pdfParser";
import { getJudicialSettings } from "./settings";

/** @deprecated use settings — mantido apenas como fallback. */
export const JUDICIAL_MIN_BOLETOS = 3;
/** @deprecated use settings — mantido apenas como fallback. */
export const JUDICIAL_MIN_ATRASO_DIAS = 30;

export interface ProcessoJudicial {
  id: string;
  unidade: string;
  nome: string;
  numero_processo: string;
  observacoes: string | null;
  updated_at: string;
  fase_atual: string | null;
  tribunal: string | null;
  ultima_consulta: string | null;
  consulta_status: string | null;
  consulta_erro: string | null;
  migrado_eproc: boolean;
}

/** Consulta o DataJud (CNJ) e atualiza o status de UM processo. */
export async function consultarStatusProcesso(input: {
  unidade: string;
  nome: string;
  numero_processo: string;
}): Promise<{
  ok: boolean;
  fase_atual: string | null;
  tribunal: string | null;
  consulta_status: string;
  consulta_erro: string | null;
}> {
  const { data, error } = await supabase.functions.invoke("consultar-processo", {
    body: input,
  });
  if (error) throw error;
  return data;
}

/** Sincroniza TODOS os processos via DataJud. */
export async function sincronizarTodosProcessos(): Promise<{
  total: number;
  atualizados: number;
  erros: number;
}> {
  const { data, error } = await supabase.functions.invoke(
    "consultar-processos-batch",
    { body: {} }
  );
  if (error) throw error;
  return data;
}

/** Quantos boletos do devedor estão com atraso acima do limite configurado. */
export function countOverdueBoletos(d: Debtor, minAtrasoDias?: number): number {
  const min = minAtrasoDias ?? getJudicialSettings().minAtrasoDias;
  return d.boletos.filter((b) => b.atraso > min).length;
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

export async function upsertProcesso(input: {
  unidade: string;
  nome: string;
  numero_processo: string;
  observacoes?: string | null;
  migrado_eproc?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("processos_judiciais")
    .upsert(
      {
        unidade: input.unidade,
        nome: input.nome,
        numero_processo: input.numero_processo,
        observacoes: input.observacoes ?? null,
        migrado_eproc: input.migrado_eproc ?? false,
      },
      { onConflict: "unidade,nome" }
    );
  if (error) throw error;
}

export async function deleteProcesso(unidade: string, nome: string): Promise<void> {
  const { error } = await supabase
    .from("processos_judiciais")
    .delete()
    .eq("unidade", unidade)
    .eq("nome", nome);
  if (error) throw error;
}

/** Mapa rápido por chave "unidade|nome". */
export function indexByKey(list: ProcessoJudicial[]): Map<string, ProcessoJudicial> {
  const m = new Map<string, ProcessoJudicial>();
  list.forEach((p) => m.set(`${p.unidade}|${p.nome}`, p));
  return m;
}
