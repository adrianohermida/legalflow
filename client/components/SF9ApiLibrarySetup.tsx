import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import { implAutofix } from "../lib/audit-rpcs";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Globe,
  Play,
  RefreshCw,
  Zap,
  Download,
  Eye,
  Settings,
} from "lucide-react";

interface SetupCheck {
  id: string;
  name: string;
  description: string;
  status: "success" | "error" | "warning" | "pending";
  details?: string;
  action?: string;
}

export const SF9ApiLibrarySetup: React.FC = () => {
  const [checks, setChecks] = useState<SetupCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: SetupCheck[] = [
      {
        id: "schema",
        name: "Schema da API Library",
        description: "Verifica se as tabelas da API Library existem",
        status: "pending",
      },
      {
        id: "providers",
        name: "Provedores de API",
        description: "Verifica se existem provedores cadastrados",
        status: "pending",
      },
      {
        id: "endpoints",
        name: "Endpoints de API",
        description: "Verifica se existem endpoints configurados",
        status: "pending",
      },
      {
        id: "functions",
        name: "Funções RPC",
        description: "Verifica se as funções RPC estão disponíveis",
        status: "pending",
      },
      {
        id: "permissions",
        name: "Permissões RLS",
        description: "Verifica se as políticas RLS estão ativas",
        status: "pending",
      },
    ];

    setChecks(diagnostics);

    // Check schema tables
    try {
      const { data: tables, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "legalflow")
        .in("table_name", [
          "api_providers",
          "api_endpoints",
          "api_call_logs",
          "api_templates",
        ]);

      const expectedTables = [
        "api_providers",
        "api_endpoints",
        "api_call_logs",
        "api_templates",
      ];
      const foundTables = tables?.map((t) => t.table_name) || [];
      const missingTables = expectedTables.filter(
        (t) => !foundTables.includes(t),
      );

      diagnostics[0].status = missingTables.length === 0 ? "success" : "error";
      diagnostics[0].details =
        missingTables.length === 0
          ? "Todas as tabelas encontradas"
          : `Tabelas faltando: ${missingTables.join(", ")}`;
      diagnostics[0].action =
        missingTables.length > 0 ? "install_schema" : undefined;
    } catch (error) {
      diagnostics[0].status = "error";
      diagnostics[0].details = `Erro ao verificar schema: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check providers
    try {
      const { data: providers, error: providersError } = await supabase.rpc(
        "legalflow.list_api_providers",
      );

      if (providersError) {
        diagnostics[1].status = "error";
        diagnostics[1].details = `Erro ao listar provedores: ${providersError.message}`;
      } else {
        diagnostics[1].status =
          providers && providers.length > 0 ? "success" : "warning";
        diagnostics[1].details = providers
          ? `${providers.length} provedores encontrados`
          : "Nenhum provedor encontrado";
        diagnostics[1].action =
          !providers || providers.length === 0 ? "seed_data" : undefined;
      }
    } catch (error) {
      diagnostics[1].status = "error";
      diagnostics[1].details = `Erro ao verificar provedores: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check endpoints
    try {
      const { data: endpoints, error: endpointsError } = await supabase.rpc(
        "legalflow.list_api_endpoints",
      );

      if (endpointsError) {
        diagnostics[2].status = "error";
        diagnostics[2].details = `Erro ao listar endpoints: ${endpointsError.message}`;
      } else {
        diagnostics[2].status =
          endpoints && endpoints.length > 0 ? "success" : "warning";
        diagnostics[2].details = endpoints
          ? `${endpoints.length} endpoints encontrados`
          : "Nenhum endpoint encontrado";
        diagnostics[2].action =
          !endpoints || endpoints.length === 0 ? "seed_data" : undefined;
      }
    } catch (error) {
      diagnostics[2].status = "error";
      diagnostics[2].details = `Erro ao verificar endpoints: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check RPC functions
    try {
      const { data: testPrepare, error: prepareError } = await supabase.rpc(
        "legalflow.api_prepare",
        {
          p_endpoint_id: "00000000-0000-0000-0000-000000000000",
          p_parameters: {},
          p_context: { test: true },
        },
      );

      // We expect this to fail with "Endpoint not found", which means the function exists
      diagnostics[3].status =
        prepareError?.message?.includes("Endpoint not found") ||
        prepareError?.message?.includes("not found")
          ? "success"
          : "error";
      diagnostics[3].details =
        prepareError?.message?.includes("Endpoint not found") ||
        prepareError?.message?.includes("not found")
          ? "Funções RPC funcionando corretamente"
          : `Erro nas funções RPC: ${prepareError?.message || "Função não encontrada"}`;
    } catch (error) {
      diagnostics[3].status = "error";
      diagnostics[3].details = `Erro ao testar funções RPC: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check RLS policies
    try {
      const { data: policies, error: policiesError } = await supabase
        .from("pg_policies")
        .select("policyname, tablename")
        .eq("schemaname", "legalflow")
        .like("tablename", "api_%");

      diagnostics[4].status =
        policies && policies.length > 0 ? "success" : "warning";
      diagnostics[4].details = policies
        ? `${policies.length} políticas RLS encontradas`
        : "Políticas RLS não encontradas";
    } catch (error) {
      diagnostics[4].status = "warning";
      diagnostics[4].details = "Não foi possível verificar políticas RLS";
    }

    setChecks(diagnostics);
    setLoading(false);
  };

  const runSeed = async () => {
    try {
      setSeeding(true);

      const result = await implAutofix("API_SEED");

      if (result.success) {
        toast({
          title: "Seed executado com sucesso",
          description: result.message,
        });

        // Re-run diagnostics
        await runDiagnostics();
      } else {
        toast({
          title: "Erro no seed",
          description: result.message || "Falha ao executar seed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error seeding:", error);
      toast({
        title: "Erro no seed",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const runTest = async () => {
    try {
      setRunning(true);

      // Try to test an existing endpoint if available
      const { data: endpoints } = await supabase.rpc(
        "legalflow.list_api_endpoints",
        { p_limit: 1 },
      );

      if (endpoints && endpoints.length > 0) {
        const testEndpoint = endpoints[0];

        // Prepare a test call
        const { data: prepared } = await supabase.rpc("legalflow.api_prepare", {
          p_endpoint_id: testEndpoint.id,
          p_parameters: {},
          p_context: { test: true, description: "Teste automático do SF9" },
        });

        if (prepared?.success) {
          // Execute the test call
          const { data: executed } = await supabase.rpc(
            "legalflow.api_execute",
            {
              p_prepared_request: prepared.prepared_request,
            },
          );

          toast({
            title: "Teste executado",
            description: executed?.success
              ? `Teste bem-sucedido em ${executed.response_time_ms}ms`
              : `Teste com falha: status ${executed?.status_code}`,
            variant: executed?.success ? "default" : "destructive",
          });
        } else {
          toast({
            title: "Erro no teste",
            description: prepared?.error || "Falha ao preparar requisição",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Nenhum endpoint disponível",
          description: "Execute o seed primeiro para criar endpoints de teste",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing:", error);
      toast({
        title: "Erro no teste",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const downloadSchema = () => {
    const schemaContent = `-- SF-9 API Library Schema
-- Execute este script no seu banco Supabase para instalar as tabelas e funções

-- Ver arquivo SF9_API_LIBRARY_SCHEMA.sql para o schema completo
-- Localização: ./SF9_API_LIBRARY_SCHEMA.sql
`;

    const blob = new Blob([schemaContent], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sf9-api-library-install-guide.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Arquivo baixado",
      description:
        "Guia de instalação baixado. Execute SF9_API_LIBRARY_SCHEMA.sql no Supabase.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const overallStatus = checks.every((c) => c.status === "success")
    ? "success"
    : checks.some((c) => c.status === "error")
      ? "error"
      : "warning";

  const successCount = checks.filter((c) => c.status === "success").length;
  const totalCount = checks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            SF-9: API Library Console
          </h2>
          <p className="text-neutral-600 text-sm mt-1">
            Sistema para chamar APIs sem hardcode e auditar respostas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              overallStatus === "success"
                ? "default"
                : overallStatus === "error"
                  ? "destructive"
                  : "secondary"
            }
          >
            {successCount}/{totalCount} Verificações
          </Badge>
        </div>
      </div>

      {/* Status Summary */}
      <Alert
        className={
          overallStatus === "success"
            ? "border-green-200 bg-green-50"
            : overallStatus === "error"
              ? "border-red-200 bg-red-50"
              : "border-yellow-200 bg-yellow-50"
        }
      >
        <AlertDescription>
          <div className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            <span className="font-medium">
              {overallStatus === "success"
                ? "✅ API Library está configurada e funcionando"
                : overallStatus === "error"
                  ? "❌ Problemas críticos encontrados - instalação necessária"
                  : "⚠️ Configuração parcial - seed de dados recomendado"}
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3">
        <Button variant="outline" onClick={runDiagnostics} disabled={loading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Verificando..." : "Verificar"}
        </Button>

        <Button variant="outline" onClick={runSeed} disabled={seeding}>
          <Zap className={`w-4 h-4 mr-2 ${seeding ? "animate-spin" : ""}`} />
          {seeding ? "Seeding..." : "Seed/Autofix"}
        </Button>

        <Button
          variant="outline"
          onClick={runTest}
          disabled={running || overallStatus === "error"}
        >
          <Play className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
          {running ? "Testando..." : "Testar"}
        </Button>

        <Button variant="outline" onClick={downloadSchema}>
          <Download className="w-4 h-4 mr-2" />
          Download Schema
        </Button>
      </div>

      {/* Detailed Checks */}
      <div className="grid gap-3">
        {checks.map((check) => (
          <Card key={check.id} className="transition-all hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium text-sm">{check.name}</div>
                    <div className="text-xs text-neutral-600">
                      {check.description}
                    </div>
                    {check.details && (
                      <div className="text-xs text-neutral-500 mt-1">
                        {check.details}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      check.status === "success"
                        ? "default"
                        : check.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {check.status === "success"
                      ? "OK"
                      : check.status === "error"
                        ? "Erro"
                        : check.status === "warning"
                          ? "Aviso"
                          : "Verificando"}
                  </Badge>
                  {check.action === "seed_data" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={runSeed}
                      disabled={seeding}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Seed
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acesso Rápido</CardTitle>
          <CardDescription>
            Links para funcionalidades principais do SF-9
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Console API</div>
              <div className="text-xs text-neutral-600">
                Interface principal para gerenciar provedores, endpoints e logs
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Eye className="w-3 h-3 mr-1" />
              Abrir Console
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Testador de API</div>
              <div className="text-xs text-neutral-600">
                Ferramenta Prepare → Fetch → Ingest para testar endpoints
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Settings className="w-3 h-3 mr-1" />
              Abrir Testador
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Logs de Auditoria</div>
              <div className="text-xs text-neutral-600">
                Histórico completo de chamadas da API com detalhes
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Database className="w-3 h-3 mr-1" />
              Ver Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installation Guide */}
      {overallStatus === "error" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              Guia de Instalação
            </CardTitle>
            <CardDescription>
              Passos para configurar o SF-9 API Library Console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                  1
                </div>
                <div>
                  <div className="font-medium">Baixar Schema SQL</div>
                  <div className="text-neutral-600">
                    Clique em "Download Schema" para obter o arquivo
                    SF9_API_LIBRARY_SCHEMA.sql
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                  2
                </div>
                <div>
                  <div className="font-medium">Executar no Supabase</div>
                  <div className="text-neutral-600">
                    Execute o script no SQL Editor do Supabase para criar
                    tabelas e funções
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                  3
                </div>
                <div>
                  <div className="font-medium">Executar Seed</div>
                  <div className="text-neutral-600">
                    Clique em "Seed/Autofix" para popular com dados de exemplo
                    (Escavador, Advise)
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                  4
                </div>
                <div>
                  <div className="font-medium">Testar Funcionamento</div>
                  <div className="text-neutral-600">
                    Use o botão "Testar" para verificar se tudo está funcionando
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SF9ApiLibrarySetup;
