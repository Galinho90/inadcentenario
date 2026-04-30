import { useMemo, useState } from "react";
import { PdfDropzone } from "@/components/PdfDropzone";
import { StatsCards } from "@/components/StatsCards";
import { DebtorsTable } from "@/components/DebtorsTable";
import { ReportsHistory } from "@/components/ReportsHistory";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, Loader2 } from "lucide-react";
import { parseDebtors, type Debtor } from "@/lib/pdfParser";
import { extractTextFromPdf } from "@/lib/pdfLoader";
import { saveReport, loadReport } from "@/lib/reportsRepo";
import { toast } from "sonner";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [tab, setTab] = useState("atual");

  const total = useMemo(
    () => debtors.reduce((acc, d) => acc + d.total, 0),
    [debtors]
  );

  async function handleFile(f: File) {
    setFile(f);
    setFileName(f.name);
    setLoading(true);
    setError(null);
    setSavedId(null);
    try {
      const text = await extractTextFromPdf(f);
      const result = parseDebtors(text);
      if (result.length === 0) {
        setError(
          "Nenhuma unidade encontrada no padrão esperado (ex: '12 01' + nome + linha 'Total')."
        );
        setDebtors([]);
      } else {
        setDebtors(result);
        toast.success(`${result.length} inadimplentes identificados`);
      }
    } catch (e) {
      console.error(e);
      setError("Falha ao ler o PDF. Verifique se o arquivo não está corrompido.");
      setDebtors([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!fileName || debtors.length === 0) return;
    setSaving(true);
    try {
      const id = await saveReport({ nomeArquivo: fileName, debtors });
      setSavedId(id);
      setHistoryKey((k) => k + 1);
      toast.success("Relatório salvo no histórico");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao salvar relatório");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenFromHistory(id: string) {
    setLoading(true);
    setError(null);
    setFile(null);
    try {
      const { summary, debtors: d } = await loadReport(id);
      setFileName(summary.nome_arquivo);
      setDebtors(d);
      setSavedId(id);
      setTab("atual");
      toast.success(`Relatório "${summary.nome_arquivo}" carregado`);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao abrir relatório");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setFileName(null);
    setDebtors([]);
    setError(null);
    setSavedId(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container py-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Inadimplência — Leitor de PDF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie o relatório em PDF para extrair unidades, moradores e valores devidos.
          </p>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="atual">Relatório atual</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="atual" className="space-y-6 mt-6">
            <PdfDropzone
              onFile={handleFile}
              fileName={fileName}
              loading={loading}
              onReset={reset}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Não foi possível processar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {debtors.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <StatsCards total={total} count={debtors.length} />
                </div>

                {file && !savedId && (
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar no histórico
                    </Button>
                  </div>
                )}
                {savedId && (
                  <p className="text-xs text-muted-foreground text-right">
                    ✓ Relatório salvo no histórico
                  </p>
                )}

                <DebtorsTable debtors={debtors} />
              </>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <ReportsHistory onOpen={handleOpenFromHistory} refreshKey={historyKey} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
