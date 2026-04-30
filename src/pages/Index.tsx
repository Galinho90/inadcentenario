import { useMemo, useState } from "react";
import { PdfDropzone } from "@/components/PdfDropzone";
import { StatsCards } from "@/components/StatsCards";
import { DebtorsTable } from "@/components/DebtorsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { parseDebtors, type Debtor } from "@/lib/pdfParser";
import { extractTextFromPdf } from "@/lib/pdfLoader";
import { toast } from "sonner";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => debtors.reduce((acc, d) => acc + d.total, 0),
    [debtors]
  );

  async function handleFile(f: File) {
    setFile(f);
    setLoading(true);
    setError(null);
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

  function reset() {
    setFile(null);
    setDebtors([]);
    setError(null);
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

      <main className="container py-8 space-y-8">
        <PdfDropzone
          onFile={handleFile}
          fileName={file?.name ?? null}
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
            <StatsCards total={total} count={debtors.length} />
            <DebtorsTable debtors={debtors} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
