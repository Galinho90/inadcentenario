import * as XLSX from "xlsx";
import type { Debtor } from "@/lib/pdfParser";
import { getBoletoAtraso } from "@/lib/pdfParser";
import type { ProcessoJudicial } from "@/lib/processosRepo";
import {
  countOverdueBoletos,
  isExtrajudicial,
  isJudicial,
} from "@/lib/processosRepo";
import type { JudicialSettings } from "@/lib/settings";

interface ExportParams {
  debtors: Debtor[];
  procMap: Map<string, ProcessoJudicial>;
  settings: JudicialSettings;
  fileName?: string;
}

function tipoCobranca(
  d: Debtor,
  procMap: Map<string, ProcessoJudicial>,
  settings: JudicialSettings
): string {
  const proc = procMap.get(`${d.unidade}|${d.nome}`);
  if (proc?.tipo === "judicial") return "Judicial (ativo)";
  if (proc?.tipo === "extrajudicial") return "Extrajudicial (ativo)";
  if (isJudicial(d, settings)) return "Elegível judicial";
  if (isExtrajudicial(d, settings)) return "Elegível extrajudicial";
  return "Regular";
}

/** Exporta os inadimplentes filtrados para uma planilha Excel (.xlsx). */
export function exportDebtorsToExcel({
  debtors,
  procMap,
  settings,
  fileName,
}: ExportParams) {
  // Aba 1: Resumo por inadimplente
  const resumoRows = debtors.map((d) => {
    const proc = procMap.get(`${d.unidade}|${d.nome}`);
    return {
      Unidade: d.unidade,
      Nome: d.nome,
      "Qtd. Boletos": d.boletos.length,
      "Boletos +" + settings.minAtrasoDias + "d":
        countOverdueBoletos(d, settings.minAtrasoDias),
      "Total (R$)": Number(d.total.toFixed(2)),
      "Tipo cobrança": tipoCobranca(d, procMap, settings),
      "Nº Processo/Referência": proc?.numero_processo ?? "",
      "Chave processo": proc?.chave_processo ?? "",
      Observações: proc?.observacoes ?? "",
    };
  });

  // Aba 2: Boletos detalhados
  const boletosRows = debtors.flatMap((d) =>
    d.boletos.map((b) => ({
      Unidade: d.unidade,
      Nome: d.nome,
      Vencimento: b.vencimento,
      "Atraso (dias)": getBoletoAtraso(b),
      Código: b.codigo,
      "Principal (R$)": Number(b.principal.toFixed(2)),
      "Total (R$)": Number(b.total.toFixed(2)),
    }))
  );

  const wb = XLSX.utils.book_new();
  const wsResumo = XLSX.utils.json_to_sheet(resumoRows);
  const wsBoletos = XLSX.utils.json_to_sheet(boletosRows);

  // Larguras aproximadas
  wsResumo["!cols"] = [
    { wch: 10 }, { wch: 34 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 30 },
  ];
  wsBoletos["!cols"] = [
    { wch: 10 }, { wch: 34 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, wsResumo, "Inadimplentes");
  XLSX.utils.book_append_sheet(wb, wsBoletos, "Boletos");

  const stamp = new Date().toISOString().slice(0, 10);
  const name = fileName ?? `inadimplentes-${stamp}.xlsx`;
  XLSX.writeFile(wb, name);
}
