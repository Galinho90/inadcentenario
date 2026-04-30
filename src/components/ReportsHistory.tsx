import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, FileText, Eye, Loader2 } from "lucide-react";
import { listReports, deleteReport, type ReportSummary } from "@/lib/reportsRepo";
import { formatBRL } from "@/lib/pdfParser";
import { toast } from "sonner";

interface Props {
  refreshKey: number;
}

export function ReportsHistory({ refreshKey }: Props) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setReports(await listReports());
    } catch (e) {
      console.error(e);
      toast.error("Falha ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function handleDelete(id: string) {
    if (!confirm("Apagar este relatório do histórico?")) return;
    setDeletingId(id);
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Relatório apagado");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao apagar");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando histórico...
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Nenhum relatório salvo ainda. Envie um PDF para começar.
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Arquivo</TableHead>
            <TableHead>Processado em</TableHead>
            <TableHead className="text-center">Inadimplentes</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-32 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium truncate max-w-xs">
                {r.nome_arquivo}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(r.processado_em).toLocaleString("pt-BR")}
              </TableCell>
              <TableCell className="text-center">{r.quantidade_inadimplentes}</TableCell>
              <TableCell className="text-right font-medium">
                {formatBRL(r.total_geral)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="Abrir"
                  >
                    <Link to={`/relatorio/${r.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    title="Apagar"
                  >
                    {deletingId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
