import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/pdfParser";
import type { ChavePeriodo, Periodo } from "@/lib/periodoFilter";

interface Props {
  /** Meses de vencimento disponíveis na base. */
  periodos: Periodo[];
  /** Mês selecionado (null = todos). */
  value: ChavePeriodo | null;
  onChange: (chave: ChavePeriodo | null) => void;
}

/** Seletor do mês de vencimento usado para recortar a inadimplência. */
export function PeriodoFilter({ periodos, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 h-4 leading-4">
        <CalendarRange className="h-3 w-3 shrink-0" />
        <span className="truncate">Vencimento (mês)</span>
      </label>
      <Select
        value={value ?? "todos"}
        onValueChange={(v) => onChange(v === "todos" ? null : v)}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Todos os meses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os vencimentos</SelectItem>
          {periodos.map((p) => (
            <SelectItem key={p.chave} value={p.chave}>
              <span className="flex items-center gap-2">
                {p.label}
                <span className="text-xs text-muted-foreground">
                  {p.boletos} boleto{p.boletos === 1 ? "" : "s"} ·{" "}
                  {formatBRL(p.total)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default PeriodoFilter;
