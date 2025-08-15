/**
 * Activity and Time Management Utilities
 * Flow C8: Activities (substitui ClickUp)
 */

export interface ActivityStatus {
  id: "todo" | "in_progress" | "done" | "blocked";
  label: string;
  color: string;
  icon: string;
}

export interface ActivityPriority {
  id: "baixa" | "media" | "alta" | "urgente";
  label: string;
  color: string;
  weight: number;
}

export interface TimeEntry {
  id: string;
  activity_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  description?: string;
  billable: boolean;
}

export interface ActivityStats {
  totalActivities: number;
  completedActivities: number;
  overdueTasks: number;
  averageCompletionTime: number;
  completionRate: number;
}

// Activity status configurations
export const ACTIVITY_STATUSES: ActivityStatus[] = [
  {
    id: "todo",
    label: "A Fazer",
    color: "bg-gray-100 text-gray-800",
    icon: "clock",
  },
  {
    id: "in_progress",
    label: "Em Andamento",
    color: "bg-blue-100 text-blue-800",
    icon: "play",
  },
  {
    id: "done",
    label: "Concluído",
    color: "bg-green-100 text-green-800",
    icon: "check-circle",
  },
  {
    id: "blocked",
    label: "Bloqueado",
    color: "bg-red-100 text-red-800",
    icon: "x-circle",
  },
];

// Priority configurations with weights for sorting
export const ACTIVITY_PRIORITIES: ActivityPriority[] = [
  {
    id: "urgente",
    label: "Urgente",
    color: "bg-red-100 text-red-800",
    weight: 4,
  },
  {
    id: "alta",
    label: "Alta",
    color: "bg-orange-100 text-orange-800",
    weight: 3,
  },
  {
    id: "media",
    label: "Média",
    color: "bg-yellow-100 text-yellow-800",
    weight: 2,
  },
  {
    id: "baixa",
    label: "Baixa",
    color: "bg-gray-100 text-gray-800",
    weight: 1,
  },
];

/**
 * Calculate if a task is overdue
 */
export function isTaskOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate) < new Date();
}

/**
 * Get due date status with urgency levels
 */
export function getDueDateStatus(dueDate?: string, status?: string) {
  if (!dueDate || status === "done") return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 0) {
    const hoursOverdue = Math.abs(diffHours);
    return {
      text:
        hoursOverdue >= 24
          ? `${Math.floor(hoursOverdue / 24)}d atraso`
          : `${hoursOverdue}h atraso`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      urgent: true,
      overdue: true,
    };
  } else if (diffHours <= 2) {
    return {
      text: "Vence em 2h",
      color: "text-red-500",
      bgColor: "bg-red-50",
      urgent: true,
      overdue: false,
    };
  } else if (diffHours <= 24) {
    return {
      text: "Vence hoje",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      urgent: true,
      overdue: false,
    };
  } else if (diffDays <= 3) {
    return {
      text: `${diffDays}d restantes`,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      urgent: false,
      overdue: false,
    };
  }

  return {
    text: `${diffDays}d restantes`,
    color: "text-green-600",
    bgColor: "bg-green-50",
    urgent: false,
    overdue: false,
  };
}

/**
 * Sort activities by priority and due date
 */
