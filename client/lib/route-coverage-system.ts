import { useState, useEffect } from 'react';

export interface RouteTest {
  path: string;
  name: string;
  category: 'escritorio' | 'portal' | 'crm' | 'admin' | 'auth' | 'setup';
  userType: 'advogado' | 'cliente' | 'any';
  status: 'pending' | 'ok' | '404' | 'error' | 'timeout';
  renderTime: number;
  lastTested: string;
  deeplink: string;
  description: string;
  params?: Record<string, string>;
  queryParams?: Record<string, string>;
}

export interface RouteCoverageStats {
  total: number;
  ok: number;
  errors: number;
  timeout: number;
  coverage_percentage: number;
  avg_render_time: number;
  last_full_test: string;
}

export class RouteCoverageSystem {
  private routes: RouteTest[] = [];
  private baseUrl: string;
  private timeout: number = 5000;

  constructor() {
    this.baseUrl = window.location.origin;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Escritório (Lawyer) Routes
    const escritorioRoutes: Omit<RouteTest, 'status' | 'renderTime' | 'lastTested' | 'deeplink'>[] = [
      {
        path: '/',
        name: 'Dashboard Principal',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Dashboard principal do sistema',
        queryParams: { tab: 'overview' }
      },
      {
        path: '/processos',
        name: 'Lista de Processos',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Visualização de todos os processos'
      },
      {
        path: '/processos-v2',
        name: 'Processos V2',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Nova interface de processos'
      },
      {
        path: '/processos/0001234-56.2023.4.01.3456',
        name: 'Detalhes do Processo',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Visualização detalhada de processo específico',
        params: { numero_cnj: '0001234-56.2023.4.01.3456' }
      },
      {
        path: '/processos-v2/0001234-56.2023.4.01.3456',
        name: 'Detalhes do Processo V2',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Nova interface para detalhes do processo',
        params: { numero_cnj: '0001234-56.2023.4.01.3456' }
      },
      {
        path: '/clientes',
        name: 'Gestão de Clientes',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Gerenciamento de clientes do escritório'
      },
      {
        path: '/jornadas',
        name: 'Jornadas do Cliente',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Gestão de jornadas e workflows'
      },
      {
        path: '/jornadas/nova',
        name: 'Nova Jornada',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Criação de nova jornada'
      },
      {
        path: '/jornadas/iniciar',
        name: 'Iniciar Jornada',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Inicialização de jornada para cliente'
      },
      {
        path: '/jornadas/designer',
        name: 'Designer de Jornadas',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Interface de design de jornadas'
      },
      {
        path: '/inbox',
        name: 'Inbox Legal',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Caixa de entrada de documentos'
      },
      {
        path: '/inbox-v2',
        name: 'Inbox Legal V2',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Nova interface do inbox'
      },
      {
        path: '/agenda',
        name: 'Agenda',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Calendário e compromissos'
      },
      {
        path: '/documentos',
        name: 'Documentos',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Gestão de documentos'
      },
      {
        path: '/financeiro',
        name: 'Financeiro',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Gestão financeira'
      },
      {
        path: '/planos-pagamento',
        name: 'Planos de Pagamento',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Configuração de planos de pagamento'
      },
      {
        path: '/relatorios',
        name: 'Relatórios',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Relatórios gerenciais'
      },
      {
        path: '/helpdesk',
        name: 'Helpdesk',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Central de suporte'
      },
      {
        path: '/servicos',
        name: 'Serviços',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Catálogo de serviços'
      },
      {
        path: '/tickets',
        name: 'Tickets',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Sistema de tickets'
      }
    ];

    // CRM Routes
    const crmRoutes: Omit<RouteTest, 'status' | 'renderTime' | 'lastTested' | 'deeplink'>[] = [
      {
        path: '/crm/contatos',
        name: 'CRM - Contatos',
        category: 'crm',
        userType: 'advogado',
        description: 'Gestão de contatos no CRM'
      },
      {
        path: '/crm/contatos/123',
        name: 'CRM - Perfil do Contato',
        category: 'crm',
        userType: 'advogado',
        description: 'Perfil 360 de contato específico',
        params: { id: '123' }
      },
      {
        path: '/crm/leads',
        name: 'CRM - Leads',
        category: 'crm',
        userType: 'advogado',
        description: 'Gestão de leads e conversão'
      },
      {
        path: '/crm/deals',
        name: 'CRM - Negócios',
        category: 'crm',
        userType: 'advogado',
        description: 'Kanban de negócios'
      },
      {
        path: '/crm/relatorios',
        name: 'CRM - Relatórios',
        category: 'crm',
        userType: 'advogado',
        description: 'Relatórios do CRM'
      }
    ];

    // Portal do Cliente Routes
    const portalRoutes: Omit<RouteTest, 'status' | 'renderTime' | 'lastTested' | 'deeplink'>[] = [
      {
        path: '/portal/chat',
        name: 'Portal - Chat',
        category: 'portal',
        userType: 'cliente',
        description: 'Chat do cliente com o escritório'
      },
      {
        path: '/portal/jornada',
        name: 'Portal - Jornada',
        category: 'portal',
        userType: 'cliente',
        description: 'Acompanhamento da jornada do cliente'
      },
      {
        path: '/portal/processos',
        name: 'Portal - Processos',
        category: 'portal',
        userType: 'cliente',
        description: 'Visualização de processos do cliente'
      },
      {
        path: '/portal/compromissos',
        name: 'Portal - Compromissos',
        category: 'portal',
        userType: 'cliente',
        description: 'Agenda de compromissos do cliente'
      },
      {
        path: '/portal/financeiro',
        name: 'Portal - Financeiro',
        category: 'portal',
        userType: 'cliente',
        description: 'Situação financeira do cliente'
      },
      {
        path: '/portal/helpdesk',
        name: 'Portal - Suporte',
        category: 'portal',
        userType: 'cliente',
        description: 'Central de ajuda do cliente'
      },
      {
        path: '/portal/servicos',
        name: 'Portal - Serviços',
        category: 'portal',
        userType: 'cliente',
        description: 'Catálogo de serviços disponíveis'
      },
      {
        path: '/portal/cliente/inst123',
        name: 'Portal - Instância Específica',
        category: 'portal',
        userType: 'cliente',
        description: 'Acesso à instância específica do cliente',
        params: { instanceId: 'inst123' }
      }
    ];

    // Admin & Dev Routes
    const adminRoutes: Omit<RouteTest, 'status' | 'renderTime' | 'lastTested' | 'deeplink'>[] = [
      {
        path: '/branding',
        name: 'Configuração de Marca',
        category: 'admin',
        userType: 'advogado',
        description: 'Personalização da marca'
      },
      {
        path: '/qa',
        name: 'Console QA',
        category: 'admin',
        userType: 'advogado',
        description: 'Console de qualidade'
      },
      {
        path: '/status',
        name: 'Status do Sistema',
        category: 'admin',
        userType: 'advogado',
        description: 'Monitor de status'
      },
      {
        path: '/config/flags',
        name: 'Feature Flags',
        category: 'admin',
        userType: 'advogado',
        description: 'Configuração de flags'
      },
      {
        path: '/dev/tools',
        name: 'Ferramentas Dev',
        category: 'admin',
        userType: 'advogado',
        description: 'Ferramentas de desenvolvimento'
      },
      {
        path: '/dev/auditoria',
        name: 'Auditoria Dev',
        category: 'admin',
        userType: 'advogado',
        description: 'Sistema de auditoria'
      },
      {
        path: '/admin/integrity',
        name: 'Integridade Admin',
        category: 'admin',
        userType: 'advogado',
        description: 'Verificação de integridade'
      },
      {
        path: '/launch',
        name: 'Plano de Lançamento',
        category: 'admin',
        userType: 'advogado',
        description: 'Plano de lançamento'
      },
      {
        path: '/autofix-testing',
        name: 'Teste Autofix',
        category: 'admin',
        userType: 'advogado',
        description: 'Sistema de testes autofix'
      }
    ];

    // Stripe Integration Routes
    const stripeRoutes: Omit<RouteTest, 'status' | 'renderTime' | 'lastTested' | 'deeplink'>[] = [
      {
        path: '/settings/stripe',
        name: 'Configurações Stripe',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Configurações de pagamento Stripe'
      },
      {
        path: '/financeiro/stripe',
        name: 'Centro Stripe',
        category: 'escritorio',
        userType: 'advogado',
        description: 'Central de pagamentos Stripe'
      }
    ];

    // Auth & Setup Routes
    const authRoutes: Omit<RouteTest, 'status' | 'renderTime' | 'lastTested' | 'deeplink'>[] = [
      {
        path: '/login',
        name: 'Login',
        category: 'auth',
        userType: 'any',
        description: 'Página de login'
      },
      {
        path: '/forgot-password',
        name: 'Esqueci a Senha',
        category: 'auth',
        userType: 'any',
        description: 'Recuperação de senha'
      },
      {
        path: '/reset-password',
        name: 'Resetar Senha',
        category: 'auth',
        userType: 'any',
        description: 'Reset de senha'
      },
      {
        path: '/setup',
        name: 'Setup Inicial',
        category: 'setup',
        userType: 'any',
        description: 'Configuração inicial do sistema'
      },
      {
        path: '/quick-setup',
        name: 'Setup Rápido',
        category: 'setup',
        userType: 'any',
        description: 'Configuração rápida'
      }
    ];

    // Combine all routes and initialize
    const allRoutes = [
      ...escritorioRoutes,
      ...crmRoutes,
      ...portalRoutes,
      ...adminRoutes,
      ...stripeRoutes,
      ...authRoutes
    ];

    this.routes = allRoutes.map(route => ({
      ...route,
      status: 'pending' as const,
      renderTime: 0,
      lastTested: 'never',
      deeplink: this.generateDeeplink(route.path, route.params, route.queryParams)
    }));
  }

