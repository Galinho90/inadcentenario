import { useQuery } from "@tanstack/react-query";
import { listProcessos, type ProcessoJudicial } from "./processosRepo";
import { loadAllReports, type ReportSummary } from "./reportsRepo";

/** Chaves canônicas de cache — compartilhadas entre componentes para deduplicar requests. */
export const queryKeys = {
  processos: ["processos"] as const,
  reports: ["reports"] as const,
  latestReport: ["reports", "latest"] as const,
};

/** Compartilha `listProcessos` entre DebtorsTable, JudicialAlert, etc. sem refetch. */
export function useProcessos() {
  return useQuery<ProcessoJudicial[]>({
    queryKey: queryKeys.processos,
    queryFn: listProcessos,
    staleTime: 30_000,
  });
}

export function useReports() {
  return useQuery<ReportSummary[]>({
    queryKey: queryKeys.reports,
    queryFn: loadAllReports,
    staleTime: 30_000,
  });
}
