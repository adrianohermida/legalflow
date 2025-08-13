import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Target,
  Inbox,
  Calendar,
  FolderOpen,
  DollarSign,
  BarChart3,
  HeadphonesIcon,
  ShoppingBag,
  MessageSquare,
  CalendarCheck,
  Receipt,
} from 'lucide-react';

interface AppLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'advogado' | 'cliente';
}

const advogadoApps = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Visão geral do escritório e métricas',
    href: '/',
    icon: LayoutDashboard,
    color: 'primary',
  },
  {
    id: 'processos',
    title: 'Processos',
    description: 'Gestão completa de processos jurídicos',
    href: '/processos',
    icon: FileText,
    color: 'primary',
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Base de clientes e relacionamento',
    href: '/clientes',
    icon: Users,
    color: 'primary',
  },
  {
    id: 'jornadas',
    title: 'Jornadas',
    description: 'Jornadas do cliente e automação',
    href: '/jornadas',
    icon: Target,
    color: 'primary',
  },
  {
    id: 'inbox',
    title: 'Inbox Legal',
    description: 'Triagem de publicações e movimentações',
    href: '/inbox',
    icon: Inbox,
    color: 'bg-danger',
  },
  {
    id: 'agenda',
    title: 'Agenda',
    description: 'Compromissos, prazos e eventos',
    href: '/agenda',
    icon: Calendar,
    color: 'bg-success',
  },
  {
    id: 'documentos',
    title: 'Documentos',
    description: 'Biblioteca e gestão de documentos',
    href: '/documentos',
    icon: FolderOpen,
    color: 'primary',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Gestão financeira e faturamento',
    href: '/financeiro',
    icon: DollarSign,
    color: 'bg-success',
  },
  {
    id: 'planos-pagamento',
    title: 'Planos de Pagamento',
    description: 'Gestão de planos de pagamento',
    href: '/planos-pagamento',
    icon: DollarSign,
    color: 'bg-success',
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Análises e relatórios gerenciais',
    href: '/relatorios',
    icon: BarChart3,
    color: 'primary',
  },
  {
    id: 'helpdesk',
    title: 'Helpdesk',
    description: 'Suporte e atendimento ao cliente',
    href: '/helpdesk',
    icon: HeadphonesIcon,
    color: 'primary',
  },
  {
    id: 'servicos',
    title: 'Serviços',
    description: 'Catálogo e gestão de serviços',
    href: '/servicos',
    icon: ShoppingBag,
    color: 'primary',
  },
];

const clienteApps = [
  {
    id: 'chat',
    title: 'Chat',
    description: 'Converse com seu advogado',
    href: '/portal/chat',
    icon: MessageSquare,
    color: 'primary',
  },
  {
    id: 'jornada',
    title: 'Jornada',
    description: 'Acompanhe o progresso do seu caso',
    href: '/portal/jornada',
    icon: Target,
    color: 'primary',
  },
  {
    id: 'processos',
    title: 'Meus Processos',
    description: 'Visualize seus processos ativos',
    href: '/portal/processos',
    icon: FileText,
    color: 'primary',
  },
  {
    id: 'compromissos',
    title: 'Compromissos',
    description: 'Seus agendamentos e prazos',
    href: '/portal/compromissos',
    icon: CalendarCheck,
    color: 'bg-success',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Faturas e histórico de pagamentos',
    href: '/portal/financeiro',
    icon: Receipt,
    color: 'bg-success',
  },
  {
    id: 'helpdesk',
    title: 'Helpdesk',
    description: 'Central de ajuda e suporte',
    href: '/portal/helpdesk',
    icon: HeadphonesIcon,
    color: 'primary',
  },
  {
    id: 'servicos',
    title: 'Serviços',
    description: 'Contratar novos serviços jurídicos',
    href: '/portal/servicos',
    icon: ShoppingBag,
    color: 'primary',
  },
];

export function AppLauncher({ isOpen, onClose, userType }: AppLauncherProps) {
  const apps = userType === 'advogado' ? advogadoApps : clienteApps;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-strong max-w-4xl w-full max-h-[80vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-heading font-semibold text-neutral-900">
                {userType === 'advogado' ? 'Módulos do Escrit��rio' : 'Portal do Cliente'}
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Acesse rapidamente todos os módulos disponíveis
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* F1.1 - Apps Grid - Mosaico 3×N */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-3 gap-4">
              {apps.map((app) => {
                const Icon = app.icon;
                return (
                  <Link
                    key={app.id}
                    to={app.href}
                    onClick={onClose}
                    className="group p-4 border transition-all duration-200 bg-white"
                    style={{
                      borderRadius: 'var(--radius)',
                      borderColor: 'var(--border)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand-700)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 82, 69, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg text-white"
                           style={{
                             backgroundColor: app.color === 'primary' ? 'var(--brand-700)' :
                                             app.color === 'bg-success' ? 'var(--success)' :
                                             app.color === 'bg-danger' ? 'var(--danger)' : 'var(--brand-700)',
                             borderRadius: 'calc(var(--radius) - 2px)'
                           }}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm transition-colors"
                            style={{ color: 'var(--on-surface)' }}>
                          {app.title}
                        </h3>
                        <p className="text-xs leading-relaxed line-clamp-2"
                           style={{ color: 'var(--muted)' }}>
                          {app.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-border">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Pressione ESC para fechar</span>
              <span>
                {userType === 'advogado' ? 'Hermida Maia Advocacia' : 'Portal do Cliente'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
