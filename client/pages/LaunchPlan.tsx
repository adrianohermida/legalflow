import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Rocket,
  Database,
  Zap,
  Shield,
  Backup,
  Flag,
  Clock,
  Users,
  Activity
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  required: boolean;
  icon: React.ReactNode;
  details?: string;
}

interface LaunchDecision {
  decision: 'go' | 'no-go' | 'pending';
  comments: string;
  timestamp: string;
  created_by?: string;
}

const LaunchPlan: React.FC = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [launchDecision, setLaunchDecision] = useState<LaunchDecision>({
    decision: 'pending',
    comments: '',
    timestamp: new Date().toISOString()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // System health data
  const { data: healthMetrics } = useSupabaseQuery(
    'launch-health-check',
    `
    select metric_name, status, metric_value, metric_unit
    from legalflow.vw_system_health_summary
    `
  );

  // Performance data
  const { data: performanceMetrics } = useSupabaseQuery(
    'launch-performance-check',
    `
    select route, p95_response_ms, error_rate, requests
    from legalflow.vw_performance_24h
    where route in ('/processos', '/tickets', '/jornadas', '/inbox')
    `
  );

  // QA test results
  const { data: qaResults } = useSupabaseQuery(
    'launch-qa-check',
    `
    select test_type, test_name, status
    from legalflow.vw_latest_qa_results
    `
  );

  // Feature flags status
  const { data: featureFlags } = useSupabaseQuery(
    'launch-feature-flags',
    `
    select key, enabled
    from legalflow.feature_flags
    where key in ('tickets', 'activities', 'jornadas', 'agenda', 'relatorios', 'financeiro')
    `
  );

  // Initialize checklist
  useEffect(() => {
    const items: ChecklistItem[] = [
      // Database
      {
        id: 'db-migrations',
        category: 'Banco',
        title: 'Migrações Aplicadas',
        description: 'Todas as migrações SQL foram aplicadas de forma idempotente',
        status: 'pending',
        required: true,
        icon: <Database className="h-4 w-4" />
      },
      {
        id: 'db-indexes',
        category: 'Banco',
        title: 'Índices Criados',
        description: '30+ índices de performance implementados',
        status: 'pending',
        required: true,
        icon: <Database className="h-4 w-4" />
      },
      {
        id: 'db-rls',
        category: 'Banco',
        title: 'RLS Ensaiado',
        description: 'Row Level Security testado e funcionando',
        status: 'pending',
        required: true,
        icon: <Shield className="h-4 w-4" />
      },

      // Performance
      {
        id: 'perf-processos',
        category: 'Performance',
        title: 'Processos < 1s P95',
        description: 'Lista de processos carrega em menos de 1 segundo P95',
        status: 'pending',
        required: true,
        icon: <Zap className="h-4 w-4" />
      },
      {
        id: 'perf-tickets',
        category: 'Performance',
        title: 'Tickets < 1s P95',
        description: 'Sistema de tickets responde rapidamente',
        status: 'pending',
        required: true,
        icon: <Zap className="h-4 w-4" />
      },
      {
        id: 'perf-jornadas',
        category: 'Performance',
        title: 'Jornadas < 1s P95',
        description: 'Fluxos de jornadas com performance adequada',
        status: 'pending',
        required: true,
        icon: <Zap className="h-4 w-4" />
      },
      {
        id: 'perf-inbox',
        category: 'Performance',
        title: 'Inbox < 1s P95',
        description: 'Inbox carrega publicações rapidamente',
        status: 'pending',
        required: true,
        icon: <Zap className="h-4 w-4" />
      },

      // E2E Tests
      {
        id: 'e2e-smoke',
        category: 'E2E',
        title: 'Smoke Tests 100%',
        description: 'Todos os smoke tests passando',
        status: 'pending',
        required: true,
        icon: <CheckCircle className="h-4 w-4" />
      },
      {
        id: 'e2e-scenarios',
        category: 'E2E',
        title: '5 Cenários E2E',
        description: 'Cenários críticos de usuário testados',
        status: 'pending',
        required: true,
        icon: <Users className="h-4 w-4" />
      },
      {
        id: 'e2e-rls',
        category: 'E2E',
        title: 'RLS E2E',
        description: 'Políticas RLS validadas em cenários reais',
        status: 'pending',
        required: true,
        icon: <Shield className="h-4 w-4" />
      },

      // Feature Flags
      {
        id: 'flags-tickets',
        category: 'Flags',
        title: 'Tickets Habilitado',
        description: 'Sistema de tickets ativo',
        status: 'pending',
        required: true,
        icon: <Flag className="h-4 w-4" />
      },
      {
        id: 'flags-activities',
        category: 'Flags',
        title: 'Activities Habilitado',
        description: 'Gestão de atividades ativa',
        status: 'pending',
        required: true,
        icon: <Activity className="h-4 w-4" />
      },
      {
        id: 'flags-jornadas',
        category: 'Flags',
        title: 'Jornadas Habilitado',
        description: 'Fluxos de jornadas ativos',
        status: 'pending',
        required: true,
        icon: <Flag className="h-4 w-4" />
      },
      {
        id: 'flags-agenda',
        category: 'Flags',
        title: 'Agenda Habilitado',
        description: 'Sistema de agenda ativo',
        status: 'pending',
        required: true,
        icon: <Clock className="h-4 w-4" />
      },
      {
        id: 'flags-relatorios',
        category: 'Flags',
        title: 'Relatórios Conforme Cronograma',
        description: 'Relatórios habilitados conforme planejamento',
        status: 'pending',
        required: false,
        icon: <Flag className="h-4 w-4" />
      },
      {
        id: 'flags-financeiro',
        category: 'Flags',
        title: 'Financeiro Conforme Cronograma',
        description: 'Módulo financeiro habilitado quando apropriado',
        status: 'pending',
        required: false,
        icon: <Flag className="h-4 w-4" />
      },

      // Backups
      {
        id: 'backup-snapshot',
        category: 'Backups',
        title: 'Snapshot Pré-Deploy',
        description: 'Backup completo antes do go-live',
        status: 'pending',
        required: true,
        icon: <Backup className="h-4 w-4" />
      }
    ];

    setChecklist(items);
  }, []);

  // Auto-evaluate checklist based on data
  useEffect(() => {
    if (!healthMetrics || !performanceMetrics || !qaResults || !featureFlags) return;

    setChecklist(prev => prev.map(item => {
      let newStatus = item.status;

      switch (item.id) {
        case 'db-rls':
          const rlsMetric = healthMetrics.find(m => m.metric_name === 'rls_enabled');
          newStatus = rlsMetric?.status === 'healthy' ? 'completed' : 'failed';
          break;

        case 'perf-processos':
          const processosPerf = performanceMetrics.find(m => m.route === '/processos');
          newStatus = processosPerf?.p95_response_ms < 1000 ? 'completed' : 'failed';
          break;

        case 'perf-tickets':
          const ticketsPerf = performanceMetrics.find(m => m.route === '/tickets');
          newStatus = ticketsPerf?.p95_response_ms < 1000 ? 'completed' : 'failed';
          break;

        case 'perf-jornadas':
          const jornadasPerf = performanceMetrics.find(m => m.route === '/jornadas');
          newStatus = jornadasPerf?.p95_response_ms < 1000 ? 'completed' : 'failed';
          break;

        case 'perf-inbox':
          const inboxPerf = performanceMetrics.find(m => m.route === '/inbox');
          newStatus = inboxPerf?.p95_response_ms < 1000 ? 'completed' : 'failed';
          break;

        case 'e2e-smoke':
          const smokeTests = qaResults.filter(q => q.test_type === 'smoke');
          newStatus = smokeTests.every(t => t.status === 'pass') ? 'completed' : 'failed';
          break;

        case 'e2e-scenarios':
          const e2eTests = qaResults.filter(q => q.test_type === 'e2e');
          newStatus = e2eTests.length >= 5 && e2eTests.every(t => t.status === 'pass') ? 'completed' : 'failed';
          break;

        case 'e2e-rls':
          const rlsTests = qaResults.filter(q => q.test_type === 'rls');
          newStatus = rlsTests.every(t => t.status === 'pass') ? 'completed' : 'failed';
          break;

        case 'flags-tickets':
          const ticketsFlag = featureFlags.find(f => f.key === 'tickets');
          newStatus = ticketsFlag?.enabled ? 'completed' : 'pending';
          break;

        case 'flags-activities':
          const activitiesFlag = featureFlags.find(f => f.key === 'activities');
          newStatus = activitiesFlag?.enabled ? 'completed' : 'pending';
          break;

        case 'flags-jornadas':
          const jornadasFlag = featureFlags.find(f => f.key === 'jornadas');
          newStatus = jornadasFlag?.enabled ? 'completed' : 'pending';
          break;

        case 'flags-agenda':
          const agendaFlag = featureFlags.find(f => f.key === 'agenda');
          newStatus = agendaFlag?.enabled ? 'completed' : 'pending';
          break;

        case 'flags-relatorios':
          const relatoriosFlag = featureFlags.find(f => f.key === 'relatorios');
          newStatus = relatoriosFlag?.enabled ? 'completed' : 'pending';
          break;

        case 'flags-financeiro':
          const financeiroFlag = featureFlags.find(f => f.key === 'financeiro');
          newStatus = financeiroFlag?.enabled ? 'completed' : 'pending';
          break;

        // Manual checks for now
        case 'db-migrations':
        case 'db-indexes':
        case 'backup-snapshot':
          // These would need manual confirmation or integration with deployment tools
          break;
      }

      return { ...item, status: newStatus };
    }));
  }, [healthMetrics, performanceMetrics, qaResults, featureFlags]);

  const toggleItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' }
        : item
    ));
  };

  const submitDecision = async () => {
    setIsSubmitting(true);
    try {
      // Save decision to database
      await supabase.from('legalflow.app_events').insert({
        event: 'launch_decision_made',
        payload: {
          decision: launchDecision.decision,
          comments: launchDecision.comments,
          checklist_status: getChecklistSummary(),
          timestamp: launchDecision.timestamp
        }
      });

      toast({
        title: `Decisão Registrada: ${launchDecision.decision.toUpperCase()}`,
        description: launchDecision.decision === 'go' 
          ? 'Sistema autorizado para go-live' 
          : 'Go-live não autorizado - revisar pendências',
        variant: launchDecision.decision === 'go' ? 'default' : 'destructive'
      });

    } catch (error) {
      console.error('Error submitting decision:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao registrar decisão',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChecklistSummary = () => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.status === 'completed').length;
    const failed = checklist.filter(item => item.status === 'failed').length;
    const requiredCompleted = checklist.filter(item => item.required && item.status === 'completed').length;
    const requiredTotal = checklist.filter(item => item.required).length;
    
    return {
      total,
      completed,
      failed,
      pending: total - completed - failed,
      requiredCompleted,
      requiredTotal,
      completionRate: Math.round((completed / total) * 100),
      requiredCompletionRate: Math.round((requiredCompleted / requiredTotal) * 100)
    };
  };

  const summary = getChecklistSummary();
  const canGoLive = summary.requiredCompletionRate === 100 && summary.failed === 0;

  const getStatusIcon = (status: string, required: boolean) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-600" />;
    return <AlertTriangle className={`h-4 w-4 ${required ? 'text-orange-600' : 'text-gray-400'}`} />;
  };

  const categoryGroups = checklist.reduce((groups, item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
    return groups;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plano de Lançamento</h1>
        <p className="text-gray-600">
          Checklist Go/No-Go para produção
        </p>
      </div>

      {/* Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Rocket className="h-5 w-5" />
            <span>Status do Lançamento</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
              <div className="text-sm text-gray-600">Completo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.pending}</div>
              <div className="text-sm text-gray-600">Pendente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
              <div className="text-sm text-gray-600">Falhou</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.requiredCompletionRate}%</div>
              <div className="text-sm text-gray-600">Críticos OK</div>
            </div>
          </div>

          <Progress value={summary.completionRate} className="mb-4" />
          
          <Alert className={`${canGoLive ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {canGoLive ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={canGoLive ? 'text-green-800' : 'text-red-800'}>
              <strong>
                {canGoLive ? 'PRONTO PARA GO-LIVE' : 'NÃO PRONTO PARA GO-LIVE'}
              </strong>
              {!canGoLive && (
                <span> - {summary.requiredTotal - summary.requiredCompleted} item(s) crítico(s) pendente(s)</span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      <div className="space-y-6">
        {Object.entries(categoryGroups).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                {items.filter(i => i.status === 'completed').length}/{items.length} completo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={item.status === 'completed'}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      {getStatusIcon(item.status, item.required)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.title}</span>
                        {item.required && (
                          <Badge variant="outline" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                      {item.details && (
                        <div className="text-xs text-gray-500 mt-1">{item.details}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Decision Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Decisão de Lançamento</CardTitle>
          <CardDescription>
            Tome a decisão final baseada no checklist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Comentários</label>
              <Textarea
                placeholder="Comentários sobre a decisão..."
                value={launchDecision.comments}
                onChange={(e) => setLaunchDecision(prev => ({ ...prev, comments: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex space-x-3">
              <Button 
                onClick={() => {
                  setLaunchDecision(prev => ({ ...prev, decision: 'go' }));
                  submitDecision();
                }}
                disabled={!canGoLive || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                GO - Autorizar Lançamento
              </Button>
              
              <Button 
                variant="destructive"
                onClick={() => {
                  setLaunchDecision(prev => ({ ...prev, decision: 'no-go' }));
                  submitDecision();
                }}
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                NO-GO - Não Autorizar
              </Button>
            </div>

            {launchDecision.decision !== 'pending' && (
              <Alert className={`${launchDecision.decision === 'go' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <AlertDescription>
                  <strong>Decisão:</strong> {launchDecision.decision.toUpperCase()} em {new Date(launchDecision.timestamp).toLocaleString('pt-BR')}
                  {launchDecision.comments && (
                    <>
                      <br />
                      <strong>Comentários:</strong> {launchDecision.comments}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaunchPlan;
