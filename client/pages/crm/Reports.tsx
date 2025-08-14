import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { ErrorState, LoadingState } from "../../components/states";
import { locale } from "../../lib/locale";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";

interface PipelineStats {
  stage_name: string;
  stage_code: string;
  deal_count: number;
  total_value: number;
  avg_time_in_stage: number;
  conversion_rate: number;
}

interface RevenueData {
  period: string;
  revenue: number;
  deals_won: number;
  avg_deal_size: number;
}

interface ConversionFunnel {
  stage: string;
  count: number;
  value: number;
  conversion_rate?: number;
}

const CRMReports: React.FC = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pipeline conversion stats
  const {
    data: pipelineStats,
    isLoading: isLoadingPipeline,
    error: pipelineError,
    refetch: refetchPipeline,
  } = useSupabaseQuery<PipelineStats[]>(
    ["pipeline-stats", dateRange],
    `
    with stage_metrics as (
      select 
        ps.name as stage_name,
        ps.code as stage_code,
        ps.order_index,
        count(d.id) as deal_count,
        coalesce(sum(d.value), 0) as total_value,
        extract(epoch from avg(d.updated_at - d.created_at))/86400 as avg_time_in_stage
      from legalflow.pipeline_stages ps
      join legalflow.pipeline_defs pd on pd.id = ps.pipeline_id
      left join legalflow.deals d on d.stage_id = ps.id 
        and d.created_at >= now() - interval '${dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "90 days"}'
      where pd.code = 'sales'
      group by ps.id, ps.name, ps.code, ps.order_index
      order by ps.order_index
    ),
    conversion_rates as (
      select 
        sm1.stage_code,
        case 
          when lag(sm1.deal_count) over (order by sm1.order_index) > 0 
          then round((sm1.deal_count::float / lag(sm1.deal_count) over (order by sm1.order_index)) * 100, 2)
          else 100
        end as conversion_rate
      from stage_metrics sm1
    )
    select 
      sm.stage_name,
      sm.stage_code,
      sm.deal_count,
      sm.total_value,
      coalesce(sm.avg_time_in_stage, 0) as avg_time_in_stage,
      coalesce(cr.conversion_rate, 100) as conversion_rate
    from stage_metrics sm
    left join conversion_rates cr on cr.stage_code = sm.stage_code
    order by sm.order_index
    `,
  );

  // Revenue over time
  const { data: revenueData, isLoading: isLoadingRevenue } = useSupabaseQuery<
    RevenueData[]
  >(
    ["revenue-over-time", dateRange],
    `
    with date_series as (
      select generate_series(
        date_trunc('week', now() - interval '${dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "90 days"}'),
        date_trunc('week', now()),
        interval '1 week'
      )::date as period
    ),
    weekly_revenue as (
      select 
        date_trunc('week', d.updated_at)::date as period,
        sum(d.value) as revenue,
        count(*) as deals_won,
        avg(d.value) as avg_deal_size
      from legalflow.deals d
      join legalflow.pipeline_stages ps on ps.id = d.stage_id
      where ps.is_won = true
        and d.updated_at >= now() - interval '${dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "90 days"}'
      group by date_trunc('week', d.updated_at)::date
    )
    select 
      to_char(ds.period, 'DD/MM') as period,
      coalesce(wr.revenue, 0) as revenue,
      coalesce(wr.deals_won, 0) as deals_won,
      coalesce(wr.avg_deal_size, 0) as avg_deal_size
    from date_series ds
    left join weekly_revenue wr on wr.period = ds.period
    order by ds.period
    `,
  );

  // Top performers
  const { data: topContacts } = useSupabaseQuery(
    ["top-contacts", dateRange],
    `
    select 
      c.name,
      count(d.id) as deal_count,
      sum(d.value) as total_value,
      avg(d.probability) as avg_probability
    from legalflow.contacts c
    join legalflow.deals d on d.contact_id = c.id
    where d.created_at >= now() - interval '${dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "90 days"}'
    group by c.id, c.name
    having sum(d.value) > 0
    order by total_value desc
    limit 10
    `,
  );

  // Summary metrics
  const { data: summaryMetrics } = useSupabaseQuery(
    ["summary-metrics", dateRange],
    `
    select
      count(distinct d.id) as total_deals,
      count(distinct d.contact_id) as unique_contacts,
      sum(d.value) as total_pipeline_value,
      sum(case when ps.is_won then d.value else 0 end) as won_value,
      sum(case when ps.is_lost then d.value else 0 end) as lost_value,
      avg(d.probability) as avg_probability,
      count(*) filter (where ps.is_won) as won_deals,
      count(*) filter (where ps.is_lost) as lost_deals,
      round(avg(extract(epoch from d.updated_at - d.created_at))/86400, 1) as avg_cycle_time
    from legalflow.deals d
    left join legalflow.pipeline_stages ps on ps.id = d.stage_id
    where d.created_at >= now() - interval '${dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : "90 days"}'
    `,
  );

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refetchPipeline();
      // Other refetch calls would go here
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStageColor = (stageCode: string) => {
    const colors = {
      novo: "bg-blue-500",
      qualificado: "bg-yellow-500",
      proposta: "bg-purple-500",
      ganho: "bg-green-500",
      perdido: "bg-red-500",
    };
    return colors[stageCode as keyof typeof colors] || "bg-gray-500";
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0)
      return { icon: TrendingUp, color: "text-green-600", text: "Novo" };
    const change = ((current - previous) / previous) * 100;
    if (change > 0)
      return {
        icon: TrendingUp,
        color: "text-green-600",
        text: `+${change.toFixed(1)}%`,
      };
    if (change < 0)
      return {
        icon: TrendingDown,
        color: "text-red-600",
        text: `${change.toFixed(1)}%`,
      };
    return { icon: TrendingUp, color: "text-gray-600", text: "0%" };
  };

  const isLoading = isLoadingPipeline || isLoadingRevenue;
  const error = pipelineError;

  if (isLoading)
    return <LoadingState type="list" title="Carregando relatórios..." />;
  if (error) return <ErrorState error={error} onRetry={refreshAll} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Relatórios CRM
            </h1>
            <p className="text-gray-600">
              Análise de conversão, performance e receita do pipeline
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={refreshAll}
              disabled={isRefreshing}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {summaryMetrics?.total_deals || 0}
                </div>
                <div className="text-xs text-gray-600">Total Deals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {locale.formatCurrency(
                    summaryMetrics?.total_pipeline_value || 0,
                  )}
                </div>
                <div className="text-xs text-gray-600">Pipeline</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {locale.formatCurrency(summaryMetrics?.won_value || 0)}
                </div>
                <div className="text-xs text-gray-600">Receita</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {summaryMetrics?.unique_contacts || 0}
                </div>
                <div className="text-xs text-gray-600">Contatos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">
                  {summaryMetrics?.avg_cycle_time || 0}d
                </div>
                <div className="text-xs text-gray-600">Ciclo Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Conversion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Conversão por Estágio
                </CardTitle>
                <CardDescription>
                  Taxa de conversão entre estágios do pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pipelineStats?.map((stage, index) => (
                    <div key={stage.stage_code} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${getStageColor(stage.stage_code)}`}
                          />
                          <span className="font-medium">
                            {stage.stage_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{stage.deal_count}</div>
                          <div className="text-sm text-gray-600">
                            {stage.conversion_rate}%
                          </div>
                        </div>
                      </div>
                      <Progress value={stage.conversion_rate} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{locale.formatCurrency(stage.total_value)}</span>
                        <span>{stage.avg_time_in_stage.toFixed(1)} dias</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Funil de Conversão
                </CardTitle>
                <CardDescription>
                  Visualização do funil de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipelineStats?.map((stage, index) => {
                    const maxWidth = pipelineStats[0]?.deal_count || 1;
                    const width = (stage.deal_count / maxWidth) * 100;

                    return (
                      <div key={stage.stage_code} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{stage.stage_name}</span>
                          <span className="font-medium">
                            {stage.deal_count}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className={`${getStageColor(stage.stage_code)} h-full rounded-full transition-all duration-300 flex items-center justify-center`}
                              style={{ width: `${width}%` }}
                            >
                              <span className="text-white text-xs font-medium">
                                {stage.conversion_rate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time in Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo Médio por Estágio</CardTitle>
              <CardDescription>
                Quantos dias os deals ficam em cada estágio em média
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {pipelineStats?.map((stage) => (
                  <div
                    key={stage.stage_code}
                    className="text-center p-4 border rounded-lg"
                  >
                    <div
                      className={`w-8 h-8 ${getStageColor(stage.stage_code)} rounded-full mx-auto mb-2`}
                    />
                    <div className="font-medium text-sm">
                      {stage.stage_name}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stage.avg_time_in_stage.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600">dias</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue over time */}
            <Card>
              <CardHeader>
                <CardTitle>Receita por Período</CardTitle>
                <CardDescription>
                  Evolução da receita de assinaturas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData?.map((period, index) => (
                    <div
                      key={period.period}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{period.period}</div>
                          <div className="text-sm text-gray-600">
                            {period.deals_won} deals fechados
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {locale.formatCurrency(period.revenue)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Ticket médio:{" "}
                          {locale.formatCurrency(period.avg_deal_size)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Breakdown da Receita</CardTitle>
                <CardDescription>
                  Análise detalhada da receita por fonte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="font-medium">Deals Fechados</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {locale.formatCurrency(summaryMetrics?.won_value || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {summaryMetrics?.won_deals || 0} deals
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="font-medium">Deals Perdidos</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        {locale.formatCurrency(summaryMetrics?.lost_value || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {summaryMetrics?.lost_deals || 0} deals
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="font-medium">Pipeline Ativo</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {locale.formatCurrency(
                          (summaryMetrics?.total_pipeline_value || 0) -
                            (summaryMetrics?.won_value || 0) -
                            (summaryMetrics?.lost_value || 0),
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.round(summaryMetrics?.avg_probability || 0)}%
                        prob. média
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Contatos por Receita</CardTitle>
              <CardDescription>
                Contatos que geraram mais receita no período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topContacts?.map((contact: any, index: number) => (
                  <div
                    key={contact.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-600">
                          {contact.deal_count} deals •{" "}
                          {Math.round(contact.avg_probability)}% prob. média
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {locale.formatCurrency(contact.total_value)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {locale.formatCurrency(
                          contact.total_value / contact.deal_count,
                        )}{" "}
                        por deal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMReports;
