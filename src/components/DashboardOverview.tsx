import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  Users,
  TrendingUp,
  AlertTriangle,
  Trophy,
  FileText,
  Clock,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type Debtor, formatBRL, getBoletoAtraso } from "@/lib/pdfParser";

interface Props {
  debtors: Debtor[];
  fileName?: string | null;
  onDebtorClick?: (d: Debtor) => void;
}

const SEVERITY_BUCKETS = [
  { key: "0-30", label: "Até 30 dias", min: 0, max: 30, color: "hsl(var(--severity-low))" },
  { key: "31-60", label: "31 a 60 dias", min: 31, max: 60, color: "hsl(var(--severity-mid))" },
  { key: "61-90", label: "61 a 90 dias", min: 61, max: 90, color: "hsl(var(--severity-high))" },
  { key: "90+", label: "Mais de 90 dias", min: 91, max: Infinity, color: "hsl(var(--severity-critical))" },
] as const;

export function DashboardOverview({ debtors, fileName, onDebtorClick }: Props) {
  const stats = useMemo(() => {
    const total = debtors.reduce((acc, d) => acc + d.total, 0);
    const count = debtors.length;
    const avg = count > 0 ? total / count : 0;
    const allBoletos = debtors.flatMap((d) => d.boletos);
    const totalBoletos = allBoletos.length;
    const maxAtraso = allBoletos.reduce((m, b) => Math.max(m, getBoletoAtraso(b)), 0);
    const criticos = debtors.filter((d) =>
      d.boletos.some((b) => getBoletoAtraso(b) > 90)
    ).length;
    return { total, count, avg, totalBoletos, maxAtraso, criticos };
  }, [debtors]);

  const top5 = useMemo(
    () => [...debtors].sort((a, b) => b.total - a.total).slice(0, 5),
    [debtors]
  );

  const severityData = useMemo(() => {
    return SEVERITY_BUCKETS.map((bucket) => {
      const value = debtors
        .flatMap((d) => d.boletos)
        .filter((b) => b.atraso >= bucket.min && b.atraso <= bucket.max)
        .reduce((acc, b) => acc + b.total, 0);
      return { name: bucket.label, value, color: bucket.color };
    }).filter((d) => d.value > 0);
  }, [debtors]);

  const topChartData = top5.map((d) => ({
    nome: d.nome.length > 18 ? d.nome.slice(0, 16) + "…" : d.nome,
    unidade: d.unidade,
    total: d.total,
  }));

  const maxTop = Math.max(...top5.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="relative rounded-xl border p-6 md:p-8 overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2">
            {fileName && (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-mono truncate max-w-xs">{fileName}</span>
              </div>
            )}
            <h2 className="text-sm font-medium text-muted-foreground">
              Total inadimplente
            </h2>
            <p className="text-4xl md:text-5xl font-bold tracking-tight">
              {formatBRL(stats.total)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3 w-3" />
                {stats.count} unidades
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Clock className="h-3 w-3" />
                {stats.totalBoletos} boletos
              </Badge>
              {stats.criticos > 0 && (
                <Badge variant="destructive" className="gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.criticos} crítico{stats.criticos > 1 ? "s" : ""} (+90d)
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <MiniStat
              icon={TrendingUp}
              label="Ticket médio"
              value={formatBRL(stats.avg)}
            />
            <MiniStat
              icon={Clock}
              label="Maior atraso"
              value={`${stats.maxAtraso}d`}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top devedores - bar chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Top 5 maiores devedores</CardTitle>
          </CardHeader>
          <CardContent>
            {topChartData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topChartData}
                    layout="vertical"
                    margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke="hsl(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatBRL(value), "Total"]}
                      labelFormatter={(label, payload) => {
                        const u = payload?.[0]?.payload?.unidade;
                        return u ? `Unidade ${u} · ${label}` : label;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--chart-1))"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por atraso */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Distribuição por atraso</CardTitle>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {severityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => formatBRL(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {severityData.map((d) => (
                    <li key={d.name} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="truncate">{d.name}</span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatBRL(d.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card/80 backdrop-blur px-4 py-3 min-w-[140px]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
      Sem dados suficientes
    </div>
  );
}
