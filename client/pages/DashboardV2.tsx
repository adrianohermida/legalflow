import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Users,
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  ArrowRight,
  Plus,
  Eye,
  Inbox,
  Activity,
  DollarSign,
  Loader2,
} from "lucide-react";
import { supabase, lf } from "../lib/supabase";
import { formatCNJ, formatDate } from "../lib/utils";

interface DashboardStats {
  totalProcessos: number;
  processosAtivos: number;
  totalClientes: number;
  prazosEstaSemanana: number;
  publicacoesNaoLidas: number;
  tarefasPendentes: number;
  eventosProximos: number;
}

interface RecentActivity {
  id: string;
  type: "processo" | "publicacao" | "tarefa" | "evento" | "cliente";
  title: string;
  description: string;
  time: string;
  numero_cnj?: string;
  created_at: string;
}

const quickActions = [
  {
    title: "Novo Processo",
    description: "Cadastrar novo processo",
    href: "/processos/novo",
    icon: FileText,
    color: "bg-brand-700",
  },
  {
    title: "Novo Cliente",
    description: "Adicionar cliente",
    href: "/clientes/novo",
    icon: Users,
    color: "bg-success",
  },
  {
    title: "Nova Jornada",
    description: "Criar jornada do cliente",
    href: "/jornadas/nova",
    icon: Target,
    color: "bg-brand-700",
  },
  {
    title: "Inbox Legal",
    description: "Triagem publicações",
    href: "/inbox-v2",
    icon: Inbox,
    color: "bg-orange-500",
  },
];

