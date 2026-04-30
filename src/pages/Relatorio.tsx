import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatsCards } from "@/components/StatsCards";
import { DebtorsTable } from "@/components/DebtorsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadReport, type ReportSummary } from "@/lib/reportsRepo";
import { formatBRL, type Debtor } from "@/lib/pdfParser";
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

  const total = useMemo(() => debtors.reduce((acc, d) => acc + d.total, 0), [debtors]);
  const top5 = useMemo(
    () => [...debtors].sort((a, b) => b.total - a.total).slice(0, 5),
    [debtors]
  );

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
            <StatsCards total={total} count={debtors.length} />

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

              <TabsContent value="ranking" className="mt-6 space-y-6">
                {top5.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-3">
                      <Trophy className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">
                        Top 5 maiores devedores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {top5.map((d, i) => (
                          <li
                            key={`${d.unidade}-${d.nome}`}
                            className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                {d.unidade}
                              </span>
                              <span className="truncate">{d.nome}</span>
                            </div>
                            <span className="font-medium shrink-0">
                              {formatBRL(d.total)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                )}

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
