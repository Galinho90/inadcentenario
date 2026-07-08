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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteProcesso,
  upsertProcesso,
  type ProcessoJudicial,
  type ProcessoTipo,
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
  const [chave, setChave] = useState("");
  const [obs, setObs] = useState("");
  const [tipo, setTipo] = useState<ProcessoTipo>("judicial");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNumero(existing?.numero_processo ?? "");
      setChave(existing?.chave_processo ?? "");
      setObs(existing?.observacoes ?? "");
      setTipo(existing?.tipo ?? "judicial");
    }
  }, [open, existing]);

  async function handleSave() {
    if (!debtor) return;
    const trimmed = numero.trim();
    if (!trimmed) {
      toast.error(tipo === "judicial" ? "Informe o número do processo" : "Informe a referência da cobrança");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("Número muito longo");
      return;
    }
    const chaveTrimmed = chave.trim();
    if (chaveTrimmed.length > 100) {
      toast.error("Chave muito longa");
      return;
    }
    setSaving(true);
    try {
      await upsertProcesso({
        unidade: debtor.unidade,
        nome: debtor.nome,
        numero_processo: trimmed,
        chave_processo: chaveTrimmed || null,
        observacoes: obs.trim().slice(0, 500) || null,
        tipo,
      });
      toast.success(tipo === "judicial" ? "Processo registrado" : "Cobrança extrajudicial registrada");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!debtor) return;
    setSaving(true);
    try {
      await deleteProcesso(debtor.unidade, debtor.nome);
      toast.success("Registro removido");
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
                {existing ? "Editar cobrança" : "Adicionar cobrança"}
              </DialogTitle>
              <DialogDescription>
                Unidade <span className="font-mono">{debtor.unidade}</span> ·{" "}
                {debtor.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="proc-tipo">Tipo de cobrança</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as ProcessoTipo)}>
                  <SelectTrigger id="proc-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="judicial">Judicial</SelectItem>
                    <SelectItem value="extrajudicial">Extrajudicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proc-numero">
                  {tipo === "judicial" ? "Número do processo *" : "Referência / protocolo *"}
                </Label>
                <Input
                  id="proc-numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder={
                    tipo === "judicial"
                      ? "ex: 0001234-56.2026.8.26.0100"
                      : "ex: NF-2026/001 ou protocolo"
                  }
                  maxLength={100}
                  autoFocus
                />
              </div>
              {tipo === "judicial" && (
                <div className="space-y-2">
                  <Label htmlFor="proc-chave">Chave do processo (opcional)</Label>
                  <Input
                    id="proc-chave"
                    value={chave}
                    onChange={(e) => setChave(e.target.value)}
                    placeholder="ex: chave de acesso do e-SAJ / PJe"
                    maxLength={100}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="proc-obs">Observações (opcional)</Label>
                <Textarea
                  id="proc-obs"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder={
                    tipo === "judicial"
                      ? "Vara, advogado, andamento..."
                      : "Cartório, notificação, prazo..."
                  }
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
