import React from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";

// Real data queries will be implemented here
// TODO: Replace with actual database queries

// Mock data for dashboard stats
const mockStats = {
  totalProcessos: 127,
  processosAtivos: 89,
  prazosEstaSemanana: 12,
  altoRisco: 3,
  novosClientes: 15,
  jornadasAtivas: 23,
  tarefasPendentes: 8,
};

// Mock data for recent activity
const mockRecentActivity = [
  {
    id: 1,
    title: "Novo processo adicionado",
    description: "Processo 1234567-89.2024.8.19.0001 cadastrado",
    time: "há 2 horas",
    icon: FileText,
    color: "text-brand-600",
  },
  {
    id: 2,
    title: "Cliente atualizado",
    description: "João Silva - dados atualizados",
    time: "há 4 horas",
    icon: Users,
    color: "text-success-600",
  },
  {
    id: 3,
    title: "Prazo aproximando",
    description: "Contestação vence em 3 dias",
    time: "há 6 horas",
    icon: Clock,
    color: "text-warning-600",
  },
  {
    id: 4,
    title: "Jornada concluída",
    description: "Onboarding cliente finalizado",
    time: "há 1 dia",
    icon: CheckCircle,
    color: "text-success-600",
  },
];

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
    title: "Agenda",
    description: "Ver compromissos",
    href: "/agenda",
    icon: Calendar,
    color: "bg-neutral-100",
  },
];

export function Dashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Dashboard
          </h1>
          <p className="text-neutral-600 mt-1">
            Visão geral do escritório - Hermida Maia Advocacia
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-brand-700 border-brand-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            +12% este mês
          </Badge>
          <Button className="btn-brand">
            <Plus className="w-4 h-4 mr-2" />
            Ação Rápida
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-soft transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total de Processos</p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {mockStats.totalProcessos}
                </p>
              </div>
              <div className="bg-neutral-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-brand-700" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <TrendingUp className="w-3 h-3 text-success mr-1" />
              <span className="text-success">+8 este mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Processos Ativos</p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {mockStats.processosAtivos}
                </p>
              </div>
              <div className="bg-success-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <CheckCircle className="w-3 h-3 text-success mr-1" />
              <span className="text-success">90% taxa de atividade</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Prazos Esta Semana</p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {mockStats.prazosEstaSemanana}
                </p>
              </div>
              <div className="bg-neutral-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-neutral-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <Clock className="w-3 h-3 text-neutral-600 mr-1" />
              <span className="text-neutral-600">3 urgentes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Alto Risco</p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {mockStats.altoRisco}
                </p>
              </div>
              <div className="bg-danger-100 p-2 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-danger mr-1" />
              <span className="text-danger">Requer atenção</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    to={action.href}
                    className="group p-4 rounded-lg border border-border hover:border-brand-200 hover:shadow-soft transition-all duration-200 bg-white hover:bg-neutral-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`${action.color} p-2 rounded-lg text-white group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-900 group-hover:text-brand-700">
                          {action.title}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRecentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-neutral-600 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-border">
              <Button variant="ghost" className="w-full text-sm" asChild>
                <Link to="/inbox">
                  Ver todas atividades
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-soft transition-all duration-200 hover:border-brand-200">
          <CardContent className="p-4">
            <Link to="/processos" className="block group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 group-hover:text-brand-700">
                    Processos
                  </h3>
                  <p className="text-2xl font-semibold text-brand-700 mt-1">
                    {mockStats.processosAtivos}
                  </p>
                  <p className="text-sm text-neutral-600">ativos</p>
                </div>
                <FileText className="w-8 h-8 text-brand-600 group-hover:scale-105 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft transition-all duration-200 hover:border-brand-200">
          <CardContent className="p-4">
            <Link to="/clientes" className="block group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 group-hover:text-brand-700">
                    Clientes
                  </h3>
                  <p className="text-2xl font-semibold text-brand-700 mt-1">
                    {mockStats.novosClientes}
                  </p>
                  <p className="text-sm text-neutral-600">novos este mês</p>
                </div>
                <Users className="w-8 h-8 text-brand-600 group-hover:scale-105 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft transition-all duration-200 hover:border-brand-200">
          <CardContent className="p-4">
            <Link to="/jornadas" className="block group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 group-hover:text-brand-700">
                    Jornadas
                  </h3>
                  <p className="text-2xl font-semibold text-brand-700 mt-1">
                    {mockStats.jornadasAtivas}
                  </p>
                  <p className="text-sm text-neutral-600">em andamento</p>
                </div>
                <Target className="w-8 h-8 text-brand-600 group-hover:scale-105 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft transition-all duration-200 hover:border-brand-200">
          <CardContent className="p-4">
            <Link to="/agenda" className="block group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-900 group-hover:text-brand-700">
                    Agenda
                  </h3>
                  <p className="text-2xl font-semibold text-brand-700 mt-1">
                    {mockStats.tarefasPendentes}
                  </p>
                  <p className="text-sm text-neutral-600">tarefas pendentes</p>
                </div>
                <Calendar className="w-8 h-8 text-brand-600 group-hover:scale-105 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