  private generateDeeplink(path: string, params?: Record<string, string>, queryParams?: Record<string, string>): string {
    let fullPath = path;
    
    // Add query parameters if they exist
    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams(queryParams);
      fullPath += `?${searchParams.toString()}`;
    }
    
    return `${this.baseUrl}${fullPath}`;
  }

  async testRoute(routeIndex: number): Promise<RouteTest> {
    const route = this.routes[routeIndex];
    if (!route) throw new Error('Route not found');

    const startTime = performance.now();
    
    try {
      route.status = 'pending';
      
      // Use fetch with timeout to test route
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(route.deeplink, {
        method: 'HEAD', // Use HEAD to avoid loading full content
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      const renderTime = performance.now() - startTime;
      
      if (response.ok) {
        route.status = 'ok';
        route.renderTime = renderTime;
      } else if (response.status === 404) {
        route.status = '404';
        route.renderTime = renderTime;
      } else {
        route.status = 'error';
        route.renderTime = renderTime;
      }
      
    } catch (error) {
      const renderTime = performance.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        route.status = 'timeout';
        route.renderTime = this.timeout;
      } else {
        route.status = 'error';
        route.renderTime = renderTime;
      }
    }
    
    route.lastTested = new Date().toISOString();
    this.routes[routeIndex] = route;
    
    return route;
  }

  async testAllRoutes(onProgress?: (route: RouteTest, index: number, total: number) => void): Promise<RouteTest[]> {
    const results: RouteTest[] = [];
    
    for (let i = 0; i < this.routes.length; i++) {
      const result = await this.testRoute(i);
      results.push(result);
      
      if (onProgress) {
        onProgress(result, i + 1, this.routes.length);
      }
      
      // Small delay between requests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  async testRoutesByCategory(category: RouteTest['category'], onProgress?: (route: RouteTest, index: number, total: number) => void): Promise<RouteTest[]> {
    const categoryRoutes = this.routes
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => route.category === category);
    
    const results: RouteTest[] = [];
    
    for (let i = 0; i < categoryRoutes.length; i++) {
      const { index } = categoryRoutes[i];
      const result = await this.testRoute(index);
      results.push(result);
      
      if (onProgress) {
        onProgress(result, i + 1, categoryRoutes.length);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  getRoutes(): RouteTest[] {
    return [...this.routes];
  }

  getRoutesByCategory(category: RouteTest['category']): RouteTest[] {
    return this.routes.filter(route => route.category === category);
  }

  getStats(): RouteCoverageStats {
    const total = this.routes.length;
    const tested = this.routes.filter(route => route.status !== 'pending');
    const ok = this.routes.filter(route => route.status === 'ok');
    const errors = this.routes.filter(route => ['404', 'error', 'timeout'].includes(route.status));
    
    const testedRenderTimes = tested
      .map(route => route.renderTime)
      .filter(time => time > 0);
    
    const avgRenderTime = testedRenderTimes.length > 0 
      ? testedRenderTimes.reduce((sum, time) => sum + time, 0) / testedRenderTimes.length 
      : 0;
    
    const lastTestedTimes = tested
      .map(route => route.lastTested)
      .filter(time => time !== 'never')
      .sort()
      .reverse();
    
    return {
      total,
      ok: ok.length,
      errors: errors.length,
      timeout: this.routes.filter(route => route.status === 'timeout').length,
      coverage_percentage: total > 0 ? Math.round((tested.length / total) * 100) : 0,
      avg_render_time: Math.round(avgRenderTime),
      last_full_test: lastTestedTimes[0] || 'never'
    };
  }

  openRoute(routeIndex: number): void {
    const route = this.routes[routeIndex];
    if (route) {
      window.open(route.deeplink, '_blank');
    }
  }

  copyDeeplink(routeIndex: number): void {
    const route = this.routes[routeIndex];
    if (route) {
      navigator.clipboard.writeText(route.deeplink);
    }
  }

  resetTestResults(): void {
    this.routes.forEach(route => {
      route.status = 'pending';
      route.renderTime = 0;
      route.lastTested = 'never';
    });
  }
}

export const routeCoverageSystem = new RouteCoverageSystem();
