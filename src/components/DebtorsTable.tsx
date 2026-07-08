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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, ChevronRight, Gavel, AlertTriangle, Scale, FileWarning } from "lucide-react";
import { Debtor, formatBRL, getBoletoAtraso } from "@/lib/pdfParser";
import {
  countOverdueBoletos,
  indexByKey,
  isExtrajudicial,
  isJudicial,
  listProcessos,
  type ProcessoJudicial,
} from "@/lib/processosRepo";
import { useJudicialSettings } from "@/lib/settings";
import { ProcessoFormDialog } from "./ProcessoFormDialog";

interface Props {
  debtors: Debtor[];
}

type CobrancaFilter = "todos" | "judicial" | "extrajudicial";

export function DebtorsTable({ debtors }: Props) {
  const settings = useJudicialSettings();
  const [search, setSearch] = useState("");
  const [minValue, setMinValue] = useState("");
  const [cobrancaFilter, setCobrancaFilter] = useState<CobrancaFilter>("todos");
  const [minBoletos, setMinBoletos] = useState("");
  const [maxBoletos, setMaxBoletos] = useState("");
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
    const minB = parseInt(minBoletos, 10);
    const maxB = parseInt(maxBoletos, 10);
    let list = debtors.filter(
      (d) =>
        d.total >= min &&
        (d.nome.toLowerCase().includes(search.toLowerCase()) ||
          d.unidade.includes(search))
    );

    if (cobrancaFilter !== "todos") {
      list = list.filter((d) => {
        const proc = procMap.get(`${d.unidade}|${d.nome}`);
        const judicial = isJudicial(d, settings);
        const extrajudicial = isExtrajudicial(d, settings);
        if (cobrancaFilter === "judicial") {
          return (proc && proc.tipo === "judicial") || (judicial && !proc);
        }
        return (proc && proc.tipo === "extrajudicial") || (extrajudicial && !proc);
      });
    }

    if (!isNaN(minB) || !isNaN(maxB)) {
      list = list.filter((d) => {
        const count = d.boletos.length;
        if (!isNaN(minB) && count < minB) return false;
        if (!isNaN(maxB) && count > maxB) return false;
        return true;
      });
    }

    return list;
  }, [debtors, search, minValue, cobrancaFilter, procMap, settings, minBoletos, maxBoletos]);

  const judicialCount = useMemo(() => {
    return debtors.filter((d) => {
      const proc = procMap.get(`${d.unidade}|${d.nome}`);
      return (proc && proc.tipo === "judicial") || isJudicial(d, settings);
    }).length;
  }, [debtors, procMap, settings]);

  const extrajudicialCount = useMemo(() => {
    return debtors.filter((d) => {
      const proc = procMap.get(`${d.unidade}|${d.nome}`);
      return (proc && proc.tipo === "extrajudicial") || isExtrajudicial(d, settings);
    }).length;
  }, [debtors, procMap, settings]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-wrap items-center">
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
          <Select value={cobrancaFilter} onValueChange={(v) => setCobrancaFilter(v as CobrancaFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo cobrança" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="judicial">Judicial</SelectItem>
              <SelectItem value="extrajudicial">Extrajudicial</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            placeholder="Min. boletos atrasados"
            value={minBoletos}
            onChange={(e) => setMinBoletos(e.target.value)}
            className="w-44"
          />
          <Input
            type="number"
            min={0}
            placeholder="Máx. boletos atrasados"
            value={maxBoletos}
            onChange={(e) => setMaxBoletos(e.target.value)}
            className="w-44"
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive font-semibold">
              <Gavel className="h-3 w-3" />
              {judicialCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-orange-500 font-semibold">
              <FileWarning className="h-3 w-3" />
              {extrajudicialCount}
            </span>
          </div>
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
                const extrajudicial = isExtrajudicial(d, settings);
                const overdueCount = countOverdueBoletos(d, settings.minAtrasoDias);
                const proc = procMap.get(`${d.unidade}|${d.nome}`);
                const isJudicialAtivo = !!proc && proc.tipo === "judicial";
                const isExtrajudicialAtivo = !!proc && proc.tipo === "extrajudicial";
                const podeCobrarJudicial = judicial && !proc;
                const podeCobrarExtrajudicial = extrajudicial && !proc;
                return (
                <TableRow
                  key={`${d.unidade}-${d.nome}-${i}`}
                  className={
                    "cursor-pointer hover:bg-accent/60 " +
                    (isJudicialAtivo
                      ? "bg-destructive/5 hover:bg-destructive/10"
                      : isExtrajudicialAtivo
                      ? "bg-orange-500/5 hover:bg-orange-500/10"
                      : podeCobrarJudicial
                      ? "bg-warning/5 hover:bg-warning/10"
                      : podeCobrarExtrajudicial
                      ? "bg-orange-500/5 hover:bg-orange-500/10"
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
                        <>
                          <Badge
                            className="gap-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            title={`Processo ${proc!.numero_processo}`}
                          >
                            <Gavel className="h-3 w-3" />
                            Judicial
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {proc!.numero_processo}
                          </span>
                        </>
                      )}
                      {isExtrajudicialAtivo && (
                        <>
                          <Badge
                            className="gap-1 bg-orange-500 text-white hover:bg-orange-600"
                            title={`Cobrança extrajudicial - ${proc!.numero_processo}`}
                          >
                            <FileWarning className="h-3 w-3" />
                            Extrajudicial
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {proc!.numero_processo}
                          </span>
                        </>
                      )}
                      {podeCobrarJudicial && (
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
                      {podeCobrarExtrajudicial && (
                        <>
                          <Badge
                            className="gap-1 bg-orange-500/80 text-white hover:bg-orange-500 animate-pulse"
                            title={`${overdueCount} boleto(s) com mais de ${settings.minAtrasoDias} dias`}
                          >
                            <FileWarning className="h-3 w-3" />
                            Cobrar extrajudicial
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
                            <FileWarning className="h-3 w-3 mr-1" />
                            Adicionar cobrança
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
                          : isExtrajudicialAtivo
                          ? "outline"
                          : podeCobrarJudicial
                          ? "outline"
                          : "secondary"
                      }
                      className={
                        isExtrajudicialAtivo
                          ? "border-orange-500 text-orange-500"
                          : podeCobrarJudicial
                          ? "border-warning text-warning"
                          : ""
                      }
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
                  {(() => {
                    const proc = procMap.get(`${selected.unidade}|${selected.nome}`);
                    const judicial = isJudicial(selected, settings);
                    const extrajudicial = isExtrajudicial(selected, settings);
                    const isJudicialAtivo = !!proc && proc.tipo === "judicial";
                    const isExtrajudicialAtivo = !!proc && proc.tipo === "extrajudicial";
                    const podeCobrarJudicial = judicial && !proc;
                    const podeCobrarExtrajudicial = extrajudicial && !proc;

                    if (!isJudicialAtivo && !isExtrajudicialAtivo && !podeCobrarJudicial && !podeCobrarExtrajudicial) return null;

                    const ativo = isJudicialAtivo || isExtrajudicialAtivo;
                    const isExt = isExtrajudicialAtivo || podeCobrarExtrajudicial;
                    const colorClass = isJudicialAtivo ? "destructive" : isExt ? "orange-500" : "warning";

                    return (
                      <div
                        className={
                          "flex items-start gap-3 rounded-lg border p-4 " +
                          (isJudicialAtivo
                            ? "border-destructive/30 bg-destructive/10"
                            : isExt
                            ? "border-orange-500/30 bg-orange-500/10"
                            : "border-warning/40 bg-warning/10")
                        }
                      >
                        <div
                          className={
                            "rounded-full p-2 " +
                            (isJudicialAtivo
                              ? "bg-destructive/20"
                              : isExt
                              ? "bg-orange-500/20"
                              : "bg-warning/20")
                          }
                        >
                          {isExt ? (
                            <FileWarning className="h-5 w-5 text-orange-500" />
                          ) : (
                            <Gavel
                              className={
                                "h-5 w-5 " +
                                (isJudicialAtivo ? "text-destructive" : "text-warning")
                              }
                            />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={
                                "font-semibold " +
                                (isJudicialAtivo
                                  ? "text-destructive"
                                  : isExt
                                  ? "text-orange-500"
                                  : "text-warning")
                              }
                            >
                              {isJudicialAtivo
                                ? "Em cobrança judicial"
                                : isExtrajudicialAtivo
                                ? "Em cobrança extrajudicial"
                                : podeCobrarJudicial
                                ? "Cobrar judicialmente"
                                : "Cobrar extrajudicialmente"}
                            </h4>
                            <Badge
                              className={
                                "gap-1 " +
                                (isJudicialAtivo
                                  ? "bg-destructive text-destructive-foreground"
                                  : isExt
                                  ? "bg-orange-500 text-white"
                                  : "bg-warning text-warning-foreground")
                              }
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {countOverdueBoletos(selected, settings.minAtrasoDias)}{" "}
                              boletos +{settings.minAtrasoDias}d
                            </Badge>
                          </div>
                          {ativo ? (
                            <div className="text-sm space-y-2">
                              <p className="text-muted-foreground">
                                {isExt ? "Referência" : "Processo"}:{" "}
                                <strong className="font-mono text-foreground">
                                  {proc!.numero_processo}
                                </strong>
                              </p>
                              {proc!.chave_processo && (
                                <p className="text-muted-foreground">
                                  Chave:{" "}
                                  <strong className="font-mono text-foreground break-all">
                                    {proc!.chave_processo}
                                  </strong>
                                </p>
                              )}
                              {proc!.observacoes && (
                                <p className="text-xs text-muted-foreground">
                                  {proc!.observacoes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              {podeCobrarJudicial
                                ? "Este morador atende ao critério para cobrança judicial. Cadastre o número do processo para marcá-lo como Judicial."
                                : "Este morador possui boletos atrasados. Registre uma cobrança extrajudicial."}
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={ativo ? "outline" : "default"}
                              className={
                                ativo
                                  ? ""
                                  : podeCobrarJudicial
                                  ? "bg-warning text-warning-foreground hover:bg-warning/90"
                                  : "bg-orange-500 text-white hover:bg-orange-600"
                              }
                              onClick={() => setEditingProc(selected)}
                            >
                              <Scale className="h-3.5 w-3.5 mr-1.5" />
                              {ativo ? "Editar" : podeCobrarJudicial ? "Adicionar processo" : "Adicionar cobrança"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                                variant={getBoletoAtraso(b) > 90 ? "destructive" : "secondary"}
                                className="font-mono"
                              >
                                {getBoletoAtraso(b)}d
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

      <ProcessoFormDialog
        debtor={editingProc}
        existing={
          editingProc
            ? procMap.get(`${editingProc.unidade}|${editingProc.nome}`) ?? null
            : null
        }
        open={!!editingProc}
        onOpenChange={(o) => !o && setEditingProc(null)}
        onSaved={refreshProcessos}
      />
    </div>
  );
}
