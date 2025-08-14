import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Separator } from "../components/ui/separator";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import {
  Power,
  PowerOff,
  Shield,
  Activity,
  Calendar,
  DollarSign,
  FileText,
  Headphones,
  Bell,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  payload: any;
  updated_at: string;
  updated_by?: string;
}

const featureConfig = {
  jornadas: {
    icon: <FileText className="h-5 w-5" />,
    name: "Jornadas",
    description: "Sistema de fluxos padronizados",
    color: "blue",
    routes: ["/jornadas", "/nova-jornada", "/iniciar-jornada"],
  },
  tickets: {
    icon: <Headphones className="h-5 w-5" />,
    name: "Tickets",
    description: "Central de atendimento e helpdesk",
    color: "green",
    routes: ["/tickets", "/helpdesk"],
  },
  activities: {
    icon: <Activity className="h-5 w-5" />,
    name: "Activities",
    description: "Gestão de atividades e tarefas",
    color: "purple",
    routes: ["/activities"],
  },
  deals: {
    icon: <Shield className="h-5 w-5" />,
    name: "Deals",
    description: "Pipeline de vendas e oportunidades",
    color: "orange",
    routes: ["/deals"],
  },
  financeiro: {
    icon: <DollarSign className="h-5 w-5" />,
    name: "Financeiro",
    description: "Gestão financeira e cobrança",
    color: "emerald",
    routes: ["/financeiro", "/planos-pagamento"],
  },
  relatorios: {
    icon: <FileText className="h-5 w-5" />,
    name: "Relatórios",
    description: "Analytics e dashboards",
    color: "indigo",
    routes: ["/relatorios"],
  },
  helpdesk: {
    icon: <Headphones className="h-5 w-5" />,
    name: "Helpdesk",
    description: "Central de suporte",
    color: "cyan",
    routes: ["/helpdesk"],
  },
  notificacoes: {
    icon: <Bell className="h-5 w-5" />,
    name: "Notificações",
    description: "Sistema de notificações",
    color: "yellow",
    routes: [],
  },
  kill_switch: {
    icon: <Power className="h-5 w-5" />,
    name: "Kill Switch",
    description: "Modo somente leitura global",
    color: "red",
    routes: [],
  },
};

