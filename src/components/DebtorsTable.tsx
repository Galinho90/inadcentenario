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
import { Search } from "lucide-react";
import { Debtor, formatBRL } from "@/lib/pdfParser";

interface Props {
  debtors: Debtor[];
}

type Mode = "lista" | "ranking";

export function DebtorsTable({ debtors }: Props) {
  const [search, setSearch] = useState("");
  const [minValue, setMinValue] = useState("");
  const [mode, setMode] = useState<Mode>("lista");

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
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="lista">Lista completa</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>
        </Tabs>
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
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d, i) => (
                <TableRow key={`${d.unidade}-${d.nome}-${i}`}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono">{d.unidade}</TableCell>
                  <TableCell>{d.nome}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatBRL(d.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Exibindo {filtered.length} de {debtors.length} registros
      </p>
    </div>
  );
}
