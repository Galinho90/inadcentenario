import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Gavel, AlertTriangle, Scale } from "lucide-react";
import { Debtor, formatBRL } from "@/lib/pdfParser";
import {
  countOverdueBoletos,
  indexByKey,
  isJudicial,
  listProcessos,
  type ProcessoJudicial,
} from "@/lib/processosRepo";
import { useJudicialSettings } from "@/lib/settings";
import { ProcessoFormDialog } from "./ProcessoFormDialog";

interface Props {
  debtors: Debtor[];
  /** Quando informado, oculta as abas internas e usa este modo. */
  mode?: Mode;
  /** Quando true, oculta as abas internas (útil quando o pai controla o modo). */
  hideTabs?: boolean;
}

type Mode = "lista" | "ranking";

export function DebtorsTable({ debtors, mode: modeProp, hideTabs }: Props) {
  const settings = useJudicialSettings();
  const [search, setSearch] = useState("");
  const [minValue, setMinValue] = useState("");
  const [internalMode, setInternalMode] = useState<Mode>("lista");
  const mode = modeProp ?? internalMode;
  const [selected, setSelected] = useState<Debtor | null>(null);
  const [processos, setProcessos] = useState<ProcessoJudicial[]>([]);
  const [editingProc, setEditingProc] = useState<Debtor | null>(null);

  const procMap = useMemo(() => indexByKey(processos), [processos]);

  const refreshProcessos = useCallback(async () => {
    try {
      setProcessos(await listProcessos());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refreshProcessos();
  }, [refreshProcessos]);

  const filtered = useMemo(() => {
    const min = parseFloat(minValue.replace(",", ".")) || 0;
    let list = debtors.filter(
      (d) =>
        d.total >= min &&
        (d.nome.toLowerCase().includes(search.toLowerCase()) ||
          d.unidade.includes(search))
    );
    if (mode === "ranking") {
      list = [...list].sort((a, b) => b.total - a.total);
    }
    return list;
  }, [debtors, search, minValue, mode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {hideTabs ? (
          <div />
        ) : (
          <Tabs value={mode} onValueChange={(v) => setInternalMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="lista">Lista completa</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou unidade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Valor mínimo (R$)"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Boletos</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d, i) => {
                const judicial = isJudicial(d, settings);
                const overdueCount = countOverdueBoletos(d, settings.minAtrasoDias);
                const proc = procMap.get(`${d.unidade}|${d.nome}`);
                const isJudicialAtivo = judicial && !!proc;
                const podeCobrar = judicial && !proc;
                return (
                <TableRow
                  key={`${d.unidade}-${d.nome}-${i}`}
                  className={
                    "cursor-pointer hover:bg-accent/60 " +
                    (isJudicialAtivo
                      ? "bg-destructive/5 hover:bg-destructive/10"
                      : podeCobrar
                      ? "bg-warning/5 hover:bg-warning/10"
                      : "")
                  }
                  onClick={() => setSelected(d)}
                >
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono">{d.unidade}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{d.nome}</span>
                      {isJudicialAtivo && (
                        <Badge
                          className="gap-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          title={`Processo ${proc!.numero_processo}`}
                        >
                          <Gavel className="h-3 w-3" />
                          Judicial
                        </Badge>
                      )}
                      {podeCobrar && (
                        <>
                          <Badge
                            className="gap-1 bg-warning text-warning-foreground hover:bg-warning/90 animate-pulse"
                            title={`${overdueCount} boletos com mais de ${settings.minAtrasoDias} dias`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Cobrar judicial
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProc(d);
                            }}
                          >
                            <Scale className="h-3 w-3 mr-1" />
                            Adicionar processo
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        isJudicialAtivo
                          ? "destructive"
                          : podeCobrar
                          ? "outline"
                          : "secondary"
                      }
                      className={podeCobrar ? "border-warning text-warning" : ""}
                    >
                      {d.boletos.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(d.total)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Exibindo {filtered.length} de {debtors.length} registros — clique em uma linha
        para ver os boletos
      </p>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          {selected && (
            <>
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>{selected.nome}</DialogTitle>
                <DialogDescription className="flex items-center justify-between gap-4">
                  <span>
                    Unidade <span className="font-mono">{selected.unidade}</span> ·{" "}
                    {selected.boletos.length}{" "}
                    {selected.boletos.length === 1 ? "boleto" : "boletos"}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatBRL(selected.total)}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-6 pt-4 space-y-4">
                  {isJudicial(selected, settings) && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                      <div className="rounded-full bg-destructive/20 p-2">
                        <Gavel className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-destructive">
                            Passível de cobrança judicial
                          </h4>
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {countOverdueBoletos(selected, settings.minAtrasoDias)} boletos +
                            {settings.minAtrasoDias}d
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Este morador acumula{" "}
                          <strong>
                            {countOverdueBoletos(selected, settings.minAtrasoDias)}
                          </strong>{" "}
                          boletos com mais de {settings.minAtrasoDias} dias de
                          atraso, totalizando{" "}
                          <strong className="text-foreground">
                            {formatBRL(selected.total)}
                          </strong>
                          . Recomenda-se o encaminhamento para cobrança judicial
                          conforme convenção do condomínio.
                        </p>
                      </div>
                    </div>
                  )}
                  {selected.boletos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum boleto detalhado encontrado para este morador.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-center">Atraso</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.boletos.map((b, i) => (
                          <TableRow key={`${b.codigo}-${i}`}>
                            <TableCell className="font-mono text-xs">
                              {b.vencimento}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={b.atraso > 90 ? "destructive" : "secondary"}
                                className="font-mono"
                              >
                                {b.atraso}d
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {b.codigo}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatBRL(b.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
