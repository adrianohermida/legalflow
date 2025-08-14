import { useSupabaseQuery } from "./useSupabaseQuery";
import { supabase, lf } from "../lib/supabase";

// Temporary wrapper for SQL queries that need RPC functions
// This is a placeholder - in production these should be proper API functions
const createQueryFunction = (description: string) => {
  return async () => {
    console.warn(`SQL query not implemented yet: ${description}`);
    return [];
  };
};

// Hook para busca rápida de contatos com índice trigram
export const useContactSearch = (searchTerm: string) => {
  return useSupabaseQuery(
    ["contact-search", searchTerm],
    async () => {
      if (searchTerm.length < 2) return [];

      try {
        const { data, error } = await lf
          .from("contacts" as any)
          .select("id, name, email, phone, kind, cpf_cnpj, created_at")
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .order("name")
          .limit(20);

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.warn("Contact search not available yet:", error);
        return [];
      }
    },
    {
      enabled: searchTerm.length >= 2,
      staleTime: 30000, // Cache por 30 segundos
    },
  );
};

// Hook para dashboard stats otimizado com índices
export const useDashboardStats = () => {
  return useSupabaseQuery(
    ["dashboard-stats"],
    async () => {
      try {
        // Get counts from different tables
        const [processos, clientes] = await Promise.all([
          supabase
            .from("processos")
            .select("*", { count: "exact", head: true }),
          supabase.from("clientes").select("*", { count: "exact", head: true }),
        ]);

        return {
          total_processos: processos.count || 0,
          total_clientes: clientes.count || 0,
          tickets_abertos: 0, // Placeholder
          tarefas_pendentes: 0, // Placeholder
          deals_abertas: 0, // Placeholder
          jornadas_ativas: 0, // Placeholder
        };
      } catch (error) {
        console.warn("Dashboard stats not fully available yet:", error);
        return {
          total_processos: 0,
          total_clientes: 0,
          tickets_abertos: 0,
          tarefas_pendentes: 0,
          deals_abertas: 0,
          jornadas_ativas: 0,
        };
      }
    },
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
    createQueryFunction("Recent activities query"),
    {
      staleTime: 30000,
    },
  );
};

// Hook para deals por pipeline otimizado
export const useDealsByPipeline = (pipelineId?: string) => {
  return useSupabaseQuery(
    ["deals-by-pipeline", pipelineId],
    createQueryFunction("Deals by pipeline query"),
    {
      staleTime: 30000,
    },
  );
};

// Hook para tickets por cliente otimizado
export const useTicketsByClient = (clienteCpfCnpj?: string) => {
  return useSupabaseQuery(
    ["tickets-by-client", clienteCpfCnpj],
    createQueryFunction("Tickets by client query"),
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
    createQueryFunction("Time entries by user query"),
    {
      staleTime: 60000,
      enabled: Boolean(userId),
    },
  );
};

// Hook para stage instances com SLA próximo do vencimento
export const useStageInstancesSLA = () => {
  return useSupabaseQuery(
    ["stage-instances-sla"],
    createQueryFunction("Stage instances SLA query"),
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
    createQueryFunction("Global search query"),
    {
      enabled: query.length >= 2,
      staleTime: 30000,
    },
  );
};

// Hook para analytics de performance de queries
export const useQueryPerformanceStats = () => {
  return useSupabaseQuery(
    ["query-performance-stats"],
    createQueryFunction("Query performance stats"),
    {
      staleTime: 600000, // Cache por 10 minutos
    },
  );
};
