import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const lf = supabase.schema('legalflow');

interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * GET /api/v1/agent/tools/metrics/sla_tickets → vw_ticket_metrics (agregações)
 */
async function getSLATicketsMetrics(): Promise<ToolResponse> {
  try {
    const { data, error } = await lf
      .from('vw_ticket_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const total = data.length;
    const frtViolations = data.filter(t => t.frt_violated).length;
    const ttrViolations = data.filter(t => t.ttr_violated).length;
    const avgFrt = data.reduce((acc, t) => acc + (t.frt_minutes || 0), 0) / total || 0;
    const avgTtr = data.reduce((acc, t) => acc + (t.ttr_minutes || 0), 0) / total || 0;

    const metrics = {
      total_tickets: total,
      frt_violation_rate: total > 0 ? (frtViolations / total) * 100 : 0,
      ttr_violation_rate: total > 0 ? (ttrViolations / total) * 100 : 0,
      avg_frt_minutes: avgFrt,
      avg_ttr_minutes: avgTtr,
      compliant_tickets: total - frtViolations - ttrViolations
    };

    return {
      success: true,
      data: metrics
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao buscar métricas de SLA"
    };
  }
}

/**
 * GET /api/v1/agent/tools/metrics/csat → vw_csat_30d
 */
async function getCSATMetrics(): Promise<ToolResponse> {
  try {
    const { data, error } = await lf
      .from('vw_csat_30d')
      .select('*')
      .order('dia', { ascending: false })
      .limit(30);

    if (error) throw error;

    const avgRating = data.reduce((acc, d) => acc + (d.csat_avg || 0), 0) / data.length || 0;
    const totalResponses = data.reduce((acc, d) => acc + (d.responses || 0), 0);
    
    return {
      success: true,
      data: {
        avg_rating: avgRating,
        total_responses: totalResponses,
        daily_data: data
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao buscar métricas de CSAT"
    };
  }
}

/**
 * POST /api/v1/agent/tools/ticket.time.add → insere em time_entries
 */
async function addTimeEntry(request: any): Promise<ToolResponse> {
  try {
    const { ticket_id, duration_minutes, notes, user_id } = request;

    const { data, error } = await lf
      .from('time_entries')
      .insert({
        ticket_id,
        duration_minutes,
        notes,
        user_id,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Entrada de tempo registrada",
      data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao registrar tempo"
    };
  }
}

/**
 * POST /api/v1/agent/tools/ticket.csat.record → insere em csat_ratings
 */
async function recordCSAT(request: any): Promise<ToolResponse> {
  try {
    const { ticket_id, rating, comment, created_by } = request;

    const { data, error } = await lf
      .from('csat_ratings')
      .insert({
        ticket_id,
        rating,
        comment,
        created_by
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Avaliação CSAT registrada",
      data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao registrar CSAT"
    };
  }
}

/**
 * POST /api/v1/agent/tools/finance.flag_overdue → chama flag_overdue_installments()
 */
async function flagOverdueInstallments(): Promise<ToolResponse> {
  try {
    const { error } = await lf.rpc('flag_overdue_installments');
    
    if (error) throw error;

    return {
      success: true,
      message: "Parcelas em atraso foram marcadas"
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao marcar parcelas em atraso"
    };
  }
}

/**
 * GET /api/v1/agent/tools/metrics/journey_stages → etapas SLA
 */
async function getJourneyStagesMetrics(): Promise<ToolResponse> {
  try {
    const { data, error } = await lf
      .from('vw_sla_etapas')
      .select('*')
      .order('priority_order', { ascending: false });

    if (error) throw error;

    const buckets = data.reduce((acc, item) => {
      acc[item.bucket] = (acc[item.bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        total_pending: data.length,
        overdue: buckets['overdue'] || 0,
        within_24h: buckets['<24h'] || 0,
        within_72h: buckets['24-72h'] || 0,
        beyond_72h: buckets['>72h'] || 0,
        details: data.slice(0, 10) // Top 10 most critical
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao buscar métricas de etapas"
    };
  }
}

/**
 * POST /api/v1/agent/tools/ticket.create → criar ticket
 */
async function createTicket(request: any): Promise<ToolResponse> {
  try {
    const { title, description, cliente_cpfcnpj, priority = 'normal', group_key } = request;

    const { data, error } = await lf
      .from('tickets')
      .insert({
        title,
        description,
        cliente_cpfcnpj,
        priority,
        group_key,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: "Ticket criado com sucesso",
      data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao criar ticket"
    };
  }
}

/**
 * GET /api/v1/agent/tools/metrics/financial → métricas financeiras
 */
async function getFinancialMetrics(): Promise<ToolResponse> {
  try {
    const { data, error } = await lf
      .from('parcelas_pagamento')
      .select('valor, status, due_date, plano_id')
      .in('status', ['pending', 'overdue']);

    if (error) throw error;

    const overdueItems = data.filter(p => p.status === 'overdue');
    const totalOverdue = overdueItems.reduce((acc, p) => acc + (p.valor || 0), 0);
    const affectedPlans = new Set(overdueItems.map(p => p.plano_id)).size;
    
    return {
      success: true,
      data: {
        total_overdue: totalOverdue,
        overdue_count: overdueItems.length,
        affected_plans: affectedPlans,
        overdue_percentage: data.length > 0 ? (overdueItems.length / data.length) * 100 : 0
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Falha ao buscar métricas financeiras"
    };
  }
}

const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/api-agent-tools-v3', '');
    const method = event.httpMethod;
    
    let result: ToolResponse;

    // Route to appropriate tool
    if (method === 'GET') {
      switch (path) {
        case '/v1/agent/tools/metrics/sla_tickets':
          result = await getSLATicketsMetrics();
          break;
        case '/v1/agent/tools/metrics/csat':
          result = await getCSATMetrics();
          break;
        case '/v1/agent/tools/metrics/journey_stages':
          result = await getJourneyStagesMetrics();
          break;
        case '/v1/agent/tools/metrics/financial':
          result = await getFinancialMetrics();
          break;
        default:
          result = { success: false, error: `GET endpoint not found: ${path}` };
      }
    } else if (method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      
      switch (path) {
        case '/v1/agent/tools/ticket.time.add':
          result = await addTimeEntry(body);
          break;
        case '/v1/agent/tools/ticket.csat.record':
          result = await recordCSAT(body);
          break;
        case '/v1/agent/tools/finance.flag_overdue':
          result = await flagOverdueInstallments();
          break;
        case '/v1/agent/tools/ticket.create':
          result = await createTicket(body);
          break;
        default:
          result = { success: false, error: `POST endpoint not found: ${path}` };
      }
    } else {
      result = { success: false, error: 'Method not allowed' };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

export { handler };
