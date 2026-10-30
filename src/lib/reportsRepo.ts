import { supabase } from "@/integrations/supabase/client";
import type { Boleto, Debtor } from "@/lib/pdfParser";
import { planDebtMerge } from "./debtMerge";

export interface ReportSummary {
  id: string;
  nome_arquivo: string;
  quantidade_inadimplentes: number;
  total_geral: number;
  processado_em: string;
}

/** Linha de `inadimplentes` lida do banco, com os boletos vinculados. */
interface InadimplenteRow {
  id: string;
  relatorio_id: string;
  unidade: string;
  nome: string;
  total: number;
  boletos?: { id: string }[];
}

/** Resultado de uma importação: o que foi criado, sobrescrito e removido. */
export interface ImportResult {
  relatorioId: string;
  /** Dívidas que não existiam antes e foram criadas. */
  criados: number;
  /** Dívidas que já existiam e foram sobrescritas com os novos valores. */
  atualizados: number;
  /** Dívidas que não existem mais no novo PDF e foram removidas. */
  removidos: number;
  /** Total de inadimplentes do novo relatório. */
  quantidade: number;
  /** Somatório das dívidas do novo relatório. */
  total: number;
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
      total_geral: debtors.reduce((acc, d) => acc + (Number(d.total) || 0), 0),
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

/* -------------------------------------------------------------------------- */
/* Importação com sobrescrita                                                   */
/* -------------------------------------------------------------------------- */

/** Payload de um boleto pronto para inserção. */
function boletoPayload(inadimplenteId: string, b: Boleto) {
  return {
    inadimplente_id: inadimplenteId,
    vencimento: b.vencimento,
    atraso: b.atraso,
    codigo: b.codigo,
    principal: b.principal,
    total: b.total,
  };
}

/** Insere devedores (com seus boletos) em um relatório. */
async function insertDebtors(relatorioId: string, debtors: Debtor[]): Promise<void> {
  if (!debtors.length) return;

  const { data, error } = await supabase
    .from("inadimplentes")
    .insert(
      debtors.map((d) => ({
        relatorio_id: relatorioId,
        unidade: d.unidade,
        nome: d.nome,
        total: Number(d.total) || 0,
      }))
    )
    .select("id");

  if (error) throw error;

  const linhas = (data ?? []) as { id: string }[];
  const boletos = debtors.flatMap((d, index) => {
    const pai = linhas[index];
    if (!pai) return [];
    return d.boletos.map((b) => boletoPayload(pai.id, b));
  });

  if (boletos.length) {
    const { error: boletoError } = await supabase.from("boletos").insert(boletos);
    if (boletoError) throw boletoError;
  }
}

/** Sobrescreve uma dívida já existente, mantendo a mesma linha no banco. */
async function updateInadimplente(
  id: string,
  patch: { relatorio_id: string; nome: string; total: number }
): Promise<boolean> {
  const { data, error } = await supabase
    .from("inadimplentes")
    .update(patch)
    .eq("id", id)
    .select("id");

  if (error) throw error;
  return (data ?? []).length > 0;
}

async function deleteInadimplente(id: string): Promise<void> {
  const { error } = await supabase.from("inadimplentes").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Importa um relatório de inadimplência aplicando a regra:
 * sobrescreve as dívidas que já existem, cria apenas as novas e remove as que
 * não existem mais no PDF.
 *
 * O relatório anterior continua no histórico (com os números congelados) e o
 * novo relatório passa a ser o vigente — sem duplicar as linhas de devedores.
 */
export async function importReport({
  nomeArquivo,
  debtors,
}: {
  nomeArquivo: string;
  debtors: Debtor[];
}): Promise<ImportResult> {
  const totalGeral = debtors.reduce((acc, d) => acc + (Number(d.total) || 0), 0);

  const { data: atual, error: atualError } = await supabase
    .from("relatorios")
    .select("id, nome_arquivo, quantidade_inadimplentes, total_geral, processado_em")
    .order("processado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (atualError) throw atualError;

  // Primeira importação: cria o relatório e toda a base.
  if (!atual) {
    const relatorio = await insertReport({ nomeArquivo, debtors });
    try {
      await insertDebtors(relatorio.id, debtors);
    } catch (err) {
      await supabase.from("relatorios").delete().eq("id", relatorio.id);
      throw err;
    }
    return {
      relatorioId: relatorio.id,
      criados: debtors.length,
      atualizados: 0,
      removidos: 0,
      quantidade: debtors.length,
      total: totalGeral,
    };
  }

  // Base vigente (relatório atual + suas dívidas).
  const { data: linhas, error: linhasError } = await supabase
    .from("inadimplentes")
    .select("id, relatorio_id, unidade, nome, total, boletos(*)")
    .eq("relatorio_id", atual.id);

  if (linhasError) throw linhasError;

  const base = ((linhas ?? []) as unknown as InadimplenteRow[]) ?? [];
  const plano = planDebtMerge(base, debtors);

  // Novo relatório (vigente). O anterior permanece no histórico.
  const novo = await insertReport({ nomeArquivo, debtors });

  const boletosParaRemover: string[] = [];
  const boletosParaInserir: ReturnType<typeof boletoPayload>[] = [];
  const recriados: { dados: Debtor }[] = [];

  try {
    // 1. Remove as dívidas que não existem mais no PDF (quitadas/fora do relatório).
    for (const removido of plano.removidos) {
      await deleteInadimplente(removido.id);
    }

    // 2. Sobrescreve as dívidas já existentes.
    for (const { anterior, novo: dados } of plano.atualizados) {
      const atualizado = await updateInadimplente(anterior.id, {
        relatorio_id: novo.id,
        nome: dados.nome,
        total: Number(dados.total) || 0,
      });

      if (atualizado) {
        // Mesma linha sobrescrita: só os boletos são substituídos.
        boletosParaRemover.push(...(anterior.boletos ?? []).map((b) => b.id));
        boletosParaInserir.push(...dados.boletos.map((b) => boletoPayload(anterior.id, b)));
      } else {
        // UPDATE bloqueado por RLS: recria a linha (mesmo resultado visível).
        recriados.push({ dados });
        await deleteInadimplente(anterior.id);
      }
    }

    // 3. Cria apenas as dívidas que ainda não existiam.
    if (plano.criados.length) {
      await insertDebtors(novo.id, plano.criados);
    }

    // 4. Recria (quando necessário) as linhas que não puderam ser sobrescritas.
    for (const { dados } of recriados) {
      const { data: criado, error: criarError } = await supabase
        .from("inadimplentes")
        .insert({
          relatorio_id: novo.id,
          unidade: dados.unidade,
          nome: dados.nome,
          total: Number(dados.total) || 0,
        })
        .select("id")
        .single();
      if (criarError) throw criarError;
      boletosParaInserir.push(
        ...dados.boletos.map((b) => boletoPayload((criado as { id: string }).id, b))
      );
    }

    // 5. Substitui os boletos das dívidas sobrescritas.
    if (boletosParaRemover.length) {
      const { error: removerError } = await supabase
        .from("boletos")
        .delete()
        .in("id", boletosParaRemover);
      if (removerError) throw removerError;
    }
    if (boletosParaInserir.length) {
      const { error: inserirError } = await supabase
        .from("boletos")
        .insert(boletosParaInserir);
      if (inserirError) throw inserirError;
    }

    // 6. Limpa linhas de importações anteriores que ainda existam no banco
    //    (evita que o total geral some relatórios velhos).
    const { data: relatorios, error: relatoriosError } = await supabase
      .from("relatorios")
      .select("id");
    if (relatoriosError) throw relatoriosError;

    const antigos = (relatorios ?? [])
      .map((r) => (r as Record<string, unknown>).id as string)
      .filter((id) => id !== novo.id);

    if (antigos.length) {
      const { error: purgeError } = await supabase
        .from("inadimplentes")
        .delete()
        .in("relatorio_id", antigos);
      if (purgeError) throw purgeError;
    }
  } catch (err) {
    console.error("Falha ao importar relatório", err);
    throw err;
  }

  return {
    relatorioId: novo.id,
    criados: plano.criados.length,
    atualizados: plano.atualizados.length,
    removidos: plano.removidos.length,
    quantidade: debtors.length,
    total: totalGeral,
  };
}

/** Remove um relatório; inadimplentes/boletos caem por ON DELETE CASCADE. */
export async function deleteReport(reportId: string) {
  const { error } = await supabase.from("relatorios").delete().eq("id", reportId);
  if (error) throw error;
}
