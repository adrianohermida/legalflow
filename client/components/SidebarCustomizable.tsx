/**
 * Sidebar Customizável - Flow B1
 * Funcionalidades:
 * - Drag & Drop para reordenar itens
 * - Adicionar/remover páginas do sidebar
 * - Confirmação de alteração do layout
 * - Persistência das configurações
 * NOTA: Modo de personalização movido para o mosaico do escritório apenas
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useToast } from "../hooks/use-toast";
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
  UserCheck,
  GripVertical,
  Settings,
  Save,
  RotateCcw,
  MessageSquare,
  CalendarCheck,
  Receipt,
  Eye,
  EyeOff,
} from "lucide-react";

interface SidebarItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  description: string;
  isVisible: boolean;
  isDefault: boolean; // Items que não podem ser removidos
}

interface SidebarCustomizableProps {
  userType: "advogado" | "cliente";
  isCustomizing?: boolean; // Controle externo do modo de customização (vem do mosaico)
  onItemsChange?: (items: SidebarItem[]) => void; // Callback para comunicar mudanças
}

// Items padrão conforme especificação Flow B1
const defaultAdvogadoItems: SidebarItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Visão geral do escritório",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "processos",
    title: "Processos",
    href: "/processos",
    icon: FileText,
    description: "Gestão de processos",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "clientes",
    title: "Clientes",
    href: "/clientes",
    icon: Users,
    description: "Base de clientes",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "agenda",
    title: "Agenda",
    href: "/agenda",
    icon: Calendar,
    description: "Compromissos e prazos",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "jornadas",
    title: "Jornadas",
    href: "/jornadas",
    icon: Target,
    description: "Templates e automação",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "inbox-legal",
    title: "Inbox Legal",
    href: "/inbox-v2",
    icon: Inbox,
    description: "Triagem de publicações",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "documentos",
    title: "Documentos",
    href: "/documentos",
    icon: FolderOpen,
    description: "Gestão de documentos",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    href: "/financeiro",
    icon: DollarSign,
    description: "Controle financeiro",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "deals",
    title: "Deals",
    href: "/deals",
    icon: Target,
    description: "Gestão de oportunidades",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "relatorios",
    title: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    description: "Relatórios e análises",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "helpdesk",
    title: "Helpdesk",
    href: "/helpdesk",
    icon: HeadphonesIcon,
    description: "Central de ajuda",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "servicos",
    title: "Serviços",
    href: "/servicos",
    icon: ShoppingBag,
    description: "Gestão de serviços",
    isVisible: true,
    isDefault: true,
  },
];

const defaultClienteItems: SidebarItem[] = [
  {
    id: "chat",
    title: "Chat",
    href: "/portal/chat",
    icon: MessageSquare,
    description: "Fale com seu advogado",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "jornada",
    title: "Jornada",
    href: "/portal/jornada",
    icon: Target,
    description: "Acompanhe seu processo",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "processos",
    title: "Meus Processos",
    href: "/portal/processos",
    icon: FileText,
    description: "Seus processos ativos",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "compromissos",
    title: "Compromissos",
    href: "/portal/compromissos",
    icon: CalendarCheck,
    description: "Agenda e prazos",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "financeiro",
    title: "Financeiro",
    href: "/portal/financeiro",
    icon: Receipt,
    description: "Faturas e pagamentos",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "helpdesk",
    title: "Helpdesk",
    href: "/portal/helpdesk",
    icon: HeadphonesIcon,
    description: "Central de ajuda",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "servicos",
    title: "Serviços",
    href: "/portal/servicos",
    icon: ShoppingBag,
    description: "Contratar serviços",
    isVisible: true,
    isDefault: true,
  },
];

export function SidebarCustomizable({
  userType,
  isCustomizing = false,
  onItemsChange,
}: SidebarCustomizableProps) {
  const location = useLocation();
  const { toast } = useToast();

  const [items, setItems] = useState<SidebarItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tempItems, setTempItems] = useState<SidebarItem[]>([]);

  // Inicializar items do localStorage ou usar padrão
  useEffect(() => {
    const storageKey = `sidebar-layout-${userType}`;
    const savedLayout = localStorage.getItem(storageKey);

    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setItems(parsed);
      } catch (error) {
        console.error("Erro ao carregar layout do sidebar:", error);
        setItems(
          userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems,
        );
      }
    } else {
      setItems(
        userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems,
      );
    }
  }, [userType]);

  // Comunicar mudanças para o componente pai
  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(items);
    }
  }, [items, onItemsChange]);

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };

  const saveLayout = () => {
    const storageKey = `sidebar-layout-${userType}`;
    localStorage.setItem(storageKey, JSON.stringify(items));

    toast({
      title: "Layout salvo",
      description: "Suas preferências de menu foram salvas",
    });
  };

  const resetToDefault = () => {
    const defaultItems =
      userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems;
    setItems(defaultItems);
    setHasChanges(true);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !isCustomizing) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
    setHasChanges(true);
  };

  const toggleItemVisibility = (itemId: string) => {
    if (!isCustomizing) return;

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, isVisible: !item.isVisible } : item,
      ),
    );
    setHasChanges(true);
  };

  const handleConfirmChanges = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    }
  };

  const confirmSave = () => {
    saveLayout();
    setHasChanges(false);
    setShowConfirmDialog(false);
  };

  const cancelChanges = () => {
    if (hasChanges) {
      setItems(tempItems);
    }
    setHasChanges(false);
  };

  // Público para uso pelo mosaico
  const publicMethods = {
    saveLayout,
    resetToDefault,
    confirmSave,
    cancelChanges,
    hasChanges,
  };

  // Expose methods to parent component
  React.useImperativeHandle(onItemsChange, () => publicMethods, [hasChanges]);

  return (
    <>
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        {/* Logo/Brand */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">Legalflow</div>
              {/* Reserved space for client branding logo */}
              <div className="h-8 bg-gray-50 border border-dashed border-gray-300 rounded flex items-center justify-center mt-1">
                <span className="text-xs text-gray-400">Logo Cliente</span>
              </div>
              <div className="text-sm text-gray-600">CRM Jurídico</div>
              <div className="text-xs text-gray-500 capitalize mt-1">
                {userType}
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
          {isCustomizing ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sidebar-items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-1"
                  >
                    {items.map((item, index) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-out",
                                item.isVisible
                                  ? active
                                    ? "text-white shadow-sm"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                  : "text-gray-400 bg-gray-50",
                                snapshot.isDragging &&
                                  "shadow-lg ring-2 ring-gray-700 ring-opacity-50",
                              )}
                              style={
                                item.isVisible && active
                                  ? { backgroundColor: "var(--gray-700)" }
                                  : {}
                              }
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="mr-2"
                              >
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>

                              <Icon className="flex-shrink-0 w-5 h-5 mr-3" />

                              <span className="truncate flex-1">
                                {item.title}
                              </span>

                              {/* Toggle visibilidade */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemVisibility(item.id)}
                                disabled={item.isDefault}
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                title={
                                  item.isVisible
                                    ? "Ocultar do menu"
                                    : "Mostrar no menu"
                                }
                              >
                                {item.isVisible ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            // Modo normal (sem customização)
            <div className="space-y-1">
              {items
                .filter((item) => item.isVisible)
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={cn(
                        "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ease-out",
                        active
                          ? "text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                      )}
                      style={
                        active ? { backgroundColor: "var(--gray-700)" } : {}
                      }
                    >
                      <Icon className="flex-shrink-0 w-5 h-5 mr-3" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
            </div>
          )}
        </nav>

        {/* Footer com informações do usuário */}
        <div className="flex-shrink-0 px-3 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {userType === "advogado" ? "Advogado" : "Cliente"}
              </div>
              <div className="text-xs text-gray-500">Sistema Jurídico</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de confirmação de mudanças */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar alterações</DialogTitle>
            <DialogDescription>
              Você fez alterações no layout do menu. Deseja salvar essas
              mudanças?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmSave}
              style={{ backgroundColor: "var(--gray-700)", color: "white" }}
            >
              Salvar mudanças
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export para uso pelo mosaico
export { defaultAdvogadoItems, defaultClienteItems };
export type { SidebarItem };
