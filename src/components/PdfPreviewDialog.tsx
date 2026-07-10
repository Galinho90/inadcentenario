import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Receipt,
  Columns3,
  FileSearch,
  Loader2,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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

function StatCard({
  icon: Icon,
  label,
  value,
  ok,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  ok: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 flex items-start gap-3 transition-colors",
        ok
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-lg grid place-items-center shrink-0",
          ok
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </p>
          {ok ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
        </div>
        <p className="text-lg font-display font-semibold leading-tight mt-0.5">
          {value}
        </p>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
  count,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  count?: number | string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h4 className="text-sm font-semibold tracking-tight">{children}</h4>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">· {count}</span>
      )}
    </div>
  );
}

export function PdfPreviewDialog({
  open,
  preview,
  fileName,
  confirming,
  onConfirm,
  onCancel,
}: Props) {
  const allOk =
    preview &&
    !!preview.titulo &&
    !!preview.colunas &&
    preview.unidades.length > 0 &&
    preview.boletos.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !confirming && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-b from-muted/40 to-transparent">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <FileSearch className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">Prévia do PDF</DialogTitle>
                {preview && (
                  <Badge
                    variant={allOk ? "default" : "secondary"}
                    className={cn(
                      "gap-1 font-normal",
                      allOk
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
                    )}
                  >
                    {allOk ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Formato válido
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3" /> Verifique os avisos
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <DialogDescription className="mt-1 flex items-center gap-1.5 min-w-0">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-xs truncate">{fileName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 space-y-6">
          {preview && (
            <>
              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={FileText}
                  label="Título"
                  value={preview.titulo ? "OK" : "—"}
                  ok={!!preview.titulo}
                  hint={preview.titulo ?? "não encontrado"}
                />
                <StatCard
                  icon={Columns3}
                  label="Colunas"
                  value={preview.colunas ? "OK" : "—"}
                  ok={!!preview.colunas}
                  hint={preview.colunas ? "cabeçalho detectado" : "não detectado"}
                />
                <StatCard
                  icon={Users}
                  label="Unidades"
                  value={preview.unidades.length}
                  ok={preview.unidades.length > 0}
                  hint="na amostra"
                />
                <StatCard
                  icon={Receipt}
                  label="Boletos"
                  value={preview.boletos.length}
                  ok={preview.boletos.length > 0}
                  hint="na amostra"
                />
              </div>

              {/* Column header raw */}
              {preview.colunas && (
                <div className="rounded-lg border bg-muted/30 px-3.5 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                    Cabeçalho detectado
                  </p>
                  <p className="text-xs font-mono break-all">{preview.colunas}</p>
                </div>
              )}

              {/* Unidades */}
              {preview.unidades.length > 0 && (
                <div>
                  <SectionTitle icon={Users} count={preview.unidades.length}>
                    Primeiras unidades
                  </SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.unidades.map((u, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 rounded-full border bg-card pl-1 pr-3 py-1 text-sm"
                      >
                        <span className="rounded-full bg-primary/10 text-primary text-[11px] font-mono font-semibold px-2 py-0.5">
                          {u.unidade}
                        </span>
                        <span className="truncate max-w-[200px]">{u.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boletos */}
              {preview.boletos.length > 0 && (
                <div>
                  <SectionTitle icon={Receipt} count={preview.boletos.length}>
                    Primeiros boletos
                  </SectionTitle>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Vencimento</th>
                            <th className="px-3 py-2 text-left font-medium">Atraso</th>
                            <th className="px-3 py-2 text-left font-medium">Código</th>
                            <th className="px-3 py-2 text-right font-medium">Principal</th>
                            <th className="px-3 py-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.boletos.map((b, i) => (
                            <tr
                              key={i}
                              className="border-t hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2 font-mono">{b.vencimento}</td>
                              <td className="px-3 py-2">
                                <Badge
                                  variant="secondary"
                                  className="font-normal text-[11px] h-5"
                                >
                                  {b.atraso}d
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-muted-foreground text-xs">
                                {b.codigo}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatBRL(b.principal)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-semibold">
                                {formatBRL(b.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample text */}
              <div>
                <SectionTitle
                  icon={ScrollText}
                  count={`primeiras linhas de ${preview.totalLinhas}`}
                >
                  Amostra do texto extraído
                </SectionTitle>
                <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/40">
                    <div className="h-2 w-2 rounded-full bg-red-400/60" />
                    <div className="h-2 w-2 rounded-full bg-amber-400/60" />
                    <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                    <span className="ml-2 text-[10px] text-muted-foreground font-mono">
                      texto.txt
                    </span>
                  </div>
                  <pre className="p-3.5 text-xs font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                    {preview.amostraTexto}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Ao confirmar, a lista atual será substituída pelos dados deste PDF.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={confirming}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={confirming || !preview}
              className="min-w-[180px]"
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Confirmar e importar
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
