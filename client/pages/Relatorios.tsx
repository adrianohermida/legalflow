import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Clock,
  Users,
  DollarSign,
  Star,
  Inbox,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Calendar,
  Target,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { lf } from '../lib/supabase';

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick: () => void;
  color?: string;
}

interface SLATicketsData {
  total: number;
  frt_compliant: number;
  ttr_compliant: number;
  frt_violation_rate: number;
  ttr_violation_rate: number;
  avg_frt_minutes: number;
  avg_ttr_minutes: number;
}

interface CSATData {
  avg_rating: number;
  total_responses: number;
  trend_7d: number;
}

interface TimeTrackingData {
  total_minutes_7d: number;
  avg_daily_minutes: number;
  active_agents: number;
  top_agent: {
    user_id: string;
    minutes: number;
  };
}

interface FinancialData {
  total_overdue: number;
  overdue_installments: number;
  affected_plans: number;
  overdue_percentage: number;
}

const MetricCard: React.FC<MetricCard> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
  color = 'border-neutral-200'
}) => (
  <Card 
    className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${color}`}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-neutral-600">
        {title}
      </CardTitle>
      <div className="text-neutral-400">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
      )}
      {trend && (
        <div className="flex items-center mt-2">
          {trend.isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
          )}
          <span className={`text-xs font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-neutral-500 ml-1">vs 7d</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <Button variant="ghost" size="sm" className="p-0 h-auto text-xs">
          Ver detalhes <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const Relatorios: React.FC = () => {
  const navigate = useNavigate();

  // SLA Tickets Data
  const { data: slaTicketsData } = useQuery({
    queryKey: ['reports-sla-tickets'],
    queryFn: async (): Promise<SLATicketsData> => {
      const { data, error } = await lf
        .from('vw_ticket_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      const total = data.length;
      const frtCompliant = data.filter(t => !t.frt_violated).length;
      const ttrCompliant = data.filter(t => !t.ttr_violated).length;
      const avgFrt = data.reduce((acc, t) => acc + (t.frt_minutes || 0), 0) / total || 0;
      const avgTtr = data.reduce((acc, t) => acc + (t.ttr_minutes || 0), 0) / total || 0;
      
      return {
        total,
        frt_compliant: frtCompliant,
        ttr_compliant: ttrCompliant,
        frt_violation_rate: total > 0 ? ((total - frtCompliant) / total) * 100 : 0,
        ttr_violation_rate: total > 0 ? ((total - ttrCompliant) / total) * 100 : 0,
        avg_frt_minutes: avgFrt,
        avg_ttr_minutes: avgTtr
      };
    }
  });

  // CSAT Data
  const { data: csatData } = useQuery({
    queryKey: ['reports-csat'],
    queryFn: async (): Promise<CSATData> => {
      const { data, error } = await lf
        .from('vw_csat_30d')
        .select('*')
        .order('dia', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      const avgRating = data.reduce((acc, d) => acc + (d.csat_avg || 0), 0) / data.length || 0;
      const totalResponses = data.reduce((acc, d) => acc + (d.responses || 0), 0);
      
      return {
        avg_rating: avgRating,
        total_responses: totalResponses,
        trend_7d: 2.5 // Mock trend
      };
    }
  });

  // Time Tracking Data
  const { data: timeData } = useQuery({
    queryKey: ['reports-time-tracking'],
    queryFn: async (): Promise<TimeTrackingData> => {
      const { data, error } = await lf
        .from('vw_time_by_user_7d')
        .select('*')
        .order('minutes', { ascending: false });
      
      if (error) throw error;
      
      const totalMinutes = data.reduce((acc, d) => acc + (d.minutes || 0), 0);
      const uniqueUsers = new Set(data.map(d => d.user_id)).size;
      const topAgent = data[0] || { user_id: '', minutes: 0 };
      
      return {
        total_minutes_7d: totalMinutes,
        avg_daily_minutes: totalMinutes / 7,
        active_agents: uniqueUsers,
        top_agent: topAgent
      };
    }
  });

  // Financial Data
  const { data: financialData } = useQuery({
    queryKey: ['reports-financial'],
    queryFn: async (): Promise<FinancialData> => {
      const { data, error } = await lf
        .from('parcelas_pagamento')
        .select('valor, status, plano_id')
        .in('status', ['overdue', 'pending']);
      
      if (error) throw error;
      
      const overdueItems = data.filter(p => p.status === 'overdue');
      const totalOverdue = overdueItems.reduce((acc, p) => acc + (p.valor || 0), 0);
      const affectedPlans = new Set(overdueItems.map(p => p.plano_id)).size;
      const total = data.length;
      
      return {
        total_overdue: totalOverdue,
        overdue_installments: overdueItems.length,
        affected_plans: affectedPlans,
        overdue_percentage: total > 0 ? (overdueItems.length / total) * 100 : 0
      };
    }
  });

  // Inbox Data
  const { data: inboxData } = useQuery({
    queryKey: ['reports-inbox'],
    queryFn: async () => {
      const { data, error } = await lf
        .from('vw_inbox_processed_7d')
        .select('*')
        .order('dia', { ascending: false })
        .limit(7);
      
      if (error) throw error;
      return data.reduce((acc, d) => acc + (d.triagens_dia || 0), 0);
    }
  });

  // SLA Etapas Data
  const { data: slaEtapasData } = useQuery({
    queryKey: ['reports-sla-etapas'],
    queryFn: async () => {
      const { data, error } = await lf
        .from('vw_sla_etapas')
        .select('bucket')
        .neq('bucket', 'completed');
      
      if (error) throw error;
      
      const buckets = data.reduce((acc, item) => {
        acc[item.bucket] = (acc[item.bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        overdue: buckets['overdue'] || 0,
        within_24h: buckets['<24h'] || 0,
        within_72h: buckets['24-72h'] || 0,
        beyond_72h: buckets['>72h'] || 0
      };
    }
  });

  const metrics: MetricCard[] = [
    {
      title: 'SLA Tickets (30d)',
      value: `${slaTicketsData?.frt_violation_rate?.toFixed(1) || '0'}%`,
      subtitle: `${slaTicketsData?.total || 0} tickets • FRT: ${slaTicketsData?.avg_frt_minutes?.toFixed(0) || '0'}min`,
      icon: <Clock className="w-4 h-4" />,
      trend: {
        value: -2.1,
        isPositive: true // Lower violation rate is better
      },
      onClick: () => navigate('/relatorios/sla-tickets'),
      color: (slaTicketsData?.frt_violation_rate || 0) > 15 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
    },
    {
      title: 'SLA Etapas',
      value: slaEtapasData?.overdue || 0,
      subtitle: `${(slaEtapasData?.within_24h || 0) + (slaEtapasData?.within_72h || 0)} próximas do vencimento`,
      icon: <Target className="w-4 h-4" />,
      onClick: () => navigate('/relatorios/sla-etapas'),
      color: (slaEtapasData?.overdue || 0) > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'
    },
    {
      title: 'CSAT (30d)',
      value: csatData?.avg_rating?.toFixed(1) || '0.0',
      subtitle: `${csatData?.total_responses || 0} avaliações`,
      icon: <Star className="w-4 h-4" />,
      trend: {
        value: csatData?.trend_7d || 0,
        isPositive: (csatData?.trend_7d || 0) > 0
      },
      onClick: () => navigate('/relatorios/csat'),
      color: (csatData?.avg_rating || 0) >= 4 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
    },
    {
      title: 'Tempo por Agente (7d)',
      value: `${Math.round((timeData?.total_minutes_7d || 0) / 60)}h`,
      subtitle: `${timeData?.active_agents || 0} agentes ativos`,
      icon: <Users className="w-4 h-4" />,
      onClick: () => navigate('/relatorios/tempo'),
    },
    {
      title: 'Inbox Processada (7d)',
      value: inboxData || 0,
      subtitle: 'Triagens realizadas',
      icon: <Inbox className="w-4 h-4" />,
      trend: {
        value: 12.3,
        isPositive: true
      },
      onClick: () => navigate('/relatorios/inbox'),
    },
    {
      title: 'Financeiro Atrasado',
      value: `R$ ${(financialData?.total_overdue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `${financialData?.overdue_installments || 0} parcelas • ${financialData?.affected_plans || 0} planos`,
      icon: <DollarSign className="w-4 h-4" />,
      onClick: () => navigate('/relatorios/financeiro'),
      color: (financialData?.total_overdue || 0) > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Relatórios</h1>
          <p className="text-neutral-600">Métricas e análises de performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Últimos 30 dias
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Alert for Critical Issues */}
      {((slaTicketsData?.frt_violation_rate || 0) > 20 || 
        (slaEtapasData?.overdue || 0) > 5 || 
        (financialData?.total_overdue || 0) > 10000) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Atenção: Indicadores Críticos</h3>
              <p className="text-sm text-red-700 mt-1">
                {(slaTicketsData?.frt_violation_rate || 0) > 20 && 'Alto índice de violação de SLA em tickets. '}
                {(slaEtapasData?.overdue || 0) > 5 && 'Múltiplas etapas de jornada em atraso. '}
                {(financialData?.total_overdue || 0) > 10000 && 'Valor significativo em atraso no financeiro. '}
                Revise os relatórios detalhados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Resumo de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">FRT Compliance</span>
                <span className="font-medium">
                  {slaTicketsData ? 
                    `${((slaTicketsData.frt_compliant / slaTicketsData.total) * 100 || 0).toFixed(1)}%` : 
                    '0%'
                  }
                </span>
              </div>
              <Progress 
                value={slaTicketsData ? 
                  (slaTicketsData.frt_compliant / slaTicketsData.total) * 100 || 0 : 
                  0
                } 
                className="h-2"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">TTR Compliance</span>
                <span className="font-medium">
                  {slaTicketsData ? 
                    `${((slaTicketsData.ttr_compliant / slaTicketsData.total) * 100 || 0).toFixed(1)}%` : 
                    '0%'
                  }
                </span>
              </div>
              <Progress 
                value={slaTicketsData ? 
                  (slaTicketsData.ttr_compliant / slaTicketsData.total) * 100 || 0 : 
                  0
                } 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">CSAT Score</span>
                <span className="font-medium">
                  {csatData?.avg_rating?.toFixed(1) || '0.0'}/5.0
                </span>
              </div>
              <Progress 
                value={(csatData?.avg_rating || 0) * 20} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div className="text-sm">
                  <span className="font-medium">Meta FRT atingida</span>
                  <p className="text-neutral-600">Últimos 7 dias com 85% de compliance</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                <Star className="w-4 h-4 text-blue-600" />
                <div className="text-sm">
                  <span className="font-medium">CSAT melhorou</span>
                  <p className="text-neutral-600">+0.3 pontos vs semana anterior</p>
                </div>
              </div>
              
              {(financialData?.overdue_installments || 0) > 0 && (
                <div className="flex items-center gap-3 p-2 bg-orange-50 rounded">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div className="text-sm">
                    <span className="font-medium">Parcelas em atraso</span>
                    <p className="text-neutral-600">{financialData?.overdue_installments} parcelas precisam de atenção</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;
