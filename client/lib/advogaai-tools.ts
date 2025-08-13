// P2.12 - AdvogaAI Tools HTTP v1 API
// Sistema de ferramentas integradas para AdvogaAI

export interface AdvogaAITool {
  id: string;
  name: string;
  description: string;
  category: 'peticion' | 'analysis' | 'research' | 'document' | 'timeline' | 'calculation';
  version: string;
  endpoint: string;
  parameters: ToolParameter[];
  response_format: any;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  validation?: any;
}

export interface ToolRequest {
  tool_id: string;
  parameters: Record<string, any>;
  context?: {
    numero_cnj?: string;
    cliente_cpfcnpj?: string;
    thread_link_id?: string;
  };
}

export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  execution_time?: number;
  tool_version?: string;
}

// P2.12 - Ferramentas disponíveis
export const ADVOGAAI_TOOLS: AdvogaAITool[] = [
  {
    id: 'petition_generator',
    name: 'Gerador de Petições',
    description: 'Gera petições jurídicas com base em templates e dados do processo',
    category: 'peticion',
    version: '1.0.0',
    endpoint: '/api/tools/petition-generator',
    parameters: [
      {
        name: 'petition_type',
        type: 'string',
        required: true,
        description: 'Tipo de petição (inicial, contestacao, recurso, etc.)',
        validation: { enum: ['inicial', 'contestacao', 'recurso', 'agravo', 'embargos'] }
      },
      {
        name: 'numero_cnj',
        type: 'string',
        required: false,
        description: 'Número CNJ do processo'
      },
      {
        name: 'facts',
        type: 'object',
        required: true,
        description: 'Fatos relevantes para a petição'
      },
      {
        name: 'legal_basis',
        type: 'array',
        required: false,
        description: 'Base legal e jurisprudência'
      },
      {
        name: 'requests',
        type: 'array',
        required: true,
        description: 'Pedidos a serem formulados'
      }
    ],
    response_format: {
      petition_text: 'string',
      legal_references: 'array',
      confidence_score: 'number'
    }
  },
  {
    id: 'deadline_calculator',
    name: 'Calculadora de Prazos',
    description: 'Calcula prazos processuais considerando feriados e regras específicas',
    category: 'calculation',
    version: '1.0.0',
    endpoint: '/api/tools/deadline-calculator',
    parameters: [
      {
        name: 'event_date',
        type: 'string',
        required: true,
        description: 'Data do evento inicial (formato ISO)'
      },
      {
        name: 'deadline_type',
        type: 'string',
        required: true,
        description: 'Tipo de prazo',
        validation: { enum: ['contestacao', 'recurso', 'agravo', 'embargos', 'cumprimento'] }
      },
      {
        name: 'court_type',
        type: 'string',
        required: true,
        description: 'Tipo de tribunal',
        validation: { enum: ['federal', 'estadual', 'trabalhista', 'superior'] }
      },
      {
        name: 'consider_holidays',
        type: 'boolean',
        required: false,
        description: 'Considerar feriados nacionais e forenses'
      }
    ],
    response_format: {
      deadline_date: 'string',
      working_days: 'number',
      calendar_days: 'number',
      holidays_considered: 'array'
    }
  },
  {
    id: 'case_analyzer',
    name: 'Analisador de Processos',
    description: 'Analisa processos e extrai insights importantes',
    category: 'analysis',
    version: '1.0.0',
    endpoint: '/api/tools/case-analyzer',
    parameters: [
      {
        name: 'numero_cnj',
        type: 'string',
        required: true,
        description: 'Número CNJ do processo'
      },
      {
        name: 'analysis_type',
        type: 'string',
        required: true,
        description: 'Tipo de análise',
        validation: { enum: ['timeline', 'risks', 'strategy', 'precedents'] }
      },
      {
        name: 'include_movimentacoes',
        type: 'boolean',
        required: false,
        description: 'Incluir movimentações na análise'
      }
    ],
    response_format: {
      analysis_result: 'object',
      recommendations: 'array',
      risk_score: 'number',
      key_insights: 'array'
    }
  },
  {
    id: 'jurisprudence_search',
    name: 'Busca de Jurisprudência',
    description: 'Busca jurisprudência relevante para o caso',
    category: 'research',
    version: '1.0.0',
    endpoint: '/api/tools/jurisprudence-search',
    parameters: [
      {
        name: 'keywords',
        type: 'array',
        required: true,
        description: 'Palavras-chave para busca'
      },
      {
        name: 'court_level',
        type: 'string',
        required: false,
        description: 'Nível do tribunal',
        validation: { enum: ['primeira_instancia', 'segunda_instancia', 'superior', 'supremo'] }
      },
      {
        name: 'date_range',
        type: 'object',
        required: false,
        description: 'Período de busca (from/to)'
      },
      {
        name: 'max_results',
        type: 'number',
        required: false,
        description: 'Número máximo de resultados'
      }
    ],
    response_format: {
      results: 'array',
      total_found: 'number',
      relevance_scores: 'array'
    }
  },
  {
    id: 'document_classifier',
    name: 'Classificador de Documentos',
    description: 'Classifica e extrai informações de documentos jurídicos',
    category: 'document',
    version: '1.0.0',
    endpoint: '/api/tools/document-classifier',
    parameters: [
      {
        name: 'document_content',
        type: 'string',
        required: true,
        description: 'Conteúdo do documento'
      },
      {
        name: 'document_type_hint',
        type: 'string',
        required: false,
        description: 'Dica sobre o tipo de documento'
      },
      {
        name: 'extract_entities',
        type: 'boolean',
        required: false,
        description: 'Extrair entidades nomeadas'
      }
    ],
    response_format: {
      document_type: 'string',
      confidence: 'number',
      extracted_entities: 'object',
      key_information: 'object'
    }
  },
  {
    id: 'timeline_generator',
    name: 'Gerador de Timeline',
    description: 'Gera timeline de eventos do processo',
    category: 'timeline',
    version: '1.0.0',
    endpoint: '/api/tools/timeline-generator',
    parameters: [
      {
        name: 'numero_cnj',
        type: 'string',
        required: true,
        description: 'Número CNJ do processo'
      },
      {
        name: 'include_predictions',
        type: 'boolean',
        required: false,
        description: 'Incluir predições de próximos eventos'
      },
      {
        name: 'format',
        type: 'string',
        required: false,
        description: 'Formato de saída',
        validation: { enum: ['json', 'html', 'pdf'] }
      }
    ],
    response_format: {
      timeline_events: 'array',
      predictions: 'array',
      critical_dates: 'array'
    }
  }
];

