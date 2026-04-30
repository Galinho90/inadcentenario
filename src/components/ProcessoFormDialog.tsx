import { useEffect, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  deleteProcesso,
  upsertProcesso,
  type ProcessoJudicial,
} from "@/lib/processosRepo";
import type { Debtor } from "@/lib/pdfParser";
import { toast } from "sonner";

interface Props {
  debtor: Debtor | null;
  existing?: ProcessoJudicial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ProcessoFormDialog({
  debtor,
  existing,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [numero, setNumero] = useState("");
  const [obs, setObs] = useState("");
  const [migradoEproc, setMigradoEproc] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNumero(existing?.numero_processo ?? "");
      setObs(existing?.observacoes ?? "");
      setMigradoEproc(existing?.migrado_eproc ?? false);
    }
  }, [open, existing]);

  async function handleSave() {
    if (!debtor) return;
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
        unidade: debtor.unidade,
        nome: debtor.nome,
        numero_processo: trimmed,
        observacoes: obs.trim().slice(0, 500) || null,
        migrado_eproc: migradoEproc,
      });
      toast.success("Processo registrado");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao salvar processo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!debtor) return;
    setSaving(true);
    try {
      await deleteProcesso(debtor.unidade, debtor.nome);
      toast.success("Processo removido");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao remover");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {debtor && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                {existing ? "Editar processo judicial" : "Adicionar processo judicial"}
              </DialogTitle>
              <DialogDescription>
                Unidade <span className="font-mono">{debtor.unidade}</span> ·{" "}
                {debtor.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="proc-numero">Número do processo *</Label>
                <Input
                  id="proc-numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="ex: 0001234-56.2026.8.26.0100"
                  maxLength={100}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proc-obs">Observações (opcional)</Label>
                <Textarea
                  id="proc-obs"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Vara, advogado, andamento..."
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {existing && (
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
                onClick={() => onOpenChange(false)}
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
  );
}
