import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { PdfPreview } from "@/lib/pdfParser";
import { formatBRL } from "@/lib/pdfParser";

interface Props {
  open: boolean;
  preview: PdfPreview | null;
  fileName: string;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function Marker({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
      )}
      <span>{label}</span>
    </div>
  );
}

export function PdfPreviewDialog({ open, preview, fileName, confirming, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !confirming && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prévia do PDF</DialogTitle>
          <DialogDescription>
            Confira o conteúdo detectado em <span className="font-mono">{fileName}</span> antes de importar.
          </DialogDescription>
        </DialogHeader>

        {preview && (
          <div className="space-y-5">
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <Marker ok={!!preview.titulo} label={preview.titulo ? `Título: "${preview.titulo}"` : "Título 'Inadimplentes' não encontrado"} />
              <Marker ok={!!preview.colunas} label={preview.colunas ? "Cabeçalho de colunas detectado" : "Cabeçalho de colunas não detectado"} />
              <Marker ok={preview.unidades.length > 0} label={`${preview.unidades.length} unidade(s) detectada(s) na amostra`} />
              <Marker ok={preview.boletos.length > 0} label={`${preview.boletos.length} boleto(s) detectado(s) na amostra`} />
              {preview.colunas && (
                <p className="text-xs text-muted-foreground font-mono pt-1 break-all">{preview.colunas}</p>
              )}
            </div>

            {preview.unidades.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Primeiras unidades</h4>
                <div className="flex flex-wrap gap-2">
                  {preview.unidades.map((u, i) => (
                    <Badge key={i} variant="secondary" className="font-normal">
                      <span className="font-mono mr-1.5">{u.unidade}</span> {u.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {preview.boletos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Primeiros boletos</h4>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Vencimento</th>
                        <th className="px-3 py-2 text-left">Atraso</th>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-right">Principal</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.boletos.map((b, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 font-mono">{b.vencimento}</td>
                          <td className="px-3 py-2">{b.atraso}d</td>
                          <td className="px-3 py-2 font-mono">{b.codigo}</td>
                          <td className="px-3 py-2 text-right">{formatBRL(b.principal)}</td>
                          <td className="px-3 py-2 text-right">{formatBRL(b.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2">
                Amostra do texto extraído{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (primeiras linhas de {preview.totalLinhas})
                </span>
              </h4>
              <pre className="rounded-md border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {preview.amostraTexto}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={confirming}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={confirming || !preview}>
            {confirming && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Confirmar e importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
