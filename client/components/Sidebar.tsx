import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
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
  Scale,
  MessageSquare,
  UserCheck,
  CalendarCheck,
  Receipt,
  Ticket,
} from "lucide-react";

interface SidebarProps {
  userType: "advogado" | "cliente";
}

// Apps principais aprovados para sidebar
const advogadoNavItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Visão geral do escritório",
  },
  {
    title: "Processos",
    href: "/processos-v2",
    icon: FileText,
    description: "Gestão de processos",
  },
  {
    title: "Clientes",
    href: "/clientes",
    icon: Users,
    description: "Base de clientes",
  },
  {
    title: "Inbox Legal",
    href: "/inbox-v2",
    icon: Inbox,
    description: "Triagem de publicações",
  },
  {
    title: "Agenda",
    href: "/agenda",
    icon: Calendar,
    description: "Compromissos e prazos",
  },
];

const clienteNavItems = [
  {
    title: "Chat",
    href: "/portal/chat",
    icon: MessageSquare,
    description: "Fale com seu advogado",
  },
  {
    title: "Jornada",
    href: "/portal/jornada",
    icon: Target,
    description: "Acompanhe seu processo",
  },
  {
    title: "Meus Processos",
    href: "/portal/processos",
    icon: FileText,
    description: "Seus processos ativos",
  },
  {
    title: "Compromissos",
    href: "/portal/compromissos",
    icon: CalendarCheck,
    description: "Agenda e prazos",
  },
  {
    title: "Financeiro",
    href: "/portal/financeiro",
    icon: Receipt,
    description: "Faturas e pagamentos",
  },
  {
    title: "Helpdesk",
    href: "/portal/helpdesk",
    icon: HeadphonesIcon,
    description: "Central de ajuda",
  },
  {
    title: "Serviços",
    href: "/portal/servicos",
    icon: ShoppingBag,
    description: "Contratar serviços",
  },
];

export function Sidebar({ userType }: SidebarProps) {
  const location = useLocation();
  const navItems = userType === "advogado" ? advogadoNavItems : clienteNavItems;

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <div className="app-sidebar">
      {/* Logo - F1.0 Branding */}
      <div
        className="flex items-center justify-center h-16 border-b border-gray-200"
        style={{ backgroundColor: "var(--brand-700)" }}
      >
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg">
            <Scale className="w-5 h-5" style={{ color: "var(--brand-700)" }} />
          </div>
          <div className="text-white">
            <div className="text-lg font-semibold leading-none">
              Hermida Maia
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--brand-100)" }}
            >
              Advocacia
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        role="navigation"
        aria-label="Menu principal"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-out",
                active
                  ? "text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              )}
              style={active ? { backgroundColor: "var(--brand-700)" } : {}}
              title={item.description}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 w-5 h-5 mr-3",
                  active
                    ? "text-white"
                    : "text-neutral-400 group-hover:text-neutral-600",
                )}
              />
              <span className="truncate">{item.title}</span>

              {/* Active indicator */}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - User Type Indicator */}
      <div className="px-3 py-4 border-t border-neutral-200">
        <div className="flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-800">
          <UserCheck className="w-4 h-4 mr-2" />
          {userType === "advogado" ? "Área do Advogado" : "Portal do Cliente"}
        </div>
      </div>
    </div>
  );
}
