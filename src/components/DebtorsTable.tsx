import { useMemo, useState } from "react";
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
import { Search, ChevronRight } from "lucide-react";
import { Debtor, formatBRL } from "@/lib/pdfParser";

interface Props {
  debtors: Debtor[];
  /** Quando informado, oculta as abas internas e usa este modo. */
  mode?: Mode;
  /** Quando true, oculta as abas internas (útil quando o pai controla o modo). */
  hideTabs?: boolean;
}

type Mode = "lista" | "ranking";

export function DebtorsTable({ debtors, mode: modeProp, hideTabs }: Props) {
  const [search, setSearch] = useState("");
  const [minValue, setMinValue] = useState("");
  const [internalMode, setInternalMode] = useState<Mode>("lista");
  const mode = modeProp ?? internalMode;
  const [selected, setSelected] = useState<Debtor | null>(null);

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
              filtered.map((d, i) => (
                <TableRow
                  key={`${d.unidade}-${d.nome}-${i}`}
                  className="cursor-pointer hover:bg-accent/60"
                  onClick={() => setSelected(d)}
                >
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono">{d.unidade}</TableCell>
                  <TableCell>{d.nome}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{d.boletos.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(d.total)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))
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
                <div className="p-6 pt-4">
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
