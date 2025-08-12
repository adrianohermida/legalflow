import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database types based on your schema
export interface Database {
  public: {
    Tables: {
      advogados: {
        Row: {
          oab: number;
          uf: string | null;
          created_at: string;
          nome: string | null;
        };
        Insert: {
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
          template_id: string | null;
          position: number;
          title: string;
          description: string | null;
          type_id: number | null;
          mandatory: boolean;
          sla_hours: number | null;
          config: any;
          created_at: string;
        };
        Insert: {
          template_id?: string | null;
          position: number;
          title: string;
          description?: string | null;
          type_id?: number | null;
          mandatory?: boolean;
          sla_hours?: number | null;
          config?: any;
        };
        Update: {
          position?: number;
          title?: string;
          description?: string | null;
          type_id?: number | null;
          mandatory?: boolean;
          sla_hours?: number | null;
          config?: any;
        };
      };
      journey_instances: {
        Row: {
          id: string;
          template_id: string | null;
          cliente_cpfcnpj: string | null;
          processo_numero_cnj: string | null;
          owner_oab: number | null;
          start_date: string;
          status: string;
          progress_pct: number;
          next_action: any;
          created_at: string;
        };
        Insert: {
          template_id?: string | null;
          cliente_cpfcnpj?: string | null;
          processo_numero_cnj?: string | null;
          owner_oab?: number | null;
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
          instance_id: string | null;
          template_stage_id: string | null;
          status: string;
          mandatory: boolean;
          sla_at: string | null;
          meta: any;
          completed_at: string | null;
        };
        Insert: {
          instance_id?: string | null;
          template_stage_id?: string | null;
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
      planos_pagamento: {
        Row: {
          id: string;
          cliente_cpfcnpj: string | null;
          processo_numero_cnj: string | null;
          amount_total: number;
          installments: number;
          paid_amount: number;
          status: string;
          created_at: string;
        };
        Insert: {
          cliente_cpfcnpj?: string | null;
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
          plano_id: string | null;
          n_parcela: number;
          due_date: string;
          amount: number;
          status: string;
          paid_at: string | null;
        };
        Insert: {
          plano_id?: string | null;
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
      stage_types: {
        Row: {
          id: number;
          code: string;
          label: string;
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
