import { supabase } from "@/integrations/supabase/client";
import type { Debtor } from "./pdfParser";

export const JUDICIAL_MIN_BOLETOS = 3;
export const JUDICIAL_MIN_ATRASO_DIAS = 30;

export interface ProcessoJudicial {
  id: string;
  unidade: string;
  nome: string;
  numero_processo: string;
  observacoes: string | null;
  updated_at: string;
}

/** Devedor é elegível à cobrança judicial: 3+ boletos com >30 dias de atraso. */
export function countOverdueBoletos(d: Debtor): number {
  return d.boletos.filter((b) => b.atraso > JUDICIAL_MIN_ATRASO_DIAS).length;
}

export function isJudicial(d: Debtor): boolean {
  return countOverdueBoletos(d) >= JUDICIAL_MIN_BOLETOS;
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
}): Promise<void> {
  const { error } = await supabase
    .from("processos_judiciais")
    .upsert(
      {
        unidade: input.unidade,
        nome: input.nome,
        numero_processo: input.numero_processo,
        observacoes: input.observacoes ?? null,
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
