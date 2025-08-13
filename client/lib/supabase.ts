import { createClient } from '@supabase/supabase-js';

// Environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly configured
const isConfigured = supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('your-supabase') &&
  !supabaseAnonKey.includes('your-anon') &&
  !supabaseAnonKey.includes('your-supabase') &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey.length > 50;

// Create main client for PUBLIC schema (AdvogaAI tables) - PRESERVE EXISTING
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : createClient('https://dummy.supabase.co', 'dummy-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

// ===============================
// F1.0 - LEGALFLOW SCHEMA CLIENT
// ===============================
// Create client for LEGALFLOW schema (F2+ tables: jornadas, stage_types, etc.)
// F1.0: Apenas instanciado, queries começam na F2
export const legalflow = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'legalflow' },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : createClient('https://dummy.supabase.co', 'dummy-key', {
      db: { schema: 'legalflow' },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

// Alternative approach: Use schema() method on main client
// F1.0: Pronto para uso nas próximas fases
export const lf = supabase.schema('legalflow');

// Export configuration status
export const supabaseConfigured = isConfigured;

// Database types - PUBLIC SCHEMA (AdvogaAI) - PRESERVE EXISTING
export interface PublicDatabase {
  public: {
    Tables: {
      // AdvogaAI tables - PRESERVE ALL
      advogados: {
        Row: {
          oab: number;
          uf: string | null;
          created_at: string;
          nome: string | null;
        };
        Insert: {
          oab: number;
          uf?: string | null;
          nome?: string | null;
        };
        Update: {
          uf?: string | null;
          nome?: string | null;
        };
      };
      clientes: {
        Row: {
          cpfcnpj: string;
          nome: string | null;
          whatsapp: string | null;
          created_at: string;
          crm_id: string | null;
        };
        Insert: {
          cpfcnpj: string;
          nome?: string | null;
          whatsapp?: string | null;
          crm_id?: string | null;
        };
        Update: {
          nome?: string | null;
          whatsapp?: string | null;
          crm_id?: string | null;
        };
      };
      processos: {
        Row: {
          numero_cnj: string;
          tribunal_sigla: string | null;
          titulo_polo_ativo: string | null;
          titulo_polo_passivo: string | null;
          data: any;
          created_at: string;
          crm_id: string | null;
          decisoes: string | null;
        };
        Insert: {
          numero_cnj: string;
          tribunal_sigla?: string | null;
          titulo_polo_ativo?: string | null;
          titulo_polo_passivo?: string | null;
          data?: any;
          crm_id?: string | null;
          decisoes?: string | null;
        };
        Update: {
          tribunal_sigla?: string | null;
          titulo_polo_ativo?: string | null;
          titulo_polo_passivo?: string | null;
          data?: any;
          crm_id?: string | null;
          decisoes?: string | null;
        };
      };
      movimentacoes: {
        Row: {
          id: number;
          numero_cnj: string | null;
          data: any;
          created_at: string;
          data_movimentacao: string | null;
        };
        Insert: {
          numero_cnj?: string | null;
          data?: any;
          data_movimentacao?: string | null;
        };
        Update: {
          numero_cnj?: string | null;
          data?: any;
          data_movimentacao?: string | null;
        };
      };
      advogados_processos: {
        Row: {
          oab: number;
          numero_cnj: string;
          created_at: string;
        };
        Insert: {
          oab: number;
          numero_cnj: string;
        };
        Update: {
          oab?: number;
          numero_cnj?: string;
        };
      };
      clientes_processos: {
        Row: {
          cpfcnpj: string;
          numero_cnj: string;
          created_at: string;
        };
        Insert: {
          cpfcnpj: string;
          numero_cnj: string;
        };
        Update: {
          cpfcnpj?: string;
          numero_cnj?: string;
        };
      };
      peticoes: {
        Row: {
          id: string;
          numero_cnj: string | null;
          tipo: string | null;
          conteudo: string | null;
          created_at: string;
        };
        Insert: {
          numero_cnj?: string | null;
          tipo?: string | null;
          conteudo?: string | null;
        };
        Update: {
          numero_cnj?: string | null;
          tipo?: string | null;
          conteudo?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          nome: string | null;
          email: string | null;
          telefone: string | null;
          created_at: string;
        };
        Insert: {
          nome?: string | null;
          email?: string | null;
          telefone?: string | null;
        };
        Update: {
          nome?: string | null;
          email?: string | null;
          telefone?: string | null;
        };
      };
      publicacoes: {
        Row: {
          id: number;
          created_at: string;
          numero_cnj: string | null;
          data: any;
          data_publicacao: string | null;
        };
        Insert: {
          numero_cnj?: string | null;
          data?: any;
          data_publicacao?: string | null;
        };
        Update: {
          numero_cnj?: string | null;
          data?: any;
          data_publicacao?: string | null;
        };
      };
      user_advogado: {
        Row: {
          user_id: string;
          oab: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          oab: number;
        };
        Update: {
          oab?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Database types - LEGALFLOW SCHEMA (new tables)
export interface LegalFlowDatabase {
  legalflow: {
    Tables: {
      stage_types: {
        Row: {
          id: number;
          code: string;
          label: string;
          created_at: string;
        };
        Insert: {
          code: string;
          label: string;
        };
        Update: {
          code?: string;
          label?: string;
        };
      };
      journey_templates: {
        Row: {
          id: string;
          name: string;
          niche: string | null;
          steps_count: number;
          eta_days: number;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          name: string;
          niche?: string | null;
          steps_count?: number;
          eta_days?: number;
          tags?: string[] | null;
        };
        Update: {
          name?: string;
          niche?: string | null;
          steps_count?: number;
          eta_days?: number;
          tags?: string[] | null;
        };
      };
      journey_template_stages: {
        Row: {
          id: string;
          template_id: string;
          position: number;
          title: string;
          description: string | null;
          type_id: number;
          mandatory: boolean;
          sla_hours: number | null;
          config: any;
          created_at: string;
        };
        Insert: {
          template_id: string;
          position: number;
          title: string;
          description?: string | null;
          type_id: number;
          mandatory?: boolean;
          sla_hours?: number | null;
          config?: any;
        };
        Update: {
          position?: number;
          title?: string;
          description?: string | null;
          type_id?: number;
          mandatory?: boolean;
          sla_hours?: number | null;
          config?: any;
        };
      };
      stage_rules: {
        Row: {
          id: string;
          stage_id: string;
          rule_type: string;
          conditions: any;
          actions: any;
          created_at: string;
        };
        Insert: {
          stage_id: string;
          rule_type: string;
          conditions: any;
          actions: any;
        };
        Update: {
          rule_type?: string;
          conditions?: any;
          actions?: any;
        };
      };
      journey_instances: {
        Row: {
          id: string;
          template_id: string;
          cliente_cpfcnpj: string;
          processo_numero_cnj: string | null;
          owner_oab: number;
          start_date: string;
          status: string;
          progress_pct: number;
          next_action: any;
          created_at: string;
        };
        Insert: {
          template_id: string;
          cliente_cpfcnpj: string;
          processo_numero_cnj?: string | null;
          owner_oab: number;
          start_date?: string;
          status?: string;
          progress_pct?: number;
          next_action?: any;
        };
        Update: {
          status?: string;
          progress_pct?: number;
          next_action?: any;
        };
      };
      stage_instances: {
        Row: {
          id: string;
          instance_id: string;
          template_stage_id: string;
          status: string;
          mandatory: boolean;
          sla_at: string | null;
          meta: any;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          instance_id: string;
          template_stage_id: string;
          status?: string;
          mandatory?: boolean;
          sla_at?: string | null;
          meta?: any;
          completed_at?: string | null;
        };
        Update: {
          status?: string;
          sla_at?: string | null;
          meta?: any;
          completed_at?: string | null;
        };
      };
      form_definitions: {
        Row: {
          id: string;
          stage_id: string;
          name: string;
          fields: any;
          validation_rules: any;
          created_at: string;
        };
        Insert: {
          stage_id: string;
          name: string;
          fields: any;
          validation_rules?: any;
        };
        Update: {
          name?: string;
          fields?: any;
          validation_rules?: any;
        };
      };
      form_responses: {
        Row: {
          id: string;
          form_id: string;
          instance_id: string;
          responses: any;
          created_at: string;
        };
        Insert: {
          form_id: string;
          instance_id: string;
          responses: any;
        };
        Update: {
          responses?: any;
        };
      };
      document_requirements: {
        Row: {
          id: string;
          stage_id: string;
          name: string;
          required: boolean;
          file_types: string[];
          max_size_mb: number;
          created_at: string;
        };
        Insert: {
          stage_id: string;
          name: string;
          required?: boolean;
          file_types?: string[];
          max_size_mb?: number;
        };
        Update: {
          name?: string;
          required?: boolean;
          file_types?: string[];
          max_size_mb?: number;
        };
      };
      document_uploads: {
        Row: {
          id: string;
          requirement_id: string;
          instance_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          uploaded_at: string;
        };
        Insert: {
          requirement_id: string;
          instance_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
        };
        Update: {
          file_name?: string;
          file_path?: string;
          file_size?: number;
        };
      };
      eventos_agenda: {
        Row: {
          id: string;
          instance_id: string | null;
          processo_numero_cnj: string | null;
          advogado_oab: number;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string | null;
          event_type: string;
          reminder_at: string | null;
          created_at: string;
        };
        Insert: {
          instance_id?: string | null;
          processo_numero_cnj?: string | null;
          advogado_oab: number;
          title: string;
          description?: string | null;
          start_time: string;
          end_time?: string | null;
          event_type?: string;
          reminder_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string | null;
          event_type?: string;
          reminder_at?: string | null;
        };
      };
      planos_pagamento: {
        Row: {
          id: string;
          cliente_cpfcnpj: string;
          processo_numero_cnj: string | null;
          amount_total: number;
          installments: number;
          paid_amount: number;
          status: string;
          created_at: string;
        };
        Insert: {
          cliente_cpfcnpj: string;
          processo_numero_cnj?: string | null;
          amount_total: number;
          installments: number;
          paid_amount?: number;
          status?: string;
        };
        Update: {
          amount_total?: number;
          installments?: number;
          paid_amount?: number;
          status?: string;
        };
      };
      parcelas_pagamento: {
        Row: {
          id: string;
          plano_id: string;
          n_parcela: number;
          due_date: string;
          amount: number;
          status: string;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          plano_id: string;
          n_parcela: number;
          due_date: string;
          amount: number;
          status?: string;
          paid_at?: string | null;
        };
        Update: {
          amount?: number;
          status?: string;
          paid_at?: string | null;
        };
      };
      stage_payment_links: {
        Row: {
          id: string;
          stage_id: string;
          plano_id: string;
          amount: number;
          required_for_completion: boolean;
          created_at: string;
        };
        Insert: {
          stage_id: string;
          plano_id: string;
          amount: number;
          required_for_completion?: boolean;
        };
        Update: {
          amount?: number;
          required_for_completion?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Combined database type for compatibility
export interface Database extends PublicDatabase, LegalFlowDatabase {}
