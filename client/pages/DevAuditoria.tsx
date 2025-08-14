import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import { implAudit, implAutofix } from "../lib/audit-rpcs";
import { AutofixHistoryPanel } from "../components/AutofixHistoryPanel";
import { autofixHistory } from "../lib/autofix-history";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Play,
  Zap,
  Database,
  Route,
  Inbox,
  GitBranch,
  CreditCard,
  Users,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface AuditModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "ok" | "pending" | "error" | "checking";
  checks: AuditCheck[];
  lastChecked?: string;
}

interface AuditCheck {
  id: string;
  name: string;
  description: string;
  status: "ok" | "pending" | "error";
  details?: string;
}

interface AutofixPatch {
  code: string;
  name: string;
  description: string;
  modules: string[];
}

const DevAuditoria: React.FC = () => {
  const [modules, setModules] = useState<AuditModule[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"audit" | "history">("audit");
  const [isRunningAutofix, setIsRunningAutofix] = useState(false);
  const [autofixPatches] = useState<AutofixPatch[]>([
    {
      code: "api_library_seed",
      name: "Seed API Library",
      description: "Popula endpoints da API Library",
      modules: ["api-library"],
    },
    {
      code: "journey_triggers_fix",
      name: "Fix Journey Triggers",
      description: "Corrige triggers de jornadas e next_action",
      modules: ["jornadas"],
    },
    {
      code: "inbox_publications_fix",
      name: "Fix Inbox Publications",
      description: "Vincula publicações do Inbox Legal",
      modules: ["inbox-legal"],
    },
    {
      code: "process_movements_sync",
      name: "Sync Process Movements",
      description: "Sincroniza processos e movimentações",
      modules: ["processos"],
    },
    {
      code: "stripe_mirror_fix",
      name: "Fix Stripe Mirror",
      description: "Corrige espelho do Stripe",
      modules: ["stripe"],
    },
    {
      code: "crm_data_fix",
      name: "Fix CRM Data",
      description: "Corrige dados de contatos e deals",
      modules: ["crm"],
    },
    {
      code: "rls_basic_setup",
      name: "Setup Basic RLS",
      description: "Configura RLS básico",
      modules: ["rls"],
    },
  ]);
  const { toast } = useToast();

  const initializeModules = (): AuditModule[] => [
    {
      id: "api-library",
      name: "API Library",
      description: "Endpoints e configurações da API",
      icon: <Database className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "api_endpoints_seed",
          name: "API endpoints seedados",
          description: "Verifica se endpoints básicos estão cadastrados",
          status: "pending",
        },
        {
          id: "api_tokens_valid",
          name: "Tokens válidos",
          description: "Valida tokens de API configurados",
          status: "pending",
        },
      ],
    },
    {
      id: "jornadas",
      name: "Jornadas",
      description: "Triggers e next_action das jornadas",
      icon: <Route className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "stage_types_filled",
          name: "legalflow.stage_types.name preenchido",
          description: "Verifica se stage_types tem nomes definidos",
          status: "pending",
        },
        {
          id: "trg_stage_refresh",
          name: "trg_stage_refresh instalado",
          description: "Trigger de refresh de stages funcionando",
          status: "pending",
        },
        {
          id: "next_action_logic",
          name: "Lógica next_action",
          description: "Verifica se next_action está funcionando",
          status: "pending",
        },
      ],
    },
    {
      id: "inbox-legal",
      name: "Inbox Legal",
      description: "Vínculo de publicações",
      icon: <Inbox className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "publications_linked",
          name: "Publicações vinculadas",
          description: "Verifica vínculo entre publicações e processos",
          status: "pending",
        },
        {
          id: "inbox_filters",
          name: "Filtros configurados",
          description: "Filtros de inbox funcionando",
          status: "pending",
        },
      ],
    },
    {
      id: "processos",
      name: "Processos ↔ Movimentações",
      description: "Sincronização entre processos e movimentações",
      icon: <GitBranch className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "process_sync",
          name: "Sincronização ativa",
          description: "Processos sincronizando com movimentações",
          status: "pending",
        },
        {
          id: "movement_triggers",
          name: "Triggers de movimentação",
          description: "Triggers de atualização funcionando",
          status: "pending",
        },
      ],
    },
    {
      id: "stripe",
      name: "Stripe Espelho",
      description: "Espelhamento de dados do Stripe",
      icon: <CreditCard className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "stripe_tables",
          name: "Tabelas espelho criadas",
          description: "Tabelas de espelhamento do Stripe existem",
          status: "pending",
        },
        {
          id: "stripe_sync",
          name: "Sincronização ativa",
          description: "Dados sincronizando com Stripe",
          status: "pending",
        },
      ],
    },
    {
      id: "crm",
      name: "CRM",
      description: "Contatos e deals do CRM",
      icon: <Users className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "contacts_integrity",
          name: "Integridade de contatos",
          description: "Dados de contatos íntegros",
          status: "pending",
        },
        {
          id: "deals_pipeline",
          name: "Pipeline de deals",
          description: "Pipeline de vendas funcionando",
          status: "pending",
        },
      ],
    },
    {
      id: "rls",
      name: "RLS Básico",
      description: "Row Level Security básico",
      icon: <Shield className="h-5 w-5" />,
      status: "pending",
      checks: [
        {
          id: "rls_enabled",
          name: "RLS habilitado",
          description: "Row Level Security ativo nas tabelas",
          status: "pending",
        },
        {
          id: "basic_policies",
          name: "Políticas básicas",
          description: "Políticas RLS básicas criadas",
          status: "pending",
        },
      ],
    },
  ];

  useEffect(() => {
    const initialModules = initializeModules();
    setModules(initialModules);

    // Auto-run audit on page load with welcome message
    const runInitialAudit = async () => {
      toast({
        title: "🔍 Iniciando Auditoria Automática",
        description: "Verificando integridade de todos os módulos...",
      });

      await runAudit(initialModules);
    };

    setTimeout(runInitialAudit, 800);
  }, []);

  const runAudit = async (modulesToAudit?: AuditModule[]) => {
    setIsRunningAudit(true);
    setAuditProgress(0);

    const currentModules = modulesToAudit || modules;

    // Show progress updates during audit
    const progressInterval = setInterval(() => {
      setAuditProgress((prev) => Math.min(prev + 15, 90));
    }, 200);

    try {
      // Try to call real RPC function first
      const { data: auditResult, error } = await supabase.rpc(
        "legalflow.impl_audit",
      );

      let finalAuditResult;

      if (error) {
        console.log(
          "RPC not available, using local implementation:",
          error.message,
        );
        // Use local implementation
        finalAuditResult = await implAudit();
      } else {
        finalAuditResult = auditResult;
      }

      // Process audit results
      const updatedModules = currentModules.map((module) => {
        const moduleResult = finalAuditResult?.[module.id];
        if (moduleResult) {
          const hasErrors = moduleResult.checks?.some(
            (check: any) => check.status === "error",
          );
          const allOk = moduleResult.checks?.every(
            (check: any) => check.status === "ok",
          );

          return {
            ...module,
            status: hasErrors ? "error" : allOk ? "ok" : "pending",
            checks: moduleResult.checks || module.checks,
            lastChecked: new Date().toISOString(),
          };
        }
        return module;
      });

      setModules(updatedModules);

      const totalModules = updatedModules.length;
      const okModules = updatedModules.filter((m) => m.status === "ok").length;
      const errorModules = updatedModules.filter(
        (m) => m.status === "error",
      ).length;
      const pendingModules = updatedModules.filter(
        (m) => m.status === "pending",
      ).length;

      // Enhanced toast with detailed summary
      const isAllOk = errorModules === 0 && pendingModules === 0;
      const hasCriticalIssues = errorModules > 0;

      toast({
        title: isAllOk
          ? "✅ Sistema Íntegro"
          : hasCriticalIssues
            ? "⚠️ Pendências Detectadas"
            : "🔄 Verificação Parcial",
        description: `${okModules} OK • ${errorModules} pendências • ${pendingModules} aguardando${
          hasCriticalIssues ? " - Use Autofix para corrigir" : ""
        }`,
        variant: hasCriticalIssues ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Error running audit:", error);
      toast({
        title: "Erro na Auditoria",
        description: "Falha crítica ao executar auditoria",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setAuditProgress(100);

      // Brief delay to show 100% before hiding progress
      setTimeout(() => {
        setIsRunningAudit(false);
        setAuditProgress(0);
      }, 500);
    }
  };

  const simulateAudit = async (currentModules: AuditModule[]) => {
    const totalSteps = currentModules.length;

    for (let i = 0; i < totalSteps; i++) {
      setAuditProgress((i / totalSteps) * 100);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Simulate some results
    const updatedModules = currentModules.map((module, index) => {
      const randomStatus = Math.random();
      let status: "ok" | "error" | "pending";

      if (randomStatus > 0.7) {
        status = "ok";
      } else if (randomStatus > 0.4) {
        status = "error";
      } else {
        status = "pending";
      }

      const updatedChecks = module.checks.map((check, checkIndex) => ({
        ...check,
        status:
          index % 2 === 0 && checkIndex === 0
            ? "error"
            : ("ok" as "ok" | "error" | "pending"),
        details:
          index % 2 === 0 && checkIndex === 0
            ? "Necessita correção"
            : undefined,
      }));

      return {
        ...module,
        status,
        checks: updatedChecks,
        lastChecked: new Date().toISOString(),
      };
    });

    setModules(updatedModules);
  };

  const runAutofix = async (patchCode: string) => {
    setIsRunningAutofix(true);

    try {
      // Try to call real RPC function first
      const { data: autofixResult, error } = await supabase.rpc(
        "legalflow.impl_autofix",
        {
          patch_code: patchCode,
        },
      );

      let finalAutofixResult;

      if (error) {
        console.log(
          "RPC not available, using local implementation:",
          error.message,
        );
        // Use local implementation
        finalAutofixResult = await implAutofix(patchCode);
      } else {
        finalAutofixResult = autofixResult;
      }

      if (finalAutofixResult?.success) {
        const changesCount = finalAutofixResult.changes?.length || 0;
        toast({
          title: "🔧 Autofix Executado",
          description: `${finalAutofixResult.message} (${changesCount} alterações)`,
        });
      } else {
        const errorsCount = finalAutofixResult?.errors?.length || 0;
        toast({
          title: "❌ Autofix Falhou",
          description: `${finalAutofixResult?.message || `Falha ao executar patch ${patchCode}`}${errorsCount > 0 ? ` (${errorsCount} erros)` : ""}`,
          variant: "destructive",
        });
      }

      // Record autofix action in history
      try {
        await autofixHistory.recordModification({
          type: "autofix",
          module: selectedModule || "unknown",
          description: `Autofix executado: ${finalAutofixResult?.message || "Correção automática"}`,
          changes: finalAutofixResult?.changes || [],
          success: finalAutofixResult?.success || false,
          context: {
            error_details: finalAutofixResult?.success ? undefined : finalAutofixResult?.errors?.join(", "),
          },
        });
      } catch (historyError) {
        console.warn("Failed to record autofix in history:", historyError);
      }

      // Re-run audit after autofix with notification
      if (finalAutofixResult?.success) {
        setTimeout(() => {
          toast({
            title: "🔄 Revalidando Sistema",
            description: "Verificando se as correções foram aplicadas...",
          });
          runAudit();
        }, 1500);
      }
    } catch (error) {
      console.error("Error running autofix:", error);
      toast({
        title: "Erro no Autofix",
        description: "Falha ao executar correção automática",
        variant: "destructive",
      });
    } finally {
      setIsRunningAutofix(false);
    }
  };

  const exportAuditLog = () => {
    const auditLog = {
      timestamp: new Date().toISOString(),
      modules: modules.map((module) => ({
        id: module.id,
        name: module.name,
        status: module.status,
        lastChecked: module.lastChecked,
        checks: module.checks,
      })),
    };

    const blob = new Blob([JSON.stringify(auditLog, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Log Exportado",
      description: "Arquivo de auditoria baixado com sucesso",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "checking":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case "error":
        return <Badge variant="destructive">Pendência</Badge>;
      case "checking":
        return <Badge className="bg-blue-100 text-blue-800">Verificando</Badge>;
      default:
        return <Badge variant="outline">Aguardando</Badge>;
    }
  };

  const okCount = modules.filter((m) => m.status === "ok").length;
  const errorCount = modules.filter((m) => m.status === "error").length;
  const totalCount = modules.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔹 Painel de Auditoria & Autofix
            </h1>
            <p className="text-gray-600">
              Sistema integrado com histórico completo e integração Builder.io
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "audit" ? "default" : "outline"}
              onClick={() => setActiveTab("audit")}
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Auditoria
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
              className="flex items-center gap-2"
            >
              <Inbox className="w-4 h-4" />
              Histórico
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo baseado na aba ativa */}
      {activeTab === "audit" ? (
        <>
          {/* Status Summary */}
          <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resumo da Auditoria</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {okCount}/{totalCount} OK
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} Pendências</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => runAudit()}
              disabled={isRunningAudit}
              className="flex items-center gap-2"
            >
              {isRunningAudit ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reexecutar Auditoria
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  disabled={isRunningAutofix}
                  className="flex items-center gap-2"
                >
                  {isRunningAutofix ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Executar Autofix
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {autofixPatches.map((patch) => (
                  <DropdownMenuItem
                    key={patch.code}
                    onClick={() => runAutofix(patch.code)}
                    className="flex flex-col items-start p-3"
                  >
                    <div className="font-medium">{patch.name}</div>
                    <div className="text-sm text-gray-500">
                      {patch.description}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              onClick={exportAuditLog}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Log
            </Button>
          </div>

          {isRunningAudit && (
            <div className="space-y-2">
              <Progress value={auditProgress} />
              <div className="text-sm text-gray-600 text-center">
                Executando auditoria... {Math.round(auditProgress)}%
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card
            key={module.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedModule === module.id ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() =>
              setSelectedModule(selectedModule === module.id ? null : module.id)
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  {module.icon}
                  <span>{module.name}</span>
                </div>
                {getStatusIcon(module.status)}
              </CardTitle>
              <CardDescription>{module.description}</CardDescription>
              <div className="flex items-center justify-between mt-2">
                {getStatusBadge(module.status)}
                {module.lastChecked && (
                  <span className="text-xs text-gray-500">
                    {new Date(module.lastChecked).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </CardHeader>

            {selectedModule === module.id && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-2">Checks:</h4>
                  {module.checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{check.name}</div>
                        <div className="text-xs text-gray-600">
                          {check.description}
                        </div>
                        {check.details && (
                          <div className="text-xs text-red-600 mt-1">
                            {check.details}
                          </div>
                        )}
                      </div>
                      {getStatusIcon(check.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Auto Audit Toast Summary */}
      {okCount > 0 && errorCount === 0 && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ Todos os módulos estão OK! Sistema funcionando corretamente.
          </AlertDescription>
        </Alert>
      )}

      {errorCount > 0 && (
        <Alert className="mt-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            ⚠️ {errorCount} módulo(s) com pendências detectadas. Use o Autofix
            para corrigir automaticamente.
          </AlertDescription>
        </Alert>
      )}
        </>
      ) : (
        /* Aba de Histórico */
        <AutofixHistoryPanel
          onPromptExecuted={(result) => {
            toast({
              title: "Prompt Builder.io executado",
              description: result?.summary || "Modificações aplicadas com sucesso",
            });
            // Re-run audit after builder prompt execution
            runAudit();
          }}
        />
      )}
    </div>
  );
};

export default DevAuditoria;
