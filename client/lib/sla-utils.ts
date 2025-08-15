/**
 * SLA (Service Level Agreement) Utilities for Ticket Management
 * Flow C7: Tickets (Freshdesk-like)
 */

export interface SLAConfig {
  priority: "baixa" | "media" | "alta" | "urgente";
  frtHours: number; // First Response Time in hours
  ttrHours: number; // Time to Resolution in hours
}

export interface SLAStatus {
  text: string;
  color: string;
  isOverdue: boolean;
  isUrgent: boolean;
  hoursRemaining: number;
}

// Default SLA configurations based on priority
export const DEFAULT_SLA_CONFIG: Record<string, SLAConfig> = {
  urgente: {
    priority: "urgente",
    frtHours: 2, // 2 hours for first response
    ttrHours: 8, // 8 hours for resolution
  },
  alta: {
    priority: "alta",
    frtHours: 4, // 4 hours for first response
    ttrHours: 24, // 24 hours for resolution
  },
  media: {
    priority: "media",
    frtHours: 8, // 8 hours for first response
    ttrHours: 72, // 72 hours for resolution
  },
  baixa: {
    priority: "baixa",
    frtHours: 24, // 24 hours for first response
    ttrHours: 120, // 120 hours (5 days) for resolution
  },
};

/**
 * Calculate SLA due dates based on ticket creation time and priority
 */
export function calculateSLADueDates(
  createdAt: string | Date,
  priority: "baixa" | "media" | "alta" | "urgente",
): { frtDue: Date; ttrDue: Date } {
  const created = new Date(createdAt);
  const config = DEFAULT_SLA_CONFIG[priority];

  const frtDue = new Date(created.getTime() + config.frtHours * 60 * 60 * 1000);
  const ttrDue = new Date(created.getTime() + config.ttrHours * 60 * 60 * 1000);

  return { frtDue, ttrDue };
}

/**
 * Get SLA status for a given due date
 */
export function getSLAStatus(dueDate?: string | Date): SLAStatus | null {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));

  if (hoursRemaining < 0) {
    // Overdue
    const hoursOverdue = Math.abs(hoursRemaining);
    return {
      text: `${hoursOverdue}h em atraso`,
      color: "text-red-600",
      isOverdue: true,
      isUrgent: true,
      hoursRemaining,
    };
  } else if (hoursRemaining < 2) {
    // Critical - less than 2 hours
    return {
      text: `${hoursRemaining}h restantes`,
      color: "text-red-500",
      isOverdue: false,
      isUrgent: true,
      hoursRemaining,
    };
  } else if (hoursRemaining < 8) {
    // Warning - less than 8 hours
    return {
      text: `${hoursRemaining}h restantes`,
      color: "text-orange-600",
      isOverdue: false,
      isUrgent: true,
      hoursRemaining,
    };
  } else if (hoursRemaining < 24) {
    // Caution - less than 24 hours
    const hours = hoursRemaining;
    return {
      text: `${hours}h restantes`,
      color: "text-yellow-600",
      isOverdue: false,
      isUrgent: false,
      hoursRemaining,
    };
  } else {
    // Normal - more than 24 hours
    const days = Math.floor(hoursRemaining / 24);
    const remainingHours = hoursRemaining % 24;
    const text =
      days > 0
        ? `${days}d ${remainingHours}h restantes`
        : `${hoursRemaining}h restantes`;

    return {
      text,
      color: "text-green-600",
      isOverdue: false,
      isUrgent: false,
      hoursRemaining,
    };
  }
}

/**
 * Get next business day (skip weekends)
 * Useful for more advanced SLA calculations
 */
export function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  // If Saturday (6) or Sunday (0), move to Monday
  if (nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 2);
  } else if (nextDay.getDay() === 0) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay;
}

/**
 * Calculate business hours between two dates
 * Assumes business hours are 9 AM to 6 PM, Monday to Friday
 */
export function calculateBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let businessHours = 0;

  const businessStart = 9; // 9 AM
  const businessEnd = 18; // 6 PM
  const hoursPerDay = businessEnd - businessStart; // 9 hours

  while (start < end) {
    const dayOfWeek = start.getDay();

    // Skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const startHour = start.getHours();
      const endHour = Math.min(businessEnd, end.getHours());

      if (startHour < businessEnd && endHour > businessStart) {
        const effectiveStart = Math.max(businessStart, startHour);
        const effectiveEnd = Math.min(businessEnd, endHour);
        businessHours += Math.max(0, effectiveEnd - effectiveStart);
      }
    }

    // Move to next day
    start.setDate(start.getDate() + 1);
    start.setHours(businessStart, 0, 0, 0);
  }

  return businessHours;
}

/**
 * Format SLA time remaining for display
 */
export function formatSLATime(hours: number): string {
  if (hours < 0) {
    const absHours = Math.abs(hours);
    if (absHours >= 24) {
      const days = Math.floor(absHours / 24);
      const remainingHours = absHours % 24;
      return `${days}d ${remainingHours}h em atraso`;
    }
    return `${absHours}h em atraso`;
  }

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days}d restantes`;
    }
    return `${days}d ${remainingHours}h restantes`;
  }

  return `${hours}h restantes`;
}

/**
 * Get SLA badge color based on status
 */
export function getSLABadgeColor(status: SLAStatus): string {
  if (status.isOverdue) {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (status.isUrgent) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  if (status.hoursRemaining < 24) {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
  return "bg-green-100 text-green-800 border-green-200";
}

/**
 * Check if ticket is within SLA
 */
export function isWithinSLA(dueDate: string | Date): boolean {
  if (!dueDate) return true;

  const now = new Date();
  const due = new Date(dueDate);
  return now <= due;
}

/**
 * Get escalation level based on SLA status
 */
export function getEscalationLevel(
  frtStatus: SLAStatus | null,
  ttrStatus: SLAStatus | null,
): "none" | "low" | "medium" | "high" | "critical" {
  if (!frtStatus && !ttrStatus) return "none";

  const isAnyOverdue = frtStatus?.isOverdue || ttrStatus?.isOverdue;
  const isAnyUrgent = frtStatus?.isUrgent || ttrStatus?.isUrgent;

  if (isAnyOverdue) {
    const maxOverdueHours = Math.max(
      Math.abs(frtStatus?.hoursRemaining || 0),
      Math.abs(ttrStatus?.hoursRemaining || 0),
    );

    if (maxOverdueHours > 48) return "critical";
    if (maxOverdueHours > 24) return "high";
    return "medium";
  }

  if (isAnyUrgent) return "low";

  return "none";
}
