import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  FileText, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import { 
  useDashboardStats, 
  useRecentActivities, 
  useStageInstancesSLA,
  useQueryPerformanceStats 
} from '../hooks/useOptimizedQueries';
import OptimizedGlobalSearch from './OptimizedGlobalSearch';

const OptimizedDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentActivities, isLoading: activitiesLoading } = useRecentActivities(8);
  const { data: slaInstances, isLoading: slaLoading } = useStageInstancesSLA();
  const { data: performanceStats } = useQueryPerformanceStats();

  const handleSearchSelect = (result: any) => {
    console.log('Resultado selecionado:', result);
    // Implementar navegação baseada no tipo
    switch (result.type) {
      case 'processo':
        window.location.href = `/processos/${result.id}`;
        break;
      case 'cliente':
        window.location.href = `/clientes?search=${result.id}`;
        break;
      case 'contact':
        window.location.href = `/crm/contatos?id=${result.id}`;
        break;
      case 'ticket':
        window.location.href = `/tickets/${result.id}`;
        break;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'todo':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimeRemaining = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header com busca otimizada */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ⚡ Dashboard Otimizado
          </h1>
          <p className="text-gray-600 mt-1">
            Performance aprimorada com índices e queries otimizadas
          </p>
        </div>
        
        <div className="w-full lg:w-96">
          <OptimizedGlobalSearch 
            onSelect={handleSearchSelect}
            placeholder="Busca rápida otimizada..."
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Processos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.total_processos || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Clientes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.total_clientes || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tickets Abertos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.tickets_abertos || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tarefas Pendentes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.tarefas_pendentes || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividades Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Atividades Recentes
            </CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Otimizada
            </Badge>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities?.slice(0, 8).map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(activity.status)}
                      <div>
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {activity.processo_titulo || activity.numero_cnj}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getPriorityBadge(activity.priority)}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {(!recentActivities || recentActivities.length === 0) && (
                  <p className="text-center text-gray-500 py-8">
                    Nenhuma atividade recente encontrada
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLA Monitor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Monitor de SLA
            </CardTitle>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Tempo Real
            </Badge>
          </CardHeader>
          <CardContent>
            {slaLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {slaInstances?.slice(0, 6).map((instance: any) => (
                  <div key={instance.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{instance.stage_name}</span>
                      <Badge 
                        variant={instance.hours_remaining < 24 ? "destructive" : "secondary"}
                        className={instance.hours_remaining < 24 ? "" : "bg-yellow-100 text-yellow-800"}
                      >
                        {formatTimeRemaining(instance.hours_remaining)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {instance.template_name} - {instance.cliente_cpfcnpj}
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          instance.hours_remaining < 24 ? 'bg-red-600' : 
                          instance.hours_remaining < 72 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{
                          width: `${Math.max(10, Math.min(100, (instance.hours_remaining / 168) * 100))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {(!slaInstances || slaInstances.length === 0) && (
                  <p className="text-center text-gray-500 py-8">
                    ✅ Todos os SLAs estão em dia
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      {performanceStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estatísticas de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {performanceStats.map((stat: any) => (
                <div key={stat.table_name} className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium capitalize">{stat.table_name}</h4>
                  <p className="text-sm text-gray-600">
                    {stat.total_records.toLocaleString()} registros
                  </p>
                  <p className="text-sm text-gray-600">
                    {stat.index_count} índices ativos
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OptimizedDashboard;
