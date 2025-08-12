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
    color: 'bg-brand-700',
  },
  {
    id: 'processos',
    title: 'Processos',
    description: 'Gestão completa de processos jurídicos',
    href: '/processos',
    icon: FileText,
    color: 'bg-brand-700',
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Base de clientes e relacionamento',
    href: '/clientes',
    icon: Users,
    color: 'bg-purple-500',
  },
  {
    id: 'jornadas',
    title: 'Jornadas',
    description: 'Jornadas do cliente e automação',
    href: '/jornadas',
    icon: Target,
    color: 'bg-orange-500',
  },
  {
    id: 'inbox',
    title: 'Inbox Legal',
    description: 'Triagem de publicações e movimentações',
    href: '/inbox',
    icon: Inbox,
    color: 'bg-red-500',
  },
  {
    id: 'agenda',
    title: 'Agenda',
    description: 'Compromissos, prazos e eventos',
    href: '/agenda',
    icon: Calendar,
    color: 'bg-green-500',
  },
  {
    id: 'documentos',
    title: 'Documentos',
    description: 'Biblioteca e gestão de documentos',
    href: '/documentos',
    icon: FolderOpen,
    color: 'bg-yellow-500',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Gestão financeira e faturamento',
    href: '/financeiro',
    icon: DollarSign,
    color: 'bg-emerald-500',
  },
  {
    id: 'planos-pagamento',
    title: 'Planos de Pagamento',
    description: 'Gestão de planos de pagamento',
    href: '/planos-pagamento',
    icon: DollarSign,
    color: 'bg-green-600',
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Análises e relatórios gerenciais',
    href: '/relatorios',
    icon: BarChart3,
    color: 'bg-indigo-500',
  },
  {
    id: 'helpdesk',
    title: 'Helpdesk',
    description: 'Suporte e atendimento ao cliente',
    href: '/helpdesk',
    icon: HeadphonesIcon,
    color: 'bg-pink-500',
  },
  {
    id: 'servicos',
    title: 'Serviços',
    description: 'Catálogo e gestão de serviços',
    href: '/servicos',
    icon: ShoppingBag,
    color: 'bg-cyan-500',
  },
];

const clienteApps = [
  {
    id: 'chat',
    title: 'Chat',
    description: 'Converse com seu advogado',
    href: '/portal/chat',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    id: 'jornada',
    title: 'Jornada',
    description: 'Acompanhe o progresso do seu caso',
    href: '/portal/jornada',
    icon: Target,
    color: 'bg-orange-500',
  },
  {
    id: 'processos',
    title: 'Meus Processos',
    description: 'Visualize seus processos ativos',
    href: '/portal/processos',
    icon: FileText,
    color: 'bg-brand-600',
  },
  {
    id: 'compromissos',
    title: 'Compromissos',
    description: 'Seus agendamentos e prazos',
    href: '/portal/compromissos',
    icon: CalendarCheck,
    color: 'bg-green-500',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Faturas e histórico de pagamentos',
    href: '/portal/financeiro',
    icon: Receipt,
    color: 'bg-emerald-500',
  },
  {
    id: 'helpdesk',
    title: 'Helpdesk',
    description: 'Central de ajuda e suporte',
    href: '/portal/helpdesk',
    icon: HeadphonesIcon,
    color: 'bg-pink-500',
  },
  {
    id: 'servicos',
    title: 'Serviços',
    description: 'Contratar novos serviços jurídicos',
    href: '/portal/servicos',
    icon: ShoppingBag,
    color: 'bg-cyan-500',
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

          {/* Apps Grid */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {apps.map((app) => {
                const Icon = app.icon;
                return (
                  <Link
                    key={app.id}
                    to={app.href}
                    onClick={onClose}
                    className="group p-4 rounded-lg border border-border hover:border-brand-200 hover:shadow-soft transition-all duration-200 bg-white hover:bg-brand-50/50"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Icon */}
                      <div className={cn(
                        'flex items-center justify-center w-12 h-12 rounded-lg text-white transition-transform group-hover:scale-105',
                        app.color
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <h3 className="font-medium text-sm text-neutral-900 group-hover:text-brand-700">
                          {app.title}
                        </h3>
                        <p className="text-xs text-neutral-600 text-ellipsis-2 leading-relaxed">
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
