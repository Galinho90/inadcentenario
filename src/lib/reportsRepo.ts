import { supabase } from "@/integrations/supabase/client";
import type { Debtor } from "@/lib/pdfParser";

export interface ReportSummary {
  id: string;
  nome_arquivo: string;
  total_geral: number;
  quantidade_inadimplentes: number;
  processado_em: string;
}

/** Salva um relatório completo (cabeçalho + inadimplentes + boletos). */
export async function saveReport(params: {
  nomeArquivo: string;
  debtors: Debtor[];
}): Promise<string> {
  const { nomeArquivo, debtors } = params;
  const totalGeral = debtors.reduce((acc, d) => acc + d.total, 0);

  const { data: rel, error: relErr } = await supabase
    .from("relatorios")
    .insert({
      nome_arquivo: nomeArquivo,
      total_geral: totalGeral,
      quantidade_inadimplentes: debtors.length,
    })
    .select("id")
    .single();

  if (relErr || !rel) throw relErr ?? new Error("Falha ao criar relatório");

  if (debtors.length === 0) return rel.id;

  // Insere inadimplentes em lote e captura ids
  const inadRows = debtors.map((d) => ({
    relatorio_id: rel.id,
    unidade: d.unidade,
    nome: d.nome,
    total: d.total,
  }));

  const { data: inadInserted, error: inadErr } = await supabase
    .from("inadimplentes")
    .insert(inadRows)
    .select("id, unidade, nome");

  if (inadErr || !inadInserted) throw inadErr ?? new Error("Falha ao salvar inadimplentes");

  // Mapa (unidade|nome) -> id
  const idMap = new Map<string, string>();
  inadInserted.forEach((row) => {
    idMap.set(`${row.unidade}|${row.nome}`, row.id);
  });

  // Insere boletos em lote
  const boletoRows = debtors.flatMap((d) => {
    const inadId = idMap.get(`${d.unidade}|${d.nome}`);
    if (!inadId) return [];
    return d.boletos.map((b) => ({
      inadimplente_id: inadId,
      vencimento: b.vencimento,
      atraso: b.atraso,
      codigo: b.codigo,
      principal: b.principal,
      total: b.total,
    }));
  });

  if (boletoRows.length) {
    const { error: bolErr } = await supabase.from("boletos").insert(boletoRows);
    if (bolErr) throw bolErr;
  }

  return rel.id;
}

export async function listReports(): Promise<ReportSummary[]> {
  const { data, error } = await supabase
    .from("relatorios")
    .select("id, nome_arquivo, total_geral, quantidade_inadimplentes, processado_em")
    .order("processado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    total_geral: Number(r.total_geral),
  }));
}

/** Retorna o último relatório salvo (mais recente) ou null se não houver. */
export async function loadLatestReport(): Promise<
  { summary: ReportSummary; debtors: Debtor[] } | null
> {
  const { data, error } = await supabase
    .from("relatorios")
    .select("id")
    .order("processado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return loadReport(data.id);
}

export async function loadReport(
  id: string
): Promise<{ summary: ReportSummary; debtors: Debtor[] }> {
  const { data: rel, error: relErr } = await supabase
    .from("relatorios")
    .select("id, nome_arquivo, total_geral, quantidade_inadimplentes, processado_em")
    .eq("id", id)
    .single();
  if (relErr || !rel) throw relErr ?? new Error("Relatório não encontrado");

  const { data: inad, error: inadErr } = await supabase
    .from("inadimplentes")
    .select("id, unidade, nome, total")
    .eq("relatorio_id", id);
  if (inadErr) throw inadErr;

  const inadIds = (inad ?? []).map((i) => i.id);
  let boletosByInad = new Map<string, any[]>();
  if (inadIds.length) {
    const { data: bols, error: bolErr } = await supabase
      .from("boletos")
      .select("inadimplente_id, vencimento, atraso, codigo, principal, total")
      .in("inadimplente_id", inadIds);
    if (bolErr) throw bolErr;
    (bols ?? []).forEach((b) => {
      const arr = boletosByInad.get(b.inadimplente_id) ?? [];
      arr.push(b);
      boletosByInad.set(b.inadimplente_id, arr);
    });
  }

  const debtors: Debtor[] = (inad ?? []).map((i) => ({
    unidade: i.unidade,
    nome: i.nome,
    total: Number(i.total),
    boletos: (boletosByInad.get(i.id) ?? []).map((b) => ({
      vencimento: b.vencimento,
      atraso: b.atraso,
      codigo: b.codigo ?? "",
      principal: Number(b.principal),
      total: Number(b.total),
    })),
  }));

  return {
    summary: { ...rel, total_geral: Number(rel.total_geral) },
    debtors,
  };
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("relatorios").delete().eq("id", id);
  if (error) throw error;
}
