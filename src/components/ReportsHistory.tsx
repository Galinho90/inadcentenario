import { useEffect, useState } from "react";
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
import { Trash2, FileText, Loader2 } from "lucide-react";
import { deleteReport } from "@/lib/reportsRepo";
import { formatBRL } from "@/lib/pdfParser";
import { useReports, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ReportsHistory() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading, error } = useReports();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (error) toast.error("Falha ao carregar histórico");
  }, [error]);

  async function handleDelete(id: string) {
    if (!confirm("Apagar este relatório do histórico?")) return;
    setDeletingId(id);
    try {
      await deleteReport(id);
      // Atualização otimista via cache
      qc.setQueryData(queryKeys.reports, (prev: typeof reports | undefined) =>
        (prev ?? []).filter((r) => r.id !== id)
      );
      toast.success("Relatório apagado");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao apagar");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
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
            <TableHead className="w-20 text-center">Ações</TableHead>
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
              <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    title="Apagar relatório"
                    className="text-muted-foreground hover:text-destructive"
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
