import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { Search, ChevronRight, Gavel, AlertTriangle, Scale, FileWarning, CheckCircle2, CircleSlash, X, SlidersHorizontal } from "lucide-react";
import { Debtor, formatBRL, getBoletoAtraso } from "@/lib/pdfParser";
import {
  countOverdueBoletos,
  indexByKey,
  isExtrajudicial,
  isJudicial,
} from "@/lib/processosRepo";
import { useProcessos, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useJudicialSettings } from "@/lib/settings";
import { ProcessoFormDialog } from "./ProcessoFormDialog";
import { CopyButton } from "./CopyButton";

interface Props {
  debtors: Debtor[];
}

type CobrancaFilter = "todos" | "judicial" | "extrajudicial";
type ProcessoFilter = "todos" | "com" | "sem";

export function DebtorsTable({ debtors }: Props) {
  const settings = useJudicialSettings();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  
  const [cobrancaFilter, setCobrancaFilter] = useState<CobrancaFilter>("todos");
  const [processoFilter, setProcessoFilter] = useState<ProcessoFilter>("todos");
  const [minBoletos, setMinBoletos] = useState("");
  const [maxBoletos, setMaxBoletos] = useState("");
  const [selected, setSelected] = useState<Debtor | null>(null);
  const [editingProc, setEditingProc] = useState<Debtor | null>(null);

  // Cache compartilhado — deduplica request entre DebtorsTable e JudicialAlert
  const { data: processos = [] } = useProcessos();
  const procMap = useMemo(() => indexByKey(processos), [processos]);

  const refreshProcessos = useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.processos });
  }, [qc]);

  // Deferred: mantém UI responsiva enquanto o filtro pesado recomputa
  const deferredSearch = useDeferredValue(search);
  const searchLower = useMemo(() => deferredSearch.toLowerCase(), [deferredSearch]);

  // Índice pré-computado: evita `.toLowerCase()` por linha em cada keystroke
  const searchIndex = useMemo(
    () => debtors.map((d) => ({ d, nomeLower: d.nome.toLowerCase() })),
    [debtors]
  );

  const filtered = useMemo(() => {
    const minB = parseInt(minBoletos, 10);
    const maxB = parseInt(maxBoletos, 10);
    const hasBoletoRange = !isNaN(minB) || !isNaN(maxB);
    const hasSearch = searchLower.length > 0;

    let list: Debtor[] = [];
    for (const { d, nomeLower } of searchIndex) {
      if (hasSearch && !nomeLower.includes(searchLower) && !d.unidade.includes(searchLower)) continue;
      list.push(d);
    }

    if (cobrancaFilter !== "todos") {
      list = list.filter((d) => {
        const proc = procMap.get(`${d.unidade}|${d.nome}`);
        if (cobrancaFilter === "judicial") {
          return (proc && proc.tipo === "judicial") || (isJudicial(d, settings) && !proc);
        }
        return (proc && proc.tipo === "extrajudicial") || (isExtrajudicial(d, settings) && !proc);
      });
    }

    if (processoFilter !== "todos") {
      list = list.filter((d) => {
        const proc = procMap.get(`${d.unidade}|${d.nome}`);
        const isJudEligivel = (proc && proc.tipo === "judicial") || isJudicial(d, settings);
        if (!isJudEligivel) return false;
        const temNumero = !!proc?.numero_processo?.trim();
        return processoFilter === "com" ? temNumero : !temNumero;
      });
    }

    if (hasBoletoRange) {
      list = list.filter((d) => {
        const count = d.boletos.length;
        if (!isNaN(minB) && count < minB) return false;
        if (!isNaN(maxB) && count > maxB) return false;
        return true;
      });
    }

    return list;
  }, [searchIndex, searchLower, cobrancaFilter, processoFilter, procMap, settings, minBoletos, maxBoletos]);


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

  const activeFilterCount =
    (cobrancaFilter !== "todos" ? 1 : 0) +
    (processoFilter !== "todos" ? 1 : 0) +
    (minBoletos.trim() || maxBoletos.trim() ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setCobrancaFilter("todos");
    setProcessoFilter("todos");
    setMinBoletos("");
    setMaxBoletos("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Linha 1: busca + contadores + ações */}
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-3">
          <div className="relative w-full sm:flex-1 min-w-0 h-10">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou unidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-10"
            />
            {search && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:h-10">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 h-7 text-xs text-destructive font-semibold whitespace-nowrap"
              title="Total de casos judiciais"
            >
              <Gavel className="h-3 w-3" />
              {judicialCount} judicial
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 h-7 text-xs text-orange-500 font-semibold whitespace-nowrap"
              title="Total de casos extrajudiciais"
            >
              <FileWarning className="h-3 w-3" />
              {extrajudicialCount} extra
            </span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs ml-auto sm:ml-0"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>




        {/* Linha 2: filtros avançados agrupados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">


          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 h-4 leading-4">
              <span className="truncate">Tipo de cobrança</span>
            </label>
            <Select value={cobrancaFilter} onValueChange={(v) => setCobrancaFilter(v as CobrancaFilter)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="judicial">
                  <span className="flex items-center gap-2">
                    <Gavel className="h-3.5 w-3.5 text-destructive" />
                    Judicial
                  </span>
                </SelectItem>
                <SelectItem value="extrajudicial">
                  <span className="flex items-center gap-2">
                    <FileWarning className="h-3.5 w-3.5 text-orange-500" />
                    Extrajudicial
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 h-4 leading-4">
              <Scale className="h-3 w-3 shrink-0" />
              <span className="truncate">Judiciais: nº processo</span>
            </label>
            <Select value={processoFilter} onValueChange={(v) => setProcessoFilter(v as ProcessoFilter)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="com">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Com nº processo
                  </span>
                </SelectItem>
                <SelectItem value="sem">
                  <span className="flex items-center gap-2">
                    <CircleSlash className="h-3.5 w-3.5 text-destructive" />
                    Sem nº processo
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 h-4 leading-4">
              <span className="truncate">Boletos atrasados (min – máx)</span>
            </label>
            <div className="flex items-center gap-2 h-10">
              <Input
                type="number"
                min={0}
                placeholder="Min"
                value={minBoletos}
                onChange={(e) => setMinBoletos(e.target.value)}
                className="h-10"
              />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <Input
                type="number"
                min={0}
                placeholder="Máx"
                value={maxBoletos}
                onChange={(e) => setMaxBoletos(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </div>
      </div>


      <VirtualDebtorRows
        rows={filtered}
        procMap={procMap}
        settings={settings}
        onSelect={setSelected}
        onEditProc={setEditingProc}
      />


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
                              <p className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                <span>{isExt ? "Referência" : "Processo"}:</span>
                                <strong className="font-mono text-foreground">
                                  {proc!.numero_processo}
                                </strong>
                                <CopyButton value={proc!.numero_processo} label={isExt ? "número da referência" : "número do processo"} />
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
                                variant={getBoletoAtraso(b) >= 30 ? "destructive" : "secondary"}
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

interface VirtualRowsProps {
  rows: Debtor[];
  procMap: ReturnType<typeof indexByKey>;
  settings: ReturnType<typeof useJudicialSettings>;
  onSelect: (d: Debtor) => void;
  onEditProc: (d: Debtor) => void;
}

function VirtualDebtorRows({ rows, procMap, settings, onSelect, onEditProc }: VirtualRowsProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (el) => el?.getBoundingClientRect().height
        : undefined,
  });

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom = items.length > 0 ? totalSize - items[items.length - 1].end : 0;

  return (
    <div className="rounded-lg border bg-card">
      {/* Header fixo */}
      <div className="border-b">
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
        </Table>
      </div>

      {rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          Nenhum registro encontrado.
        </div>
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: "min(70vh, 900px)", contain: "layout paint style" }}
        >
          <Table style={{ height: totalSize }}>
            <TableBody>
              {paddingTop > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={6} style={{ height: paddingTop, padding: 0 }} />
                </tr>
              )}
              {items.map((vi) => {
                const d = rows[vi.index];
                const i = vi.index;
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
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
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
                    onClick={() => onSelect(d)}
                  >
                    <TableCell className="w-12 text-muted-foreground">{i + 1}</TableCell>
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
                            <Badge
                              variant="outline"
                              className="gap-1 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              title="Processo cadastrado"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Com nº processo
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground inline-flex items-center gap-1">
                              {proc!.numero_processo}
                              <CopyButton value={proc!.numero_processo} />
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
                            <span className="font-mono text-xs text-muted-foreground inline-flex items-center gap-1">
                              {proc!.numero_processo}
                              <CopyButton value={proc!.numero_processo} label="número da referência" />
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
                            <Badge
                              variant="outline"
                              className="gap-1 border-destructive/50 text-destructive bg-destructive/10"
                              title="Ainda não há número de processo cadastrado"
                            >
                              <CircleSlash className="h-3 w-3" />
                              Sem nº processo
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProc(d);
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
                                onEditProc(d);
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
                    <TableCell className="w-10 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                );
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={6} style={{ height: paddingBottom, padding: 0 }} />
                </tr>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
