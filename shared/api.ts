/**
 * Shared code between client and server
 * Comprehensive API types for AdvogaAI system
 */

// ================================
// RESPONSE TYPES
// ================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DemoResponse {
  message: string;
}

// ================================
// ENTITY TYPES - PUBLIC SCHEMA
// ================================

export interface Advogado {
  oab: number;
  uf: string | null;
  created_at: string;
  nome: string | null;
}

export interface Cliente {
  cpfcnpj: string;
  nome: string | null;
  whatsapp: string | null;
  created_at: string;
  crm_id: string | null;
}

export interface Processo {
  numero_cnj: string;
  tribunal_sigla: string | null;
  titulo_polo_ativo: string | null;
  titulo_polo_passivo: string | null;
  data: any;
  created_at: string;
  crm_id: string | null;
  decisoes: string | null;
}

export interface Movimentacao {
  id: number;
  numero_cnj: string | null;
  data: any;
  created_at: string;
  data_movimentacao: string | null;
}

export interface Publicacao {
  id: number;
  created_at: string;
  numero_cnj: string | null;
  data: any;
  data_publicacao: string | null;
}

export interface Peticao {
  id: string;
  numero_cnj: string | null;
  tipo: string | null;
  conteudo: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  numero_cnj: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  metadata: any | null;
  created_at: string;
}

export interface ThreadLink {
  id: string;
  numero_cnj: string | null;
  cliente_cpfcnpj: string | null;
  context_type: string;
  created_at: string;
}

export interface AIMessage {
  id: string;
  thread_link_id: string;
  sender_type: "user" | "agent" | "system";
  content: string;
  created_at: string;
}

export interface Timeline {
  id: string;
  numero_cnj: string | null;
  data: string;
  tipo: string;
  conteudo: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ================================
// ENTITY TYPES - LEGALFLOW SCHEMA
// ================================

export type EventType =
  | "audiencia"
  | "reuniao"
  | "prazo"
  | "entrega"
  | "compromisso"
  | "outros";
export type JourneyStatus = "ativo" | "pausado" | "concluido" | "cancelado";
export type PaymentStatus = "pendente" | "pago" | "vencido" | "cancelado";
export type StageStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped";
export type TicketStatus = "aberto" | "em_andamento" | "resolvido" | "fechado";
export type Priority = "baixa" | "media" | "alta" | "urgente";
export type ChannelType =
  | "email"
  | "whatsapp"
  | "telefone"
  | "presencial"
  | "sistema";
export type ActivityStatus = "todo" | "in_progress" | "done" | "blocked";
export type ConversationStatus = "open" | "pending" | "resolved" | "closed";

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  group_key: string | null;
  channel: ChannelType;
  assigned_oab: number | null;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  frt_due_at: string | null;
  ttr_due_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  title: string;
  status: ActivityStatus;
  priority: Priority;
  due_at: string | null;
  assigned_oab: number | null;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  ticket_id: string | null;
  deal_id: string | null;
  stage_instance_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  activity_id: string | null;
  ticket_id: string | null;
  deal_id: string | null;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  description: string | null;
  billable: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  owner_oab: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventoAgenda {
  id: string;
  stage_instance_id: string | null;
  event_type: EventType;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  external_ref: string | null;
  cliente_cpfcnpj: string | null;
  created_at: string;
}

export interface ConversationProperties {
  thread_link_id: string;
  status: ConversationStatus | null;
  priority: Priority | null;
  group_key: string | null;
  tags: string[] | null;
  assignee_id: string | null;
  sla_due_at: string | null;
  custom: any | null;
  created_at: string;
  updated_at: string;
}

export interface PlanoPagamento {
  id: string;
  cliente_cpfcnpj: string;
  processo_numero_cnj: string | null;
  amount_total: number;
  installments: number;
  paid_amount: number;
  status: PaymentStatus;
  created_at: string;
}

export interface ParcelaPagamento {
  id: string;
  plano_id: string;
  n_parcela: number;
  due_date: string;
  amount: number;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface CSATRating {
  id: string;
  ticket_id: string;
  rating: number;
  feedback: string | null;
  cliente_cpfcnpj: string | null;
  created_at: string;
}

export interface SavedView {
  id: string;
  name: string;
  user_id: string;
  view_type: string;
  filters: any;
  columns: string[] | null;
  sort_by: string | null;
  sort_order: string | null;
  is_default: boolean;
  created_at: string;
}

// ================================
// JOURNEY & STAGE TYPES
// ================================

export interface JourneyTemplate {
  id: string;
  name: string;
  niche: string | null;
  steps_count: number;
  eta_days: number;
  tags: string[] | null;
  created_at: string;
}

export interface JourneyInstance {
  id: string;
  template_id: string;
  cliente_cpfcnpj: string;
  processo_numero_cnj: string | null;
  owner_oab: number;
  start_date: string;
  status: JourneyStatus;
  progress_pct: number;
  next_action: any;
  created_at: string;
}

export interface StageType {
  id: number;
  code: string;
  label: string;
  created_at: string;
}

export interface JourneyTemplateStage {
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
}

export interface StageInstance {
  id: string;
  instance_id: string;
  template_stage_id: string;
  status: StageStatus;
  mandatory: boolean;
  sla_at: string | null;
  meta: any;
  completed_at: string | null;
  created_at: string;
}

// ================================
// REQUEST/RESPONSE TYPES
// ================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    oab?: number;
    userType: "advogado" | "cliente";
  };
  token: string;
  expiresAt: string;
}

export interface CreateClienteRequest {
  cpfcnpj: string;
  nome?: string;
  whatsapp?: string;
}

