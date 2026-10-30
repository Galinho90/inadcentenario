import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PdfDropzone } from "@/components/PdfDropzone";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { PeriodoFilter } from "@/components/PeriodoFilter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarRange, Loader2, RefreshCw, Settings, Upload, UserCircle } from "lucide-react";
import type { Debtor, PdfPreview } from "@/lib/pdfParser";
import { formatBRL } from "@/lib/pdfParser";
import { recortarPorPeriodo } from "@/lib/periodoFilter";
import {
  loadLatestReport,
  importReport,
  type ReportSummary,
} from "@/lib/reportsRepo";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries";
import { toast } from "sonner";

// Code-split: Recharts + tabela pesada não vão no chunk inicial
const DashboardOverview = lazy(() => import("@/components/DashboardOverview"));
const DebtorsTable = lazy(() => import("@/components/DebtorsTable"));
const ReportsHistory = lazy(() => import("@/components/ReportsHistory"));

const SectionFallback = () => (
  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    Carregando componentes...
  </div>
);

const Index = () => {
  const qc = useQueryClient();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [current, setCurrent] = useState<ReportSummary | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("atual");
  const [showUpload, setShowUpload] = useState(false);
  const [pending, setPending] = useState<{ file: File; text: string; preview: PdfPreview } | null>(null);
  const [confirming, setConfirming] = useState(false);
  /** Mês de vencimento selecionado (null = todos os vencimentos). */
  const [periodo, setPeriodo] = useState<string | null>(null);

  /** Recorte da inadimplência pelo mês de vencimento escolhido. */
  const recorte = useMemo(
    () => recortarPorPeriodo(debtors, periodo),
    [debtors, periodo]
  );

  const periodoLabel = useMemo(
    () => recorte.periodos.find((p) => p.chave === periodo)?.label ?? null,
    [recorte.periodos, periodo]
  );

  // Mantém a seleção válida: se o relatório novo não tiver mais o mês escolhido,
  // volta para o mês mais recente disponível.
  useEffect(() => {
    if (recorte.periodos.length === 0) {
      if (periodo) setPeriodo(null);
      return;
    }
    if (periodo && !recorte.periodos.some((p) => p.chave === periodo)) {
      setPeriodo(recorte.periodos[0].chave);
    }
  }, [periodo, recorte.periodos]);

  // Ao abrir a aba "Por mês" sem seleção, já entra no mês mais recente.
  function handleTabChange(value: string) {
    setTab(value);
    if (value === "mes" && !periodo && recorte.periodos.length > 0) {
      setPeriodo(recorte.periodos[0].chave);
    }
  }

  const refreshCurrent = useCallback(async () => {
    setLoadingCurrent(true);
    try {
      const res = await loadLatestReport();
      if (res) {
        setCurrent(res.summary);
        setDebtors(res.debtors);
      } else {
        setCurrent(null);
        setDebtors([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao carregar a lista atual");
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    refreshCurrent();
  }, [refreshCurrent]);

  // Prefetch dinâmico: ao passar o mouse sobre a aba histórico, aquece o chunk
  const prefetchHistory = useCallback(() => {
    import("@/components/ReportsHistory");
  }, []);

  async function handleFile(f: File) {
    setProcessing(true);
    setError(null);
    try {
      const [{ extractTextFromPdf }, parserMod] = await Promise.all([
        import("@/lib/pdfLoader"),
        import("@/lib/pdfParser"),
      ]);
      const { validateReportText, buildPreview, PdfValidationError } = parserMod;
      const text = await extractTextFromPdf(f);

      try {
        validateReportText(text);
      } catch (ve) {
        if (ve instanceof PdfValidationError) {
          const details = ve.details?.length ? `\n\n• ${ve.details.join("\n• ")}` : "";
          setError(`${ve.message}${details}`);
          return;
        }
        throw ve;
      }

      // Mostra prévia para validação visual antes de importar
      setPending({ file: f, text, preview: buildPreview(text) });
    } catch (e) {
      console.error(e);
      setError("Não foi possível processar o PDF. Verifique se o arquivo não está corrompido.");
    } finally {
      setProcessing(false);
    }
  }

  async function confirmImport() {
    if (!pending) return;
    setConfirming(true);
    try {
      const { parseDebtors } = await import("@/lib/pdfParser");
      const result = parseDebtors(pending.text);
      if (result.length === 0) {
        setError("Nenhuma unidade encontrada no relatório. Verifique o formato do PDF e tente novamente.");
        setPending(null);
        return;
      }
      const diff = await importReport({ nomeArquivo: pending.file.name, debtors: result });
      toast.success(
        `${diff.quantidade} inadimplente${diff.quantidade !== 1 ? "s" : ""} na lista atual: ` +
          `${diff.atualizados} atualizado${diff.atualizados !== 1 ? "s" : ""}, ` +
          `${diff.criados} novo${diff.criados !== 1 ? "s" : ""}` +
          (diff.removidos > 0 ? `, ${diff.removidos} removido${diff.removidos !== 1 ? "s" : ""}` : "")
      );
      setShowUpload(false);
      setPending(null);
      qc.invalidateQueries({ queryKey: queryKeys.reports });
      await refreshCurrent();
    } catch (e) {
      console.error(e);
      setError("Erro ao salvar o relatório. Tente novamente.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header premium */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md glass">
        <div className="container py-4 md:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-elevated shrink-0 ring-2 ring-primary/20">
              <span className="text-primary-foreground font-display font-bold text-sm">IC</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-display font-semibold tracking-tight">
                Inadimplência
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Gestão — Condomínio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden sm:inline-flex hover:bg-accent transition-smooth"
            >
              <Link to="/perfil">
                <UserCircle className="h-4 w-4 mr-1.5" />
                Perfil
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="sm:hidden" aria-label="Perfil">
              <Link to="/perfil"><UserCircle className="h-4 w-4" /></Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:inline-flex hover:bg-accent hover:border-primary/30 transition-smooth"
            >
              <Link to="/configuracoes">
                <Settings className="h-4 w-4 mr-1.5" />
                Configurações
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="sm:hidden" aria-label="Configurações">
              <Link to="/configuracoes"><Settings className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 md:py-8 space-y-6 max-w-7xl">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-11 px-1.5 gap-1 bg-muted/60 border border-border/50">
            <TabsTrigger
              value="atual"
              className="text-sm px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-smooth"
            >
              Visão atual
            </TabsTrigger>
            <TabsTrigger
              value="mes"
              className="text-sm px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-smooth"
            >
              <CalendarRange className="h-4 w-4 mr-1.5" />
              Por mês
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="text-sm px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-smooth"
              onMouseEnter={prefetchHistory}
              onFocus={prefetchHistory}
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atual" className="space-y-5 mt-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground min-w-0">
                {current ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>
                        Dados de{" "}
                        <strong className="text-foreground font-medium">
                          {new Date(current.processado_em).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    </div>
                    <span className="hidden sm:inline text-border">·</span>
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">
                      {current.nome_arquivo}
                    </span>
                  </div>
                ) : loadingCurrent ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    Carregando dados...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    Nenhum relatório importado ainda. Envie um PDF para começar.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await refreshCurrent();
                    qc.invalidateQueries({ queryKey: queryKeys.reports });
                    qc.invalidateQueries({ queryKey: queryKeys.processos });
                    toast.success("Dados atualizados");
                  }}
                  disabled={loadingCurrent}
                  className="transition-smooth hover:bg-accent hover:border-primary/30 hover:shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingCurrent ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button
                  variant={showUpload ? "outline" : "default"}
                  size="sm"
                  onClick={() => setShowUpload((v) => !v)}
                  className={`transition-smooth ${
                    showUpload
                      ? "bg-muted text-foreground hover:bg-muted/80 border-primary/30"
                      : "shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  {showUpload ? "Cancelar" : current ? "Atualizar lista" : "Importar PDF"}
                </Button>
              </div>
            </div>

            {/* Upload area */}
            {(showUpload || !current) && !loadingCurrent && (
              <div className="space-y-3">
                {current && (
                  <Alert className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 dark:border-amber-500/30">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-900 dark:text-amber-300">Sobreposição de dados</AlertTitle>
                    <AlertDescription className="text-amber-800/80 dark:text-amber-400/80">
                      O novo PDF sobrescreve a lista atual: as dívidas já existentes são
                      atualizadas, apenas as novas são criadas e as que não aparecem
                      mais no relatório saem da lista. O relatório anterior fica no
                      Histórico e os processos judiciais já cadastrados permanecem
                      vinculados aos respectivos moradores.
                    </AlertDescription>
                  </Alert>
                )}
                <PdfDropzone
                  onFile={handleFile}
                  fileName={null}
                  loading={processing}
                  onReset={() => setShowUpload(false)}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro no processamento</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
              </Alert>
            )}

            {/* Content */}
            {loadingCurrent ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando dashboard...</span>
              </div>
            ) : debtors.length > 0 ? (
              <Suspense fallback={<SectionFallback />}>
                <ErrorBoundary label="o dashboard">
                  <DashboardOverview
                    debtors={debtors}
                    totalGeral={debtors.reduce((acc, d) => acc + (Number(d.total) || 0), 0)}
                    quantidadeInadimplentes={debtors.length}
                  />
                </ErrorBoundary>
                <ErrorBoundary label="a tabela de inadimplentes">
                  <DebtorsTable debtors={debtors} />
                </ErrorBoundary>
              </Suspense>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Upload className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-lg text-foreground mb-1">
                  Pronto para começar
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Importe o relatório de inadimplência em PDF para visualizar o
                  dashboard e gerenciar os devedores do condomínio.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="mt-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-smooth"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Importar relatório
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mes" className="space-y-5 mt-5">
            {loadingCurrent ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando inadimplência...</span>
              </div>
            ) : debtors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <CalendarRange className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-lg text-foreground mb-1">
                  Nenhum relatório carregado
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Importe o relatório de inadimplência em PDF para pesquisar as
                  taxas de condomínio por mês de vencimento.
                </p>
              </div>
            ) : (
              <Suspense fallback={<SectionFallback />}>
                {/* Pesquisa por data: apenas o mês de vencimento dos boletos */}
                <div className="rounded-lg border bg-card p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="w-full sm:w-72">
                      <PeriodoFilter
                        periodos={recorte.periodos}
                        value={periodo}
                        onChange={setPeriodo}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground sm:pb-2">
                      {periodo ? (
                        <>
                          Taxas de condomínio com vencimento em{" "}
                          <strong className="text-foreground">{periodoLabel}</strong>:{" "}
                          {recorte.boletos} boleto{recorte.boletos === 1 ? "" : "s"} de{" "}
                          {recorte.debtors.length} inadimplente
                          {recorte.debtors.length === 1 ? "" : "s"} —{" "}
                          <strong className="text-foreground">
                            {formatBRL(recorte.total)}
                          </strong>
                        </>
                      ) : (
                        <>
                          Escolha o mês de vencimento para listar os inadimplentes
                          das taxas daquele mês.
                          {recorte.periodos.length > 0 && (
                            <>
                              {" "}
                              {recorte.periodos.length} mês
                              {recorte.periodos.length === 1 ? "" : "es"} na base atual.
                            </>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {periodo && recorte.debtors.length > 0 ? (
                  <ErrorBoundary label="a lista de inadimplentes do mês">
                    <DebtorsTable
                      debtors={recorte.debtors}
                      totalRegistros={debtors.length}
                      periodos={recorte.periodos}
                      periodo={periodo}
                      onPeriodoChange={setPeriodo}
                    />
                  </ErrorBoundary>
                ) : (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {recorte.periodos.length === 0
                      ? "Nenhuma taxa com vencimento reconhecido no relatório atual."
                      : "Selecione um mês de vencimento para ver a lista dos inadimplentes das taxas daquele mês."}
                  </div>
                )}
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-5">
            <Suspense fallback={<SectionFallback />}>
              <ReportsHistory />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>

      <PdfPreviewDialog
        open={!!pending}
        preview={pending?.preview ?? null}
        fileName={pending?.file.name ?? ""}
        confirming={confirming}
        onConfirm={confirmImport}
        onCancel={() => setPending(null)}
      />
    </div>
  );
};

export default Index;
