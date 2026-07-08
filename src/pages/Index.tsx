import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PdfDropzone } from "@/components/PdfDropzone";
import { DashboardOverview } from "@/components/DashboardOverview";
import { DebtorsTable } from "@/components/DebtorsTable";

import { ReportsHistory } from "@/components/ReportsHistory";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw, Settings, Upload, UserCircle } from "lucide-react";
import { parseDebtors, type Debtor } from "@/lib/pdfParser";
import { extractTextFromPdf } from "@/lib/pdfLoader";
import {
  loadLatestReport,
  saveReport,
  type ReportSummary,
} from "@/lib/reportsRepo";
import { toast } from "sonner";

const Index = () => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [current, setCurrent] = useState<ReportSummary | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [tab, setTab] = useState("atual");
  const [showUpload, setShowUpload] = useState(false);

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
      toast.error("Falha ao carregar lista atual");
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    refreshCurrent();
  }, [refreshCurrent]);

  async function handleFile(f: File) {
    setProcessing(true);
    setError(null);
    try {
      const text = await extractTextFromPdf(f);
      const result = parseDebtors(text);
      if (result.length === 0) {
        setError(
          "Nenhuma unidade encontrada no padrão esperado (ex: '12 01' + nome + linha 'Total')."
        );
        return;
      }
      // Substitui a lista atual: salva como novo relatório (vira o "atual").
      await saveReport({ nomeArquivo: f.name, debtors: result });
      toast.success(
        `Lista atualizada — ${result.length} inadimplentes`
      );
      setShowUpload(false);
      setHistoryKey((k) => k + 1);
      await refreshCurrent();
    } catch (e) {
      console.error(e);
      setError("Falha ao processar o PDF. Verifique se o arquivo não está corrompido.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container py-4 md:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-elevated shrink-0">
              <span className="text-primary-foreground font-display font-bold text-sm">IC</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-display font-semibold tracking-tight truncate">
                Inadimplência — Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                Gestão de inadimplentes do condomínio
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/perfil">
                <UserCircle className="h-4 w-4 mr-1.5" />
                Perfil
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="sm:hidden" aria-label="Perfil">
              <Link to="/perfil"><UserCircle className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
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

      <main className="container py-6 md:py-8 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10">
            <TabsTrigger value="atual" className="text-sm">Lista atual</TabsTrigger>
            <TabsTrigger value="historico" className="text-sm">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="atual" className="space-y-6 mt-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                {current ? (
                  <>
                    Última atualização:{" "}
                    <strong className="text-foreground">
                      {new Date(current.processado_em).toLocaleString("pt-BR")}
                    </strong>{" "}
                    · arquivo{" "}
                    <span className="font-mono text-xs">
                      {current.nome_arquivo}
                    </span>
                  </>
                ) : loadingCurrent ? (
                  "Carregando lista atual..."
                ) : (
                  "Nenhum relatório enviado ainda."
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await refreshCurrent();
                    setHistoryKey((k) => k + 1);
                    toast.success("Dados atualizados");
                  }}
                  disabled={loadingCurrent}
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${loadingCurrent ? "animate-spin" : ""}`} />
                  Atualizar agora
                </Button>
                <Button
                  variant={showUpload ? "ghost" : "default"}
                  size="sm"
                  onClick={() => setShowUpload((v) => !v)}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  {showUpload ? "Cancelar" : current ? "Atualizar lista" : "Enviar PDF"}
                </Button>
              </div>
            </div>

            {(showUpload || !current) && !loadingCurrent && (
              <div className="space-y-3">
                {current && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                      Ao enviar um novo PDF, a lista atual será{" "}
                      <strong>substituída integralmente</strong>. O relatório
                      anterior permanece disponível na aba Histórico, e os
                      números de processo judicial cadastrados continuam salvos
                      por morador.
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

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Não foi possível processar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loadingCurrent ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : debtors.length > 0 ? (
              <>
                <DashboardOverview
                  debtors={debtors}
                  fileName={current?.nome_arquivo}
                />
                
                <DebtorsTable debtors={debtors} />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <ReportsHistory refreshKey={historyKey} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
