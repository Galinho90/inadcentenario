import { useEffect, useMemo, useState } from "react";
import { Gavel, AlertTriangle, Scale, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { type Debtor, formatBRL } from "@/lib/pdfParser";
import {
  countOverdueBoletos,
  deleteProcesso,
  indexByKey,
  isJudicial,
  listProcessos,
  upsertProcesso,
  type ProcessoJudicial,
} from "@/lib/processosRepo";
import { useJudicialSettings } from "@/lib/settings";
import { toast } from "sonner";

interface Props {
  debtors: Debtor[];
  /** Quando true permite adicionar/editar número de processo (relatórios salvos). */
  editable?: boolean;
}

export function JudicialAlert({ debtors, editable = false }: Props) {
  const settings = useJudicialSettings();
  const [processos, setProcessos] = useState<ProcessoJudicial[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Debtor | null>(null);
  const [numero, setNumero] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const elegiveis = useMemo(() => {
    return debtors
      .filter((d) => isJudicial(d, settings))
      .sort((a, b) => b.total - a.total);
  }, [debtors, settings]);

  const map = useMemo(() => indexByKey(processos), [processos]);

  async function refresh() {
    setLoading(true);
    try {
      setProcessos(await listProcessos());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openEdit(d: Debtor) {
    const existing = map.get(`${d.unidade}|${d.nome}`);
    setEditing(d);
    setNumero(existing?.numero_processo ?? "");
    setObs(existing?.observacoes ?? "");
  }

  async function handleSave() {
    if (!editing) return;
    const trimmed = numero.trim();
    if (!trimmed) {
      toast.error("Informe o número do processo");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("Número muito longo");
      return;
    }
    setSaving(true);
    try {
      await upsertProcesso({
        unidade: editing.unidade,
        nome: editing.nome,
        numero_processo: trimmed,
        observacoes: obs.trim().slice(0, 500) || null,
      });
      toast.success("Processo registrado");
      setEditing(null);
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao salvar processo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    try {
      await deleteProcesso(editing.unidade, editing.nome);
      toast.success("Processo removido");
      setEditing(null);
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover");
    } finally {
      setSaving(false);
    }
  }

  if (elegiveis.length === 0) return null;

  const totalDevido = elegiveis.reduce((s, d) => s + d.total, 0);
  const comProcesso = elegiveis.filter((d) =>
    map.has(`${d.unidade}|${d.nome}`)
  ).length;

  return (
    <>
      <Alert variant="destructive" className="border-destructive/40 bg-destructive/5">
        <Gavel className="h-5 w-5" />
        <AlertTitle className="flex items-center gap-2 flex-wrap">
          Cobrança judicial recomendada
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {elegiveis.length}{" "}
            {elegiveis.length === 1 ? "morador" : "moradores"}
          </Badge>
          {editable && comProcesso > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {comProcesso} com processo
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="space-y-3 mt-2">
          <p className="text-sm">
            Critério: <strong>{settings.minBoletos}+ boletos</strong> com mais de{" "}
            <strong>{settings.minAtrasoDias} dias</strong> de atraso. Total
            envolvido:{" "}
            <strong className="text-foreground">{formatBRL(totalDevido)}</strong>.
          </p>

          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Carregando processos...
            </div>
          ) : (
            <ul className="space-y-2">
              {elegiveis.map((d) => {
                const proc = map.get(`${d.unidade}|${d.nome}`);
                const overdue = countOverdueBoletos(d);
                return (
                  <li
                    key={`${d.unidade}-${d.nome}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-background/60 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {d.unidade}
                        </span>
                        <span className="font-medium truncate">{d.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {overdue} boletos +{JUDICIAL_MIN_ATRASO_DIAS}d
                        </Badge>
                      </div>
                      {proc ? (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          Processo:{" "}
                          <span className="font-mono text-foreground">
                            {proc.numero_processo}
                          </span>
                        </p>
                      ) : editable ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sem processo registrado
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">
                        {formatBRL(d.total)}
                      </span>
                      {editable && (
                        <Button
                          size="sm"
                          variant={proc ? "outline" : "destructive"}
                          onClick={() => openEdit(d)}
                        >
                          <Scale className="h-3.5 w-3.5 mr-1" />
                          {proc ? "Editar" : "Adicionar"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!editable && (
            <p className="text-xs text-muted-foreground">
              Salve este relatório no histórico para registrar o número do
              processo judicial de cada morador.
            </p>
          )}
        </AlertDescription>
      </Alert>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Processo judicial
                </DialogTitle>
                <DialogDescription>
                  Unidade <span className="font-mono">{editing.unidade}</span> ·{" "}
                  {editing.nome}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número do processo *</Label>
                  <Input
                    id="numero"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="ex: 0001234-56.2026.8.26.0100"
                    maxLength={100}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Observações (opcional)</Label>
                  <Textarea
                    id="obs"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Vara, advogado, andamento..."
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {map.has(`${editing.unidade}|${editing.nome}`) && (
                  <Button
                    variant="ghost"
                    onClick={handleDelete}
                    disabled={saving}
                    className="mr-auto text-destructive hover:text-destructive"
                  >
                    Remover
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
