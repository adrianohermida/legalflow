import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { 
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  Calendar,
  BarChart3,
  ExternalLink,
  Filter,
  Download
} from 'lucide-react';
import { 
  ReportCard, 
  SLAMetrics, 
  NichoCompletion, 
  PublicationsMetrics, 
  PaymentMetrics, 
  AIActivityMetrics,
  DrillThroughFilters
} from '../types/financial';

// Mock analytics data
const mockSLAMetrics: SLAMetrics = {
  total_stages: 156,
  within_sla: 112,
  overdue: 32,
  critical_overdue: 12,
  avg_completion_time_hours: 28.5
};

const mockNichoCompletion: NichoCompletion[] = [
  {
    nicho: 'Trabalhista',
    total_journeys: 45,
    completed_journeys: 32,
    avg_completion_time_days: 35,
    completion_rate: 71.1
  },
  {
    nicho: 'Família',
    total_journeys: 28,
    completed_journeys: 22,
    avg_completion_time_days: 42,
    completion_rate: 78.6
  },
  {
    nicho: 'Empresarial',
    total_journeys: 18,
    completed_journeys: 12,
    avg_completion_time_days: 65,
    completion_rate: 66.7
  },
  {
    nicho: 'Criminal',
    total_journeys: 12,
    completed_journeys: 8,
    avg_completion_time_days: 28,
    completion_rate: 66.7
  }
];

const mockPublicationsMetrics: PublicationsMetrics = {
  total_received: 248,
  processed: 198,
  pending: 50,
  linked_to_cases: 156,
  in_journeys: 89,
  processing_rate: 79.8
};

const mockPaymentMetrics: PaymentMetrics = {
  total_plans: 23,
  active_plans: 18,
  total_revenue: 245000,
  overdue_amount: 23500,
  overdue_installments: 8,
  collection_rate: 91.2
};

const mockAIActivityMetrics: AIActivityMetrics = {
  total_generations: 156,
  petitions_generated: 89,
  responses_generated: 45,
  documents_analyzed: 234,
  time_saved_hours: 124
};

// Mock drill-through data
const mockOverdueStages = [
  {
    id: '1',
    journey_instance: 'Onboarding Trabalhista - João Silva',
    stage_name: 'Upload de Documentos',
    due_date: '2024-02-05',
    days_overdue: 8,
    responsible: 'Dr. Maria Santos'
  },
  {
    id: '2',
    journey_instance: 'Divórcio Consensual - Maria Oliveira',
    stage_name: 'Análise de Documentos',
    due_date: '2024-02-10',
    days_overdue: 3,
    responsible: 'Dr. João Silva'
  }
];

const mockOverduePayments = [
  {
    id: '1',
    client_name: 'Maria Oliveira',
    amount: 2500,
    due_date: '2024-03-20',
    days_overdue: 15,
    plan_type: 'Divórcio Consensual'
  }
];

