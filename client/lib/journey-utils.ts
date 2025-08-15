/**
 * Journey Management Utilities - Flows D1-D8
 * Comprehensive utilities for journey templates, instances, and automation
 */

export interface StageType {
  id: string;
  name: string;
  type: "lesson" | "form" | "upload" | "meeting" | "gate" | "task";
  icon: string;
  description: string;
  config_schema: Record<string, any>;
}

export interface JourneyTemplate {
  id: string;
  name: string;
  description?: string;
  area: string;
  category: string;
  stage_count: number;
  estimated_duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  tags: string[];
}

export interface JourneyTemplateStage {
  id: string;
  template_id: string;
  stage_type_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_mandatory: boolean;
  sla_days: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StageRule {
  id: string;
  stage_id: string;
  trigger_event: "on_enter" | "on_done" | "on_overdue";
  action_type:
    | "notify"
    | "create_activity"
    | "create_ticket"
    | "schedule"
    | "webhook";
  action_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface JourneyInstance {
  id: string;
  template_id: string;
  template_name: string;
  client_cpf_cnpj: string;
  client_name: string;
  numero_cnj?: string;
  responsible_oab: string;
  responsible_name: string;
  status: "active" | "completed" | "cancelled" | "on_hold";
  progress_pct: number;
  next_action: string;
  next_action_stage_id?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StageInstance {
  id: string;
  journey_instance_id: string;
  template_stage_id: string;
  stage_type: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "skipped" | "overdue";
  is_mandatory: boolean;
  due_at: string;
  started_at?: string;
  completed_at?: string;
  form_responses?: Record<string, any>;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequirement {
  id: string;
  stage_instance_id: string;
  name: string;
  description?: string;
  file_types: string[];
  is_mandatory: boolean;
  max_file_size_mb: number;
  created_at: string;
}

export interface DocumentUpload {
  id: string;
  requirement_id: string;
  stage_instance_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  status: "pending" | "approved" | "rejected" | "needs_revision";
  uploaded_by: string;
  uploaded_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface JourneyFilters {
  search?: string;
  area?: string;
  status?: string;
  responsible_oab?: string;
  client_cpf_cnpj?: string;
  created_from?: string;
  created_to?: string;
  tags?: string[];
}

export interface JourneyStats {
  total_instances: number;
  active_instances: number;
  completed_instances: number;
  avg_completion_days: number;
  overdue_stages: number;
  completion_rate: number;
  stage_breakdown: Record<string, { count: number; completion_rate: number }>;
}

/**
 * Calculate journey statistics
 */
export function calculateJourneyStats(
  instances: JourneyInstance[],
  stages: StageInstance[],
): JourneyStats {
  const stats: JourneyStats = {
    total_instances: instances.length,
    active_instances: 0,
    completed_instances: 0,
    avg_completion_days: 0,
    overdue_stages: 0,
    completion_rate: 0,
    stage_breakdown: {},
  };

  let totalCompletionDays = 0;
  let completedCount = 0;

  instances.forEach((instance) => {
    if (instance.status === "active") {
      stats.active_instances++;
    } else if (instance.status === "completed") {
      stats.completed_instances++;
      if (instance.completed_at) {
        const days = Math.ceil(
          (new Date(instance.completed_at).getTime() -
            new Date(instance.started_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalCompletionDays += days;
        completedCount++;
      }
    }
  });

  // Calculate overdue stages
  const now = new Date();
  stages.forEach((stage) => {
    if (stage.status === "pending" || stage.status === "in_progress") {
      const dueDate = new Date(stage.due_at);
      if (dueDate < now) {
        stats.overdue_stages++;
      }
    }
  });

  stats.avg_completion_days =
    completedCount > 0 ? totalCompletionDays / completedCount : 0;
  stats.completion_rate =
    stats.total_instances > 0
      ? (stats.completed_instances / stats.total_instances) * 100
      : 0;

  return stats;
}

/**
 * Sort journeys by different criteria
 */
export function sortJourneys(
  journeys: JourneyInstance[],
  sortBy: string,
  sortOrder: "asc" | "desc" = "desc",
): JourneyInstance[] {
  return [...journeys].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case "progress_pct":
        aValue = a.progress_pct;
        bValue = b.progress_pct;
        break;
      case "started_at":
        aValue = new Date(a.started_at);
        bValue = new Date(b.started_at);
        break;
      case "client_name":
        aValue = a.client_name.toLowerCase();
        bValue = b.client_name.toLowerCase();
        break;
      case "template_name":
        aValue = a.template_name.toLowerCase();
        bValue = b.template_name.toLowerCase();
        break;
      case "responsible_name":
        aValue = a.responsible_name.toLowerCase();
        bValue = b.responsible_name.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortOrder === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder === "asc" ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Filter journeys based on criteria
 */
export function filterJourneys(
  journeys: JourneyInstance[],
  filters: JourneyFilters,
): JourneyInstance[] {
  return journeys.filter((journey) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        journey.template_name.toLowerCase().includes(searchLower) ||
        journey.client_name.toLowerCase().includes(searchLower) ||
        journey.responsible_name.toLowerCase().includes(searchLower) ||
        (journey.numero_cnj &&
          journey.numero_cnj.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && journey.status !== filters.status) {
      return false;
    }

    // Responsible filter
    if (
      filters.responsible_oab &&
      journey.responsible_oab !== filters.responsible_oab
    ) {
      return false;
    }

    // Client filter
    if (
      filters.client_cpf_cnpj &&
      journey.client_cpf_cnpj !== filters.client_cpf_cnpj
    ) {
      return false;
    }

    // Date range filters
    if (filters.created_from) {
      const journeyDate = new Date(journey.started_at);
      const fromDate = new Date(filters.created_from);
      if (journeyDate < fromDate) return false;
    }
    if (filters.created_to) {
      const journeyDate = new Date(journey.started_at);
      const toDate = new Date(filters.created_to);
      if (journeyDate > toDate) return false;
    }

    return true;
  });
}

/**
 * Get journey status color
 */
export function getJourneyStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-100";
    case "active":
      return "text-blue-600 bg-blue-100";
    case "on_hold":
      return "text-yellow-600 bg-yellow-100";
    case "cancelled":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Get stage status color
 */
export function getStageStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-100";
    case "in_progress":
      return "text-blue-600 bg-blue-100";
    case "pending":
      return "text-gray-600 bg-gray-100";
    case "overdue":
      return "text-red-600 bg-red-100";
    case "skipped":
      return "text-orange-600 bg-orange-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Get stage type icon
 */
export function getStageTypeIcon(type: string): string {
  const icons = {
    lesson: "📚",
    form: "📝",
    upload: "📤",
    meeting: "🤝",
    gate: "🚪",
    task: "✅",
  };
  return icons[type as keyof typeof icons] || "📋";
}

/**
 * Calculate next action for journey
 */
export function calculateNextAction(
  instance: JourneyInstance,
  stages: StageInstance[],
): { action: string; stage_id?: string } {
  const instanceStages = stages.filter(
    (s) => s.journey_instance_id === instance.id,
  );

  // Find first incomplete mandatory stage
  const pendingMandatory = instanceStages
    .filter(
      (s) =>
        s.is_mandatory &&
        (s.status === "pending" || s.status === "in_progress"),
    )
    .sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
    )[0];

  if (pendingMandatory) {
    const isOverdue = new Date(pendingMandatory.due_at) < new Date();
    return {
      action: isOverdue
        ? `⚠️ ${pendingMandatory.title} (Atrasado)`
        : `📋 ${pendingMandatory.title}`,
      stage_id: pendingMandatory.id,
    };
  }

  // Find next optional stage
  const pendingOptional = instanceStages
    .filter(
      (s) =>
        !s.is_mandatory &&
        (s.status === "pending" || s.status === "in_progress"),
    )
    .sort(
      (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
    )[0];

  if (pendingOptional) {
    return {
      action: `📌 ${pendingOptional.title}`,
      stage_id: pendingOptional.id,
    };
  }

  // All stages completed
  const allCompleted = instanceStages.every(
    (s) => s.status === "completed" || s.status === "skipped",
  );
  if (allCompleted) {
    return { action: "🎉 Jornada Concluída" };
  }

  return { action: "✅ Aguardando próxima etapa" };
}

/**
 * Calculate journey progress percentage
 */
export function calculateProgress(stages: StageInstance[]): number {
  if (stages.length === 0) return 0;

  const completedStages = stages.filter((s) => s.status === "completed").length;
  return Math.round((completedStages / stages.length) * 100);
}

/**
 * Format relative time for stages
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "agora" : `${diffMinutes} min atrás`;
    }
    return diffHours === 1 ? "1 hora atrás" : `${diffHours} horas atrás`;
  }

  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 semana atrás" : `${weeks} semanas atrás`;
  }

  const months = Math.floor(diffDays / 30);
  return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
}

/**
 * Check if stage is overdue
 */
export function isStageOverdue(stage: StageInstance): boolean {
  if (stage.status === "completed" || stage.status === "skipped") return false;
  return new Date(stage.due_at) < new Date();
}

/**
 * Get days until due
 */
export function getDaysUntilDue(stage: StageInstance): number {
  const now = new Date();
  const dueDate = new Date(stage.due_at);
  const diffMs = dueDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Default stage types configuration
 */
export const DEFAULT_STAGE_TYPES: StageType[] = [
  {
    id: "lesson",
    name: "Lição",
    type: "lesson",
    icon: "📚",
    description: "Conteúdo educativo ou informativo",
    config_schema: {
      content: { type: "text", required: true },
      video_url: { type: "url", required: false },
      duration_minutes: { type: "number", required: false },
    },
  },
  {
    id: "form",
    name: "Formulário",
    type: "form",
    icon: "📝",
    description: "Coleta de informações estruturadas",
    config_schema: {
      fields: { type: "array", required: true },
      validation_rules: { type: "object", required: false },
    },
  },
  {
    id: "upload",
    name: "Upload",
    type: "upload",
    icon: "📤",
    description: "Envio de documentos",
    config_schema: {
      allowed_types: { type: "array", required: true },
      max_files: { type: "number", required: false },
      max_size_mb: { type: "number", required: false },
    },
  },
  {
    id: "meeting",
    name: "Reunião",
    type: "meeting",
    icon: "🤝",
    description: "Agendamento de reunião",
    config_schema: {
      duration_minutes: { type: "number", required: true },
      meeting_type: {
        type: "select",
        options: ["presencial", "online"],
        required: true,
      },
    },
  },
  {
    id: "gate",
    name: "Aprovação",
    type: "gate",
    icon: "🚪",
    description: "Ponto de aprovação ou revisão",
    config_schema: {
      approval_type: {
        type: "select",
        options: ["automatic", "manual"],
        required: true,
      },
      approvers: { type: "array", required: false },
    },
  },
  {
    id: "task",
    name: "Tarefa",
    type: "task",
    icon: "✅",
    description: "Tarefa a ser executada",
    config_schema: {
      assignee: { type: "string", required: false },
      priority: {
        type: "select",
        options: ["low", "medium", "high"],
        required: false,
      },
    },
  },
];

/**
 * Generate default stage rules for a stage type
 */
export function generateDefaultRules(stageType: string): Partial<StageRule>[] {
  const commonRules = [
    {
      trigger_event: "on_enter" as const,
      action_type: "notify" as const,
      action_config: { message: "Nova etapa iniciada" },
      is_active: true,
    },
  ];

  switch (stageType) {
    case "upload":
      return [
        ...commonRules,
        {
          trigger_event: "on_done" as const,
          action_type: "create_activity" as const,
          action_config: { title: "Documentos enviados", type: "upload" },
          is_active: true,
        },
      ];
    case "meeting":
      return [
        ...commonRules,
        {
          trigger_event: "on_enter" as const,
          action_type: "schedule" as const,
          action_config: { event_type: "meeting" },
          is_active: true,
        },
      ];
    case "task":
      return [
        ...commonRules,
        {
          trigger_event: "on_done" as const,
          action_type: "create_activity" as const,
          action_config: { title: "Tarefa concluída", type: "task" },
          is_active: true,
        },
      ];
    default:
      return commonRules;
  }
}
