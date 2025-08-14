import { useSupabaseQuery } from "./useSupabaseQuery";
import { supabase, lf } from "../lib/supabase";

// Hook para busca rápida de contatos com índice trigram
export const useContactSearch = (searchTerm: string) => {
  return useSupabaseQuery(
    ["contact-search", searchTerm],
    `
      SELECT 
        id,
        name,
        email,
        phone,
        kind,
        cpf_cnpj,
        created_at
      FROM legalflow.contacts 
      WHERE name % $1 OR name ILIKE $2
      ORDER BY similarity(name, $1) DESC, name
      LIMIT 20
    `,
    [searchTerm, `%${searchTerm}%`],
    {
      enabled: searchTerm.length >= 2,
      staleTime: 30000, // Cache por 30 segundos
    },
  );
};

// Hook para dashboard stats otimizado com índices
export const useDashboardStats = () => {
  return useSupabaseQuery(
    "dashboard-stats",
    `
      SELECT 
        (SELECT COUNT(*) FROM public.processos) as total_processos,
        (SELECT COUNT(*) FROM public.clientes) as total_clientes,
        (SELECT COUNT(*) FROM legalflow.tickets WHERE status = 'aberto') as tickets_abertos,
        (SELECT COUNT(*) FROM legalflow.activities WHERE status = 'todo') as tarefas_pendentes,
        (SELECT COUNT(*) FROM legalflow.deals WHERE status = 'open') as deals_abertas,
        (SELECT COUNT(*) FROM legalflow.journey_instances WHERE status = 'active') as jornadas_ativas
    `,
    [],
    {
      staleTime: 60000, // Cache por 1 minuto
      refetchInterval: 300000, // Refetch a cada 5 minutos
    },
  );
};

// Hook para activities recentes otimizado
export const useRecentActivities = (limit: number = 10) => {
  return useSupabaseQuery(
    ["recent-activities", limit],
    `
      SELECT 
        a.id,
        a.title,
        a.status,
        a.priority,
        a.created_at,
        a.numero_cnj,
        p.titulo_polo_ativo as processo_titulo
      FROM legalflow.activities a
      LEFT JOIN public.processos p ON p.numero_cnj = a.numero_cnj
      ORDER BY a.created_at DESC
      LIMIT $1
    `,
    [limit],
    {
      staleTime: 30000,
    },
  );
};

// Hook para deals por pipeline otimizado
export const useDealsByPipeline = (pipelineId?: string) => {
  return useSupabaseQuery(
    ["deals-by-pipeline", pipelineId],
    `
      SELECT 
        d.id,
        d.title,
        d.value,
        d.status,
        d.stage,
        d.created_at,
        c.name as contact_name,
        c.email as contact_email
      FROM legalflow.deals d
      LEFT JOIN legalflow.contacts c ON c.id = d.contact_id
      WHERE ($1 IS NULL OR d.pipeline_id = $1)
      ORDER BY d.created_at DESC
    `,
    [pipelineId || null],
    {
      staleTime: 30000,
    },
  );
};

// Hook para tickets por cliente otimizado
export const useTicketsByClient = (clienteCpfCnpj?: string) => {
  return useSupabaseQuery(
    ["tickets-by-client", clienteCpfCnpj],
    `
      SELECT 
        t.id,
        t.subject,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at,
        COUNT(tt.id) as thread_count
      FROM legalflow.tickets t
      LEFT JOIN legalflow.ticket_threads tt ON tt.ticket_id = t.id
      WHERE ($1 IS NULL OR t.cliente_cpfcnpj = $1)
      GROUP BY t.id, t.subject, t.status, t.priority, t.created_at, t.updated_at
      ORDER BY t.updated_at DESC
    `,
    [clienteCpfCnpj || null],
    {
      staleTime: 30000,
    },
  );
};

