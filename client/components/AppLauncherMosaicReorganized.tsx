/**
 * App Launcher Mosaic - REORGANIZADO COM SEÇÕES BETA
 * Mosaico reorganizado com aplicações principais, ferramentas, beta e desenvolvimento
 * INCLUI: Seção BETA para aplicações em desenvolvimento
 * CORES: Harmonização monocromática com indicadores de status
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
  Beaker,
  Code,
  Bug,
  Monitor,
  Flag,
  Wrench,
} from "lucide-react";
import {
  SidebarItem,
  defaultAdvogadoItems,
  defaultClienteItems,
} from "./SidebarCustomizable";
import { themeUtils, colors } from "../lib/theme-colors";

interface AppLauncherMosaicProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "advogado" | "cliente";
  onUpdateSidebar?: (updatedItems: any[]) => void;
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
  isDefault: boolean;
  isNew?: boolean;
  isBeta?: boolean;
  isDev?: boolean;
}

// APLICAÇÕES REORGANIZADAS POR CATEGORIA
const allAdvogadoModules: AppModule[] = [
  // ===========================================
  // APLICAÇÕES PRINCIPAIS - Core do escritório
  // ===========================================
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral do escritório",
    href: "/",
    icon: LayoutDashboard,
    color: colors.neutral[700],
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "processos",
    title: "Processos",
    description: "Gestão de processos jurídicos",
    href: "/processos",
    icon: FileText,
    color: colors.brand.primary,
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "clientes",
    title: "Clientes",
    description: "Gestão de clientes e contatos",
    href: "/clientes",
    icon: Users,
    color: colors.semantic.info,
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "agenda",
    title: "Agenda",
    description: "Calendário e compromissos",
    href: "/agenda",
    icon: Calendar,
    color: colors.semantic.warning,
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "jornadas",
    title: "Jornadas",
    description: "Fluxos automatizados",
    href: "/jornadas",
    icon: Target,
    color: colors.brand.secondary,
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "inbox-legal",
    title: "Inbox Legal",
    description: "Publicações e atualizações",
    href: "/inbox",
    icon: Inbox,
    color: colors.neutral[600],
    category: "Principais",
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
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Controle financeiro e planos",
    href: "/financeiro",
    icon: DollarSign,
    color: colors.semantic.success,
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "relatorios",
    title: "Relatórios",
    description: "Dashboards e análises",
    href: "/relatorios",
    icon: BarChart3,
    color: colors.neutral[700],
    category: "Principais",
    inSidebar: true,
    isDefault: true,
  },

  // ===========================================
  // FERRAMENTAS DO ESCRITÓRIO
  // ===========================================
  {
    id: "helpdesk",
    title: "Helpdesk",
    description: "Central de ajuda e tickets",
    href: "/helpdesk",
    icon: HeadphonesIcon,
    color: colors.neutral[500],
    category: "Ferramentas",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Catálogo de serviços",
    href: "/servicos",
    icon: ShoppingBag,
    color: colors.neutral[600],
    category: "Ferramentas",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "data-export",
    title: "Exportar Dados",
    description: "Backup e exportação",
    href: "/data-export",
    icon: Database,
    color: colors.neutral[500],
    category: "Ferramentas",
    inSidebar: false,
    isDefault: false,
  },
  {
    id: "audit-log",
    title: "Log de Auditoria",
    description: "Histórico de ações",
    href: "/audit-log",
    icon: TestTube,
    color: colors.neutral[600],
    category: "Ferramentas",
    inSidebar: false,
    isDefault: false,
  },

  // ===========================================
  // APLICAÇÕES BETA - Em desenvolvimento/teste
  // ===========================================
  {
    id: "analytics",
    title: "Analytics Pro",
    description: "📊 Análise avançada de dados (Em desenvolvimento)",
    href: "/analytics",
    icon: Activity,
    color: colors.brand.primary,
    category: "Beta",
    inSidebar: false,
    isDefault: false,
    isBeta: true,
  },
  {
    id: "api-integrations",
    title: "API Manager",
    description: "🔗 Integrações com sistemas externos (Beta)",
    href: "/api-integrations",
    icon: Zap,
    color: colors.semantic.warning,
    category: "Beta",
    inSidebar: false,
    isDefault: false,
    isBeta: true,
  },
  {
    id: "examples",
    title: "Design System",
    description: "🎨 Exemplos e padrões de design (Beta)",
    href: "/examples",
    icon: Eye,
    color: colors.brand.secondary,
    category: "Beta",
    inSidebar: false,
    isDefault: false,
    isBeta: true,
  },
  {
    id: "api-example",
    title: "API Testing",
    description: "🔧 Testes de API REST (Beta)",
    href: "/api-example",
    icon: TestTube,
    color: colors.semantic.info,
    category: "Beta",
    inSidebar: false,
    isDefault: false,
    isBeta: true,
  },

  // ===========================================
  // FERRAMENTAS DE DESENVOLVIMENTO
  // ===========================================
  {
    id: "dev-auditoria",
    title: "DevAuditoria",
    description: "🔧 Sistema de auditoria e autofix",
    href: "/dev-auditoria",
    icon: Bug,
    color: colors.neutral[700],
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isDev: true,
  },
  {
    id: "admin-integrity",
    title: "Admin Integrity",
    description: "🔧 Verificações de integridade DB",
    href: "/admin/integrity",
    icon: Database,
    color: colors.semantic.error,
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isDev: true,
  },
  {
    id: "qa-console",
    title: "QA Console",
    description: "🔧 Console de qualidade",
    href: "/qa",
    icon: TestTube,
    color: colors.neutral[600],
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isDev: true,
  },
  {
    id: "status-dashboard",
    title: "Status Dashboard",
    description: "🔧 Monitoramento do sistema",
    href: "/status",
    icon: Monitor,
    color: colors.semantic.success,
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isDev: true,
  },
  {
    id: "feature-flags",
    title: "Feature Flags",
    description: "🔧 Configurações de funcionalidades",
    href: "/config/flags",
    icon: Flag,
    color: colors.neutral[500],
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isDev: true,
  },
  {
    id: "dev-tools",
    title: "Dev Tools",
    description: "🔧 Ferramentas de desenvolvimento",
    href: "/dev/tools",
    icon: Wrench,
    color: colors.neutral[600],
    category: "Desenvolvimento",
    inSidebar: false,
    isDefault: false,
    isDev: true,
  },
];

// Módulos para clientes (inalterados)
const allClienteModules: AppModule[] = [
  {
    id: "chat",
    title: "Chat",
    description: "Comunicação direta",
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
    description: "Progresso dos serviços",
    href: "/portal/jornada",
    icon: Target,
    color: colors.brand.secondary,
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "processos",
    title: "Meus Processos",
    description: "Acompanhe seus processos",
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
    description: "Agenda de compromissos",
    href: "/portal/compromissos",
    icon: CalendarCheck,
    color: colors.semantic.warning,
    category: "Principal",
    inSidebar: true,
    isDefault: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Controle financeiro",
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
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Inicializar módulos
  useEffect(() => {
    const allModules = userType === "advogado" ? allAdvogadoModules : allClienteModules;
    setModules(allModules);
  }, [userType]);

  // Organizar módulos por categoria
  const modulesByCategory = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, AppModule[]>);

  // Ordem das categorias
  const categoryOrder = userType === "advogado" 
    ? ["Principais", "Ferramentas", "Beta", "Desenvolvimento"]
    : ["Principal"];

  const toggleSidebar = (moduleId: string) => {
    if (!isCustomizeMode) return;
    
    setModules(prev => prev.map(module => 
      module.id === moduleId && !module.isDefault
        ? { ...module, inSidebar: !module.inSidebar }
        : module
    ));
    setHasChanges(true);
  };

  const resetToDefault = () => {
    const defaultModules = userType === "advogado" ? allAdvogadoModules : allClienteModules;
    setModules(defaultModules);
    setHasChanges(false);
    toast({
      title: "Configuração resetada",
      description: "Sidebar voltou ao padrão",
    });
  };

  const saveChanges = () => {
    const sidebarItems = modules
      .filter(module => module.inSidebar)
      .map(module => ({
        title: module.title,
        href: module.href,
        icon: module.icon,
        description: module.description,
      }));

    onUpdateSidebar?.(sidebarItems);
    setHasChanges(false);
    setIsCustomizeMode(false);
    
    toast({
      title: "Configuração salva",
      description: "Sidebar atualizada com sucesso",
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Principais": return <Star className="h-4 w-4" />;
      case "Ferramentas": return <Wrench className="h-4 w-4" />;
      case "Beta": return <Beaker className="h-4 w-4" />;
      case "Desenvolvimento": return <Code className="h-4 w-4" />;
      default: return <LayoutDashboard className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Principais": return "text-blue-700 border-blue-200 bg-blue-50";
      case "Ferramentas": return "text-green-700 border-green-200 bg-green-50";
      case "Beta": return "text-orange-700 border-orange-200 bg-orange-50";
      case "Desenvolvimento": return "text-purple-700 border-purple-200 bg-purple-50";
      default: return "text-gray-700 border-gray-200 bg-gray-50";
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                🏢 Aplicações do Escritório
              </DialogTitle>
              <DialogDescription>
                {isCustomizeMode 
                  ? "Clique nos módulos para adicionar/remover do sidebar"
                  : "Acesse todas as aplicações disponíveis"
                }
              </DialogDescription>
            </div>
            
            {userType === "advogado" && (
              <div className="flex items-center gap-2">
                {isCustomizeMode && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetToDefault}
                      className="text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                    {hasChanges && (
                      <Button
                        size="sm"
                        onClick={saveChanges}
                        className="text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Salvar
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  variant={isCustomizeMode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsCustomizeMode(!isCustomizeMode)}
                  className="text-xs"
                >
                  <PanelLeft className="h-3 w-3 mr-1" />
                  {isCustomizeMode ? "Finalizar" : "Personalizar"}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {categoryOrder.map(category => {
              const categoryModules = modulesByCategory[category];
              if (!categoryModules?.length) return null;

              return (
                <div key={category} className="space-y-4">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getCategoryColor(category)}`}>
                    {getCategoryIcon(category)}
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <Badge variant="outline" className="text-xs">
                      {categoryModules.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryModules.map((module) => (
                      <div
                        key={module.id}
                        className={cn(
                          "group relative border rounded-lg p-4 hover:shadow-md transition-all",
                          isCustomizeMode && !module.isDefault && "cursor-pointer hover:border-blue-300",
                          module.inSidebar && isCustomizeMode && "ring-2 ring-blue-200 bg-blue-50",
                          !module.inSidebar && isCustomizeMode && "opacity-70"
                        )}
                        onClick={() => toggleSidebar(module.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg shrink-0"
                            style={{ backgroundColor: `${module.color}15`, color: module.color }}
                          >
                            <module.icon className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{module.title}</h4>
                              {module.isBeta && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                  BETA
                                </Badge>
                              )}
                              {module.isDev && (
                                <Badge variant="outline" className="text-xs">
                                  DEV
                                </Badge>
                              )}
                              {module.isNew && (
                                <Badge className="text-xs bg-green-100 text-green-700">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-600 mb-3">
                              {module.description}
                            </p>

                            {!isCustomizeMode && (
                              <Link 
                                to={module.href}
                                onClick={onClose}
                                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                              >
                                Abrir aplicação →
                              </Link>
                            )}
                          </div>

                          {isCustomizeMode && (
                            <div className="absolute top-2 right-2">
                              {module.isDefault ? (
                                <Badge variant="outline" className="text-xs">
                                  Fixo
                                </Badge>
                              ) : module.inSidebar ? (
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Minus className="h-3 w-3 text-white" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center group-hover:bg-blue-600">
                                  <Plus className="h-3 w-3 text-gray-600 group-hover:text-white" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
