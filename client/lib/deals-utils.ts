/**
 * Deals Management Utilities - Flow C9
 * Utilities for managing sales pipeline, deals, and stages
 */

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  expected_close_date: string;
  created_at: string;
  updated_at: string;
  stage_id: string;
  pipeline_id: string;
  contact_id?: string;
  company_id?: string;
  owner_id: string;
  tags: string[];
  notes: string;
  status: "open" | "won" | "lost";
  lost_reason?: string;
  won_at?: string;
  lost_at?: string;
  custom_fields: Record<string, any>;
  activities_count: number;
  last_activity_at?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  probability: number;
  pipeline_id: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealFilters {
  search?: string;
  stage_id?: string;
  pipeline_id?: string;
  owner_id?: string;
  status?: string;
  value_min?: number;
  value_max?: number;
  expected_close_from?: string;
  expected_close_to?: string;
  tags?: string[];
}

export interface DealStats {
  total_value: number;
  total_deals: number;
  won_value: number;
  won_deals: number;
  conversion_rate: number;
  avg_deal_value: number;
  stage_breakdown: Record<string, { count: number; value: number }>;
}

/**
 * Calculate deal statistics for a set of deals
 */
export function calculateDealStats(deals: Deal[]): DealStats {
  const stats: DealStats = {
    total_value: 0,
    total_deals: deals.length,
    won_value: 0,
    won_deals: 0,
    conversion_rate: 0,
    avg_deal_value: 0,
    stage_breakdown: {},
  };

  deals.forEach((deal) => {
    stats.total_value += deal.value;

    if (deal.status === "won") {
      stats.won_value += deal.value;
      stats.won_deals++;
    }

    // Stage breakdown
    if (!stats.stage_breakdown[deal.stage_id]) {
      stats.stage_breakdown[deal.stage_id] = { count: 0, value: 0 };
    }
    stats.stage_breakdown[deal.stage_id].count++;
    stats.stage_breakdown[deal.stage_id].value += deal.value;
  });

  stats.conversion_rate =
    stats.total_deals > 0 ? (stats.won_deals / stats.total_deals) * 100 : 0;
  stats.avg_deal_value =
    stats.total_deals > 0 ? stats.total_value / stats.total_deals : 0;

  return stats;
}

/**
 * Sort deals by different criteria
 */
export function sortDeals(
  deals: Deal[],
  sortBy: string,
  sortOrder: "asc" | "desc" = "desc",
): Deal[] {
  const sorted = [...deals].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case "value":
        aValue = a.value;
        bValue = b.value;
        break;
      case "probability":
        aValue = a.probability;
        bValue = b.probability;
        break;
      case "expected_close_date":
        aValue = new Date(a.expected_close_date);
        bValue = new Date(b.expected_close_date);
        break;
      case "created_at":
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case "updated_at":
        aValue = new Date(a.updated_at);
        bValue = new Date(b.updated_at);
        break;
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
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

  return sorted;
}

/**
 * Filter deals based on various criteria
 */
export function filterDeals(deals: Deal[], filters: DealFilters): Deal[] {
  return deals.filter((deal) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        deal.title.toLowerCase().includes(searchLower) ||
        deal.notes.toLowerCase().includes(searchLower) ||
        deal.tags.some((tag) => tag.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Stage filter
    if (filters.stage_id && deal.stage_id !== filters.stage_id) {
      return false;
    }

    // Pipeline filter
    if (filters.pipeline_id && deal.pipeline_id !== filters.pipeline_id) {
      return false;
    }

    // Owner filter
    if (filters.owner_id && deal.owner_id !== filters.owner_id) {
      return false;
    }

    // Status filter
    if (filters.status && deal.status !== filters.status) {
      return false;
    }

    // Value range filter
    if (filters.value_min !== undefined && deal.value < filters.value_min) {
      return false;
    }
    if (filters.value_max !== undefined && deal.value > filters.value_max) {
      return false;
    }

    // Expected close date range
    if (filters.expected_close_from) {
      const dealDate = new Date(deal.expected_close_date);
      const fromDate = new Date(filters.expected_close_from);
      if (dealDate < fromDate) return false;
    }
    if (filters.expected_close_to) {
      const dealDate = new Date(deal.expected_close_date);
      const toDate = new Date(filters.expected_close_to);
      if (dealDate > toDate) return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) =>
        deal.tags.includes(tag),
      );
      if (!hasMatchingTag) return false;
    }

    return true;
  });
}

/**
 * Group deals by stage for Kanban view
 */
export function groupDealsByStage(
  deals: Deal[],
  stages: PipelineStage[],
): Record<string, Deal[]> {
  const grouped: Record<string, Deal[]> = {};

  // Initialize with empty arrays for all stages
  stages.forEach((stage) => {
    grouped[stage.id] = [];
  });

  // Group deals by stage
  deals.forEach((deal) => {
    if (grouped[deal.stage_id]) {
      grouped[deal.stage_id].push(deal);
    }
  });

  return grouped;
}

/**
 * Format currency value
 */
export function formatCurrency(
  value: number,
  currency: string = "BRL",
): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
  }).format(value);
}

/**
 * Format probability as percentage
 */
export function formatProbability(probability: number): string {
  return `${Math.round(probability)}%`;
}

/**
 * Get deal status color
 */
export function getDealStatusColor(status: string): string {
  switch (status) {
    case "won":
      return "text-green-600 bg-green-100";
    case "lost":
      return "text-red-600 bg-red-100";
    case "open":
      return "text-blue-600 bg-blue-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

/**
 * Get stage color or default
 */
export function getStageColor(stage: PipelineStage): string {
  return stage.color || "#3B82F6";
}

/**
 * Calculate weighted pipeline value
 */
export function calculateWeightedValue(deal: Deal): number {
  return deal.value * (deal.probability / 100);
}

/**
 * Format relative time (e.g., "2 days ago")
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
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
  }

  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 ano atrás" : `${years} anos atrás`;
}

/**
 * Check if deal is overdue
 */
export function isDealOverdue(deal: Deal): boolean {
  const now = new Date();
  const expectedClose = new Date(deal.expected_close_date);
  return deal.status === "open" && expectedClose < now;
}

/**
 * Get days until expected close
 */
export function getDaysUntilClose(deal: Deal): number {
  const now = new Date();
  const expectedClose = new Date(deal.expected_close_date);
  const diffMs = expectedClose.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
