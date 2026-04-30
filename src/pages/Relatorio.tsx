import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardOverview } from "@/components/DashboardOverview";
import { DebtorsTable } from "@/components/DebtorsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadReport, type ReportSummary } from "@/lib/reportsRepo";
import { type Debtor } from "@/lib/pdfParser";
import { toast } from "sonner";

const Relatorio = () => {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"lista" | "ranking">("lista");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { summary, debtors } = await loadReport(id);
        setSummary(summary);
        setDebtors(debtors);
      } catch (e) {
        console.error(e);
        setError("Não foi possível carregar este relatório.");
        toast.error("Falha ao carregar relatório");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container py-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {summary?.nome_arquivo ?? "Relatório"}
            </h1>
            {summary && (
              <p className="text-sm text-muted-foreground mt-1">
                Processado em{" "}
                {new Date(summary.processado_em).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando relatório...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <DashboardOverview debtors={debtors} fileName={summary?.nome_arquivo} />

            <Tabs value={tab} onValueChange={(v) => setTab(v as "lista" | "ranking")}>
              <TabsList>
                <TabsTrigger value="lista">Lista</TabsTrigger>
                <TabsTrigger value="ranking">
                  <Trophy className="h-3.5 w-3.5 mr-1.5" />
                  Ranking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lista" className="mt-6">
                <DebtorsTable debtors={debtors} mode="lista" hideTabs />
              </TabsContent>

              <TabsContent value="ranking" className="mt-6">
                <DebtorsTable debtors={debtors} mode="ranking" hideTabs />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Relatorio;
