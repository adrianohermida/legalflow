/**
 * Unified Route Configuration - Route Consolidation
 * Single source of truth for all application routes
 */

export const ROUTES = {
  // Core application routes
  dashboard: "/",

  // Process management
  processos: {
    list: "/processos",
    detail: "/processos/:cnj",
    create: "/processos/new",
    overview: "/processos/:cnj/overview",
  },

  // Client management
  clientes: {
    list: "/clientes",
    detail: "/clientes/:id",
    create: "/clientes/new",
  },

  // Inbox and publications
  inbox: {
    main: "/inbox",
    publications: "/inbox/publications",
    movements: "/inbox/movements",
  },

  // Calendar and agenda
  agenda: {
    main: "/agenda",
    create: "/agenda/new",
    event: "/agenda/:id",
  },

  // Journey management
  jornadas: {
    list: "/jornadas",
    designer: "/jornadas/designer",
    new: "/jornadas/new",
    start: "/jornadas/start",
    instance: "/jornadas/:id",
  },

  // Document management
  documentos: {
    main: "/documentos",
    view: "/documentos/:id",
    upload: "/documentos/upload",
  },

  // CRM modules
  crm: {
    contatos: {
      list: "/crm/contatos",
      detail: "/crm/contatos/:id",
      create: "/crm/contatos/new",
    },
    leads: "/crm/leads",
    deals: "/crm/deals",
    relatorios: "/crm/relatorios",
  },

  // Ticketing system
  tickets: {
    list: "/tickets",
    detail: "/tickets/:id",
    create: "/tickets/new",
  },

  // Activities and tasks
  activities: {
    list: "/activities",
    detail: "/activities/:id",
    create: "/activities/new",
  },

  // Deals management
  deals: {
    list: "/deals",
    detail: "/deals/:id",
    create: "/deals/new",
  },

  // Financial management
  financeiro: {
    main: "/financeiro",
    stripe: "/financeiro/stripe",
    planos: "/financeiro/planos",
  },

  // Support and help
  helpdesk: "/helpdesk",
  servicos: "/servicos",

  // Reports
  relatorios: "/relatorios",

  // Client portal
  portal: {
    dashboard: "/portal",
    chat: "/portal/chat",
    jornada: "/portal/jornada",
    processos: "/portal/processos",
    compromissos: "/portal/compromissos",
    financeiro: "/portal/financeiro",
    helpdesk: "/portal/helpdesk",
    servicos: "/portal/servicos",
    cliente: "/portal/cliente/:instanceId",
  },

  // Admin and development
  admin: {
    integrity: "/admin/integrity",
    branding: "/admin/branding",
    auditoria: "/admin/auditoria",
    flags: "/admin/flags",
  },

  // Development tools
  dev: {
    tools: "/dev/tools",
    qa: "/dev/qa",
    status: "/dev/status",
    launch: "/dev/launch",
    auditLog: "/dev/audit-log",
  },

  // Authentication
  auth: {
    login: "/login",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    setup: "/setup",
    quickSetup: "/quick-setup",
  },

  // Settings
  settings: {
    stripe: "/settings/stripe",
  },
} as const;

/**
 * Legacy route redirects for backward compatibility
 * Maps old routes to new unified routes
 */
export const LEGACY_REDIRECTS = {
  // Process routes
  "/processos-v2": ROUTES.processos.list,
  "/processos-v2/:cnj": ROUTES.processos.detail,
  "/processos-overview": ROUTES.processos.list,
  "/processo-detail/:cnj": ROUTES.processos.detail,
  "/processo-overview/:cnj": ROUTES.processos.overview,

  // Inbox routes
  "/inbox-v2": ROUTES.inbox.main,
  "/inbox-sf4": ROUTES.inbox.main,
  "/inbox-c4": ROUTES.inbox.main,
  "/inbox-legal": ROUTES.inbox.main,
  "/inbox-legal-v2": ROUTES.inbox.main,
  "/inbox-legal-sf4": ROUTES.inbox.main,
  "/inbox-legal-c4": ROUTES.inbox.main,

  // Journey routes
  "/jornadas-d1": ROUTES.jornadas.list,
  "/journey-designer": ROUTES.jornadas.designer,
  "/jornadas/nova": ROUTES.jornadas.new,
  "/jornadas/iniciar": ROUTES.jornadas.start,

  // Document routes
  "/documentos-c6": ROUTES.documentos.main,

  // Calendar routes
  "/agenda-c5": ROUTES.agenda.main,
  "/agenda-basic": ROUTES.agenda.main,

  // Activity routes
  "/activities-c8": ROUTES.activities.list,

  // Ticket routes
  "/tickets-c7": ROUTES.tickets.list,

  // Deal routes
  "/deals-c9": ROUTES.deals.list,

  // Admin routes
  "/dev/auditoria": ROUTES.admin.auditoria,
  "/dev-auditoria": ROUTES.admin.auditoria,
  "/audit-log": ROUTES.dev.auditLog,
  "/config/flags": ROUTES.admin.flags,
  "/admin-integrity": ROUTES.admin.integrity,

  // Financial routes
  "/planos-pagamento": ROUTES.financeiro.planos,
} as const;

/**
 * Generate URL with parameters
 */
export function generateUrl(
  route: string,
  params?: Record<string, string>,
): string {
  let url = route;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }

  return url;
}

/**
 * Get route parameters from URL
 */
export function getRouteParams(
  route: string,
  actualPath: string,
): Record<string, string> {
  const routeParts = route.split("/");
  const pathParts = actualPath.split("/");
  const params: Record<string, string> = {};

  routeParts.forEach((part, index) => {
    if (part.startsWith(":")) {
      const paramName = part.slice(1);
      params[paramName] = pathParts[index] || "";
    }
  });

  return params;
}

/**
 * Check if route matches pattern
 */
export function matchRoute(pattern: string, path: string): boolean {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every((part, index) => {
    return part.startsWith(":") || part === pathParts[index];
  });
}

/**
 * Navigation helper type
 */
export type NavigationItem = {
  id: string;
  title: string;
  href: string;
  icon?: React.ComponentType<any>;
  description?: string;
  isVisible?: boolean;
  isDefault?: boolean;
  children?: NavigationItem[];
};

/**
 * Generate breadcrumb from route
 */
export function generateBreadcrumb(
  path: string,
): Array<{ label: string; href: string }> {
  const parts = path.split("/").filter(Boolean);
  const breadcrumb: Array<{ label: string; href: string }> = [
    { label: "Dashboard", href: ROUTES.dashboard },
  ];

  let currentPath = "";
  parts.forEach((part, index) => {
    currentPath += `/${part}`;

    // Generate label from route part
    let label = part.charAt(0).toUpperCase() + part.slice(1);

    // Custom labels for known routes
    const customLabels: Record<string, string> = {
      processos: "Processos",
      clientes: "Clientes",
      agenda: "Agenda",
      jornadas: "Jornadas",
      documentos: "Documentos",
      inbox: "Inbox Legal",
      tickets: "Tickets",
      activities: "Atividades",
      deals: "Deals",
      financeiro: "Financeiro",
      crm: "CRM",
      portal: "Portal",
      admin: "Admin",
      dev: "Desenvolvimento",
    };

    if (customLabels[part]) {
      label = customLabels[part];
    }

    breadcrumb.push({ label, href: currentPath });
  });

  return breadcrumb;
}
