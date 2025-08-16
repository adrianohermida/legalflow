import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { supabase } from "../lib/supabase";
import {
  Activity,
  Database,
  Cpu,
  Timer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Globe,
  Zap,
} from "lucide-react";

interface HealthMetric {
  metric_name: string;
  status: "healthy" | "warning" | "critical";
  metric_value: number;
  metric_unit: string;
  details: any;
  created_at: string;
}

interface PerformanceMetric {
  route: string;
  requests: number;
  avg_response_ms: number;
  p95_response_ms: number;
  p99_response_ms: number;
  error_count: number;
  error_rate: number;
}

interface AppEvent {
  id: string;
  event: string;
  payload: any;
  created_at: string;
  user_id?: string;
  ip_address?: string;
}

const StatusDashboard: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Health metrics query
  const { data: healthMetrics, refetch: refetchHealth } = useSupabaseQuery<
    HealthMetric[]
  >(
    "system-health",
    `
    select metric_name, status, metric_value, metric_unit, details, created_at
    from legalflow.vw_system_health_summary
    order by 
      case status 
        when 'critical' then 1 
        when 'warning' then 2 
        when 'healthy' then 3 
      end,
      metric_name
    `,
  );

  // Performance metrics query (24h)
  const { data: performanceMetrics, refetch: refetchPerformance } =
    useSupabaseQuery<PerformanceMetric[]>(
      "performance-24h",
      `
    select route, requests, avg_response_ms, p95_response_ms, p99_response_ms, error_count, error_rate
    from legalflow.vw_performance_24h
    order by requests desc
    limit 10
    `,
    );

  // Recent events (last 2 hours)
  const { data: recentEvents, refetch: refetchEvents } = useSupabaseQuery<
    AppEvent[]
  >(
    "recent-events",
    `
    select id, event, payload, created_at, user_id, ip_address
    from legalflow.app_events 
    where created_at >= now() - interval '2 hours'
    order by created_at desc
    limit 50
    `,
  );

  // Event counts by type
  const { data: eventCounts } = useSupabaseQuery(
    "event-counts",
    `
    select event, count(*) as count
    from legalflow.vw_recent_events
    order by count desc
    limit 10
    `,
  );

  // System overview stats
  const { data: systemStats } = useSupabaseQuery(
    "system-stats",
    `
    select 
      (select count(*) from legalflow.processos) as total_processos,
      (select count(*) from legalflow.tickets where status != 'resolved') as active_tickets,
      (select count(*) from legalflow.journey_instances where status = 'active') as active_journeys,
      (select count(*) from auth.users where last_sign_in_at >= now() - interval '24 hours') as active_users_24h
    `,
  );

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchHealth(),
        refetchPerformance(),
        refetchEvents(),
      ]);
      setLastUpdate(new Date());

      // Log refresh event
      await supabase.from("legalflow.app_events").insert({
        event: "status_dashboard_refresh",
        payload: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "critical":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      healthy: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 500) return "text-green-600";
    if (ms < 1000) return "text-yellow-600";
    return "text-red-600";
  };

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffMinutes < 1) return "agora";
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const overallHealth = healthMetrics?.every((h) => h.status === "healthy")
    ? "healthy"
    : healthMetrics?.some((h) => h.status === "critical")
      ? "critical"
      : "warning";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Status do Sistema
            </h1>
            <p className="text-gray-600">
              Observabilidade e saúde da plataforma em tempo real
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")}
            </div>
            <Button
              onClick={refreshAll}
              disabled={isRefreshing}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {getStatusIcon(overallHealth)}
              <div>
                <div className="text-sm font-medium">Status Geral</div>
                <Badge className={getStatusBadge(overallHealth)}>
                  {overallHealth === "healthy"
                    ? "Saudável"
                    : overallHealth === "warning"
                      ? "Atenção"
                      : "Crítico"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">Processos</div>
                <div className="text-2xl font-bold">
                  {systemStats?.total_processos || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">Tickets Ativos</div>
                <div className="text-2xl font-bold">
                  {systemStats?.active_tickets || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium">Usuários 24h</div>
                <div className="text-2xl font-bold">
                  {systemStats?.active_users_24h || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">Saúde</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saúde do Sistema</CardTitle>
              <CardDescription>
                Monitoramento de conectividade, RLS e performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthMetrics?.map((metric) => (
                  <div
                    key={metric.metric_name}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {metric.metric_name === "supabase_connection" && (
                          <Database className="h-4 w-4" />
                        )}
                        {metric.metric_name === "rls_enabled" && (
                          <Shield className="h-4 w-4" />
                        )}
                        {metric.metric_name === "query_performance" && (
                          <Zap className="h-4 w-4" />
                        )}
                        {![
                          "supabase_connection",
                          "rls_enabled",
                          "query_performance",
                        ].includes(metric.metric_name) && (
                          <Cpu className="h-4 w-4" />
                        )}
                        <span className="font-medium capitalize">
                          {metric.metric_name.replace(/_/g, " ")}
                        </span>
                      </div>
                      {getStatusIcon(metric.status)}
                    </div>

                    <div className="text-2xl font-bold mb-1">
                      {metric.metric_value} {metric.metric_unit}
                    </div>

                    <Badge className={getStatusBadge(metric.status)} size="sm">
                      {metric.status}
                    </Badge>

                    {metric.details &&
                      Object.keys(metric.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {JSON.stringify(metric.details, null, 2).slice(
                            0,
                            100,
                          )}
                          ...
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Performance (24h)</CardTitle>
              <CardDescription>
                Latência, throughput e taxa de erro por rota
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceMetrics?.map((metric) => (
                  <div key={metric.route} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-mono text-sm font-medium">
                        {metric.route}
                      </div>
                      <Badge
                        variant={
                          metric.error_rate > 5 ? "destructive" : "default"
                        }
                      >
                        {metric.requests} reqs
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Média</div>
                        <div
                          className={`font-bold ${getResponseTimeColor(metric.avg_response_ms)}`}
                        >
                          {metric.avg_response_ms}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-600">P95</div>
                        <div
                          className={`font-bold ${getResponseTimeColor(metric.p95_response_ms)}`}
                        >
                          {metric.p95_response_ms}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-600">P99</div>
                        <div
                          className={`font-bold ${getResponseTimeColor(metric.p99_response_ms)}`}
                        >
                          {metric.p99_response_ms}ms
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-600">Erro</div>
                        <div
                          className={`font-bold ${metric.error_rate > 5 ? "text-red-600" : "text-green-600"}`}
                        >
                          {metric.error_rate}%
                        </div>
                      </div>
                    </div>

                    {metric.p95_response_ms > 1000 && (
                      <Alert className="mt-3 border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          P95 acima de 1s - considere otimização
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event Counts */}
            <Card>
              <CardHeader>
                <CardTitle>Top Eventos (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {eventCounts?.map((event: any) => (
                    <div
                      key={event.event}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono truncate">{event.event}</span>
                      <Badge variant="outline">{event.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Events Stream */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stream de Eventos (2h)</CardTitle>
                <CardDescription>Eventos em tempo quase real</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentEvents?.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between text-sm p-2 border rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <Activity className="h-3 w-3 text-gray-400" />
                        <span className="font-mono text-xs">{event.event}</span>
                        {event.user_id && (
                          <Badge variant="outline" className="text-xs">
                            user
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatEventTime(event.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatusDashboard;
