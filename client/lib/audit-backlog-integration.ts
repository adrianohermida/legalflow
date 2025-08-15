import { supabase } from './supabase';
import { autofixHistory } from './autofix-history';

interface AuditFinding {
  id: string;
  type: 'error' | 'warning' | 'improvement' | 'optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  module: string;
  title: string;
  description: string;
  recommendation: string;
  estimatedEffort: number; // em horas
  storyPoints: number;
  tags: string[];
  category: 'performance' | 'security' | 'ui' | 'database' | 'api' | 'general';
  builderExecutable: boolean;
  builderPrompt?: string;
}

interface BacklogSuggestion {
  finding: AuditFinding;
  autoCreate: boolean;
  reason: string;
}

/**
 * Analisa os resultados de uma auditoria e identifica oportunidades de melhoria
 * que podem ser automaticamente convertidas em itens do backlog
 */
export class AuditBacklogIntegrator {
  private static readonly AUTO_CREATE_THRESHOLDS = {
    criticalErrors: true,
    highPriorityImprovements: true,
    performanceIssues: true,
    securityVulnerabilities: true,
  };

  /**
   * Analisa os resultados da auditoria e gera sugestões para o backlog
   */
  static async analyzeAuditResults(auditResults: any): Promise<BacklogSuggestion[]> {
    const findings: AuditFinding[] = [];
    const suggestions: BacklogSuggestion[] = [];

    // Analisar cada módulo da auditoria
    for (const [moduleId, moduleResult] of Object.entries(auditResults)) {
      const moduleData = moduleResult as any;
      
      if (moduleData.status === 'error') {
        for (const check of moduleData.checks || []) {
          if (check.status === 'error') {
            const finding = this.mapCheckToFinding(moduleId, check);
            if (finding) {
              findings.push(finding);
            }
          }
        }
      }
    }

    // Detectar padrões e gerar sugestões
    for (const finding of findings) {
      const suggestion = this.evaluateFindingForBacklog(finding);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Mapeia um check de auditoria para um finding estruturado
   */
  private static mapCheckToFinding(moduleId: string, check: any): AuditFinding | null {
    const findingMap: Record<string, Partial<AuditFinding>> = {
      'route-coverage': {
        type: 'improvement',
        category: 'api',
        tags: ['routes', 'coverage', 'navigation'],
        recommendation: 'Implementar rotas faltantes e corrigir problemas de deeplink',
        estimatedEffort: 4,
        storyPoints: 3,
        builderExecutable: true,
        builderPrompt: 'Corrigir problemas de roteamento e implementar rotas faltantes para melhorar a navegação do usuário'
      },
      'database-integrity': {
        type: 'error',
        category: 'database',
        tags: ['database', 'integrity', 'schema'],
        recommendation: 'Corrigir problemas de integridade do banco de dados',
        estimatedEffort: 6,
        storyPoints: 5,
        builderExecutable: false
      },
      'api-endpoints': {
        type: 'improvement',
        category: 'api',
        tags: ['api', 'endpoints', 'performance'],
        recommendation: 'Otimizar performance dos endpoints da API',
        estimatedEffort: 3,
        storyPoints: 2,
        builderExecutable: true,
        builderPrompt: 'Implementar otimizações de performance nos endpoints da API mais utilizados'
      },
      'ui-components': {
        type: 'improvement',
        category: 'ui',
        tags: ['ui', 'components', 'accessibility'],
        recommendation: 'Melhorar acessibilidade e consistência dos componentes',
        estimatedEffort: 8,
        storyPoints: 5,
        builderExecutable: true,
        builderPrompt: 'Refatorar componentes UI para melhorar acessibilidade e seguir padrões do design system'
      },
      'security-audit': {
        type: 'error',
        category: 'security',
        tags: ['security', 'vulnerability', 'authentication'],
        recommendation: 'Corrigir vulnerabilidades de segurança identificadas',
        estimatedEffort: 12,
        storyPoints: 8,
        builderExecutable: false
      },
      'performance-metrics': {
        type: 'optimization',
        category: 'performance',
        tags: ['performance', 'optimization', 'metrics'],
        recommendation: 'Implementar melhorias de performance baseadas em métricas',
        estimatedEffort: 5,
        storyPoints: 3,
        builderExecutable: true,
        builderPrompt: 'Otimizar componentes com base nas métricas de performance coletadas'
      }
    };

    const template = findingMap[check.id] || findingMap[moduleId];
    if (!template) return null;

    const severity = this.determineSeverity(check);
    
    return {
      id: `${moduleId}-${check.id}-${Date.now()}`,
      title: `${template.type === 'error' ? 'Corrigir' : 'Melhorar'}: ${check.name}`,
      description: check.details || check.description || `Problema identificado no módulo ${moduleId}`,
      module: moduleId,
      severity,
      type: template.type || 'improvement',
      category: template.category || 'general',
      tags: template.tags || [moduleId],
      recommendation: template.recommendation || 'Investigar e corrigir o problema identificado',
      estimatedEffort: template.estimatedEffort || 2,
      storyPoints: template.storyPoints || 1,
      builderExecutable: template.builderExecutable || false,
      builderPrompt: template.builderPrompt
    };
  }

  /**
   * Determina a severidade baseada no status e contexto
   */
  private static determineSeverity(check: any): 'low' | 'medium' | 'high' | 'critical' {
    if (check.details?.includes('critical') || check.details?.includes('security')) {
      return 'critical';
    }
    if (check.details?.includes('performance') || check.details?.includes('error')) {
      return 'high';
    }
    if (check.details?.includes('warning')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Avalia se um finding deve ser sugerido para criação automática no backlog
   */
  private static evaluateFindingForBacklog(finding: AuditFinding): BacklogSuggestion | null {
    let autoCreate = false;
    let reason = '';

    // Regras para criação automática
    if (finding.severity === 'critical') {
      autoCreate = this.AUTO_CREATE_THRESHOLDS.criticalErrors;
      reason = 'Erro crítico detectado - criação automática recomendada';
    } else if (finding.type === 'error' && finding.severity === 'high') {
      autoCreate = this.AUTO_CREATE_THRESHOLDS.highPriorityImprovements;
      reason = 'Erro de alta prioridade detectado';
    } else if (finding.category === 'performance' && finding.severity !== 'low') {
      autoCreate = this.AUTO_CREATE_THRESHOLDS.performanceIssues;
      reason = 'Problema de performance identificado';
    } else if (finding.category === 'security') {
      autoCreate = this.AUTO_CREATE_THRESHOLDS.securityVulnerabilities;
      reason = 'Vulnerabilidade de segurança detectada';
    } else if (finding.storyPoints >= 3) {
      autoCreate = false;
      reason = 'Melhoria significativa sugerida para análise manual';
    } else {
      autoCreate = false;
      reason = 'Melhoria menor sugerida para revisão';
    }

    return {
      finding,
      autoCreate,
      reason
    };
  }

  /**
   * Cria automaticamente itens no backlog baseado nas sugestões aprovadas
   */
  static async createBacklogItemsFromSuggestions(suggestions: BacklogSuggestion[], userId?: string): Promise<string[]> {
    const createdItems: string[] = [];

    for (const suggestion of suggestions) {
      if (suggestion.autoCreate) {
        try {
          const itemId = await this.createBacklogItem(suggestion.finding, userId);
          if (itemId) {
            createdItems.push(itemId);
            
            // Registrar no histórico
            await autofixHistory.recordModification({
              type: 'audit_integration',
              module: suggestion.finding.module,
              description: `Item criado automaticamente no backlog: ${suggestion.finding.title}`,
              changes: [`Criado item ${itemId} baseado em finding de auditoria`],
              success: true,
            });
          }
        } catch (error) {
          console.error('Erro ao criar item do backlog:', error);
        }
      }
    }

    return createdItems;
  }

  /**
   * Cria um item no backlog a partir de um finding de auditoria
   */
  private static async createBacklogItem(finding: AuditFinding, userId?: string): Promise<string | null> {
    try {
      const itemData = {
        p_title: finding.title,
        p_description: finding.description,
        p_type: finding.type === 'error' ? 'bug_fix' : 'improvement',
        p_priority: this.mapSeverityToPriority(finding.severity),
        p_category: finding.category,
        p_tags: finding.tags,
        p_builder_prompt: finding.builderPrompt || null,
        p_can_execute_in_builder: finding.builderExecutable,
        p_acceptance_criteria: [
          finding.recommendation,
          `Resolver problema identificado no módulo ${finding.module}`,
          'Validar que o problema foi corrigido através de nova auditoria'
        ],
        p_business_value: `Melhoria identificada automaticamente via auditoria do sistema no módulo ${finding.module}`,
        p_technical_notes: `Origem: Auditoria automática\nMódulo: ${finding.module}\nSeveridade: ${finding.severity}\nTipo: ${finding.type}`,
        p_story_points: finding.storyPoints,
        p_estimated_hours: finding.estimatedEffort
      };

      const { data, error } = await supabase.rpc('create_backlog_item', itemData);
      
      if (error) {
        console.error('Erro ao criar item do backlog:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro na criação do item do backlog:', error);
      return null;
    }
  }

  /**
   * Mapeia severidade para prioridade do backlog
   */
  private static mapSeverityToPriority(severity: string): string {
    const mapping: Record<string, string> = {
      'critical': 'urgent',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return mapping[severity] || 'medium';
  }

  /**
   * Obtém estatísticas sobre as integrações de auditoria
   */
  static async getIntegrationStats(): Promise<{
    totalSuggestions: number;
    autoCreated: number;
    manualReview: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    try {
      // Buscar itens criados via auditoria (identificados pela technical_notes)
      const { data: auditItems, error } = await supabase
        .from('autofix_backlog')
        .select('category, priority, technical_notes, created_at')
        .like('technical_notes', '%Origem: Auditoria automática%')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // últimos 30 dias

      if (error) throw error;

      const stats = {
        totalSuggestions: auditItems?.length || 0,
        autoCreated: auditItems?.length || 0,
        manualReview: 0, // Por implementar: contar sugestões em análise
        byCategory: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>
      };

      // Calcular estatísticas por categoria e severidade
      auditItems?.forEach(item => {
        stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
        stats.bySeverity[item.priority] = (stats.bySeverity[item.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas de integração:', error);
      return {
        totalSuggestions: 0,
        autoCreated: 0,
        manualReview: 0,
        byCategory: {},
        bySeverity: {}
      };
    }
  }
}

/**
 * Hook para usar a integração de auditoria em componentes React
 */
export const useAuditBacklogIntegration = () => {
  const processAuditResults = async (auditResults: any) => {
    const suggestions = await AuditBacklogIntegrator.analyzeAuditResults(auditResults);
    return suggestions;
  };

  const createItemsFromSuggestions = async (suggestions: BacklogSuggestion[]) => {
    return await AuditBacklogIntegrator.createBacklogItemsFromSuggestions(suggestions);
  };

  const getStats = async () => {
    return await AuditBacklogIntegrator.getIntegrationStats();
  };

  return {
    processAuditResults,
    createItemsFromSuggestions,
    getStats
  };
};
