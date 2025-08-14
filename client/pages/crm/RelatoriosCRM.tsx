import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Clock, 
  Users,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase, lf } from '../../lib/supabase';

interface ConversionStats {
  stage_name: string;
  stage_code: string;
  order_index: number;
  total_deals: number;
  conversion_rate: number;
  avg_time_in_stage: number;
  total_value: number;
}

interface RevenueByContact {
  contact_id: string;
  contact_name: string;
  contact_email: string;
  total_revenue: number;
  subscription_count: number;
  deal_count: number;
}

const RelatoriosCRM = () => {
  const [periodFilter, setPeriodFilter] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  // Query para conversão por etapa
  const { data: conversionStats = [], isLoading: conversionLoading, refetch: refetchConversion } = useSupabaseQuery(
    ['conversion-stats', periodFilter],
    `
      WITH stage_deals AS (
        SELECT 
          ps.id as stage_id,
          ps.name as stage_name,
          ps.code as stage_code,
          ps.order_index,
          COUNT(d.id) as total_deals,
          SUM(d.value) as total_value,
          AVG(EXTRACT(EPOCH FROM (COALESCE(d.updated_at, NOW()) - d.created_at)) / 86400) as avg_days_in_stage
        FROM legalflow.pipeline_stages ps
        JOIN legalflow.pipeline_defs pd ON pd.id = ps.pipeline_id
        LEFT JOIN legalflow.deals d ON d.stage_id = ps.id 
          AND d.created_at >= NOW() - INTERVAL '${periodFilter} days'
        WHERE pd.code = 'sales'
        GROUP BY ps.id, ps.name, ps.code, ps.order_index
      ),
      conversion_rates AS (
        SELECT 
          s1.stage_id,
          s1.stage_name,
          s1.stage_code,
          s1.order_index,
          s1.total_deals,
          s1.total_value,
          s1.avg_days_in_stage,
          CASE 
            WHEN s_prev.total_deals > 0 
            THEN (s1.total_deals::float / s_prev.total_deals * 100)
            ELSE 100
          END as conversion_rate
        FROM stage_deals s1
        LEFT JOIN stage_deals s_prev ON s_prev.order_index = s1.order_index - 1
      )
      SELECT 
        stage_name,
        stage_code,
        order_index,
        total_deals,
        COALESCE(conversion_rate, 100) as conversion_rate,
        COALESCE(avg_days_in_stage, 0) as avg_time_in_stage,
        COALESCE(total_value, 0) as total_value
      FROM conversion_rates
      ORDER BY order_index
    `,
    []
  );

  // Query para tempo médio no estágio
  const { data: timeStats = [], refetch: refetchTime } = useSupabaseQuery(
    ['time-in-stages', periodFilter],
    `
      SELECT 
        ps.name as stage_name,
        ps.code as stage_code,
        AVG(EXTRACT(EPOCH FROM (
          CASE 
            WHEN d.stage_id = ps.id THEN COALESCE(d.updated_at, NOW())
            ELSE d.updated_at
          END - d.created_at
        )) / 86400) as avg_days,
        COUNT(d.id) as deal_count
      FROM legalflow.pipeline_stages ps
      JOIN legalflow.pipeline_defs pd ON pd.id = ps.pipeline_id
      LEFT JOIN legalflow.deals d ON d.stage_id = ps.id
        AND d.created_at >= NOW() - INTERVAL '${periodFilter} days'
      WHERE pd.code = 'sales'
      GROUP BY ps.id, ps.name, ps.code, ps.order_index
      ORDER BY ps.order_index
    `,
    []
  );

  // Query para receita por contato (Stripe)
  const { data: revenueByContact = [], refetch: refetchRevenue } = useSupabaseQuery(
    ['revenue-by-contact', periodFilter],
    `
      SELECT 
        c.id as contact_id,
        c.name as contact_name,
        c.email as contact_email,
        COALESCE(stripe_revenue.total_revenue, 0) as total_revenue,
        COALESCE(stripe_revenue.subscription_count, 0) as subscription_count,
        COUNT(d.id) as deal_count
      FROM legalflow.contacts c
      LEFT JOIN legalflow.deals d ON d.contact_id = c.id
        AND d.created_at >= NOW() - INTERVAL '${periodFilter} days'
      LEFT JOIN (
        SELECT 
          sc.contact_id,
          SUM(CASE WHEN si.amount_paid IS NOT NULL THEN si.amount_paid::float / 100 ELSE 0 END) as total_revenue,
          COUNT(DISTINCT ss.id) as subscription_count
        FROM legalflow.stripe_customers sc
        LEFT JOIN legalflow.contacts cont ON cont.stripe_customer_id = sc.stripe_customer_id
        LEFT JOIN legalflow.stripe_subscriptions ss ON ss.customer_id = sc.stripe_customer_id
        LEFT JOIN legalflow.stripe_invoices si ON si.customer_id = sc.stripe_customer_id
          AND si.created >= EXTRACT(EPOCH FROM (NOW() - INTERVAL '${periodFilter} days'))
        GROUP BY sc.contact_id
      ) stripe_revenue ON stripe_revenue.contact_id = c.id
      WHERE c.stripe_customer_id IS NOT NULL OR d.id IS NOT NULL
      GROUP BY c.id, c.name, c.email, stripe_revenue.total_revenue, stripe_revenue.subscription_count
      HAVING COUNT(d.id) > 0 OR COALESCE(stripe_revenue.total_revenue, 0) > 0
      ORDER BY total_revenue DESC, deal_count DESC
      LIMIT 20
    `,
    []
  );

  // Query para resumo geral
  const { data: summaryStats, refetch: refetchSummary } = useSupabaseQuery(
    ['crm-summary', periodFilter],
    `
      SELECT 
        -- Deals
        COUNT(DISTINCT d.id) as total_deals,
        SUM(d.value) as total_deal_value,
        COUNT(DISTINCT d.id) FILTER (WHERE ps.is_won = true) as won_deals,
        SUM(d.value) FILTER (WHERE ps.is_won = true) as won_value,
        
        -- Contatos
        COUNT(DISTINCT c.id) as total_contacts,
        COUNT(DISTINCT c.id) FILTER (WHERE c.stripe_customer_id IS NOT NULL) as stripe_contacts,
        
        -- Timeline
        COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '7 days') as deals_this_week,
        COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '7 days') as contacts_this_week
      FROM legalflow.contacts c
      LEFT JOIN legalflow.deals d ON d.contact_id = c.id
        AND d.created_at >= NOW() - INTERVAL '${periodFilter} days'
      LEFT JOIN legalflow.pipeline_stages ps ON ps.id = d.stage_id
    `,
    []
  );

  // Refresh all data
  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchConversion(),
        refetchTime(),
        refetchRevenue(),
        refetchSummary()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Export data
  const handleExportData = () => {
    const exportData = {
      periodo: `${periodFilter} dias`,
      data_geracao: new Date().toISOString(),
      conversao_por_etapa: conversionStats,
      tempo_por_etapa: timeStats,
      receita_por_contato: revenueByContact,
      resumo: summaryStats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-crm-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDays = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    return `${Math.round(days)}d`;
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Relatórios CRM
          </h1>
          <p className="text-gray-600 mt-1">
            Análise de performance e eficiência do pipeline de vendas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          
          <Button onClick={handleRefreshAll} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Período:</span>
            </div>
            
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Deals</p>
                  <p className="text-2xl font-bold">{summaryStats.total_deals || 0}</p>
                  <p className="text-xs text-gray-500">
                    {summaryStats.deals_this_week || 0} esta semana
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(summaryStats.total_deal_value || 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {summaryStats.won_deals || 0} fechados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Taxa Sucesso</p>
                  <p className="text-2xl font-bold">
                    {summaryStats.total_deals > 0 
                      ? Math.round((summaryStats.won_deals / summaryStats.total_deals) * 100)
                      : 0
                    }%
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(summaryStats.won_value || 0)} ganhos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Contatos</p>
                  <p className="text-2xl font-bold">{summaryStats.total_contacts || 0}</p>
                  <p className="text-xs text-gray-500">
                    {summaryStats.stripe_contacts || 0} com Stripe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversão por Etapa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversão por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversionLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {conversionStats.map((stage, index) => (
                  <div key={stage.stage_code} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{stage.stage_name}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${getConversionColor(stage.conversion_rate)}`}>
                          {Math.round(stage.conversion_rate)}%
                        </span>
                        <div className="text-xs text-gray-500">
                          {stage.total_deals} deals
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(stage.conversion_rate, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatCurrency(stage.total_value)}</span>
                      <span>{formatDays(stage.avg_time_in_stage)} médio</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tempo Médio no Estágio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tempo Médio por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeStats.map((stage) => (
                <div key={stage.stage_code} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{stage.stage_name}</div>
                    <div className="text-sm text-gray-500">
                      {stage.deal_count} deals
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatDays(stage.avg_days)}
                    </div>
                    <div className="text-xs text-gray-500">
                      tempo médio
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receita por Contato/Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Receita por Contato (Top 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueByContact.length > 0 ? (
            <div className="space-y-3">
              {revenueByContact.map((contact, index) => (
                <div key={contact.contact_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{contact.contact_name}</div>
                      <div className="text-sm text-gray-500">
                        {contact.contact_email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(contact.total_revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {contact.subscription_count} assinaturas • {contact.deal_count} deals
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">
                Nenhuma receita encontrada no período selecionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Performance do Pipeline</h4>
              <p className="text-blue-700 text-sm">
                {conversionStats.length > 0 && (
                  <>
                    A etapa "{conversionStats.find(s => s.conversion_rate === Math.min(...conversionStats.map(cs => cs.conversion_rate)))?.stage_name}" 
                    tem a menor taxa de conversão ({Math.round(Math.min(...conversionStats.map(cs => cs.conversion_rate)))}%). 
                    Considere revisar os processos desta etapa.
                  </>
                )}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Oportunidades</h4>
              <p className="text-green-700 text-sm">
                {summaryStats && (
                  <>
                    {summaryStats.total_contacts - summaryStats.stripe_contacts} contatos ainda não possuem 
                    integração com Stripe. Isso representa uma oportunidade de expandir a base de pagantes.
                  </>
                )}
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Tempo de Ciclo</h4>
              <p className="text-yellow-700 text-sm">
                {timeStats.length > 0 && (
                  <>
                    O ciclo total médio é de aproximadamente {formatDays(timeStats.reduce((sum, s) => sum + s.avg_days, 0))}.
                    Identifique gargalos nas etapas com maior tempo médio.
                  </>
                )}
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Receita</h4>
              <p className="text-purple-700 text-sm">
                {revenueByContact.length > 0 && (
                  <>
                    Top 3 contatos geram {formatCurrency(revenueByContact.slice(0, 3).reduce((sum, c) => sum + c.total_revenue, 0))} 
                    da receita total. Mantenha relacionamento próximo com estes clientes.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosCRM;
