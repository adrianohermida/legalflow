import { supabase, supabaseConfigured } from './supabase';
import type { Database } from './supabase';

// Check if Supabase is properly configured
function checkSupabaseConfig() {
  if (!supabaseConfigured) {
    throw new Error('Supabase não está configurado. Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
}

type Tables = Database['public']['Tables'];
type Cliente = Tables['clientes']['Row'];
type Processo = Tables['processos']['Row'];
type JourneyTemplate = Tables['journey_templates']['Row'];
type JourneyInstance = Tables['journey_instances']['Row'];
type PlanoPagamento = Tables['planos_pagamento']['Row'];

// ============================================================================
// CLIENTES
// ============================================================================

export const clientesApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(cpfcnpj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cpfcnpj', cpfcnpj)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(cliente: Tables['clientes']['Insert']) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('clientes')
      .insert(cliente)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(cpfcnpj: string, updates: Tables['clientes']['Update']) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('cpfcnpj', cpfcnpj)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(cpfcnpj: string) {
    checkSupabaseConfig();
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('cpfcnpj', cpfcnpj);
    
    if (error) throw error;
  },

  async getWithProcessos(cpfcnpj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        clientes_processos (
          processos (*)
        )
      `)
      .eq('cpfcnpj', cpfcnpj)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// PROCESSOS
// ============================================================================

export const processosApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('processos')
      .select(`
        *,
        clientes_processos (
          clientes (nome, cpfcnpj)
        ),
        advogados_processos (
          advogados (nome, oab)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(numero_cnj: string) {
    const { data, error } = await supabase
      .from('processos')
      .select(`
        *,
        clientes_processos (
          clientes (*)
        ),
        advogados_processos (
          advogados (*)
        ),
        movimentacoes (*),
        publicacoes (*)
      `)
      .eq('numero_cnj', numero_cnj)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(processo: Tables['processos']['Insert']) {
    const { data, error } = await supabase
      .from('processos')
      .insert(processo)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(numero_cnj: string, updates: Tables['processos']['Update']) {
    const { data, error } = await supabase
      .from('processos')
      .update(updates)
      .eq('numero_cnj', numero_cnj)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async linkCliente(numero_cnj: string, cpfcnpj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('clientes_processos')
      .insert({ numero_cnj, cpfcnpj })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async linkAdvogado(numero_cnj: string, oab: number) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('advogados_processos')
      .insert({ numero_cnj, oab })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// JOURNEY TEMPLATES
// ============================================================================

export const journeyTemplatesApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('journey_templates')
      .select(`
        *,
        journey_template_stages (
          *,
          stage_types (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('journey_templates')
      .select(`
        *,
        journey_template_stages (
          *,
          stage_types (*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(template: Tables['journey_templates']['Insert']) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('journey_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['journey_templates']['Update']) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from('journey_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    checkSupabaseConfig();
    const { error } = await supabase
      .from('journey_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// ============================================================================
// JOURNEY INSTANCES
// ============================================================================

export const journeyInstancesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('journey_instances')
      .select(`
        *,
        journey_templates (name, niche),
        clientes (nome),
        processos (numero_cnj),
        advogados (nome),
        stage_instances (
          *,
          journey_template_stages (title, type_id)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('journey_instances')
      .select(`
        *,
        journey_templates (
          *,
          journey_template_stages (*)
        ),
        clientes (*),
        processos (*),
        advogados (*),
        stage_instances (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(instance: Tables['journey_instances']['Insert']) {
    const { data, error } = await supabase
      .from('journey_instances')
      .insert(instance)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProgress(id: string, progress_pct: number) {
    const { data, error } = await supabase
      .from('journey_instances')
      .update({ progress_pct })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// PLANOS DE PAGAMENTO
// ============================================================================

export const planosApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('planos_pagamento')
      .select(`
        *,
        clientes (nome),
        processos (numero_cnj),
        parcelas_pagamento (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('planos_pagamento')
      .select(`
        *,
        clientes (*),
        processos (*),
        parcelas_pagamento (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(plano: Tables['planos_pagamento']['Insert']) {
    const { data, error } = await supabase
      .from('planos_pagamento')
      .insert(plano)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Tables['planos_pagamento']['Update']) {
    const { data, error } = await supabase
      .from('planos_pagamento')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// PUBLICAÇÕES
// ============================================================================

export const publicacoesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('publicacoes')
      .select('*')
      .order('data_publicacao', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByProcesso(numero_cnj: string) {
    const { data, error } = await supabase
      .from('publicacoes')
      .select('*')
      .eq('numero_cnj', numero_cnj)
      .order('data_publicacao', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async markAsProcessed(id: number) {
    const { data, error } = await supabase
      .from('publicacoes')
      .update({ data: { processed: true } })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// MOVIMENTAÇÕES
// ============================================================================

export const movimentacoesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('movimentacoes')
      .select('*')
      .order('data_movimentacao', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByProcesso(numero_cnj: string) {
    const { data, error } = await supabase
      .from('movimentacoes')
      .select('*')
      .eq('numero_cnj', numero_cnj)
      .order('data_movimentacao', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// ANALYTICS (For Reports)
// ============================================================================

export const analyticsApi = {
  async getSLAMetrics() {
    // Complex query for SLA metrics
    const { data, error } = await supabase
      .rpc('get_sla_metrics');
    
    if (error) {
      console.warn('SLA metrics function not available, using fallback');
      return {
        total_stages: 0,
        within_sla: 0,
        overdue: 0,
        critical_overdue: 0,
        avg_completion_time_hours: 0
      };
    }
    return data;
  },

  async getNichoCompletion() {
    const { data, error } = await supabase
      .from('journey_instances')
      .select(`
        journey_templates (niche),
        status
      `);
    
    if (error) throw error;
    
    // Process data for niche completion rates
    const nichos = data?.reduce((acc: any, item: any) => {
      const niche = item.journey_templates?.niche || 'Outros';
      if (!acc[niche]) {
        acc[niche] = { total: 0, completed: 0 };
      }
      acc[niche].total += 1;
      if (item.status === 'completed') {
        acc[niche].completed += 1;
      }
      return acc;
    }, {});

    return Object.entries(nichos || {}).map(([niche, stats]: [string, any]) => ({
      nicho: niche,
      total_journeys: stats.total,
      completed_journeys: stats.completed,
      completion_rate: (stats.completed / stats.total) * 100,
      avg_completion_time_days: 30 // Would need more complex query
    }));
  },

  async getPaymentMetrics() {
    const { data: planos, error } = await supabase
      .from('planos_pagamento')
      .select(`
        *,
        parcelas_pagamento (*)
      `);
    
    if (error) throw error;
    
    const totalRevenue = planos?.reduce((sum, plano) => sum + plano.paid_amount, 0) || 0;
    const overdueAmount = planos?.reduce((sum, plano) => {
      const overdueParcelas = plano.parcelas_pagamento?.filter((p: any) => 
        p.status === 'vencida'
      ) || [];
      return sum + overdueParcelas.reduce((pSum: number, p: any) => pSum + p.amount, 0);
    }, 0) || 0;

    return {
      total_plans: planos?.length || 0,
      active_plans: planos?.filter(p => p.status === 'em_andamento').length || 0,
      total_revenue: totalRevenue,
      overdue_amount: overdueAmount,
      overdue_installments: 0, // Would need more complex calculation
      collection_rate: totalRevenue > 0 ? ((totalRevenue / (totalRevenue + overdueAmount)) * 100) : 0
    };
  }
};

// ============================================================================
// STAGE TYPES
// ============================================================================

export const stageTypesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('stage_types')
      .select('*')
      .order('label');
    
    if (error) throw error;
    return data;
  }
};

// ============================================================================
// ERROR HANDLER
// ============================================================================

export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  if (error.message?.includes('JWT')) {
    // Handle authentication errors
    window.location.href = '/login';
    return;
  }
  
  if (error.message?.includes('permission')) {
    throw new Error('Você não tem permissão para realizar esta ação');
  }
  
  if (error.message?.includes('duplicate')) {
    throw new Error('Este registro já existe');
  }
  
  if (error.message?.includes('foreign key')) {
    throw new Error('Não é possível excluir este registro pois ele está sendo usado');
  }
  
  throw new Error(error.message || 'Erro interno do servidor');
};
