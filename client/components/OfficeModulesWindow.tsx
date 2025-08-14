import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X, ChevronRight, Folder, FolderOpen, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import {
  Target,
  FolderOpen as FolderIcon,
  DollarSign,
  BarChart3,
  HeadphonesIcon,
  ShoppingBag,
  Ticket,
  Shield,
} from "lucide-react";

interface OfficeModulesWindowProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "advogado" | "cliente";
}

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface FolderItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  modules: ModuleItem[];
}

const advogadoFolders: FolderItem[] = [
  {
    id: "gestao",
    title: "Gestão",
    description: "Módulos de gestão e controle",
    icon: BarChart3,
    modules: [
      {
        id: "jornadas",
        title: "Jornadas",
        description: "Jornadas do cliente e automação",
        href: "/jornadas",
        icon: Target,
        color: "primary",
      },
      {
        id: "financeiro",
        title: "Financeiro",
        description: "Gestão financeira e faturamento",
        href: "/financeiro",
        icon: DollarSign,
        color: "bg-success",
      },
      {
        id: "relatorios",
        title: "Relatórios",
        description: "Análises e relatórios gerenciais",
        href: "/relatorios",
        icon: BarChart3,
        color: "primary",
      },
    ],
  },
  {
    id: "atendimento",
    title: "Atendimento",
    description: "Módulos de atendimento ao cliente",
    icon: HeadphonesIcon,
    modules: [
      {
        id: "helpdesk",
        title: "Helpdesk",
        description: "Suporte e atendimento ao cliente",
        href: "/helpdesk",
        icon: HeadphonesIcon,
        color: "primary",
      },
      {
        id: "tickets",
        title: "Tickets",
        description: "Sistema de atendimento",
        href: "/tickets",
        icon: Ticket,
        color: "primary",
      },
      {
        id: "servicos",
        title: "Serviços",
        description: "Catálogo e gestão de serviços",
        href: "/servicos",
        icon: ShoppingBag,
        color: "primary",
      },
    ],
  },
  {
    id: "documentacao",
    title: "Documentação",
    description: "Gestão de documentos e arquivos",
    icon: FolderIcon,
    modules: [
      {
        id: "documentos",
        title: "Documentos",
        description: "Biblioteca e gestão de documentos",
        href: "/documentos",
        icon: FolderIcon,
        color: "primary",
      },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    description: "Ferramentas de sistema e auditoria",
    icon: Shield,
    modules: [
      {
        id: "auditoria",
        title: "Auditoria",
        description: "Painel de auditoria e autofix",
        href: "/dev/auditoria",
        icon: Shield,
        color: "bg-danger",
      },
    ],
  },
];

export function OfficeModulesWindow({ isOpen, onClose, userType }: OfficeModulesWindowProps) {
  const [currentView, setCurrentView] = useState<"folders" | "modules">("folders");
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);

  if (!isOpen) return null;

  const folders = userType === "advogado" ? advogadoFolders : [];

  const handleFolderClick = (folder: FolderItem) => {
    setSelectedFolder(folder);
    setCurrentView("modules");
    setBreadcrumb([folder.title]);
  };

  const handleBackToFolders = () => {
    setCurrentView("folders");
    setSelectedFolder(null);
    setBreadcrumb([]);
  };

  const handleModuleClick = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-strong max-w-5xl w-full max-h-[80vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              {/* Back button */}
              {currentView === "modules" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToFolders}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </Button>
              )}

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-heading font-semibold text-neutral-900">
                    Módulos do Escritório
                  </h2>
                  
                  {/* Breadcrumb */}
                  {breadcrumb.length > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-neutral-600">
                      <ChevronRight className="w-4 h-4" />
                      {breadcrumb.map((crumb, index) => (
                        <span key={index} className="font-medium">
                          {crumb}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-neutral-600 mt-1">
                  {currentView === "folders" 
                    ? "Navegue pelas pastas para acessar os módulos organizados"
                    : `${selectedFolder?.modules.length || 0} módulos disponíveis`
                  }
                </p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {currentView === "folders" ? (
              /* Folders View */
              <div className="grid grid-cols-2 gap-6">
                {folders.map((folder) => {
                  const Icon = folder.icon;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleFolderClick(folder)}
                      className="group p-6 border rounded-lg cursor-pointer transition-all duration-200 bg-white hover:shadow-md"
                      style={{
                        borderColor: "var(--border)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--brand-700)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Folder Icon */}
                        <div
                          className="flex items-center justify-center w-12 h-12 rounded-lg text-white flex-shrink-0"
                          style={{
                            backgroundColor: "var(--brand-700)",
                          }}
                        >
                          <Folder className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-base text-neutral-900 truncate">
                              {folder.title}
                            </h3>
                            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors flex-shrink-0" />
                          </div>
                          
                          <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                            {folder.description}
                          </p>
                          
                          <div className="flex items-center mt-3 text-xs text-neutral-500">
                            <Icon className="w-3 h-3 mr-1" />
                            <span>{folder.modules.length} módulos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Modules View */
              <div className="grid grid-cols-3 gap-4">
                {selectedFolder?.modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link
                      key={module.id}
                      to={module.href}
                      onClick={handleModuleClick}
                      className="group p-4 border transition-all duration-200 bg-white rounded-lg"
                      style={{
                        borderColor: "var(--border)",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--brand-700)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(40, 82, 69, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                      }}
                    >
                      <div className="flex flex-col items-center text-center space-y-3">
                        {/* Icon */}
                        <div
                          className="flex items-center justify-center w-12 h-12 rounded-lg text-white"
                          style={{
                            backgroundColor:
                              module.color === "primary"
                                ? "var(--brand-700)"
                                : module.color === "bg-success"
                                  ? "var(--success)"
                                  : module.color === "bg-danger"
                                    ? "var(--danger)"
                                    : "var(--brand-700)",
                          }}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                          <h3 className="font-medium text-sm text-neutral-900">
                            {module.title}
                          </h3>
                          <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-border">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Pressione ESC para fechar</span>
              <span>Hermida Maia Advocacia</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
