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
import { Search, ChevronRight, Gavel, AlertTriangle, Scale, RefreshCw } from "lucide-react";
import { Debtor, formatBRL } from "@/lib/pdfParser";
import {
  consultarStatusProcesso,
  countOverdueBoletos,
  indexByKey,
  isJudicial,
  listProcessos,
  type ProcessoJudicial,
} from "@/lib/processosRepo";
import { useJudicialSettings } from "@/lib/settings";
import { ProcessoFormDialog } from "./ProcessoFormDialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

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
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0, ok: 0, erro: 0 });

  const handleSyncOne = useCallback(
    async (proc: ProcessoJudicial) => {
      const key = `${proc.unidade}|${proc.nome}`;
      setSyncingKey(key);
      try {
        const r = await consultarStatusProcesso({
          unidade: proc.unidade,
          nome: proc.nome,
          numero_processo: proc.numero_processo,
        });
        await refreshProcessos();
        toast({
          title: "Status atualizado",
          description:
            r.consulta_status === "ok"
              ? `Fase: ${r.fase_atual ?? "—"}`
              : r.consulta_status === "nao_encontrado"
              ? "Processo não encontrado no DataJud."
              : `Erro: ${r.consulta_erro ?? "desconhecido"}`,
        });
      } catch (e) {
        toast({
          title: "Falha ao consultar",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      } finally {
        setSyncingKey(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSyncAll = useCallback(async () => {
    const lista = await listProcessos();
    if (lista.length === 0) {
      toast({ title: "Nada para sincronizar", description: "Nenhum processo cadastrado." });
      return;
    }
    setSyncingAll(true);
    setSyncProgress({ done: 0, total: lista.length, ok: 0, erro: 0 });
    let ok = 0;
    let erro = 0;
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      try {
        const r = await consultarStatusProcesso({
          unidade: p.unidade,
          nome: p.nome,
          numero_processo: p.numero_processo,
        });
        if (r.consulta_status === "ok") ok++;
        else erro++;
      } catch {
        erro++;
      }
      setSyncProgress({ done: i + 1, total: lista.length, ok, erro });
    }
    await refreshProcessos();
    setSyncingAll(false);
    toast({
      title: "Sincronização concluída",
      description: `${ok} atualizados · ${erro} com problema (de ${lista.length})`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncingAll || processos.length === 0}
            title="Consultar status de todos os processos no DataJud (CNJ)"
          >
            <RefreshCw className={"h-3.5 w-3.5 mr-1.5 " + (syncingAll ? "animate-spin" : "")} />
            {syncingAll
              ? `Sincronizando ${syncProgress.done}/${syncProgress.total}...`
              : "Sincronizar processos"}
          </Button>
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
                          {proc!.fase_atual && (
                            <Badge
                              variant="secondary"
                              className="text-xs font-normal"
                              title={
                                proc!.ultima_consulta
                                  ? `Atualizado em ${new Date(proc!.ultima_consulta).toLocaleString("pt-BR")}`
                                  : undefined
                              }
                            >
                              {proc!.fase_atual}
                            </Badge>
                          )}
                          {proc!.tribunal && (
                            <span className="text-xs text-muted-foreground">
                              {proc!.tribunal}
                            </span>
                          )}
                        </>
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
                  {isJudicial(selected, settings) && (() => {
                    const proc = procMap.get(`${selected.unidade}|${selected.nome}`);
                    const ativo = !!proc;
                    return (
                      <div
                        className={
                          "flex items-start gap-3 rounded-lg border p-4 " +
                          (ativo
                            ? "border-destructive/30 bg-destructive/10"
                            : "border-warning/40 bg-warning/10")
                        }
                      >
                        <div
                          className={
                            "rounded-full p-2 " +
                            (ativo ? "bg-destructive/20" : "bg-warning/20")
                          }
                        >
                          <Gavel
                            className={
                              "h-5 w-5 " +
                              (ativo ? "text-destructive" : "text-warning")
                            }
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={
                                "font-semibold " +
                                (ativo ? "text-destructive" : "text-warning")
                              }
                            >
                              {ativo
                                ? "Em cobrança judicial"
                                : "Cobrar judicialmente"}
                            </h4>
                            <Badge
                              className={
                                "gap-1 " +
                                (ativo
                                  ? "bg-destructive text-destructive-foreground"
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
                                Processo:{" "}
                                <strong className="font-mono text-foreground">
                                  {proc!.numero_processo}
                                </strong>
                                {proc!.tribunal && (
                                  <span className="ml-2 text-xs">
                                    ({proc!.tribunal})
                                  </span>
                                )}
                              </p>
                              <div className="rounded-md border border-border/50 bg-background/50 p-3 space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">
                                  Status processual (DataJud)
                                </div>
                                <div className="text-sm">
                                  {proc!.fase_atual ? (
                                    <strong className="text-foreground">
                                      {proc!.fase_atual}
                                    </strong>
                                  ) : proc!.consulta_status === "nao_encontrado" ? (
                                    <span className="text-muted-foreground italic">
                                      Não encontrado no DataJud
                                    </span>
                                  ) : proc!.consulta_status === "erro" ? (
                                    <span className="text-destructive italic text-xs">
                                      Erro: {proc!.consulta_erro}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground italic">
                                      Nunca consultado
                                    </span>
                                  )}
                                </div>
                                {proc!.ultima_consulta && (
                                  <div className="text-xs text-muted-foreground">
                                    Última consulta:{" "}
                                    {new Date(proc!.ultima_consulta).toLocaleString("pt-BR")}
                                  </div>
                                )}
                              </div>
                              {proc!.observacoes && (
                                <p className="text-xs text-muted-foreground">
                                  {proc!.observacoes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Este morador atende ao critério para cobrança
                              judicial. Cadastre o número do processo para
                              marcá-lo como <strong>Judicial</strong>.
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={ativo ? "outline" : "default"}
                              className={
                                ativo
                                  ? ""
                                  : "bg-warning text-warning-foreground hover:bg-warning/90"
                              }
                              onClick={() => setEditingProc(selected)}
                            >
                              <Scale className="h-3.5 w-3.5 mr-1.5" />
                              {ativo ? "Editar processo" : "Adicionar processo"}
                            </Button>
                            {ativo && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={syncingKey === `${proc!.unidade}|${proc!.nome}`}
                                onClick={() => handleSyncOne(proc!)}
                              >
                                <RefreshCw
                                  className={
                                    "h-3.5 w-3.5 mr-1.5 " +
                                    (syncingKey === `${proc!.unidade}|${proc!.nome}`
                                      ? "animate-spin"
                                      : "")
                                  }
                                />
                                Atualizar status
                              </Button>
                            )}
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
