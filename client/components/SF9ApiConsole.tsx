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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import { implAutofix } from "../lib/audit-rpcs";
import {
  Server,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  Settings,
  Activity,
  Zap,
  Eye,
  Database,
  Globe,
  Download,
  RefreshCw,
  Code,
  Terminal
} from "lucide-react";

interface ApiProvider {
  id: string;
  name: string;
  base_url: string;
  description: string;
  auth_type: string;
  is_active: boolean;
  tags: string[];
  endpoints_count: number;
  recent_calls_count: number;
  avg_response_time: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

interface ApiEndpoint {
  id: string;
  provider_id: string;
  provider_name: string;
  name: string;
  path: string;
  method: string;
  description: string;
  is_active: boolean;
  tags: string[];
  recent_calls_count: number;
  avg_response_time: number;
  success_rate: number;
  cost_per_call: number;
  created_at: string;
}

interface ApiCallLog {
  id: string;
  endpoint_id: string;
  provider_name: string;
  endpoint_name: string;
  request_id: string;
  method: string;
  url: string;
  status_code: number;
  status: string;
  response_time_ms: number;
  cost_applied: number;
  error_message: string;
  created_at: string;
  context_summary: string;
}

export const SF9ApiConsole: React.FC = () => {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [callLogs, setCallLogs] = useState<ApiCallLog[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"providers" | "endpoints" | "logs" | "testing">("providers");
  const [showApiTester, setShowApiTester] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [preparedRequest, setPreparedRequest] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadProviders();
    loadLogs();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      loadEndpoints(selectedProvider);
    } else {
      loadEndpoints();
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase.rpc("legalflow.list_api_providers");
      
      if (error) throw error;
      
      setProviders(data || []);
    } catch (error) {
      console.error("Error loading providers:", error);
      toast({
        title: "Erro ao carregar provedores",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const loadEndpoints = async (providerId?: string) => {
    try {
      const { data, error } = await supabase.rpc("legalflow.list_api_endpoints", {
        p_provider_id: providerId || null,
      });
      
      if (error) throw error;
      
      setEndpoints(data || []);
    } catch (error) {
      console.error("Error loading endpoints:", error);
      toast({
        title: "Erro ao carregar endpoints",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("legalflow.list_api_call_logs", {
        p_hours_back: 24,
        p_limit: 50,
      });
      
      if (error) throw error;
      
      setCallLogs(data || []);
    } catch (error) {
      console.error("Error loading call logs:", error);
      toast({
        title: "Erro ao carregar logs",
        description: error instanceof Error ? error.message : "Erro desconhecido", 
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const prepareApiCall = async (endpoint: ApiEndpoint, parameters: any) => {
    try {
      setPreparing(true);
      
      const { data, error } = await supabase.rpc("legalflow.api_prepare", {
        p_endpoint_id: endpoint.id,
        p_parameters: parameters,
        p_context: {
          description: `Manual test from API Console`,
          source: "api_console",
          user_id: (await supabase.auth.getUser()).data.user?.id,
        },
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      setPreparedRequest(data.prepared_request);
      
      toast({
        title: "Requisição preparada",
        description: "Requisição preparada com sucesso. Clique em 'Executar' para enviar.",
      });
      
      return data.prepared_request;
    } catch (error) {
      console.error("Error preparing API call:", error);
      toast({
        title: "Erro ao preparar requisição",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    } finally {
      setPreparing(false);
    }
  };

  const executeApiCall = async (preparedRequest: any) => {
    try {
      setExecuting(true);
      
      const { data, error } = await supabase.rpc("legalflow.api_execute", {
        p_prepared_request: preparedRequest,
      });
      
      if (error) throw error;
      
      setExecutionResult(data);
      
      // Recarregar logs para mostrar a nova entrada
      await loadLogs();
      
      toast({
        title: data.success ? "Requisição executada com sucesso" : "Erro na execução",
        description: data.success 
          ? `Resposta recebida em ${data.response_time_ms}ms`
          : `Erro ${data.status_code}: ${data.response?.error || "Erro desconhecido"}`,
        variant: data.success ? "default" : "destructive",
      });
      
      return data;
    } catch (error) {
      console.error("Error executing API call:", error);
      toast({
        title: "Erro ao executar requisição",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return null;
    } finally {
      setExecuting(false);
    }
  };

  const seedApiLibrary = async () => {
    try {
      setSeeding(true);

      const result = await implAutofix("API_SEED");

      if (result.success) {
        toast({
          title: "Seed executado com sucesso",
          description: result.message,
        });

        // Recarregar dados
        await Promise.all([
          loadProviders(),
          loadEndpoints(),
          loadLogs(),
        ]);
      } else {
        toast({
          title: "Erro no seed",
          description: result.message || "Falha ao executar seed da API Library",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error seeding API library:", error);
      toast({
        title: "Erro no seed",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-100 text-green-800";
      case "POST":
        return "bg-blue-100 text-blue-800";
      case "PUT":
        return "bg-yellow-100 text-yellow-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            API Library Console
          </h1>
          <p className="text-neutral-600 mt-1">
            Chamar APIs sem hardcode e auditar respostas - Providers/Endpoints/Logs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={seedApiLibrary}
            disabled={seeding}
          >
            <Zap className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? "Seeding..." : "Seed/Autofix"}
          </Button>
          <Button
            variant="outline"
            onClick={() => loadProviders()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowApiTester(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Testar API
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{providers.length}</div>
                <div className="text-sm text-neutral-600">Provedores</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{endpoints.length}</div>
                <div className="text-sm text-neutral-600">Endpoints</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{callLogs.length}</div>
                <div className="text-sm text-neutral-600">Chamadas (24h)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {callLogs.length > 0 
                    ? Math.round((callLogs.filter(log => log.status === 'success').length / callLogs.length) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-neutral-600">Taxa de Sucesso</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <Input
              placeholder="Buscar provedores, endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedProvider || "all"} onValueChange={(value) => setSelectedProvider(value === "all" ? null : value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por provedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os provedores</SelectItem>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Provedores
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Logs de Chamadas
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Console de Teste
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4">
            {filteredProviders.map((provider) => (
              <Card 
                key={provider.id}
                className={`transition-all cursor-pointer hover:shadow-md ${
                  selectedProvider === provider.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedProvider(
                  selectedProvider === provider.id ? null : provider.id
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${provider.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Server className={`w-5 h-5 ${provider.is_active ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        <CardDescription>{provider.description}</CardDescription>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{provider.auth_type}</Badge>
                          <Badge variant={provider.is_active ? "default" : "secondary"}>
                            {provider.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          {provider.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-neutral-600">
                        {provider.endpoints_count} endpoints
                      </div>
                      <div className="text-sm text-neutral-600">
                        {provider.recent_calls_count} chamadas (24h)
                      </div>
                      <div className="text-sm text-neutral-600">
                        {provider.success_rate.toFixed(1)}% sucesso
                      </div>
                      <div className="text-sm text-neutral-600">
                        {provider.avg_response_time.toFixed(0)}ms médio
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-neutral-600">
                    <span>Base URL: <code className="bg-gray-100 px-2 py-1 rounded">{provider.base_url}</code></span>
                    <span>Criado: {new Date(provider.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <div className="grid gap-4">
            {filteredEndpoints.map((endpoint) => (
              <Card key={endpoint.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getMethodColor(endpoint.method)}>
                          {endpoint.method}
                        </Badge>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {endpoint.path}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEndpoint(endpoint);
                          setShowApiTester(true);
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Testar
                      </Button>
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-base">{endpoint.name}</CardTitle>
                    <CardDescription>{endpoint.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{endpoint.provider_name}</Badge>
                      <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                        {endpoint.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                      {endpoint.cost_per_call > 0 && (
                        <Badge variant="outline">
                          R$ {endpoint.cost_per_call.toFixed(2)}
                        </Badge>
                      )}
                      {endpoint.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-600">Chamadas (24h)</div>
                      <div className="font-medium">{endpoint.recent_calls_count}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Tempo médio</div>
                      <div className="font-medium">{endpoint.avg_response_time.toFixed(0)}ms</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Taxa de sucesso</div>
                      <div className="font-medium">{endpoint.success_rate.toFixed(1)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Chamadas (Últimas 24h)</CardTitle>
              <CardDescription>
                Histórico de todas as chamadas da API para auditoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {callLogs.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                  <p>Nenhuma chamada registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <div className="font-medium text-sm">
                            {log.provider_name} - {log.endpoint_name}
                          </div>
                          <div className="text-xs text-neutral-600">
                            {log.method} {log.url}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {log.context_summary}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={getMethodColor(log.method)}>
                            {log.method}
                          </Badge>
                          <Badge 
                            variant={log.status === 'success' ? 'default' : 'destructive'}
                          >
                            {log.status_code}
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">
                          {log.response_time_ms}ms
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <ApiTestingPanel
            endpoints={endpoints}
            onPrepare={prepareApiCall}
            onExecute={executeApiCall}
            preparing={preparing}
            executing={executing}
            preparedRequest={preparedRequest}
            executionResult={executionResult}
          />
        </TabsContent>
      </Tabs>

      {/* API Tester Dialog */}
      <Dialog open={showApiTester} onOpenChange={setShowApiTester}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testador de API</DialogTitle>
            <DialogDescription>
              Prepare, execute e visualize chamadas da API em tempo real
            </DialogDescription>
          </DialogHeader>
          <ApiTestingPanel
            endpoints={endpoints}
            selectedEndpoint={selectedEndpoint}
            onPrepare={prepareApiCall}
            onExecute={executeApiCall}
            preparing={preparing}
            executing={executing}
            preparedRequest={preparedRequest}
            executionResult={executionResult}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente separado para o painel de testes
interface ApiTestingPanelProps {
  endpoints: ApiEndpoint[];
  selectedEndpoint?: ApiEndpoint | null;
  onPrepare: (endpoint: ApiEndpoint, parameters: any) => Promise<any>;
  onExecute: (preparedRequest: any) => Promise<any>;
  preparing: boolean;
  executing: boolean;
  preparedRequest: any;
  executionResult: any;
}

const ApiTestingPanel: React.FC<ApiTestingPanelProps> = ({
  endpoints,
  selectedEndpoint,
  onPrepare,
  onExecute,
  preparing,
  executing,
  preparedRequest,
  executionResult,
}) => {
  const [currentEndpoint, setCurrentEndpoint] = useState<ApiEndpoint | null>(selectedEndpoint || null);
  const [parameters, setParameters] = useState<string>("{}");
  const [step, setStep] = useState<"prepare" | "fetch" | "ingest">("prepare");

  useEffect(() => {
    if (selectedEndpoint) {
      setCurrentEndpoint(selectedEndpoint);
    }
  }, [selectedEndpoint]);

  const handlePrepare = async () => {
    if (!currentEndpoint) return;
    
    try {
      const parsedParams = JSON.parse(parameters);
      await onPrepare(currentEndpoint, parsedParams);
      setStep("fetch");
    } catch (error) {
      console.error("Invalid JSON parameters:", error);
    }
  };

  const handleExecute = async () => {
    if (!preparedRequest) return;
    
    await onExecute(preparedRequest);
    setStep("ingest");
  };

  return (
    <div className="space-y-6">
      {/* Workflow Steps */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          step === "prepare" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
        }`}>
          <Settings className="w-4 h-4" />
          Prepare
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          step === "fetch" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
        }`}>
          <Play className="w-4 h-4" />
          Fetch
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          step === "ingest" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
        }`}>
          <Database className="w-4 h-4" />
          Ingest
        </div>
      </div>

      {/* Endpoint Selection */}
      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={currentEndpoint?.id || ""} 
            onValueChange={(value) => {
              const endpoint = endpoints.find(e => e.id === value);
              setCurrentEndpoint(endpoint || null);
              setStep("prepare");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um endpoint para testar" />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((endpoint) => (
                <SelectItem key={endpoint.id} value={endpoint.id}>
                  <div className="flex items-center gap-2">
                    <Badge className={getMethodColor(endpoint.method)}>
                      {endpoint.method}
                    </Badge>
                    {endpoint.provider_name} - {endpoint.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentEndpoint && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium">{currentEndpoint.name}</div>
                <div className="text-gray-600">{currentEndpoint.description}</div>
                <div className="mt-1">
                  <code className="text-xs bg-white px-2 py-1 rounded">
                    {currentEndpoint.method} {currentEndpoint.path}
                  </code>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameters Input */}
      {currentEndpoint && (
        <Card>
          <CardHeader>
            <CardTitle>2. Parâmetros da Requisição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="parameters">Parâmetros (JSON)</Label>
              <textarea
                id="parameters"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder='{"cnj": "1234567-89.2023.8.26.0100", "tribunal": "TJSP"}'
                className="w-full mt-1 p-3 border rounded-lg font-mono text-sm h-32"
              />
            </div>
            
            <Button 
              onClick={handlePrepare}
              disabled={!currentEndpoint || preparing}
              className="w-full"
            >
              {preparing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              {preparing ? "Preparando..." : "Preparar Requisição"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prepared Request Display */}
      {preparedRequest && (
        <Card>
          <CardHeader>
            <CardTitle>3. Requisição Preparada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(preparedRequest, null, 2)}
              </pre>
            </div>
            
            <Button 
              onClick={handleExecute}
              disabled={!preparedRequest || executing}
              className="w-full"
            >
              {executing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {executing ? "Executando..." : "Executar Chamada"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Execution Result */}
      {executionResult && (
        <Card>
          <CardHeader>
            <CardTitle>4. Resultado da Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={executionResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <div className="flex items-center gap-2 mb-2">
                  {executionResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {executionResult.success ? "Sucesso" : "Erro"} - 
                    Status {executionResult.status_code} - 
                    {executionResult.response_time_ms}ms
                  </span>
                </div>
                <div className="text-sm">
                  Request ID: <code>{executionResult.request_id}</code>
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Resposta:</div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(executionResult.response, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper function
const getMethodColor = (method: string) => {
  switch (method) {
    case "GET":
      return "bg-green-100 text-green-800";
    case "POST":
      return "bg-blue-100 text-blue-800";
    case "PUT":
      return "bg-yellow-100 text-yellow-800";
    case "DELETE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default SF9ApiConsole;
