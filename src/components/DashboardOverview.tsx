import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Users, DollarSign, FileText,
  AlertTriangle, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Activity, ChevronRight
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  inadimplentes: Array<{
    id: string;
    nome: string;
    unidade: string;
    total: number;
    created_at: string;
  }>;
  totalInadimplentes: number;
  totalGeral: number;
  quantidadeRelatorios: number;
  quantidadeProcessos: number;
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData>({
    inadimplentes: [],
    totalInadimplentes: 0,
    totalGeral: 0,
    quantidadeRelatorios: 0,
    quantidadeProcessos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://zwngrpxfrrocpdsicinb.supabase.co/functions/v1/dashboard-metrics');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalFormatado = data.totalGeral > 0
    ? data.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00';

  // Evolução temporal (mock para demonstração)
  const evolucaoData = [
    { mes: 'Mai', valor: 45 },
    { mes: 'Jun', valor: 52 },
    { mes: 'Jul', valor: 48 },
    { mes: 'Ago', valor: 61 },
    { mes: 'Set', valor: 55 },
    { mes: 'Out', valor: data.totalInadimplentes },
  ];

  // Distribuição por gravidade
  const gravidadeData = [
    { label: 'Crítico', valor: Math.floor(data.totalInadimplentes * 0.15), color: '#ef4444' },
    { label: 'Alto', valor: Math.floor(data.totalInadimplentes * 0.25), color: '#f97316' },
    { label: 'Médio', valor: Math.floor(data.totalInadimplentes * 0.35), color: '#eab308' },
    { label: 'Baixo', valor: Math.floor(data.totalInadimplentes * 0.25), color: '#22c55e' },
  ];

  // Inadimplentes ordenados por valor
  const inadimplentesOrdenados = [...data.inadimplentes]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const getGravidade = (total: number) => {
    if (total > 10000) return { label: 'Crítico', color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500' };
    if (total > 5000) return { label: 'Alto', color: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-500' };
    if (total > 2000) return { label: 'Médio', color: '#eab308', bg: 'bg-yellow-500/10', text: 'text-yellow-500' };
    return { label: 'Baixo', color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500' };
  };

  const metricCards = [
    {
      title: 'Total em Dívida',
      value: totalFormatado,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: '+12.5%',
      trendUp: false,
    },
    {
      title: 'Inadimplentes',
      value: data.totalInadimplentes.toString(),
      icon: Users,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      trend: '+8.3%',
      trendUp: true,
    },
    {
      title: 'Relatórios',
      value: data.quantidadeRelatorios.toString(),
      icon: FileText,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      trend: '+3',
      trendUp: true,
    },
    {
      title: 'Processos Judiciais',
      value: data.quantidadeProcessos.toString(),
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: '+2',
      trendUp: true,
    },
  ];

  const acoesRecomendadas = [
    { titulo: 'Revisar processos críticos', quantidade: Math.floor(data.totalInadimplentes * 0.15), prioridade: 'Crítica', color: 'text-red-500' },
    { titulo: 'Enviar notificações', quantidade: Math.floor(data.totalInadimplentes * 0.4), prioridade: 'Alta', color: 'text-orange-500' },
    { titulo: 'Gerar relatórios', quantidade: data.quantidadeRelatorios, prioridade: 'Média', color: 'text-yellow-500' },
    { titulo: 'Atualizar dados', quantidade: Math.floor(data.totalInadimplentes * 0.25), prioridade: 'Normal', color: 'text-green-500' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2"><Card className="animate-pulse h-64" /><Card className="animate-pulse h-64" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua gestão de inadimplência</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl ${card.bg} p-3`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${card.trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                    {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {card.trend}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Evolução Temporal */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Evolução de Inadimplentes</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucaoData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#888" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="#888" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #333', background: '#111' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Area type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Gravidade */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Distribuição por Gravidade</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Classificação dos inadimplentes</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gravidadeData} layout="vertical" barSize={20}>
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#888" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} stroke="#888" tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #333', background: '#111' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {gravidadeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela e Ações */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Principais Inadimplentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Principais Inadimplentes</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                Ver todos <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {inadimplentesOrdenados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum inadimplente registrado</p>
                <p className="text-xs text-muted-foreground mt-1">Importe um relatório para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inadimplentesOrdenados.map((item) => {
                  const gravidade = getGravidade(item.total);
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gravidade.bg.replace('/10', '')}`} style={{ backgroundColor: gravidade.color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">{item.unidade}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${gravidade.text} border-current/30`}>
                          {gravidade.label}
                        </Badge>
                        <p className="text-sm font-semibold whitespace-nowrap">
                          {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Recomendadas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Ações Recomendadas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {acoesRecomendadas.map((acao, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-medium ${acao.color}`}>{acao.quantidade}</div>
                  <div>
                    <p className="text-sm font-medium">{acao.titulo}</p>
                    <p className={`text-xs ${acao.color}`}>{acao.prioridade}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