// P2.12 - Cliente HTTP para AdvogaAI Tools
export class AdvogaAIToolsClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_ADVOGAAI_TOOLS_URL || 'https://api.advogaai.com/v1';
    this.apiKey = apiKey || import.meta.env.VITE_ADVOGAAI_TOOLS_API_KEY || '';
  }

  async executeTool(request: ToolRequest): Promise<ToolResponse> {
    const tool = ADVOGAAI_TOOLS.find(t => t.id === request.tool_id);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool ${request.tool_id} not found`
      };
    }

    try {
      // Validar parâmetros
      const validationError = this.validateParameters(tool, request.parameters);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }

      const startTime = Date.now();
      
      const response = await fetch(`${this.baseUrl}${tool.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Tool-Version': tool.version
        },
        body: JSON.stringify({
          parameters: request.parameters,
          context: request.context
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data,
        execution_time: executionTime,
        tool_version: tool.version
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  private validateParameters(tool: AdvogaAITool, parameters: Record<string, any>): string | null {
    for (const param of tool.parameters) {
      if (param.required && !(param.name in parameters)) {
        return `Required parameter '${param.name}' is missing`;
      }
      
      if (param.name in parameters) {
        const value = parameters[param.name];
        
        // Validação de tipo básica
        if (param.type === 'string' && typeof value !== 'string') {
          return `Parameter '${param.name}' must be a string`;
        }
        if (param.type === 'number' && typeof value !== 'number') {
          return `Parameter '${param.name}' must be a number`;
        }
        if (param.type === 'boolean' && typeof value !== 'boolean') {
          return `Parameter '${param.name}' must be a boolean`;
        }
        if (param.type === 'array' && !Array.isArray(value)) {
          return `Parameter '${param.name}' must be an array`;
        }
        if (param.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          return `Parameter '${param.name}' must be an object`;
        }
        
        // Validações específicas
        if (param.validation?.enum && !param.validation.enum.includes(value)) {
          return `Parameter '${param.name}' must be one of: ${param.validation.enum.join(', ')}`;
        }
      }
    }
    
    return null;
  }

  getAvailableTools(): AdvogaAITool[] {
    return ADVOGAAI_TOOLS;
  }

  getToolById(toolId: string): AdvogaAITool | undefined {
    return ADVOGAAI_TOOLS.find(t => t.id === toolId);
  }

  getToolsByCategory(category: AdvogaAITool['category']): AdvogaAITool[] {
    return ADVOGAAI_TOOLS.filter(t => t.category === category);
  }
}

// Instância singleton
export const advogaAIToolsClient = new AdvogaAIToolsClient();
