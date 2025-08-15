/**
 * Sidebar Customizável - Flow B1
 * Funcionalidades:
 * - Drag & Drop para reordenar itens
 * - Adicionar/remover páginas do sidebar
 * - Confirmação de alteração do layout
 * - Persistência das configurações
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
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
    href: "/processos-v2",
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
    description: "Jornadas do cliente",
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

export function SidebarCustomizable({ userType }: SidebarCustomizableProps) {
  const location = useLocation();
  const { toast } = useToast();
  
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
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
        setItems(userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems);
      }
    } else {
      setItems(userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems);
    }
  }, [userType]);

  // Salvar layout no localStorage
  const saveLayout = () => {
    const storageKey = `sidebar-layout-${userType}`;
    localStorage.setItem(storageKey, JSON.stringify(items));
    setHasChanges(false);
    
    toast({
      title: "Layout salvo",
      description: "As alterações do sidebar foram salvas com sucesso.",
    });
  };

  // Resetar para layout padrão
  const resetToDefault = () => {
    const defaultItems = userType === "advogado" ? defaultAdvogadoItems : defaultClienteItems;
    setItems(defaultItems);
    setHasChanges(true);
  };

  // Manipular drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
    setHasChanges(true);
  };

  // Toggle visibilidade de item
  const toggleItemVisibility = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, isVisible: !item.isVisible } : item
      )
    );
    setHasChanges(true);
  };

  // Verificar se rota está ativa
  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  // Confirmar alterações
  const handleConfirmChanges = () => {
    setShowConfirmDialog(true);
  };

  // Aplicar alterações
  const applyChanges = () => {
    saveLayout();
    setIsCustomizing(false);
    setShowConfirmDialog(false);
    setTempItems([]);
  };

  // Cancelar alterações
  const cancelChanges = () => {
    if (tempItems.length > 0) {
      setItems(tempItems);
    }
    setIsCustomizing(false);
    setHasChanges(false);
    setTempItems([]);
  };

  // Iniciar customização
  const startCustomizing = () => {
    setTempItems([...items]); // Backup do estado atual
    setIsCustomizing(true);
  };

  const visibleItems = items.filter(item => item.isVisible);

  return (
    <>
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

        {/* Controles de Customização */}
        {!isCustomizing ? (
          <div className="px-3 py-2 border-b border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={startCustomizing}
              className="w-full justify-start text-xs text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-4 h-4 mr-2" />
              Personalizar Menu
            </Button>
          </div>
        ) : (
          <div className="px-3 py-2 border-b border-gray-200 space-y-2">
            <div className="text-xs text-gray-600 font-medium">Modo Personalização</div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfirmChanges}
                disabled={!hasChanges}
                className="flex-1 text-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                Salvar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="flex-1 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Resetar
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelChanges}
              className="w-full text-xs"
            >
              Cancelar
            </Button>
          </div>
        )}

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
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                    {items.map((item, index) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
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
                                snapshot.isDragging && "shadow-lg ring-2 ring-brand-700 ring-opacity-50"
                              )}
                              style={
                                item.isVisible && active 
                                  ? { backgroundColor: "var(--brand-700)" } 
                                  : {}
                              }
                            >
                              <div {...provided.dragHandleProps} className="mr-2">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>
                              
                              <Icon className="flex-shrink-0 w-5 h-5 mr-3" />
                              
                              <span className="truncate flex-1">{item.title}</span>

                              {/* Toggle visibilidade */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemVisibility(item.id)}
                                disabled={item.isDefault}
                                className="ml-auto opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              >
                                <div
                                  className={cn(
                                    "w-3 h-3 rounded-full border-2",
                                    item.isVisible
                                      ? "bg-brand-700 border-brand-700"
                                      : "border-gray-400"
                                  )}
                                />
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
              {visibleItems.map((item) => {
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
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                          : "text-neutral-400 group-hover:text-neutral-600"
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
            </div>
          )}
        </nav>

        {/* Footer - User Type Indicator */}
        <div className="px-3 py-4 border-t border-neutral-200">
          <div className="flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-800">
            <UserCheck className="w-4 h-4 mr-2" />
            {userType === "advogado" ? "Área do Advogado" : "Portal do Cliente"}
          </div>
        </div>
      </div>

      {/* Confirmação de Alterações */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alterações</DialogTitle>
            <DialogDescription>
              Deseja salvar as alterações feitas no layout do sidebar? As mudanças serão aplicadas permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={applyChanges} className="bg-brand-900 hover:bg-brand-700">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
