import React, { useState } from "react";
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
import { implAudit, implAutofix } from "../lib/audit-rpcs";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  Database,
  Users,
  FileText,
  MessageSquare,
  Target,
  Globe,
  Shield,
  Cpu,
} from "lucide-react";

interface AuditModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "ok" | "error" | "pending";
  checks: Array<{
    id: string;
    name: string;
    status: "ok" | "error" | "pending";
    details?: string;
  }>;
  autofixCode?: string;
}

const CompletionPackAudit: React.FC = () => {
  const [auditResults, setAuditResults] = useState<Record<string, any>>({});
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [runningAutofix, setRunningAutofix] = useState<string | null>(null);
  const [lastAuditTime, setLastAuditTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Definir módulos baseados nos códigos da especificação
  const auditModules: AuditModule[] = [
    {
      id: "stage-types",
      name: "Stage Types",
      description: "Verificar stage_types.name preenchido e triggers",
      icon: <Target className="h-5 w-5" />,
      status: auditResults["jornadas"]?.status || "pending",
      checks: auditResults["jornadas"]?.checks || [],
      autofixCode: "STAGE_TYPES_FIX",
    },
    {
      id: "next-action", 
      name: "Next-Action",
      description: "Lógica compute_next_action e triggers funcionais",
      icon: <Cpu className="h-5 w-5" />,
      status: auditResults["jornadas"]?.status || "pending",
      checks: auditResults["jornadas"]?.checks || [],
      autofixCode: "NEXT_ACTION_CORE",
    },
    {
      id: "timeline",
      name: "Timeline",
      description: "Views vw_timeline_processo e sincronização",
      icon: <FileText className="h-5 w-5" />,
      status: auditResults["processos"]?.status || "pending", 
      checks: auditResults["processos"]?.checks || [],
      autofixCode: "TIMELINE_VIEWS",
    },
    {
      id: "dedup-indices",
      name: "Dedup Índices",
      description: "Índices de deduplicação ux_*_cnj_date_hash",
      icon: <Database className="h-5 w-5" />,
      status: auditResults["inbox-legal"]?.status || "pending",
      checks: auditResults["inbox-legal"]?.checks || [],
      autofixCode: "INDEX_DEDUP",
    },
    {
      id: "conversation-core",
      name: "Conversation Core",
      description: "Sistema de conversas, threads e properties",
      icon: <MessageSquare className="h-5 w-5" />,
      status: auditResults["crm"]?.status || "pending",
      checks: auditResults["crm"]?.checks || [],
      autofixCode: "CONVERSATION_CORE",
    },
    {
      id: "api-library",
      name: "API Library",
      description: "Endpoints, tokens e integração externa",
      icon: <Globe className="h-5 w-5" />,
      status: auditResults["api-library"]?.status || "pending",
      checks: auditResults["api-library"]?.checks || [],
      autofixCode: "API_SEED",
    },
    {
      id: "etl-ingest",
      name: "ETL Ingest",
      description: "Sistema de ingestão e pipeline ETL",
      icon: <RefreshCw className="h-5 w-5" />,
      status: auditResults["processos"]?.status || "pending",
      checks: auditResults["processos"]?.checks || [],
      autofixCode: "ETL_INGEST",
    },
    {
      id: "contacts-view",
      name: "Contacts View",
      description: "vw_contacts_unified e CRM integrado",
      icon: <Users className="h-5 w-5" />,
      status: auditResults["crm"]?.status || "pending",
      checks: auditResults["crm"]?.checks || [],
      autofixCode: "CONTACTS_VIEW_FIX",
    },
  ];

  const runAudit = async () => {
    setIsRunningAudit(true);
    try {
      const results = await implAudit();
      setAuditResults(results);
      setLastAuditTime(new Date());
      
      const totalModules = Object.keys(results).length;
      const okModules = Object.values(results).filter(r => r.status === "ok").length;
      const errorModules = Object.values(results).filter(r => r.status === "error").length;

      toast({
        title: "Auditoria Concluída",
        description: `${okModules}/${totalModules} módulos OK, ${errorModules} com problemas`,
        variant: okModules === totalModules ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Erro na auditoria:", error);
      toast({
        title: "Erro na Auditoria",
        description: error instanceof Error ? error.message : "Falha na execução",
        variant: "destructive",
      });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const runAutofix = async (module: AuditModule) => {
    if (!module.autofixCode) return;
    
    setRunningAutofix(module.id);
    try {
      const result = await implAutofix(module.autofixCode);
      
      if (result.success) {
        toast({
          title: "Autofix Executado",
          description: `${module.name}: ${result.message}`,
        });
        
        // Re-run audit para verificar resultado
        setTimeout(() => runAudit(), 1000);
      } else {
        toast({
          title: "Autofix Falhou",
          description: result.errors.join(", "),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro no autofix:", error);
      toast({
        title: "Erro no Autofix",
        description: error instanceof Error ? error.message : "Falha na execução",
        variant: "destructive",
      });
    } finally {
      setRunningAutofix(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      default:
        return "border-yellow-200 bg-yellow-50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Completion Pack - Auditoria & Autofix</h2>
          <p className="text-muted-foreground">
            Subflow 0: Ver pendências e corrigir com 1 clique
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastAuditTime && (
            <span className="text-sm text-muted-foreground">
              Última auditoria: {lastAuditTime.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={runAudit}
            disabled={isRunningAudit}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunningAudit ? "animate-spin" : ""}`} />
            {isRunningAudit ? "Auditando..." : "Executar Auditoria"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {Object.keys(auditResults).length > 0 && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            Status: {auditModules.filter(m => m.status === "ok").length} OK, {" "}
            {auditModules.filter(m => m.status === "error").length} com problemas, {" "}
            {auditModules.filter(m => m.status === "pending").length} pendentes
          </AlertDescription>
        </Alert>
      )}

      {/* Audit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {auditModules.map((module) => (
          <Card key={module.id} className={`${getStatusColor(module.status)} transition-all duration-200`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {module.icon}
                  <CardTitle className="text-sm">{module.name}</CardTitle>
                </div>
                {getStatusIcon(module.status)}
              </div>
              <CardDescription className="text-xs">
                {module.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Status Details */}
              {module.checks.length > 0 && (
                <div className="space-y-1">
                  {module.checks.slice(0, 2).map((check) => (
                    <div key={check.id} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {check.name}
                      </span>
                      <Badge
                        variant={check.status === "ok" ? "default" : "destructive"}
                        className="text-xs py-0 px-1"
                      >
                        {check.status === "ok" ? "OK" : check.status === "error" ? "ERR" : "PEND"}
                      </Badge>
                    </div>
                  ))}
                  {module.checks.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{module.checks.length - 2} mais...
                    </span>
                  )}
                </div>
              )}

              {/* Autofix Button */}
              {module.autofixCode && (
                <Button
                  size="sm"
                  onClick={() => runAutofix(module)}
                  disabled={runningAutofix === module.id || module.status === "ok"}
                  className="w-full text-xs"
                  variant={module.status === "error" ? "default" : "outline"}
                >
                  {runningAutofix === module.id ? (
                    <div className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Corrigindo...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {module.status === "ok" ? "OK" : "Autofix"}
                    </div>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>Executar Auditoria:</strong> verifica status de todos os módulos</p>
          <p>• <strong>Autofix:</strong> corrige automaticamente problemas detectados</p>
          <p>• <strong>Status OK:</strong> módulo funcionando corretamente</p>
          <p>• <strong>Status Error:</strong> requer correção (use Autofix)</p>
          <p>• <strong>Status Pending:</strong> não verificado ou setup incompleto</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionPackAudit;
