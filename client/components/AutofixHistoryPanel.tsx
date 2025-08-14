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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Settings, Zap } from 'lucide-react';
import EnhancedAutofixPanel from './EnhancedAutofixPanel';
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Progress } from "./ui/progress";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import {
  autofixHistory,
  ModificationEntry,
  BuilderPromptRequest,
} from "../lib/autofix-history";
import { createAutofixTables, insertSampleData } from "../lib/supabase-setup-helper";
// import { initializeAutofixDatabase } from "../lib/autofix-database-setup";
import {
  History,
  GitBranch,
  Zap,
  Bot,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Upload,
  Play,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

interface AutofixHistoryPanelProps {
  onPromptExecuted?: (result: any) => void;
}

export function AutofixHistoryPanel({ onPromptExecuted }: AutofixHistoryPanelProps) {
  const [modifications, setModifications] = useState<ModificationEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);
  const [isBuilderDialogOpen, setIsBuilderDialogOpen] = useState(false);
  const [builderPrompt, setBuilderPrompt] = useState("");
  const [builderContext, setBuilderContext] = useState("");
  const [builderPriority, setBuilderPriority] = useState<"low" | "medium" | "high">("medium");
  const [builderCategory, setBuilderCategory] = useState<"bug_fix" | "feature" | "improvement" | "refactor">("improvement");
  const [processingPrompt, setProcessingPrompt] = useState(false);
  const [isAutoSetup, setIsAutoSetup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const tablesExist = await initializeDatabase();
      if (tablesExist) {
        loadHistory();
        loadStats();
      }
    };
    init();
  }, []);

  const initializeDatabase = async () => {
    try {
      // Check if autofix_history table exists
      const { error } = await supabase.from("autofix_history").select("id").limit(1);

      if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
        console.log("Autofix tables don't exist. Please run the SQL setup script in Supabase.");
        toast({
          title: "⚠️ Configuração Necessária",
          description: "As tabelas de histórico não existem. Execute o script AUTOFIX_DATABASE_SETUP.sql no Supabase SQL Editor.",
          variant: "destructive",
        });
        setTablesExist(false);
        return false;
      } else if (error) {
        console.error("Database access error:", error);
        toast({
          title: "Erro de Acesso",
          description: `Erro ao acessar banco: ${error.message}`,
          variant: "destructive",
        });
        setTablesExist(false);
        return false;
      }

      console.log("Autofix tables verified successfully");
      setTablesExist(true);
      return true;
    } catch (error) {
      console.warn("Could not verify autofix tables:", error);
      setTablesExist(false);
      return false;
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const history = await autofixHistory.getModificationHistory(100);
      setModifications(history);
    } catch (error) {
      console.error("Failed to load modification history:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro ao carregar histórico",
        description: errorMessage.includes("relation") && errorMessage.includes("does not exist")
          ? "Tabelas não encontradas. Execute o script SQL no Supabase."
          : `Erro: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const systemStats = await autofixHistory.getSystemStats();
      setStats(systemStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        console.warn("Autofix tables don't exist. Stats will be unavailable.");
      }
    }
  };

  const handleImportGitHistory = async () => {
    try {
      setLoading(true);
      toast({
        title: "Importando histórico Git",
        description: "Importando commits do repositório...",
      });

      await autofixHistory.importGitHistory();
      
      toast({
        title: "Histórico importado",
        description: "Commits do Git foram importados com sucesso",
      });

      await loadHistory();
      await loadStats();
    } catch (error) {
      console.error("Failed to import git history:", error);
      toast({
        title: "Erro na importação",
        description: "Falha ao importar histórico do Git",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuilderPrompt = async () => {
    if (!builderPrompt.trim()) {
      toast({
        title: "Prompt requerido",
        description: "Digite um prompt para enviar ao Builder.io",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPrompt(true);
      
      const request: BuilderPromptRequest = {
        prompt: builderPrompt,
        context: builderContext,
        priority: builderPriority,
        category: builderCategory,
      };

      toast({
        title: "Executando prompt",
        description: "Enviando prompt para Builder.io...",
      });

      const response = await autofixHistory.executeBuilderPrompt(request);
      
      if (response.status === "completed") {
        toast({
          title: "Prompt executado",
          description: response.result?.summary || "Prompt executado com sucesso",
        });
        
        onPromptExecuted?.(response.result);
      } else {
        toast({
          title: "Erro no prompt",
          description: response.error || "Falha na execução do prompt",
          variant: "destructive",
        });
      }

      setIsBuilderDialogOpen(false);
      setBuilderPrompt("");
      setBuilderContext("");
      
      await loadHistory();
      await loadStats();
    } catch (error) {
      console.error("Failed to execute builder prompt:", error);
      toast({
        title: "Erro na execução",
        description: "Falha ao executar prompt no Builder.io",
        variant: "destructive",
      });
    } finally {
      setProcessingPrompt(false);
    }
  };

  const handleAutoSetup = async () => {
    try {
      setIsAutoSetup(true);

      toast({
        title: "Configurando tabelas",
        description: "Tentando criar tabelas automaticamente...",
      });

      const setupResult = await createAutofixTables();

      if (setupResult.success) {
        toast({
          title: "Tabelas criadas",
          description: "Inserindo dados de exemplo...",
        });

        const sampleResult = await insertSampleData();

        if (sampleResult.success) {
          toast({
            title: "✅ Setup concluído",
            description: "Tabelas criadas e dados de exemplo inseridos com sucesso!",
          });

          setTablesExist(true);
          loadHistory();
          loadStats();
        } else {
          toast({
            title: "⚠️ Setup parcial",
            description: "Tabelas criadas, mas erro ao inserir dados de exemplo",
            variant: "destructive",
          });
          setTablesExist(true);
        }
      } else {
        toast({
          title: "❌ Falha no setup automático",
          description: setupResult.error || "Use o SQL Editor do Supabase",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no setup",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsAutoSetup(false);
    }
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(modifications, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `autofix-history-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Histórico exportado",
      description: "Arquivo de histórico baixado com sucesso",
    });
  };

  const getTypeIcon = (type: ModificationEntry["type"]) => {
    switch (type) {
      case "autofix":
        return <Zap className="w-4 h-4 text-yellow-600" />;
      case "manual":
        return <User className="w-4 h-4 text-blue-600" />;
      case "builder_prompt":
        return <Bot className="w-4 h-4 text-purple-600" />;
      case "git_import":
        return <GitBranch className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: ModificationEntry["type"]) => {
    switch (type) {
      case "autofix":
        return "AutoFix";
      case "manual":
        return "Manual";
      case "builder_prompt":
        return "Builder.io";
      case "git_import":
        return "Git Import";
      default:
        return type;
    }
  };

  // Se as tabelas não existem, mostrar instruções de setup
  if (tablesExist === false) {
    return (
      <div className="space-y-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <MessageSquare className="w-5 h-5" />
              Configuração Necessária
            </CardTitle>
            <CardDescription className="text-orange-700">
              As tabelas de histórico do autofix não foram encontradas no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-orange-700">
                Para usar o sistema de histórico, você precisa executar o script SQL no Supabase:
              </p>

              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <ol className="list-decimal list-inside space-y-2 text-sm text-orange-800">
                  <li>Acesse o Supabase SQL Editor</li>
                  <li>Execute o arquivo <code className="bg-orange-100 px-2 py-1 rounded">AUTOFIX_DATABASE_SETUP.sql</code></li>
                  <li>Aguarde a criação das tabelas</li>
                  <li>Recarregue esta página</li>
                </ol>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleAutoSetup}
                  disabled={isAutoSetup}
                  className="flex items-center gap-2"
                >
                  {isAutoSetup ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Setup Automático
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Supabase
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setTablesExist(null);
                    const init = async () => {
                      const exists = await initializeDatabase();
                      if (exists) {
                        loadHistory();
                        loadStats();
                      }
                    };
                    init();
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Verificar Novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state durante verificação inicial
  if (tablesExist === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Verificando configuração do banco de dados...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="enhanced-autofix" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enhanced-autofix" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Enhanced Autofix
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            History & Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced-autofix">
          <EnhancedAutofixPanel />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_modifications}</div>
              <p className="text-xs text-muted-foreground">Total de Modificações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.successful_modifications}</div>
              <p className="text-xs text-muted-foreground">Sucessos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.failed_modifications}</div>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {Math.round((stats.successful_modifications / stats.total_modifications) * 100) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Controle de Histórico
          </CardTitle>
          <CardDescription>
            Gerencie e monitore todas as modificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={loadHistory}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            
            <Button
              onClick={handleImportGitHistory}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar Git
            </Button>
            
            <Button
              onClick={exportHistory}
              disabled={loading || modifications.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>

            <Dialog open={isBuilderDialogOpen} onOpenChange={setIsBuilderDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Prompt Builder.io
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Executar Prompt no Builder.io</DialogTitle>
                  <DialogDescription>
                    Envie prompts para serem executados via API do Builder.io
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Prompt</label>
                    <Textarea
                      value={builderPrompt}
                      onChange={(e) => setBuilderPrompt(e.target.value)}
                      placeholder="Descreva o que você quer que seja modificado no sistema..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Contexto (opcional)</label>
                    <Textarea
                      value={builderContext}
                      onChange={(e) => setBuilderContext(e.target.value)}
                      placeholder="Forneça contexto adicional sobre a modificação..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Prioridade</label>
                      <Select value={builderPriority} onValueChange={(value: any) => setBuilderPriority(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Categoria</label>
                      <Select value={builderCategory} onValueChange={(value: any) => setBuilderCategory(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bug_fix">Correção</SelectItem>
                          <SelectItem value="feature">Funcionalidade</SelectItem>
                          <SelectItem value="improvement">Melhoria</SelectItem>
                          <SelectItem value="refactor">Refatoração</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsBuilderDialogOpen(false)}
                    disabled={processingPrompt}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBuilderPrompt}
                    disabled={processingPrompt || !builderPrompt.trim()}
                    className="flex items-center gap-2"
                  >
                    {processingPrompt ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Executar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Modificações</CardTitle>
          <CardDescription>
            {modifications.length} modificações registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Carregando histórico...
            </div>
          ) : modifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma modificação registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mudanças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modifications.map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell className="text-xs">
                      {new Date(mod.timestamp).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getTypeIcon(mod.type)}
                        {getTypeLabel(mod.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{mod.module}</TableCell>
                    <TableCell className="max-w-xs truncate">{mod.description}</TableCell>
                    <TableCell>
                      {mod.success ? (
                        <Badge className="flex items-center gap-1 w-fit bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          Falha
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {Array.isArray(mod.changes) ? mod.changes.length : 0} modificações
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
