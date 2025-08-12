// Financial & Revenue Types

export interface PlanoPagamento {
  id: string;
  cliente_cpfcnpj: string;
  cliente_nome: string;
  processo_numero_cnj?: string;
  processo_titulo?: string;
  journey_instance_id?: string;
  journey_template_name?: string;
  amount_total: number;
  installments: number;
  status: 'ativo' | 'pausado' | 'concluido' | 'inadimplente';
  created_at: string;
  created_by_oab: string;
  parcelas: ParcelaPagamento[];
  payment_links: StagePaymentLink[];
}

export interface ParcelaPagamento {
  id: string;
  plano_id: string;
  sequence_number: number;
  due_date: string;
  amount: number;
  status: 'pendente' | 'vencida' | 'paga' | 'cancelada';
  paid_at?: string;
  payment_method?: string;
  notes?: string;
  triggered_by_stage_id?: string; // When milestone triggered this installment
}

export interface StagePaymentLink {
  id: string;
  plano_id: string;
  stage_template_id: string;
  stage_name: string;
  rule: 'create_installment' | 'activate_installment' | 'send_notification';
  installment_amount?: number;
  days_after_completion?: number;
}

// Reporting & Analytics Types
export interface SLAMetrics {
  total_stages: number;
  within_sla: number;
  overdue: number;
  critical_overdue: number; // > 2x SLA time
  avg_completion_time_hours: number;
}

export interface NichoCompletion {
  nicho: string;
  total_journeys: number;
  completed_journeys: number;
  avg_completion_time_days: number;
  completion_rate: number;
}

export interface PublicationsMetrics {
  total_received: number;
  processed: number;
  pending: number;
  linked_to_cases: number;
  in_journeys: number;
  processing_rate: number;
}

export interface PaymentMetrics {
  total_plans: number;
  active_plans: number;
  total_revenue: number;
  overdue_amount: number;
  overdue_installments: number;
  collection_rate: number;
}

export interface AIActivityMetrics {
  total_generations: number;
  petitions_generated: number;
  responses_generated: number;
  documents_analyzed: number;
  time_saved_hours: number;
}

export interface ReportCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // percentage change
  status: 'success' | 'warning' | 'danger' | 'info';
  icon: string;
  data?: any; // Additional data for drill-through
}

// Drill-through filter types
export interface DrillThroughFilters {
  type: 'sla' | 'nicho' | 'publications' | 'payments' | 'ai_activity';
  status?: string;
  nicho?: string;
  date_range?: {
    start: string;
    end: string;
  };
  criteria?: any;
}

// Analytics aggregation types
export interface AnalyticsData {
  sla_metrics: SLAMetrics;
  nicho_completion: NichoCompletion[];
  publications_metrics: PublicationsMetrics;
  payment_metrics: PaymentMetrics;
  ai_activity: AIActivityMetrics;
  updated_at: string;
}