export function DashboardV2() {
  // Query para estatísticas do dashboard
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Buscar total de processos
      const { count: totalProcessos } = await supabase
        .from("processos")
        .select("*", { count: "exact", head: true });

      // Buscar total de clientes
      const { count: totalClientes } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });

      // Buscar publicações não lidas
      const { count: publicacoesNaoLidas } = await supabase
        .from("publicacoes")
        .select("*", { count: "exact", head: true })
        .eq("lido", false);

      // Buscar tarefas pendentes
      const { count: tarefasPendentes } = await lf
        .from("activities")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]);

      // Buscar eventos próximos (próximos 7 dias)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { count: eventosProximos } = await lf
        .from("eventos_agenda")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", nextWeek.toISOString());

      return {
        totalProcessos: totalProcessos || 0,
        processosAtivos: totalProcessos || 0, // Assumindo que todos estão ativos
        totalClientes: totalClientes || 0,
        prazosEstaSemanana: eventosProximos || 0,
        publicacoesNaoLidas: publicacoesNaoLidas || 0,
        tarefasPendentes: tarefasPendentes || 0,
        eventosProximos: eventosProximos || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Query para atividades recentes
  const { data: recentActivities = [], isLoading: activitiesLoading } =
    useQuery<RecentActivity[]>({
      queryKey: ["recent-activities"],
      queryFn: async () => {
        const activities: RecentActivity[] = [];

        // Últimos processos cadastrados
        const { data: recentProcessos } = await supabase
          .from("processos")
          .select("numero_cnj, titulo_polo_ativo, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        recentProcessos?.forEach((processo) => {
          activities.push({
            id: `processo-${processo.numero_cnj}`,
            type: "processo",
            title: "Novo processo cadastrado",
            description: `${formatCNJ(processo.numero_cnj)} - ${processo.titulo_polo_ativo || "Processo"}`,
            time: formatDate(processo.created_at),
            numero_cnj: processo.numero_cnj,
            created_at: processo.created_at,
          });
        });

        // Últimas publicações
        const { data: recentPublicacoes } = await supabase
          .from("publicacoes")
          .select("id, numero_cnj, data, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        recentPublicacoes?.forEach((pub) => {
          const resumo =
            pub.data?.resumo || pub.data?.texto || "Nova publicação";
          activities.push({
            id: `pub-${pub.id}`,
            type: "publicacao",
            title: "Nova publicação",
            description: `${pub.numero_cnj ? formatCNJ(pub.numero_cnj) : "Sem CNJ"} - ${resumo.substring(0, 50)}...`,
            time: formatDate(pub.created_at),
            numero_cnj: pub.numero_cnj,
            created_at: pub.created_at,
          });
        });

        // Últimas tarefas
        const { data: recentTarefas } = await lf
          .from("activities")
          .select("id, numero_cnj, title, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        recentTarefas?.forEach((tarefa) => {
          activities.push({
            id: `tarefa-${tarefa.id}`,
            type: "tarefa",
            title: "Nova tarefa criada",
            description: `${tarefa.numero_cnj ? formatCNJ(tarefa.numero_cnj) : ""} - ${tarefa.title}`,
            time: formatDate(tarefa.created_at),
            numero_cnj: tarefa.numero_cnj,
            created_at: tarefa.created_at,
          });
        });

        // Últimos clientes
        const { data: recentClientes } = await supabase
          .from("clientes")
          .select("cpfcnpj, nome, created_at")
          .order("created_at", { ascending: false })
          .limit(2);

        recentClientes?.forEach((cliente) => {
          activities.push({
            id: `cliente-${cliente.cpfcnpj}`,
            type: "cliente",
            title: "Novo cliente cadastrado",
            description: `${cliente.nome} - ${cliente.cpfcnpj}`,
            time: formatDate(cliente.created_at),
            created_at: cliente.created_at,
          });
        });

        // Ordenar por data mais recente
        return activities
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, 8);
      },
      staleTime: 5 * 60 * 1000,
    });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "processo":
        return FileText;
      case "publicacao":
        return Bell;
      case "tarefa":
        return Target;
      case "evento":
        return Calendar;
      case "cliente":
        return Users;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "processo":
        return "text-blue-600";
      case "publicacao":
        return "text-orange-600";
      case "tarefa":
        return "text-green-600";
      case "evento":
        return "text-purple-600";
      case "cliente":
        return "text-indigo-600";
      default:
        return "text-neutral-600";
    }
  };

  const getActivityLink = (activity: RecentActivity) => {
    switch (activity.type) {
      case "processo":
        return activity.numero_cnj
          ? `/processos-v2/${activity.numero_cnj}`
          : "/processos";
      case "publicacao":
        return "/inbox-v2";
      case "tarefa":
        return "/agenda";
      case "cliente":
        return "/clientes";
      default:
        return "/";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            Visão geral do escritório e métricas em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/processos/novo">
              <Plus className="w-4 h-4 mr-2" />
              Novo Processo
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-neutral-200 rounded animate-pulse w-20" />
                </CardTitle>
                <div className="h-4 w-4 bg-neutral-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-neutral-200 rounded animate-pulse mb-1" />
                <div className="h-3 bg-neutral-200 rounded animate-pulse w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Processos
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalProcessos}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.processosAtivos} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalClientes}</div>
                <p className="text-xs text-muted-foreground">
                  Total cadastrados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Publicações
                </CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.publicacoesNaoLidas}
                </div>
                <p className="text-xs text-muted-foreground">Não lidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tarefas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.tarefasPendentes}
                </div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-neutral-200 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 bg-neutral-200 rounded animate-pulse mb-2" />
                        <div className="h-3 bg-neutral-200 rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    return (
                      <Link
                        key={activity.id}
                        to={getActivityLink(activity)}
                        className="flex items-center space-x-4 p-2 rounded-lg hover:bg-neutral-50 transition-colors"
                      >
                        <div
                          className={`p-2 rounded-full bg-neutral-100 ${getActivityColor(activity.type)}`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.time}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500">Nenhuma atividade recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickActions.map((action) => (
                <Link key={action.title} to={action.href}>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                  >
                    <div className={`p-2 rounded-lg ${action.color} mr-3`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts/Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eventos Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.eventosProximos ? (
              <div className="text-center py-4">
                <Calendar className="h-12 w-12 text-brand-600 mx-auto mb-4" />
                <div className="text-2xl font-bold">
                  {stats.eventosProximos}
                </div>
                <p className="text-sm text-muted-foreground">
                  eventos nos próximos 7 dias
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">Nenhum evento agendado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inbox Legal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="flex justify-center items-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.publicacoesNaoLidas}
                  </div>
                  <p className="text-sm text-muted-foreground">Não lidas</p>
                </div>
              </div>
              <Link to="/inbox-v2">
                <Button size="sm">
                  <Inbox className="h-4 w-4 mr-2" />
                  Abrir Inbox
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