const FeatureFlags: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [killSwitchConfirm, setKillSwitchConfirm] = useState(false);
  const { toast } = useToast();

  // Feature flags query
  const { data: featureFlags, refetch } = useSupabaseQuery<FeatureFlag[]>(
    "feature-flags",
    `
    select key, enabled, description, payload, updated_at, updated_by
    from legalflow.feature_flags
    order by 
      case key 
        when 'kill_switch' then 1 
        else 2 
      end,
      key
    `,
  );

  // Check if kill switch is active
  const killSwitchActive =
    featureFlags?.find((f) => f.key === "kill_switch")?.enabled || false;

  const updateFeatureFlag = async (key: string, enabled: boolean) => {
    if (key === "kill_switch" && enabled && !killSwitchConfirm) {
      setKillSwitchConfirm(true);
      return;
    }

    setIsUpdating(key);
    try {
      const { error } = await supabase
        .from("legalflow.feature_flags")
        .update({
          enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);

      if (error) throw error;

      // Log the change
      await supabase.from("legalflow.app_events").insert({
        event: "feature_flag_changed",
        payload: {
          flag: key,
          enabled,
          previous_state: !enabled,
          timestamp: new Date().toISOString(),
        },
      });

      await refetch();

      if (key === "kill_switch") {
        toast({
          title: enabled ? "Kill Switch Ativado" : "Kill Switch Desativado",
          description: enabled
            ? "Sistema em modo somente leitura"
            : "Sistema voltou ao modo normal",
          variant: enabled ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Feature Flag Atualizada",
          description: `${featureConfig[key as keyof typeof featureConfig]?.name} ${enabled ? "habilitada" : "desabilitada"}`,
        });
      }

      if (key === "kill_switch") {
        setKillSwitchConfirm(false);
      }
    } catch (error) {
      console.error("Error updating feature flag:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar feature flag",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleAllFeatures = async (enable: boolean) => {
    const regularFeatures =
      featureFlags?.filter((f) => f.key !== "kill_switch") || [];

    for (const feature of regularFeatures) {
      if (feature.enabled !== enable) {
        await updateFeatureFlag(feature.key, enable);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay
      }
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
      cyan: "bg-cyan-100 text-cyan-800 border-cyan-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      red: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const enabledCount =
    featureFlags?.filter((f) => f.enabled && f.key !== "kill_switch").length ||
    0;
  const totalCount =
    featureFlags?.filter((f) => f.key !== "kill_switch").length || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Flags</h1>
        <p className="text-gray-600">
          Controle de funcionalidades e rollout progressivo
        </p>
      </div>

      {/* Kill Switch Alert */}
      {killSwitchActive && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <Power className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>SISTEMA EM MODO SOMENTE LEITURA</strong> - Kill Switch
            ativo. Usuários não podem fazer alterações.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium">Features Ativas</div>
                <div className="text-2xl font-bold">
                  {enabledCount}/{totalCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              {killSwitchActive ? (
                <Lock className="h-5 w-5 text-red-600" />
              ) : (
                <Unlock className="h-5 w-5 text-green-600" />
              )}
              <div>
                <div className="text-sm font-medium">Sistema</div>
                <div className="text-lg font-bold">
                  {killSwitchActive ? "Bloqueado" : "Normal"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex justify-center">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllFeatures(true)}
                disabled={isUpdating !== null}
              >
                Habilitar Todas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllFeatures(false)}
                disabled={isUpdating !== null}
              >
                Desabilitar Todas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kill Switch Section */}
      <Card className="mb-6 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <Power className="h-5 w-5" />
            <span>Kill Switch Global</span>
          </CardTitle>
          <CardDescription>
            Ativa modo somente leitura em todo o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                Somente Leitura {killSwitchActive ? "(ATIVO)" : "(INATIVO)"}
              </div>
              <div className="text-sm text-gray-600">
                Bloqueia todas as operações de escrita
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                checked={killSwitchActive}
                onCheckedChange={(enabled) =>
                  updateFeatureFlag("kill_switch", enabled)
                }
                disabled={isUpdating === "kill_switch"}
              />
              {isUpdating === "kill_switch" && (
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          {killSwitchConfirm && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-3">
                  <strong>ATENÇÃO:</strong> Você está prestes a ativar o Kill
                  Switch. Isso colocará todo o sistema em modo somente leitura.
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateFeatureFlag("kill_switch", true)}
                    >
                      Confirmar Ativação
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setKillSwitchConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Feature Flags Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Módulos do Sistema</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureFlags
            ?.filter((flag) => flag.key !== "kill_switch")
            .map((flag) => {
              const config =
                featureConfig[flag.key as keyof typeof featureConfig];
              if (!config) return null;

              return (
                <Card
                  key={flag.key}
                  className={`transition-all ${flag.enabled ? "border-green-200" : "border-gray-200"}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${getColorClasses(config.color)}`}
                        >
                          {config.icon}
                        </div>
                        <div>
                          <div className="font-medium">{config.name}</div>
                          <div className="text-sm text-gray-600">
                            {config.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge variant={flag.enabled ? "default" : "secondary"}>
                          {flag.enabled ? "Ativo" : "Inativo"}
                        </Badge>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(enabled) =>
                            updateFeatureFlag(flag.key, enabled)
                          }
                          disabled={isUpdating === flag.key || killSwitchActive}
                        />
                        {isUpdating === flag.key && (
                          <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                        )}
                      </div>
                    </div>

                    {config.routes.length > 0 && (
                      <div className="text-xs text-gray-600">
                        <strong>Rotas:</strong> {config.routes.join(", ")}
                      </div>
                    )}

                    {!flag.enabled && (
                      <div className="text-xs text-orange-600 mt-2">
                        ⚠️ Usuários serão redirecionados com mensagem
                        informativa
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            • <strong>Feature Flags:</strong> Habilitam/desabilitam módulos
            específicos
          </p>
          <p>
            • <strong>Kill Switch:</strong> Bloqueia todas as operações de
            escrita no sistema
          </p>
          <p>
            • <strong>Redirecionamento:</strong> Usuários são informados quando
            tentam acessar módulos desabilitados
          </p>
          <p>
            • <strong>Rollback:</strong> Mudanças podem ser revertidas
            instantaneamente
          </p>
          <p>
            • <strong>Logs:</strong> Todas as alterações são registradas para
            auditoria
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureFlags;