// Hook para time entries por usuário e período otimizado
export const useTimeEntriesByUser = (
  userId?: string,
  startDate?: string,
  endDate?: string,
) => {
  return useSupabaseQuery(
    ["time-entries-user", userId, startDate, endDate],
    `
      SELECT 
        te.id,
        te.start_time,
        te.end_time,
        te.duration,
        te.description,
        a.title as activity_title,
        a.numero_cnj
      FROM legalflow.time_entries te
      LEFT JOIN legalflow.activities a ON a.id = te.activity_id
      WHERE ($1 IS NULL OR te.user_id = $1)
        AND ($2 IS NULL OR te.start_time >= $2::timestamp)
        AND ($3 IS NULL OR te.start_time <= $3::timestamp)
      ORDER BY te.start_time DESC
    `,
    [userId || null, startDate || null, endDate || null],
    {
      staleTime: 60000,
      enabled: Boolean(userId),
    },
  );
};

// Hook para stage instances com SLA próximo do vencimento
export const useStageInstancesSLA = () => {
  return useSupabaseQuery(
    "stage-instances-sla",
    `
      SELECT 
        si.id,
        si.status,
        si.sla_at,
        si.created_at,
        ji.cliente_cpfcnpj,
        jt.name as template_name,
        st.name as stage_name,
        EXTRACT(EPOCH FROM (si.sla_at - NOW())) / 3600 as hours_remaining
      FROM legalflow.stage_instances si
      JOIN legalflow.journey_instances ji ON ji.id = si.instance_id
      JOIN legalflow.journey_templates jt ON jt.id = ji.template_id
      JOIN legalflow.journey_stages st ON st.id = si.stage_id
      WHERE si.status IN ('pending', 'in_progress')
        AND si.sla_at IS NOT NULL
        AND si.sla_at > NOW()
      ORDER BY si.sla_at ASC
      LIMIT 50
    `,
    [],
    {
      staleTime: 300000, // Cache por 5 minutos
      refetchInterval: 600000, // Refetch a cada 10 minutos
    },
  );
};

// Hook para busca global otimizada
export const useGlobalSearch = (query: string) => {
  return useSupabaseQuery(
    ["global-search", query],
    `
      SELECT 'processo' as type, numero_cnj as id, titulo_polo_ativo as title, 'Processo' as category
      FROM public.processos 
      WHERE titulo_polo_ativo % $1 OR titulo_polo_ativo ILIKE $2
      
      UNION ALL
      
      SELECT 'cliente' as type, cpfcnpj as id, nome as title, 'Cliente' as category
      FROM public.clientes
      WHERE nome % $1 OR nome ILIKE $2
      
      UNION ALL
      
      SELECT 'contact' as type, id::text as id, name as title, 'Contato' as category
      FROM legalflow.contacts
      WHERE name % $1 OR name ILIKE $2
      
      UNION ALL
      
      SELECT 'ticket' as type, id::text as id, subject as title, 'Ticket' as category
      FROM legalflow.tickets
      WHERE subject % $1 OR subject ILIKE $2
      
      ORDER BY 
        CASE 
          WHEN title % $1 THEN similarity(title, $1)
          ELSE 0
        END DESC,
        title
      LIMIT 20
    `,
    [query, `%${query}%`],
    {
      enabled: query.length >= 2,
      staleTime: 30000,
    },
  );
};

// Hook para analytics de performance de queries
export const useQueryPerformanceStats = () => {
  return useSupabaseQuery(
    "query-performance-stats",
    `
      SELECT 
        'contacts' as table_name,
        (SELECT COUNT(*) FROM legalflow.contacts) as total_records,
        (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE relname = 'contacts') as index_count
      
      UNION ALL
      
      SELECT 
        'activities' as table_name,
        (SELECT COUNT(*) FROM legalflow.activities) as total_records,
        (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE relname = 'activities') as index_count
      
      UNION ALL
      
      SELECT 
        'deals' as table_name,
        (SELECT COUNT(*) FROM legalflow.deals) as total_records,
        (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE relname = 'deals') as index_count
    `,
    [],
    {
      staleTime: 600000, // Cache por 10 minutos
    },
  );
};
