import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, TrendingUp } from "lucide-react";
import { formatBRL } from "@/lib/pdfParser";

interface Props {
  total: number;
  count: number;
}

export function StatsCards({ total, count }: Props) {
  const avg = count > 0 ? total / count : 0;

  const items = [
    { label: "Total geral da dívida", value: formatBRL(total), icon: Wallet },
    { label: "Inadimplentes", value: count.toString(), icon: Users },
    { label: "Ticket médio", value: formatBRL(avg), icon: TrendingUp },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {it.label}
            </CardTitle>
            <it.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