export interface CreateProcessoRequest {
  numero_cnj: string;
  tribunal_sigla?: string;
  titulo_polo_ativo?: string;
  titulo_polo_passivo?: string;
  data?: any;
}

export interface CreateTicketRequest {
  subject: string;
  priority?: Priority;
  channel?: ChannelType;
  assigned_oab?: number;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
}

export interface CreateActivityRequest {
  title: string;
  priority?: Priority;
  due_at?: string;
  assigned_oab?: number;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
  ticket_id?: string;
  deal_id?: string;
}

export interface CreateDealRequest {
  title: string;
  value: number;
  currency?: string;
  stage?: string;
  probability?: number;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
  owner_oab?: number;
}

export interface CreateEventoRequest {
  event_type: EventType;
  title: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  external_ref?: string;
  cliente_cpfcnpj?: string;
}

export interface CreatePlanoRequest {
  cliente_cpfcnpj: string;
  processo_numero_cnj?: string;
  amount_total: number;
  installments: number;
}

export interface UpdateTicketRequest {
  subject?: string;
  status?: TicketStatus;
  priority?: Priority;
  assigned_oab?: number;
}

export interface UpdateActivityRequest {
  title?: string;
  status?: ActivityStatus;
  priority?: Priority;
  due_at?: string;
  assigned_oab?: number;
}

export interface UpdateConversationPropertiesRequest {
  status?: ConversationStatus;
  priority?: Priority;
  group_key?: string;
  tags?: string[];
  assignee_id?: string;
  sla_due_at?: string;
  custom?: any;
}

// ================================
// SEARCH & FILTER TYPES
// ================================

export interface SearchFilters {
  query?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  created_after?: string;
  created_before?: string;
  due_after?: string;
  due_before?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface TicketFilters extends SearchFilters {
  channel?: ChannelType;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
}

export interface ActivityFilters extends SearchFilters {
  ticket_id?: string;
  deal_id?: string;
  stage_instance_id?: string;
}

export interface ClienteFilters {
  query?: string;
  created_after?: string;
  created_before?: string;
  has_whatsapp?: boolean;
}

export interface ProcessoFilters {
  query?: string;
  tribunal_sigla?: string;
  created_after?: string;
  created_before?: string;
}

// ================================
// ADVOGAAI TOOLS TYPES
// ================================

export interface AdvogaAIToolRequest {
  tool_id: string;
  parameters: Record<string, any>;
  context?: {
    numero_cnj?: string;
    cliente_cpfcnpj?: string;
    thread_link_id?: string;
  };
}

export interface AdvogaAIToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  execution_time?: number;
  tool_version?: string;
}

export interface ToolExecutionHistory {
  id: string;
  tool_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  result: AdvogaAIToolResponse;
  executed_by: string;
  executed_at: string;
}

// ================================
// ANALYTICS TYPES
// ================================

export interface TicketMetrics {
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_resolution_time: number;
  sla_breach_count: number;
  satisfaction_score: number;
}

export interface ActivityMetrics {
  total_activities: number;
  completed_activities: number;
  overdue_activities: number;
  avg_completion_time: number;
  productivity_score: number;
}

export interface FinancialMetrics {
  total_receivable: number;
  total_received: number;
  pending_amount: number;
  overdue_amount: number;
  collection_rate: number;
}

export interface DashboardMetrics {
  tickets: TicketMetrics;
  activities: ActivityMetrics;
  financial: FinancialMetrics;
  recent_events: Timeline[];
  urgent_tasks: Activity[];
}

// ================================
// ERROR TYPES
// ================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: ValidationError[];
  code?: string;
  timestamp: string;
}

// ================================
// UTILITY TYPES
// ================================

export type EntityWithRelations<T, R = {}> = T & R;

export type CreateRequest<T> = Omit<T, "id" | "created_at" | "updated_at">;
export type UpdateRequest<T> = Partial<Omit<T, "id" | "created_at">>;

export type SortDirection = "asc" | "desc";
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "notin";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface SortCondition {
  field: string;
  direction: SortDirection;
}

export interface QueryOptions {
  filters?: FilterCondition[];
  sort?: SortCondition[];
  pagination?: PaginationParams;
  include?: string[];
}

// ================================
// CONSTANTS
// ================================

export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/api/auth/login",
  LOGOUT: "/api/auth/logout",
  REFRESH: "/api/auth/refresh",

  // Entities
  CLIENTES: "/api/clientes",
  PROCESSOS: "/api/processos",
  TICKETS: "/api/tickets",
  ACTIVITIES: "/api/activities",
  DEALS: "/api/deals",
  EVENTOS: "/api/eventos",
  PLANOS: "/api/planos",

  // Tools
  ADVOGAAI_TOOLS: "/api/tools",

  // Analytics
  METRICS: "/api/metrics",
  DASHBOARD: "/api/dashboard",
} as const;

export const STATUS_COLORS = {
  // Ticket Status
  aberto: "destructive",
  em_andamento: "default",
  resolvido: "secondary",
  fechado: "outline",

  // Activity Status
  todo: "destructive",
  in_progress: "default",
  done: "secondary",
  blocked: "outline",

  // Priority
  baixa: "outline",
  media: "secondary",
  alta: "default",
  urgente: "destructive",

  // Payment Status
  pendente: "secondary",
  pago: "default",
  vencido: "destructive",
  cancelado: "outline",
} as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  sort_by: "created_at",
  sort_order: "desc" as const,
};

export const SLA_HOURS = {
  priority: {
    urgente: { frt: 1, ttr: 4 },
    alta: { frt: 4, ttr: 8 },
    media: { frt: 8, ttr: 24 },
    baixa: { frt: 24, ttr: 72 },
  },
} as const;
