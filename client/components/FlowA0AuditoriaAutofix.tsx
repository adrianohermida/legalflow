/**
 * Flow A0: Auditoria & Autofix (Dev Console)
 * Behavior Goal: detectar pendências e corrigir em 1 clique
 * 
 * Implementação completa conforme especificação:
 * - Cards específicos para cada área
 * - Botões Executar Auditoria → rpc legalflow.impl_audit()
 * - Botões Autofix �� rpc legalflow.impl_autofix(patch_code)
 * - Bindings: supabaseLF.rpc
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { lf } from '../lib/supabase'; // supabaseLF binding
import { flowA0ImplAudit, flowA0ImplAutofix } from '../lib/flow-a0-rpcs';
import {
  CheckCircle,
  XCircle,
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
  Cpu,
  Activity,
  Settings,
  Play,
  AlertCircle,
} from 'lucide-react';

interface AuditModuleStatus {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'ok' | 'error' | 'pending' | 'checking';
  checks: Array<{
    id: string;
    name: string;
    status: 'ok' | 'error' | 'pending';
    details?: string;
  }>;
  autofixCode: string;
  lastChecked?: string;
}

interface AuditResults {
  [moduleId: string]: {
    status: 'ok' | 'error' | 'pending';
    checks: Array<{
      id: string;
      name: string;
      status: 'ok' | 'error' | 'pending';
      details?: string;
    }>;
    lastChecked?: string;
  };
}

// Interface movida para flow-a0-rpcs.ts

export function FlowA0AuditoriaAutofix() {
  const [modules, setModules] = useState<AuditModuleStatus[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [runningAutofix, setRunningAutofix] = useState<string | null>(null);
  const [auditProgress, setAuditProgress] = useState(0);
  const [lastAuditTime, setLastAuditTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Definir módulos conforme especificação A0
  const initializeModules = (): AuditModuleStatus[] => [
    {
      id: 'stage-types',
      name: 'Stage Types',
      description: 'Verificar stage_types.name preenchido e triggers',
      icon: <Target className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'STAGE_TYPES_FIX',
    },
    {
      id: 'next-action',
      name: 'Next-Action/Trigger',
      description: 'Lógica compute_next_action e triggers funcionais',
      icon: <Cpu className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'NEXT_ACTION_CORE',
    },
    {
      id: 'timeline-view',
      name: 'Timeline View',
      description: 'Views vw_timeline_processo e sincronização',
      icon: <FileText className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'TIMELINE_VIEWS',
    },
    {
      id: 'dedup-indices',
      name: 'Dedup Índices',
      description: 'Índices de deduplicação ux_*_cnj_date_hash',
      icon: <Database className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'INDEX_DEDUP',
    },
    {
      id: 'conversation-core',
      name: 'Conversation Core',
      description: 'Sistema de conversas, threads e properties',
      icon: <MessageSquare className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'CONVERSATION_CORE',
    },
    {
      id: 'api-library',
      name: 'API Library',
      description: 'Endpoints, tokens e integração externa',
      icon: <Globe className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'API_SEED',
    },
    {
      id: 'etl-ingest',
      name: 'ETL Ingest',
      description: 'Sistema de ingestão e pipeline ETL',
      icon: <Activity className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'ETL_INGEST',
    },
    {
      id: 'contacts-view',
      name: 'Contacts View',
      description: 'vw_contacts_unified e CRM integrado',
      icon: <Users className="h-5 w-5" />,
      status: 'pending',
      checks: [],
      autofixCode: 'CONTACTS_VIEW_FIX',
    },
  ];

  useEffect(() => {
    setModules(initializeModules());
  }, []);

  /**
   * Executar Auditoria → rpc legalflow.impl_audit()
   */
  const executeAudit = async () => {
    setIsRunningAudit(true);
    setAuditProgress(0);

    try {
      console.log('🔍 Iniciando auditoria Flow A0...');

      // Chamar implementação local que usa supabaseLF
      const auditResults = await flowA0ImplAudit();

      console.log('📊 Resultados da auditoria:', auditResults);

      // Atualizar módulos com resultados
      setModules(prevModules => 
        prevModules.map(module => {
          const moduleResult = auditResults[module.id];
          if (moduleResult) {
            return {
              ...module,
              status: moduleResult.status,
              checks: moduleResult.checks || [],
              lastChecked: new Date().toISOString(),
            };
          }
          return module;
        })
      );

      setLastAuditTime(new Date());

      // Calcular estatísticas
      const totalModules = Object.keys(auditResults).length;
      const okModules = Object.values(auditResults).filter(r => r.status === 'ok').length;
      const errorModules = Object.values(auditResults).filter(r => r.status === 'error').length;

      toast({
        title: 'Auditoria Concluída',
        description: `${okModules}/${totalModules} módulos OK, ${errorModules} com problemas`,
        variant: okModules === totalModules ? 'default' : 'destructive',
      });

    } catch (error) {
      console.error('❌ Erro na auditoria:', error);
      toast({
        title: 'Erro na Auditoria',
        description: error instanceof Error ? error.message : 'Falha na execução',
        variant: 'destructive',
      });
    } finally {
      setIsRunningAudit(false);
      setAuditProgress(100);
    }
  };

  /**
   * Autofix → rpc legalflow.impl_autofix(patch_code)
   */
  const executeAutofix = async (module: AuditModuleStatus) => {
    setRunningAutofix(module.id);

    try {
      console.log(`🔧 Executando autofix: ${module.autofixCode}`);

      // Chamar implementação local que usa supabaseLF
      const result = await flowA0ImplAutofix(module.autofixCode);

      console.log('🛠️ Resultado do autofix:', result);

      if (result.success) {
        toast({
          title: 'Autofix Executado',
          description: `${module.name}: ${result.message}`,
        });

        // Atualizar status do módulo para 'checking'
        setModules(prevModules =>
          prevModules.map(m =>
            m.id === module.id ? { ...m, status: 'checking' } : m
          )
        );

        // Re-executar auditoria após autofix
        setTimeout(() => {
          executeAudit();
        }, 1500);
      } else {
        toast({
          title: 'Autofix Falhou',
          description: result.errors.join(', '),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Erro no autofix:', error);
      toast({
        title: 'Erro no Autofix',
        description: error instanceof Error ? error.message : 'Falha na execução',
        variant: 'destructive',
      });
    } finally {
      setRunningAutofix(null);
    }
  };

  // Utilitários de UI
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-danger" />;
      case 'checking':
        return <RefreshCw className="h-4 w-4 text-brand-700 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-warn" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'checking':
        return 'border-brand-200 bg-brand-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  // Estatísticas
  const stats = {
    total: modules.length,
    ok: modules.filter(m => m.status === 'ok').length,
    error: modules.filter(m => m.status === 'error').length,
    pending: modules.filter(m => m.status === 'pending' || m.status === 'checking').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-semibold text-gray-900">
            Flow A0: Auditoria & Autofix
          </h2>
          <p className="text-gray-600 mt-1">
            Detectar pendências e corrigir em 1 clique
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastAuditTime && (
            <span className="text-sm text-gray-500">
              Última auditoria: {lastAuditTime.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={executeAudit}
            disabled={isRunningAudit}
            className="bg-brand-900 hover:bg-brand-700"
          >
            {isRunningAudit ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunningAudit ? 'Auditando...' : 'Executar Auditoria'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-brand-700" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
                <div className="text-sm text-gray-600">OK</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                <div className="text-sm text-gray-600">Erro</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">Pendente</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {isRunningAudit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso da Auditoria</span>
              <span className="text-sm text-gray-600">{Math.round(auditProgress)}%</span>
            </div>
            <Progress value={auditProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Status Summary */}
      {stats.total > 0 && lastAuditTime && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Status da Auditoria</AlertTitle>
          <AlertDescription>
            {stats.ok} módulos OK, {stats.error} com problemas, {stats.pending} pendentes.
            {stats.error > 0 && ' Use os botões Autofix para corrigir automaticamente.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Audit Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((module) => (
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
                      <span className="text-xs text-gray-600">{check.name}</span>
                      <Badge
                        variant={check.status === 'ok' ? 'default' : 'destructive'}
                        className="text-xs py-0 px-1"
                      >
                        {check.status === 'ok' ? 'OK' : check.status === 'error' ? 'ERR' : 'PEND'}
                      </Badge>
                    </div>
                  ))}
                  {module.checks.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{module.checks.length - 2} mais...
                    </span>
                  )}
                </div>
              )}

              {/* Autofix Button */}
              <Button
                size="sm"
                onClick={() => executeAutofix(module)}
                disabled={runningAutofix === module.id || module.status === 'checking'}
                className="w-full text-xs"
                variant={module.status === 'error' ? 'default' : 'outline'}
              >
                {runningAutofix === module.id ? (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Corrigindo...
                  </div>
                ) : module.status === 'checking' ? (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Verificando...
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {module.status === 'ok' ? 'OK' : 'Autofix'}
                  </div>
                )}
              </Button>

              {/* Last Checked */}
              {module.lastChecked && (
                <div className="text-xs text-gray-500 text-center">
                  {new Date(module.lastChecked).toLocaleTimeString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Flow A0 - Instruções de Uso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>Executar Auditoria:</strong> Chama <code>legalflow.impl_audit()</code> para verificar todos os módulos</p>
          <p>• <strong>Autofix:</strong> Chama <code>legalflow.impl_autofix(patch_code)</code> com códigos específicos</p>
          <p>• <strong>Códigos disponíveis:</strong> STAGE_TYPES_FIX, NEXT_ACTION_CORE, TIMELINE_VIEWS, INDEX_DEDUP, CONVERSATION_CORE, API_SEED, ETL_INGEST</p>
          <p>• <strong>Aceite:</strong> Auditoria lista status; autofix aplica e reaudita sem erro</p>
        </CardContent>
      </Card>
    </div>
  );
}