export function Relatorios() {
  const [selectedDrillThrough, setSelectedDrillThrough] = useState<DrillThroughFilters | null>(null);
  const [isDrillThroughOpen, setIsDrillThroughOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 10) / 10}%`;
  };

  const handleDrillThrough = (type: DrillThroughFilters['type'], criteria?: any) => {
    setSelectedDrillThrough({ type, criteria });
    setIsDrillThroughOpen(true);
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const reportCards: ReportCard[] = [
    // SLA Metrics
    {
      id: 'sla-within',
      title: 'Etapas no Prazo',
      value: mockSLAMetrics.within_sla,
      subtitle: `${formatPercentage((mockSLAMetrics.within_sla / mockSLAMetrics.total_stages) * 100)} do total`,
      trend: 2.5,
      status: 'success',
      icon: 'CheckCircle'
    },
    {
      id: 'sla-overdue',
      title: 'Etapas Atrasadas',
      value: mockSLAMetrics.overdue,
      subtitle: `${mockSLAMetrics.critical_overdue} críticas`,
      trend: -1.2,
      status: 'danger',
      icon: 'AlertTriangle'
    },
    {
      id: 'sla-avg-time',
      title: 'Tempo Médio Conclusão',
      value: `${mockSLAMetrics.avg_completion_time_hours}h`,
      subtitle: 'Por etapa',
      trend: -3.1,
      status: 'success',
      icon: 'Clock'
    },
    
    // Publications
    {
      id: 'pub-processed',
      title: 'Publicações Processadas',
      value: `${formatPercentage(mockPublicationsMetrics.processing_rate)}`,
      subtitle: `${mockPublicationsMetrics.processed}/${mockPublicationsMetrics.total_received}`,
      trend: 5.2,
      status: 'success',
      icon: 'FileText'
    },
    {
      id: 'pub-pending',
      title: 'Publicações Pendentes',
      value: mockPublicationsMetrics.pending,
      subtitle: 'Aguardando triagem',
      trend: -8.1,
      status: 'warning',
      icon: 'Clock'
    },
    
    // Payment Metrics
    {
      id: 'payment-collection',
      title: 'Taxa de Cobrança',
      value: `${formatPercentage(mockPaymentMetrics.collection_rate)}`,
      subtitle: formatCurrency(mockPaymentMetrics.total_revenue),
      trend: 1.8,
      status: 'success',
      icon: 'DollarSign'
    },
    {
      id: 'payment-overdue',
      title: 'Valores Vencidos',
      value: formatCurrency(mockPaymentMetrics.overdue_amount),
      subtitle: `${mockPaymentMetrics.overdue_installments} parcelas`,
      trend: 12.3,
      status: 'danger',
      icon: 'AlertTriangle'
    },
    
    // AI Activity
    {
      id: 'ai-generations',
      title: 'Gerações IA',
      value: mockAIActivityMetrics.total_generations,
      subtitle: 'Este mês',
      trend: 15.6,
      status: 'info',
      icon: 'Activity'
    },
    {
      id: 'ai-time-saved',
      title: 'Tempo Economizado',
      value: `${mockAIActivityMetrics.time_saved_hours}h`,
      subtitle: 'Com automação IA',
      trend: 22.1,
      status: 'info',
      icon: 'TrendingUp'
    }
  ];

  const renderDrillThroughContent = () => {
    if (!selectedDrillThrough) return null;

    switch (selectedDrillThrough.type) {
      case 'sla':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Etapas com SLA Vencido</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOverdueStages.map((stage) => (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.journey_instance}</TableCell>
                    <TableCell>{stage.stage_name}</TableCell>
                    <TableCell>{new Date(stage.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{stage.days_overdue} dias</Badge>
                    </TableCell>
                    <TableCell>{stage.responsible}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pagamentos em Atraso</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Tipo de Plano</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOverduePayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.client_name}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{payment.days_overdue} dias</Badge>
                    </TableCell>
                    <TableCell>{payment.plan_type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return <p>Dados detalhados não disponíveis para este item.</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios & SLA</h1>
          <p className="text-gray-600 mt-1">
            Gestão por exceção e monitoramento de performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {reportCards.map((card) => {
          const IconComponent = {
            CheckCircle,
            AlertTriangle,
            Clock,
            FileText,
            DollarSign,
            Activity,
            TrendingUp
          }[card.icon] || Activity;

          return (
            <Card 
              key={card.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (card.id.includes('sla') || card.id.includes('overdue')) {
                  handleDrillThrough(card.id.includes('payment') ? 'payments' : 'sla');
                }
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <IconComponent className={`h-4 w-4 ${
                  card.status === 'success' ? 'text-green-600' :
                  card.status === 'warning' ? 'text-yellow-600' :
                  card.status === 'danger' ? 'text-red-600' :
                  'text-blue-600'
                }`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  {card.trend && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(card.trend)}`}>
                      {getTrendIcon(card.trend)}
                      {Math.abs(card.trend)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion by Niche */}
      <Card>
        <CardHeader>
          <CardTitle>Conclusão por Nicho Jurídico</CardTitle>
          <CardDescription>
            Performance de conclusão de jornadas por área de atuação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockNichoCompletion.map((nicho) => (
              <div key={nicho.nicho} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{nicho.nicho}</span>
                    <Badge variant="outline">
                      {nicho.completed_journeys}/{nicho.total_journeys} jornadas
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatPercentage(nicho.completion_rate)}</div>
                    <div className="text-sm text-gray-500">{nicho.avg_completion_time_days} dias médio</div>
                  </div>
                </div>
                <Progress value={nicho.completion_rate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Atividade da IA</CardTitle>
            <CardDescription>
              Utilização de recursos de inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Petições Geradas</span>
                <span className="font-medium">{mockAIActivityMetrics.petitions_generated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Respostas Automatizadas</span>
                <span className="font-medium">{mockAIActivityMetrics.responses_generated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Documentos Analisados</span>
                <span className="font-medium">{mockAIActivityMetrics.documents_analyzed}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center font-medium">
                  <span>Tempo Total Economizado</span>
                  <span className="text-green-600">{mockAIActivityMetrics.time_saved_hours}h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publicações & Movimentações</CardTitle>
            <CardDescription>
              Status de processamento do inbox legal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Recebidas</span>
                <span className="font-medium">{mockPublicationsMetrics.total_received}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Processadas</span>
                <span className="font-medium text-green-600">{mockPublicationsMetrics.processed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pendentes</span>
                <span className="font-medium text-yellow-600">{mockPublicationsMetrics.pending}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Vinculadas a Casos</span>
                <span className="font-medium">{mockPublicationsMetrics.linked_to_cases}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Em Jornadas</span>
                <span className="font-medium text-blue-600">{mockPublicationsMetrics.in_journeys}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center font-medium">
                  <span>Taxa de Processamento</span>
                  <span className="text-green-600">{formatPercentage(mockPublicationsMetrics.processing_rate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso direto aos módulos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/jornadas">
                <Target className="h-6 w-6" />
                <span>Jornadas</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/inbox">
                <FileText className="h-6 w-6" />
                <span>Inbox Legal</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/planos-pagamento">
                <DollarSign className="h-6 w-6" />
                <span>Pagamentos</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
              <Link to="/clientes">
                <Users className="h-6 w-6" />
                <span>Clientes</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drill-through Modal */}
      <Dialog open={isDrillThroughOpen} onOpenChange={setIsDrillThroughOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhamento</DialogTitle>
            <DialogDescription>
              Informações detalhadas do indicador selecionado
            </DialogDescription>
          </DialogHeader>
          {renderDrillThroughContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