export function sortActivitiesByPriority(activities: any[]): any[] {
  return activities.sort((a, b) => {
    // First, sort by overdue status
    const aOverdue = isTaskOverdue(a.due_at, a.status);
    const bOverdue = isTaskOverdue(b.due_at, b.status);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by priority weight
    const aPriority =
      ACTIVITY_PRIORITIES.find((p) => p.id === a.priority)?.weight || 0;
    const bPriority =
      ACTIVITY_PRIORITIES.find((p) => p.id === b.priority)?.weight || 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    // Finally by due date
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }

    if (a.due_at && !b.due_at) return -1;
    if (!a.due_at && b.due_at) return 1;

    // Fallback to creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Calculate activity statistics
 */
export function calculateActivityStats(activities: any[]): ActivityStats {
  const total = activities.length;
  const completed = activities.filter((a) => a.status === "done").length;
  const overdue = activities.filter((a) =>
    isTaskOverdue(a.due_at, a.status),
  ).length;

  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  // Calculate average completion time for completed tasks
  const completedWithDates = activities
    .filter((a) => a.status === "done" && a.due_at)
    .map((a) => {
      const created = new Date(a.created_at);
      const updated = new Date(a.updated_at);
      return updated.getTime() - created.getTime();
    });

  const averageCompletionTime =
    completedWithDates.length > 0
      ? completedWithDates.reduce((sum, time) => sum + time, 0) /
        completedWithDates.length
      : 0;

  return {
    totalActivities: total,
    completedActivities: completed,
    overdueTasks: overdue,
    averageCompletionTime: Math.floor(averageCompletionTime / (1000 * 60 * 60)), // in hours
    completionRate: Math.round(completionRate),
  };
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

/**
 * Calculate time spent on activity
 */
export function calculateTimeSpent(timeEntries: TimeEntry[]): number {
  return timeEntries.reduce((total, entry) => {
    if (entry.duration_seconds) {
      return total + entry.duration_seconds;
    } else if (entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      return total + Math.floor((end.getTime() - start.getTime()) / 1000);
    }
    return total;
  }, 0);
}

/**
 * Get next status in workflow
 */
export function getNextStatus(currentStatus: string): string {
  const statusFlow = {
    todo: "in_progress",
    in_progress: "done",
    blocked: "in_progress",
    done: "done", // Already done
  };

  return statusFlow[currentStatus as keyof typeof statusFlow] || currentStatus;
}

/**
 * Get available transitions for a status
 */
export function getAvailableTransitions(
  currentStatus: string,
): ActivityStatus[] {
  const allTransitions = {
    todo: ["in_progress", "blocked"],
    in_progress: ["done", "blocked", "todo"],
    blocked: ["todo", "in_progress"],
    done: ["todo"], // Allow reopening
  };

  const availableIds =
    allTransitions[currentStatus as keyof typeof allTransitions] || [];
  return ACTIVITY_STATUSES.filter((status) => availableIds.includes(status.id));
}

/**
 * Generate activity summary for reporting
 */
export function generateActivitySummary(activities: any[]): string {
  const stats = calculateActivityStats(activities);
  const urgentTasks = activities.filter(
    (a) => a.priority === "urgente" && a.status !== "done",
  ).length;
  const tasksToday = activities.filter((a) => {
    if (!a.due_at || a.status === "done") return false;
    const today = new Date();
    const due = new Date(a.due_at);
    return due.toDateString() === today.toDateString();
  }).length;

  return `${stats.totalActivities} atividades total, ${stats.completedActivities} concluídas (${stats.completionRate}%), ${stats.overdueTasks} em atraso, ${urgentTasks} urgentes, ${tasksToday} vencem hoje.`;
}

/**
 * Filter activities by various criteria
 */
export function filterActivities(
  activities: any[],
  filters: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    dueToday?: boolean;
    overdue?: boolean;
    search?: string;
  },
): any[] {
  return activities.filter((activity) => {
    // Status filter
    if (
      filters.status &&
      filters.status !== "all" &&
      activity.status !== filters.status
    ) {
      return false;
    }

    // Priority filter
    if (
      filters.priority &&
      filters.priority !== "all" &&
      activity.priority !== filters.priority
    ) {
      return false;
    }

    // Assigned to filter
    if (
      filters.assignedTo &&
      filters.assignedTo !== "all" &&
      activity.assigned_oab?.toString() !== filters.assignedTo
    ) {
      return false;
    }

    // Due today filter
    if (filters.dueToday && activity.due_at) {
      const today = new Date();
      const due = new Date(activity.due_at);
      if (due.toDateString() !== today.toDateString()) {
        return false;
      }
    }

    // Overdue filter
    if (filters.overdue && !isTaskOverdue(activity.due_at, activity.status)) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = [
        activity.title,
        activity.cliente_nome,
        activity.numero_cnj,
        activity.advogado_nome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });
}
