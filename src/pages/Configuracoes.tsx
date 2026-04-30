import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gavel, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_SETTINGS,
  saveJudicialSettings,
  useJudicialSettings,
} from "@/lib/settings";
import { toast } from "sonner";

const Configuracoes = () => {
  const current = useJudicialSettings();
  const [minBoletos, setMinBoletos] = useState<number>(current.minBoletos);
  const [minAtrasoDias, setMinAtrasoDias] = useState<number>(current.minAtrasoDias);

  const dirty =
    minBoletos !== current.minBoletos || minAtrasoDias !== current.minAtrasoDias;

  function handleSave() {
    if (minBoletos < 1 || minBoletos > 99) {
      toast.error("Mínimo de boletos deve estar entre 1 e 99");
      return;
    }
    if (minAtrasoDias < 0 || minAtrasoDias > 3650) {
      toast.error("Dias de atraso deve estar entre 0 e 3650");
      return;
    }
    saveJudicialSettings({ minBoletos, minAtrasoDias });
    toast.success("Configurações salvas");
  }

  function handleReset() {
    setMinBoletos(DEFAULT_SETTINGS.minBoletos);
    setMinAtrasoDias(DEFAULT_SETTINGS.minAtrasoDias);
    saveJudicialSettings(DEFAULT_SETTINGS);
    toast.success("Configurações restauradas");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container py-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina os critérios usados para sinalizar moradores como passíveis de
            cobrança judicial.
          </p>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-destructive" />
              Critério de cobrança judicial
            </CardTitle>
            <CardDescription>
              Um morador será marcado como{" "}
              <strong className="text-destructive">Judicial</strong> quando tiver
              pelo menos <strong>{minBoletos}</strong> boletos com mais de{" "}
              <strong>{minAtrasoDias}</strong> dias de atraso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="minBoletos">Mínimo de boletos atrasados</Label>
              <Input
                id="minBoletos"
                type="number"
                min={1}
                max={99}
                value={minBoletos}
                onChange={(e) => setMinBoletos(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Quantidade mínima de boletos vencidos para considerar judicial
                (entre 1 e 99).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAtrasoDias">Dias mínimos de atraso por boleto</Label>
              <Input
                id="minAtrasoDias"
                type="number"
                min={0}
                max={3650}
                value={minAtrasoDias}
                onChange={(e) => setMinAtrasoDias(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Apenas boletos com atraso superior a este valor (em dias) serão
                contados no critério.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar padrão
              </Button>
              <Button onClick={handleSave} disabled={!dirty}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Configuracoes;
