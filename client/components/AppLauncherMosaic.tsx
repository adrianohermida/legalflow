/**
 * App Launcher Mosaic - Flow B1
 * Launcher "Apps" abre overlay com cards 3×N dos módulos
 * Preview de módulos permite adicionar e remover páginas do sidebar
 * INCLUI: Modo de personalização discreto do sidebar (conforme Flow C2)
 * CORES: Harmonização monocromática com acentos da marca
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
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  PanelLeft,
} from "lucide-react";
import { SidebarItem, defaultAdvogadoItems, defaultClienteItems } from "./SidebarCustomizable";
import { themeUtils, colors } from "../lib/theme-colors";

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

// Todos os módulos disponíveis - cores harmonizadas
const allAdvogadoModules: AppModule[] = [
  // Módulos principais (padrão no sidebar)
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral do escritório",
    href: "/",
    icon: LayoutDashboard,
    color: colors.neutral[700],
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
    color: colors.brand.primary,
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
    color: colors.neutral[600],
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
    color: colors.neutral[500],
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
    color: colors.brand.accent,
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
    color: colors.semantic.warning,
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
    color: colors.neutral[600],
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
    color: colors.semantic.success,
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
    color: colors.neutral[700],
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
    color: colors.neutral[500],
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
    color: colors.neutral[600],
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },

  // Módulos adicionais (não no sidebar por padrão)
  {
    id: "analytics",
    title: "Analytics",
    description: "Análise avançada de dados",
    href: "/analytics",
    icon: Activity,
    color: colors.brand.primary,
    category: "Avançado",
    inSidebar: false,
    isDefault: false,
    isNew: true,
  },
  {
    id: "api-integrations",
    title: "API Integrations",
    description: "Integrações com sistemas externos",
    href: "/api-integrations",
    icon: Zap,
    color: colors.semantic.warning,
    category: "Avançado",
    inSidebar: false,
    isDefault: false,
    isBeta: true,
  },
  {
    id: "data-export",
    title: "Data Export",
    description: "Exportação e backup de dados",
    href: "/data-export",
    icon: Database,
    color: colors.neutral[500],
    category: "Utilitários",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "audit-log",
    title: "Audit Log",
    description: "Log de auditoria do sistema",
    href: "/audit-log",
    icon: TestTube,
    color: colors.neutral[600],
    category: "Utilitários",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "system-settings",
    title: "Configurações",
    description: "Configurações do sistema",
    href: "/settings",
    icon: Settings,
    color: colors.neutral[700],
    category: "Sistema",
    inSidebar: false,
    isDefault: false,
  },
];

const allClienteModules: AppModule[] = [
  {
    id: "chat",
    title: "Chat",
    description: "Fale com seu advogado",
    href: "/portal/chat",
    icon: MessageSquare,
    color: colors.brand.primary,
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "jornada",
    title: "Jornada",
    description: "Acompanhe seu processo",
    href: "/portal/jornada",
    icon: Target,
    color: colors.brand.accent,
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
    color: colors.neutral[700],
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
    color: colors.neutral[600],
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
    color: colors.semantic.success,
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
    color: colors.neutral[500],
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
    color: colors.neutral[600],
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [isSidebarCustomizing, setIsSidebarCustomizing] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // Carregar módulos baseado no tipo de usuário
    const allModules = userType === "advogado" ? allAdvogadoModules : allClienteModules;
    
    // Sincronizar com o estado do sidebar
    const storageKey = `sidebar-layout-${userType}`;
    const savedLayout = localStorage.getItem(storageKey);
    
    if (savedLayout) {
      try {
        const sidebarItems = JSON.parse(savedLayout);
        const syncedModules = allModules.map(module => ({
          ...module,
          inSidebar: sidebarItems.some((item: any) => item.id === module.id && item.isVisible)
        }));
        setModules(syncedModules);
      } catch (error) {
        setModules(allModules);
      }
    } else {
      setModules(allModules);
    }

    // Carregar itens do sidebar
    const defaultItems = userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems;
    setSidebarItems(savedLayout ? JSON.parse(savedLayout) : defaultItems);
  }, [userType, isOpen]);

  const categories = ["Todos", ...Array.from(new Set(modules.map(m => m.category)))];

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleModuleInSidebar = (moduleId: string) => {
    if (!isSidebarCustomizing) return;

    const module = modules.find(m => m.id === moduleId);
    if (!module || module.isDefault) return;

    // Atualizar módulos
    const updatedModules = modules.map(module => 
      module.id === moduleId ? { ...module, inSidebar: !module.inSidebar } : module
    );
    setModules(updatedModules);

    // Atualizar itens do sidebar
    const updatedSidebarItems = sidebarItems.map(item => 
      item.id === moduleId ? { ...item, isVisible: !item.isVisible } : item
    );
    setSidebarItems(updatedSidebarItems);
    setHasChanges(true);
  };

  const startSidebarCustomization = () => {
    setIsSidebarCustomizing(true);
    toast({
      title: "Modo personalização ativado",
      description: "Clique nos módulos para adicionar/remover do menu lateral",
    });
  };

  const saveSidebarChanges = () => {
    const storageKey = `sidebar-layout-${userType}`;
    localStorage.setItem(storageKey, JSON.stringify(sidebarItems));
    
    if (onUpdateSidebar) {
      onUpdateSidebar(sidebarItems);
    }

    setIsSidebarCustomizing(false);
    setHasChanges(false);
    
    toast({
      title: "Layout salvo",
      description: "Suas preferências de menu foram salvas",
    });
  };

  const resetSidebarToDefault = () => {
    const defaultItems = userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems;
    const allModules = userType === "advogado" ? allAdvogadoModules : allClienteModules;
    
    setSidebarItems(defaultItems);
    setModules(allModules);
    setHasChanges(true);
    
    toast({
      title: "Layout resetado",
      description: "Menu restaurado para configuração padrão",
    });
  };

  const cancelSidebarCustomization = () => {
    // Recarregar do localStorage
    const storageKey = `sidebar-layout-${userType}`;
    const savedLayout = localStorage.getItem(storageKey);
    const defaultItems = userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems;
    
    const items = savedLayout ? JSON.parse(savedLayout) : defaultItems;
    setSidebarItems(items);
    
    // Resincronizar módulos
    const allModules = userType === "advogado" ? allAdvogadoModules : allClienteModules;
    const syncedModules = allModules.map(module => ({
      ...module,
      inSidebar: items.some((item: any) => item.id === module.id && item.isVisible)
    }));
    setModules(syncedModules);
    
    setIsSidebarCustomizing(false);
    setHasChanges(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50" 
      style={{ backgroundColor: colors.surface.overlay }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        style={themeUtils.elevatedCardShadow}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.neutral[200] }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: colors.neutral[900] }}>
              Módulos do Sistema
            </h2>
            <p className="mt-1" style={{ color: colors.neutral[600] }}>
              Escolha os módulos para acessar funcionalidades do AdvogaAI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Controles de customização do sidebar - discretos */}
            {userType === "advogado" && (
              <>
                {!isSidebarCustomizing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startSidebarCustomization}
                    className="text-xs"
                  >
                    <PanelLeft className="w-4 h-4 mr-1" />
                    Personalizar Menu
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveSidebarChanges}
                      disabled={!hasChanges}
                      className="text-xs"
                      style={hasChanges ? themeUtils.primaryButton : {}}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetSidebarToDefault}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Resetar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelSidebarCustomization}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b" style={{ borderColor: colors.neutral[200] }}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar módulos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ 
                  borderColor: colors.neutral[300],
                  boxShadow: `0 0 0 2px ${colors.brand.primaryLight}`
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  style={
                    selectedCategory === category 
                      ? themeUtils.primaryButton
                      : {}
                  }
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Status do modo de personalização */}
          {isSidebarCustomizing && (
            <div 
              className="mt-4 p-3 rounded-lg border"
              style={{ 
                backgroundColor: colors.brand.primaryLight,
                borderColor: colors.brand.primary 
              }}
            >
              <div className="flex items-center gap-2" style={{ color: colors.brand.primaryDark }}>
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Modo Personalização Ativo
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: colors.brand.primary }}>
                Clique nos ícones de olho para adicionar/remover módulos do menu lateral
              </p>
            </div>
          )}
        </div>

        {/* Modules Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  className={cn(
                    "relative group bg-white border rounded-lg p-4 hover:shadow-md transition-all duration-200",
                    isSidebarCustomizing && "hover:border-gray-400 cursor-pointer"
                  )}
                  style={{ borderColor: colors.neutral[200], ...themeUtils.cardShadow }}
                >
                  {/* Badge de status no sidebar */}
                  {isSidebarCustomizing && (
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleModuleInSidebar(module.id)}
                        disabled={module.isDefault}
                        className="h-6 w-6 p-0"
                        title={
                          module.isDefault 
                            ? "Módulo obrigatório" 
                            : module.inSidebar 
                            ? "Remover do menu" 
                            : "Adicionar ao menu"
                        }
                      >
                        {module.inSidebar ? (
                          <Eye className="w-3 h-3" style={{ color: colors.semantic.success }} />
                        ) : (
                          <EyeOff className="w-3 h-3" style={{ color: colors.neutral[400] }} />
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center" 
                      style={{ backgroundColor: module.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate" style={{ color: colors.neutral[900] }}>
                          {module.title}
                        </h3>
                        {module.inSidebar && (
                          <Badge variant="secondary" className="text-xs">
                            Menu
                          </Badge>
                        )}
                        {module.isNew && (
                          <Badge className="text-xs" style={themeUtils.successBadge}>
                            Novo
                          </Badge>
                        )}
                        {module.isBeta && (
                          <Badge variant="outline" className="text-xs">
                            Beta
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: colors.neutral[600] }}>
                        {module.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className="text-xs">
                          {module.category}
                        </Badge>
                        {!isSidebarCustomizing && (
                          <Link
                            to={module.href}
                            onClick={onClose}
                            className="text-xs font-medium hover:underline"
                            style={{ color: colors.brand.primary }}
                          >
                            Abrir →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredModules.length === 0 && (
            <div className="text-center py-12" style={{ color: colors.neutral[500] }}>
              <p>Nenhum módulo encontrado para "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
