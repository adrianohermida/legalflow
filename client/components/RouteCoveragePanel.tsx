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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Play,
  ExternalLink,
  Copy,
  RotateCcw,
  Globe,
  Users,
  Building,
  Settings,
  Key,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useRouteDiagnostics } from "../lib/route-diagnostics-autofix";
import {
  routeCoverageSystem,
  RouteTest,
  RouteCoverageStats,
} from "../lib/route-coverage-system";

interface RouteCoveragePanelProps {
  className?: string;
}

const RouteCoveragePanel: React.FC<RouteCoveragePanelProps> = ({
  className,
}) => {
  const [routes, setRoutes] = useState<RouteTest[]>([]);
  const [stats, setStats] = useState<RouteCoverageStats | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [currentTestProgress, setCurrentTestProgress] = useState({
    current: 0,
    total: 0,
  });
  const [diagnosticsResults, setDiagnosticsResults] = useState<any[]>([]);
  const [healthStats, setHealthStats] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { toast } = useToast();
  const { runDiagnostics, applyAutoFixes, getHealthStats, generateReport } = useRouteDiagnostics();

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const allRoutes = routeCoverageSystem.getRoutes();
    const currentStats = routeCoverageSystem.getStats();
    setRoutes(allRoutes);
    setStats(currentStats);
  };

  const runRouteDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      console.log('🔍 Executando diagnóstico completo das rotas...');

      const issues = await runDiagnostics();
      const stats = await getHealthStats();

      setDiagnosticsResults(issues);
      setHealthStats(stats);
      setShowDiagnostics(true);

      toast({
        title: "Diagnóstico concluído",
        description: `${issues.length} problemas identificados. ${stats.autoFixableIssues} podem ser corrigidos automaticamente.`,
      });
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast({
        title: "Erro no diagnóstico",
        description: "Falha ao executar diagnóstico das rotas.",
        variant: "destructive",
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const applyAutomaticFixes = async () => {
    if (diagnosticsResults.length === 0) return;

    setIsApplyingFixes(true);
    try {
      console.log('🔧 Aplicando correções automáticas...');

      const fixResults = await applyAutoFixes(diagnosticsResults);
      const successfulFixes = fixResults.filter(r => r.success);

      // Atualizar dados após aplicar correções
      await refreshData();
      await runRouteDiagnostics();

      toast({
        title: "Correções aplicadas",
        description: `${successfulFixes.length} de ${fixResults.length} correções aplicadas com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao aplicar correções:', error);
      toast({
        title: "Erro nas correções",
        description: "Falha ao aplicar algumas correções automáticas.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingFixes(false);
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setCurrentTestProgress({ current: 0, total: routes.length });

    try {
      await routeCoverageSystem.testAllRoutes((route, index, total) => {
        setCurrentTestProgress({ current: index, total });
        // Update routes in real-time
        refreshData();
      });

      toast({
        title: "Teste de Rotas Concluído",
        description: "Todos os testes de rota foram executados com sucesso",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: `Falha ao executar testes: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsRunningTests(false);
      setCurrentTestProgress({ current: 0, total: 0 });
      refreshData();
    }
  };

  const runCategoryTests = async (category: RouteTest["category"]) => {
    setIsRunningTests(true);
    const categoryRoutes = routes.filter(
      (route) => route.category === category,
    );
    setCurrentTestProgress({ current: 0, total: categoryRoutes.length });

    try {
      await routeCoverageSystem.testRoutesByCategory(
        category,
        (route, index, total) => {
          setCurrentTestProgress({ current: index, total });
          refreshData();
        },
      );

      toast({
        title: `Teste ${category} Concluído`,
        description: `Testes da categoria ${category} executados com sucesso`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: `Falha ao testar categoria: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsRunningTests(false);
      setCurrentTestProgress({ current: 0, total: 0 });
      refreshData();
    }
  };

  const testSingleRoute = async (index: number) => {
    try {
      await routeCoverageSystem.testRoute(index);
      refreshData();
      toast({
        title: "Rota Testada",
        description: "Teste individual concluído",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Erro no Teste",
        description: `Falha ao testar rota: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  const openRoute = (index: number) => {
    routeCoverageSystem.openRoute(index);
    toast({
      title: "Rota Aberta",
      description: "Nova aba aberta com a rota selecionada",
      variant: "default",
    });
  };

  const copyDeeplink = (index: number) => {
    routeCoverageSystem.copyDeeplink(index);
    toast({
      title: "Deeplink Copiado",
      description: "Link da rota copiado para área de transferência",
      variant: "default",
    });
  };

  const resetTests = () => {
    routeCoverageSystem.resetTestResults();
    refreshData();
    toast({
      title: "Testes Resetados",
      description: "Todos os resultados de teste foram limpos",
      variant: "default",
    });
  };

  const getStatusIcon = (status: RouteTest["status"]) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "404":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "timeout":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "pending":
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: RouteTest["status"]) => {
    const variants = {
      ok: "default",
      "404": "destructive",
      error: "destructive",
      timeout: "secondary",
      pending: "outline",
    } as const;

    const labels = {
      ok: "OK",
      "404": "404",
      error: "ERROR",
      timeout: "TIMEOUT",
      pending: "PENDING",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status.toUpperCase()}
      </Badge>
    );
  };

  const getCategoryIcon = (category: RouteTest["category"]) => {
    const icons = {
      escritorio: <Building className="h-4 w-4" />,
      portal: <Users className="h-4 w-4" />,
      crm: <Globe className="h-4 w-4" />,
      admin: <Settings className="h-4 w-4" />,
      auth: <Key className="h-4 w-4" />,
      setup: <Settings className="h-4 w-4" />,
    };
    return icons[category] || <Globe className="h-4 w-4" />;
  };

  const filteredRoutes = routes.filter((route) => {
    const matchesCategory =
      selectedCategory === "all" || route.category === selectedCategory;
    const matchesSearch =
      searchFilter === "" ||
      route.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      route.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
      route.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(routes.map((route) => route.category)));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🛣️ SF-1: Cobertura de Rotas & Navegação
          </h2>
          <p className="text-muted-foreground">
            QA visual completo com health check, tempo de render e deeplinks de
            teste
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetTests}
            disabled={isRunningTests}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={runAllTests}
            disabled={isRunningTests}
            className="min-w-[140px]"
          >
            {isRunningTests ? (
              <>
                <Play className="mr-2 h-4 w-4 animate-spin" />
                Testando... ({currentTestProgress.current}/
                {currentTestProgress.total})
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Testar Todas
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <p className="text-sm font-medium">Total de Rotas</p>
                <p className="text-xs text-muted-foreground">Mapeadas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.ok}
                </div>
                <p className="text-sm font-medium">OK</p>
                <p className="text-xs text-muted-foreground">Funcionando</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.errors}
                </div>
                <p className="text-sm font-medium">Errors</p>
                <p className="text-xs text-muted-foreground">Com problemas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.avg_render_time}ms
                </div>
                <p className="text-sm font-medium">Tempo Médio</p>
                <p className="text-xs text-muted-foreground">Render</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.coverage_percentage}%
                </div>
                <p className="text-sm font-medium">Cobertura</p>
                <p className="text-xs text-muted-foreground">Testada</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.performance_issues || 0}
                </div>
                <p className="text-sm font-medium">Performance</p>
                <p className="text-xs text-muted-foreground">Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all-routes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all-routes">Todas as Rotas</TabsTrigger>
          <TabsTrigger value="by-category">Por Categoria</TabsTrigger>
          <TabsTrigger value="performance">🚀 Performance</TabsTrigger>
          <TabsTrigger value="health-report">Health Report</TabsTrigger>
          <TabsTrigger value="deeplinks">Deeplinks</TabsTrigger>
          <TabsTrigger value="diagnostics">🔧 Diagnósticos</TabsTrigger>
        </TabsList>

        <TabsContent value="all-routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista Completa de Rotas</CardTitle>
              <CardDescription>
                Todas as rotas mapeadas (Escritório + Portal + CRM) com status
                de health
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label>Buscar</Label>
                  <Input
                    placeholder="Filtrar por nome, path ou descrição..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
                <div className="w-48">
                  <Label>Categoria</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Routes Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Rota</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>User Type</TableHead>
                      <TableHead>Render Time</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Última Tested</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.map((route, index) => {
                      const originalIndex = routes.findIndex(
                        (r) => r.path === route.path,
                      );
                      return (
                        <TableRow key={route.path}>
                          <TableCell>{getStatusIcon(route.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{route.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {route.path}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {route.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(route.category)}
                              <span className="capitalize">
                                {route.category}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {route.userType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span
                                className={`text-sm ${route.renderTime > 500 ? "text-red-600" : "text-green-600"}`}
                              >
                                {route.renderTime > 0
                                  ? `${route.renderTime}ms`
                                  : "-"}
                              </span>
                              {route.renderTime > 500 && (
                                <span className="text-xs text-red-500">
                                  ⚠️ Slow
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {route.performanceScore !== undefined ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-sm font-medium ${
                                      route.performanceStatus === "excellent"
                                        ? "text-green-600"
                                        : route.performanceStatus === "good"
                                          ? "text-blue-600"
                                          : route.performanceStatus ===
                                              "acceptable"
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                    }`}
                                  >
                                    {route.performanceScore}
                                  </span>
                                  {route.performanceStatus === "excellent" && (
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                  )}
                                  {route.performanceStatus === "poor" && (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    route.performanceStatus === "excellent"
                                      ? "border-green-500"
                                      : route.performanceStatus === "good"
                                        ? "border-blue-500"
                                        : route.performanceStatus ===
                                            "acceptable"
                                          ? "border-yellow-500"
                                          : "border-red-500"
                                  }`}
                                >
                                  {route.performanceStatus}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {route.lastTested !== "never"
                                ? new Date(route.lastTested).toLocaleString()
                                : "Never"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => testSingleRoute(originalIndex)}
                                disabled={isRunningTests}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRoute(originalIndex)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyDeeplink(originalIndex)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-category" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => {
              const categoryRoutes = routes.filter(
                (route) => route.category === category,
              );
              const okCount = categoryRoutes.filter(
                (route) => route.status === "ok",
              ).length;
              const errorCount = categoryRoutes.filter((route) =>
                ["404", "error", "timeout"].includes(route.status),
              ).length;

              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize">{category}</span>
                      <Badge variant="outline">
                        {categoryRoutes.length} rotas
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {okCount} OK, {errorCount} com problemas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {categoryRoutes.slice(0, 5).map((route) => (
                        <div
                          key={route.path}
                          className="flex items-center gap-2 text-sm"
                        >
                          {getStatusIcon(route.status)}
                          <span className="flex-1 truncate">{route.name}</span>
                          {getStatusBadge(route.status)}
                        </div>
                      ))}
                      {categoryRoutes.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          +{categoryRoutes.length - 5} mais rotas...
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runCategoryTests(category)}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="mr-2 h-3 w-3" />
                      Testar{" "}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Analytics
              </CardTitle>
              <CardDescription>
                Métricas detalhadas de performance com benchmarks e
                recomendações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-6">
                  {/* Performance Overview */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        Tempo Médio
                      </h4>
                      <div
                        className={`text-2xl font-bold ${stats.avg_render_time > 500 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stats.avg_render_time}ms
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Render médio
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2">
                        🎯 Meta: &lt;500ms
                      </h4>
                      <div
                        className={`text-2xl font-bold ${stats.routes_above_500ms > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {stats.total - stats.routes_above_500ms}/{stats.total}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rotas dentro da meta
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2">⚠️ Issues</h4>
                      <div
                        className={`text-2xl font-bold ${stats.performance_issues > 0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {stats.performance_issues || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Problemas detectados
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2">
                        📊 Score Geral
                      </h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(
                          ((stats.total - stats.performance_issues) /
                            stats.total) *
                            100,
                        ) || 0}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Performance score
                      </div>
                    </Card>
                  </div>

                  {/* Performance Alerts */}
                  {stats.routes_above_500ms > 0 && (
                    <Alert className="border-orange-200">
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                      <AlertDescription>
                        ⚠️ {stats.routes_above_500ms} rotas com render time
                        acima de 500ms. Considere otimizações para melhorar a
                        experiência do usuário.
                      </AlertDescription>
                    </Alert>
                  )}

                  {stats.performance_issues > 0 && (
                    <Alert className="border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription>
                        🚨 {stats.performance_issues} rotas com problemas de
                        performance detectados. Revise as rotas marcadas como
                        "poor" ou "acceptable".
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Top Performing Routes */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        Top Performance
                      </h4>
                      <div className="space-y-2">
                        {routes
                          .filter(
                            (route) => route.performanceStatus === "excellent",
                          )
                          .slice(0, 5)
                          .map((route) => (
                            <div
                              key={route.path}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="truncate">{route.name}</span>
                              <Badge
                                variant="outline"
                                className="border-green-500 text-green-600"
                              >
                                {route.performanceScore}
                              </Badge>
                            </div>
                          ))}
                        {routes.filter(
                          (route) => route.performanceStatus === "excellent",
                        ).length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            Nenhuma rota com performance excelente ainda
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-1 text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        Needs Attention
                      </h4>
                      <div className="space-y-2">
                        {routes
                          .filter((route) => route.performanceStatus === "poor")
                          .slice(0, 5)
                          .map((route) => (
                            <div
                              key={route.path}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="truncate">{route.name}</span>
                              <Badge
                                variant="outline"
                                className="border-red-500 text-red-600"
                              >
                                {route.performanceScore}
                              </Badge>
                            </div>
                          ))}
                        {routes.filter(
                          (route) => route.performanceStatus === "poor",
                        ).length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            Nenhuma rota com problemas críticos 🎉
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health-report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Report Detalhado</CardTitle>
              <CardDescription>
                Relatório de saúde das rotas com métricas de performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-6">
                  {/* Performance Alert */}
                  {stats.avg_render_time > 500 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ⚠️ Tempo de render acima do esperado (&gt;500ms).
                        Algumas rotas podem estar lentas.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Error Summary */}
                  {stats.errors > 0 && (
                    <Alert className="border-red-200">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription>
                        🚨 {stats.errors} rotas com problemas detectados.
                        Verifique rotas com status 404 ou erro.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Summary */}
                  {stats.coverage_percentage >= 90 && stats.errors === 0 && (
                    <Alert className="border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        ✅ Excelente! {stats.coverage_percentage}% de cobertura
                        sem erros críticos.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Detailed Metrics */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2">
                        📊 Cobertura
                      </h4>
                      <div className="text-2xl font-bold">
                        {stats.coverage_percentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stats.ok + stats.errors} de {stats.total} testadas
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2">
                        ⚡ Performance
                      </h4>
                      <div className="text-2xl font-bold">
                        {stats.avg_render_time}ms
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tempo médio de render
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-semibold text-sm mb-2">
                        🎯 Confiabilidade
                      </h4>
                      <div className="text-2xl font-bold">
                        {stats.total > 0
                          ? Math.round(
                              (stats.ok / (stats.ok + stats.errors)) * 100,
                            )
                          : 0}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rotas funcionais
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deeplinks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deeplinks de Teste</CardTitle>
              <CardDescription>
                Links diretos para todas as rotas com query params de teste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routes.map((route, index) => (
                  <div key={route.path} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{route.name}</span>
                          {getStatusBadge(route.status)}
                          <Badge variant="outline" className="capitalize">
                            {route.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground break-all">
                          {route.deeplink}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRoute(index)}
                          title="Abrir rota"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyDeeplink(index)}
                          title="Copiar deeplink"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Diagnóstico Avançado de Rotas
                  </CardTitle>
                  <CardDescription>
                    Sistema automático de detecção e correção de problemas
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={runRouteDiagnostics}
                    disabled={isRunningDiagnostics}
                    variant="outline"
                  >
                    {isRunningDiagnostics ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isRunningDiagnostics ? "Diagnosticando..." : "Executar Diagnóstico"}
                  </Button>

                  {diagnosticsResults.length > 0 && (
                    <Button
                      onClick={applyAutomaticFixes}
                      disabled={isApplyingFixes || diagnosticsResults.filter(d => d.autoFixable).length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isApplyingFixes ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      {isApplyingFixes ? "Aplicando..." : "Auto-Corrigir"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Health Stats */}
              {healthStats && (
                <div className="grid grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {healthStats.totalRoutes}
                    </div>
                    <p className="text-sm text-gray-600">Total de Rotas</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {healthStats.healthyRoutes}
                    </div>
                    <p className="text-sm text-gray-600">Saudáveis</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {healthStats.issuesFound}
                    </div>
                    <p className="text-sm text-gray-600">Problemas</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {healthStats.autoFixableIssues}
                    </div>
                    <p className="text-sm text-gray-600">Auto-corrigíveis</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {healthStats.healthPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">Saúde Geral</p>
                  </div>
                </div>
              )}

              {/* Diagnostics Results */}
              {diagnosticsResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Problemas Identificados</h3>
                    <Badge variant="outline" className="text-sm">
                      {diagnosticsResults.length} issues
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {diagnosticsResults.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          issue.severity === 'critical'
                            ? 'border-red-200 bg-red-50'
                            : issue.severity === 'high'
                            ? 'border-orange-200 bg-orange-50'
                            : issue.severity === 'medium'
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={
                                  issue.severity === 'critical'
                                    ? 'border-red-500 text-red-700'
                                    : issue.severity === 'high'
                                    ? 'border-orange-500 text-orange-700'
                                    : issue.severity === 'medium'
                                    ? 'border-yellow-500 text-yellow-700'
                                    : 'border-blue-500 text-blue-700'
                                }
                              >
                                {issue.severity}
                              </Badge>
                              <Badge variant="outline">
                                {issue.issueType.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {issue.route.category}
                              </Badge>
                              {issue.autoFixable && (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  <Zap className="w-3 h-3 mr-1" />
                                  Auto-fixável
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 mb-1">
                              {issue.route.path} - {issue.route.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {issue.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              💡 {issue.suggestedFix}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <div className="text-right text-xs text-gray-500">
                              <div>~{issue.estimatedTime}min</div>
                            </div>
                            {!issue.autoFixable && (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Resumo do Diagnóstico</h4>
                        <p className="text-sm text-blue-700">
                          {diagnosticsResults.filter(d => d.autoFixable).length} problemas podem ser corrigidos automaticamente.
                          Tempo estimado: ~{diagnosticsResults.reduce((sum, d) => sum + d.estimatedTime, 0)} minutos.
                        </p>
                      </div>
                      {diagnosticsResults.filter(d => d.autoFixable).length > 0 && (
                        <Button
                          onClick={applyAutomaticFixes}
                          disabled={isApplyingFixes}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Corrigir Automaticamente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {diagnosticsResults.length === 0 && !isRunningDiagnostics && (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Execute o diagnóstico para identificar problemas nas rotas</p>
                  <p className="text-sm">O sistema analisará deeplinks, componentes, autenticação e performance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RouteCoveragePanel;
