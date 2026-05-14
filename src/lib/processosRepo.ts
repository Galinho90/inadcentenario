import { supabase } from "@/integrations/supabase/client";
import type { Debtor } from "./pdfParser";
import { getBoletoAtraso } from "./pdfParser";
import { getJudicialSettings } from "./settings";

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

export async function upsertProcesso(input: {
  unidade: string;
  nome: string;
  numero_processo: string;
  observacoes?: string | null;
  tipo?: ProcessoTipo;
}): Promise<void> {
  const { error } = await supabase
    .from("processos_judiciais")
    .upsert(
      {
        unidade: input.unidade,
        nome: input.nome,
        numero_processo: input.numero_processo,
        observacoes: input.observacoes ?? null,
        tipo: input.tipo ?? "judicial",
      } as any,
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
