/**
 * App Launcher Mosaic - Flow B1
 * Launcher "Apps" abre overlay com cards 3×N dos módulos
 * Preview de módulos permite adicionar e remover páginas do sidebar
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "../hooks/use-toast";
import {
  X,
  Plus,
  Minus,
  Star,
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
  Ticket,
  Settings,
  CreditCard,
  Globe,
  Database,
  TestTube,
  Zap,
  Activity,
} from "lucide-react";

interface AppLauncherMosaicProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "advogado" | "cliente";
  onUpdateSidebar?: (updatedItems: any[]) => void; // Callback para atualizar sidebar
}

interface AppModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
  category: string;
  inSidebar: boolean;
  isDefault: boolean; // Não podem ser removidos do sidebar
  isNew?: boolean;
  isBeta?: boolean;
}

// Todos os módulos disponíveis
const allAdvogadoModules: AppModule[] = [
  // Módulos principais (padrão no sidebar)
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral do escritório",
    href: "/",
    icon: LayoutDashboard,
    color: "bg-blue-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "processos",
    title: "Processos",
    description: "Gestão de processos",
    href: "/processos-v2",
    icon: FileText,
    color: "bg-green-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "Base de clientes",
    href: "/clientes",
    icon: Users,
    color: "bg-purple-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "agenda",
    title: "Agenda",
    description: "Compromissos e prazos",
    href: "/agenda",
    icon: Calendar,
    color: "bg-red-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "jornadas",
    title: "Jornadas",
    description: "Jornadas do cliente",
    href: "/jornadas",
    icon: Target,
    color: "bg-orange-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "inbox-legal",
    title: "Inbox Legal",
    description: "Triagem de publicações",
    href: "/inbox-v2",
    icon: Inbox,
    color: "bg-cyan-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "documentos",
    title: "Documentos",
    description: "Gestão de documentos",
    href: "/documentos",
    icon: FolderOpen,
    color: "bg-yellow-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Controle financeiro",
    href: "/financeiro",
    icon: DollarSign,
    color: "bg-emerald-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "relatorios",
    title: "Relatórios",
    description: "Relatórios e análises",
    href: "/relatorios",
    icon: BarChart3,
    color: "bg-indigo-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "helpdesk",
    title: "Helpdesk",
    description: "Central de ajuda",
    href: "/helpdesk",
    icon: HeadphonesIcon,
    color: "bg-pink-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Gestão de serviços",
    href: "/servicos",
    icon: ShoppingBag,
    color: "bg-violet-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },

  // Módulos adicionais (não estão no sidebar por padrão)
  {
    id: "tickets",
    title: "Tickets",
    description: "Sistema de tickets",
    href: "/tickets",
    icon: Ticket,
    color: "bg-slate-500",
    category: "Gestão",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "crm-contatos",
    title: "CRM Contatos",
    description: "Gestão avançada de contatos",
    href: "/crm/contatos",
    icon: Users,
    color: "bg-teal-500",
    category: "CRM",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "crm-deals",
    title: "CRM Deals",
    description: "Pipeline de negócios",
    href: "/crm/deals",
    icon: Target,
    color: "bg-amber-500",
    category: "CRM",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "stripe-config",
    title: "Stripe Config",
    description: "Configuração de pagamentos",
    href: "/settings/stripe",
    icon: CreditCard,
    color: "bg-blue-600",
    category: "Integração",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "auditoria",
    title: "Auditoria",
    description: "Sistema de auditoria e autofix",
    href: "/dev/auditoria",
    icon: TestTube,
    color: "bg-gray-600",
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isBeta: true,
  },
  {
    id: "activities",
    title: "Activities",
    description: "Atividades e tasks",
    href: "/activities",
    icon: Activity,
    color: "bg-lime-500",
    category: "Produtividade",
    inSidebar: false,
    isDefault: false,
    isNew: true,
  },
];

const allClienteModules: AppModule[] = [
  {
    id: "chat",
    title: "Chat",
    description: "Fale com seu advogado",
    href: "/portal/chat",
    icon: MessageSquare,
    color: "bg-blue-500",
    category: "Comunicação",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "jornada",
    title: "Jornada",
    description: "Acompanhe seu processo",
    href: "/portal/jornada",
    icon: Target,
    color: "bg-green-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "processos",
    title: "Meus Processos",
    description: "Seus processos ativos",
    href: "/portal/processos",
    icon: FileText,
    color: "bg-purple-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "compromissos",
    title: "Compromissos",
    description: "Agenda e prazos",
    href: "/portal/compromissos",
    icon: CalendarCheck,
    color: "bg-red-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Faturas e pagamentos",
    href: "/portal/financeiro",
    icon: Receipt,
    color: "bg-emerald-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "helpdesk",
    title: "Helpdesk",
    description: "Central de ajuda",
    href: "/portal/helpdesk",
    icon: HeadphonesIcon,
    color: "bg-orange-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Contratar serviços",
    href: "/portal/servicos",
    icon: ShoppingBag,
    color: "bg-violet-500",
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
];

export function AppLauncherMosaic({
  isOpen,
  onClose,
  userType,
  onUpdateSidebar,
}: AppLauncherMosaicProps) {
  const [modules, setModules] = useState<AppModule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Principal");
  const { toast } = useToast();

  useEffect(() => {
    // Carregar configuração salva do localStorage
    const storageKey = `app-launcher-${userType}`;
    const savedConfig = localStorage.getItem(storageKey);
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setModules(parsed);
      } catch (error) {
        console.error("Erro ao carregar configuração do launcher:", error);
        setModules(userType === "advogado" ? allAdvogadoModules : allClienteModules);
      }
    } else {
      setModules(userType === "advogado" ? allAdvogadoModules : allClienteModules);
    }
  }, [userType]);

  // Salvar configuração
  const saveConfig = (updatedModules: AppModule[]) => {
    const storageKey = `app-launcher-${userType}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedModules));
    setModules(updatedModules);
  };

  // Toggle módulo no sidebar
  const toggleModuleInSidebar = (moduleId: string) => {
    const updatedModules = modules.map(module => {
      if (module.id === moduleId && !module.isDefault) {
        return { ...module, inSidebar: !module.inSidebar };
      }
      return module;
    });

    saveConfig(updatedModules);

    // Notificar componente pai para atualizar sidebar
    if (onUpdateSidebar) {
      const sidebarItems = updatedModules
        .filter(module => module.inSidebar)
        .map(module => ({
          id: module.id,
          title: module.title,
          href: module.href,
          icon: module.icon,
          description: module.description,
          isVisible: true,
          isDefault: module.isDefault,
        }));
      onUpdateSidebar(sidebarItems);
    }

    const module = updatedModules.find(m => m.id === moduleId);
    if (module) {
      toast({
        title: module.inSidebar ? "Adicionado ao Sidebar" : "Removido do Sidebar",
        description: `${module.title} foi ${module.inSidebar ? "adicionado ao" : "removido do"} menu lateral.`,
      });
    }
  };

  // Filtrar módulos por categoria
  const categories = [...new Set(modules.map(module => module.category))];
  const filteredModules = modules.filter(module => module.category === selectedCategory);

  // Organizar em grade 3×N
  const moduleRows = [];
  for (let i = 0; i < filteredModules.length; i += 3) {
    moduleRows.push(filteredModules.slice(i, i + 3));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-brand-700 to-brand-900">
          <div>
            <h2 className="text-2xl font-bold text-white">Módulos do Sistema</h2>
            <p className="text-brand-100">
              {userType === "advogado" ? "Escritório de Advocacia" : "Portal do Cliente"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b bg-gray-50 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === category
                  ? "border-b-2 border-brand-700 text-brand-700 bg-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Module Grid */}
        <div className="p-6 overflow-y-auto max-h-96">
          {moduleRows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-3 gap-4 mb-4">
              {row.map((module) => {
                const Icon = module.icon;
                
                return (
                  <div
                    key={module.id}
                    className="relative group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 bg-white hover:bg-gray-50"
                  >
                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {module.isNew && (
                        <Badge className="bg-green-500 text-white text-xs">Novo</Badge>
                      )}
                      {module.isBeta && (
                        <Badge variant="outline" className="text-xs">Beta</Badge>
                      )}
                      {module.inSidebar && (
                        <Badge variant="outline" className="text-xs bg-brand-50 text-brand-700 border-brand-200">
                          <Star className="w-3 h-3 mr-1" />
                          Sidebar
                        </Badge>
                      )}
                    </div>

                    {/* Module Content */}
                    <Link
                      to={module.href}
                      onClick={onClose}
                      className="block"
                    >
                      <div className="flex items-center mb-3">
                        <div className={cn("p-3 rounded-lg", module.color)}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-1">{module.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                    </Link>

                    {/* Sidebar Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {module.inSidebar ? "No menu lateral" : "Não está no menu"}
                      </span>
                      
                      {!module.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleModuleInSidebar(module.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {module.inSidebar ? (
                            <>
                              <Minus className="w-3 h-3 mr-1" />
                              Remover
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Preencher linha incompleta */}
              {row.length < 3 && (
                <>
                  {Array.from({ length: 3 - row.length }).map((_, index) => (
                    <div key={`empty-${index}`} />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{modules.filter(m => m.inSidebar).length}</span> módulos no sidebar
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>💡 Dica: Clique em "Adicionar" para incluir módulos no menu lateral</span>
          </div>
        </div>
      </div>
    </div>
  );
}
