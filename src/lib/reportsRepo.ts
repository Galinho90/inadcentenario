import { supabase } from "@/integrations/supabase/client";
import type { Debtor } from "@/lib/pdfParser";

export interface ReportSummary {
  id: string;
  nome_arquivo: string;
  quantidade_inadimplentes: number;
  total_geral: number;
  processado_em: string;
}

export async function insertReport({
  nomeArquivo,
  debtors,
}: {
  nomeArquivo: string;
  debtors: Debtor[];
}) {
  const { data, error } = await supabase
    .from("relatorios")
    .insert({
      nome_arquivo: nomeArquivo,
      quantidade_inadimplentes: debtors.length,
      total_geral: debtors.reduce((acc, d) => acc + d.total, 0),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadReport(reportId: string) {
  const { data: relatorio, error: relError } = await supabase
    .from("relatorios")
    .select("*")
    .eq("id", reportId)
    .single();

  if (relError || !relatorio) return null;

  const { data: inadimplentes, error: inadError } = await supabase
    .from("inadimplentes")
    .select("*, boletos(*)")
    .eq("relatorio_id", reportId);

  if (inadError) throw inadError;

  const debtors: Debtor[] = (inadimplentes ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    unidade: row.unidade as string,
    nome: row.nome as string,
    total: Number(row.total) || 0,
    tipo: "Normal" as const,
    boletos: ((row.boletos as unknown[]) ?? []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      vencimento: b.vencimento as string,
      atraso: Number(b.atraso) || 0,
      codigo: (b.codigo as string) ?? null,
      principal: Number(b.principal) || 0,
      total: Number(b.total) || 0,
    })),
  }));

  return {
    summary: {
      id: relatorio.id,
      nome_arquivo: relatorio.nome_arquivo,
      quantidade_inadimplentes: relatorio.quantidade_inadimplentes,
      total_geral: Number(relatorio.total_geral) || 0,
      processado_em: relatorio.processado_em,
    },
    debtors,
  };
}

export async function loadLatestReport() {
  const { data: relatorio, error: relError } = await supabase
    .from("relatorios")
    .select("*")
    .order("processado_em", { ascending: false })
    .limit(1)
    .single();

  if (relError || !relatorio) return null;

  const { data: inadimplentes, error: inadError } = await supabase
    .from("inadimplentes")
    .select("*, boletos(*)")
    .eq("relatorio_id", relatorio.id);

  if (inadError) throw inadError;

  const debtors: Debtor[] = (inadimplentes ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    unidade: row.unidade as string,
    nome: row.nome as string,
    total: Number(row.total) || 0,
    tipo: "Normal" as const,
    boletos: ((row.boletos as unknown[]) ?? []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      vencimento: b.vencimento as string,
      atraso: Number(b.atraso) || 0,
      codigo: (b.codigo as string) ?? null,
      principal: Number(b.principal) || 0,
      total: Number(b.total) || 0,
    })),
  }));

  return {
    summary: {
      id: relatorio.id,
      nome_arquivo: relatorio.nome_arquivo,
      quantidade_inadimplentes: relatorio.quantidade_inadimplentes,
      total_geral: Number(relatorio.total_geral) || 0,
      processado_em: relatorio.processado_em,
    },
    debtors,
  };
}

export async function loadAllReports() {
  const { data, error } = await supabase
    .from("relatorios")
    .select("*")
    .order("processado_em", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(
    (row: Record<string, unknown>): ReportSummary => ({
      id: row.id as string,
      nome_arquivo: row.nome_arquivo as string,
      quantidade_inadimplentes: row.quantidade_inadimplentes as number,
      total_geral: Number(row.total_geral) || 0,
      processado_em: row.processado_em as string,
    })
  );
}
