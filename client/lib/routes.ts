/**
 * CONSOLIDATED ROUTES SYSTEM
 * Implementing unified route mapping as suggested
 */

export const ROUTES = {
  // Core application routes
  processos: {
    list: '/processos',
    detail: '/processos/:id',
    create: '/processos/new',
    edit: '/processos/:id/edit'
  },
  
  clientes: {
    list: '/clientes',
    detail: '/clientes/:id',
    create: '/clientes/new',
    edit: '/clientes/:id/edit'
  },
  
  documentos: {
    list: '/documentos',
    detail: '/documentos/:id',
    create: '/documentos/new',
    upload: '/documentos/upload'
  },
  
  dashboard: {
    main: '/dashboard',
    analytics: '/dashboard/analytics',
    reports: '/dashboard/reports'
  },
  
  // CRM routes
  crm: {
    dashboard: '/crm',
    contacts: '/crm/contatos',
    deals: '/crm/deals',
    leads: '/crm/leads',
    reports: '/crm/relatorios'
  },
  
  // Administrative routes
  admin: {
    dashboard: '/admin',
    users: '/admin/usuarios',
    settings: '/admin/configuracoes',
    integrations: '/admin/integracoes'
  },
  
  // Financial routes
  financial: {
    dashboard: '/financeiro',
    invoices: '/financeiro/faturas',
    payments: '/financeiro/pagamentos',
    plans: '/financeiro/planos'
  },
  
  // Legal inbox routes
  inbox: {
    dashboard: '/inbox',
    publications: '/inbox/publicacoes',
    movements: '/inbox/movimentacoes'
  }
} as const;

// Route helpers
export function buildRoute(routeTemplate: string, params: Record<string, string | number>) {
  let route = routeTemplate;
  
  Object.entries(params).forEach(([key, value]) => {
    route = route.replace(`:${key}`, String(value));
  });
  
  return route;
}

// Navigation helpers
export function navigateToProcesso(id: string) {
  return buildRoute(ROUTES.processos.detail, { id });
}

export function navigateToCliente(id: string) {
  return buildRoute(ROUTES.clientes.detail, { id });
}

export function navigateToDocumento(id: string) {
  return buildRoute(ROUTES.documentos.detail, { id });
}

// Route validation
export function isValidRoute(path: string): boolean {
  const allRoutes = Object.values(ROUTES).flatMap(section => 
    typeof section === 'string' ? [section] : Object.values(section)
  );
  
  return allRoutes.some(route => {
    const routeRegex = new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+') + '$');
    return routeRegex.test(path);
  });
}

export default ROUTES;
