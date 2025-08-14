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
import {
  autofixHistory,
  ModificationEntry,
  BuilderPromptRequest,
} from "../lib/autofix-history";
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
  const [isBuilderDialogOpen, setIsBuilderDialogOpen] = useState(false);
  const [builderPrompt, setBuilderPrompt] = useState("");
  const [builderContext, setBuilderContext] = useState("");
  const [builderPriority, setBuilderPriority] = useState<"low" | "medium" | "high">("medium");
  const [builderCategory, setBuilderCategory] = useState<"bug_fix" | "feature" | "improvement" | "refactor">("improvement");
  const [processingPrompt, setProcessingPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeDatabase();
    loadHistory();
    loadStats();
  }, []);

  const initializeDatabase = async () => {
    try {
      // Simple check if tables exist - initialize directly in the component
      const { error } = await supabase.from("autofix_history").select("id").limit(1);

      if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
        console.log("Autofix tables don't exist. Please run the SQL setup script in Supabase.");
        toast({
          title: "Configuração necessária",
          description: "Execute o script SQL AUTOFIX_DATABASE_SETUP.sql no Supabase",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.warn("Could not verify autofix tables:", error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const history = await autofixHistory.getModificationHistory(100);
      setModifications(history);
    } catch (error) {
      console.error("Failed to load modification history:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de modificações",
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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
