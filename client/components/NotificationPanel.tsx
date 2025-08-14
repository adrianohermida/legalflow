import React, { useState } from "react";
import {
  X,
  Bell,
  Filter,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "advogado" | "cliente";
}

type FilterType = "todos" | "prazos" | "publicacoes" | "financeiro" | "chat";

// Mock data removed - implement real notifications from database
const mockNotifications: any[] = [];

const filterConfig = {
  todos: { label: "Todos", count: 3 },
  prazos: { label: "Prazos", count: 1 },
  publicacoes: { label: "Publicações", count: 1 },
  financeiro: { label: "Financeiro", count: 1 },
  chat: { label: "Chat", count: 0 },
};

export function NotificationPanel({
  isOpen,
  onClose,
  userType,
}: NotificationPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");

  if (!isOpen) return null;

  const filteredNotifications =
    activeFilter === "todos"
      ? mockNotifications
      : mockNotifications.filter((n) => n.type === activeFilter);

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-strong z-50 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-heading font-semibold text-neutral-900">
              Notificações
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-neutral-600">
                {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-2">
            {Object.entries(filterConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(key as FilterType)}
                className="text-xs"
              >
                {config.label}
                {config.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {config.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-4 border-b border-border">
            <Button variant="outline" size="sm" className="w-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar tudo como lido
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-neutral-900 mb-2">
                Nenhuma notificação
              </h3>
              <p className="text-xs text-neutral-600">
                Quando houver atualizações, você verá aqui
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredNotifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-neutral-50",
                      notification.read
                        ? "border-transparent bg-neutral-50/50"
                        : "border-brand-200 bg-brand-50/30",
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 mt-0.5 flex-shrink-0",
                          notification.color,
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-tight",
                            notification.read
                              ? "text-neutral-700"
                              : "font-medium text-neutral-900",
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-500 mt-2">
                          {notification.time}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-brand-600 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-neutral-50">
          <p className="text-xs text-neutral-500 text-center">
            {userType === "advogado"
              ? "Hermida Maia Advocacia"
              : "Portal do Cliente"}
          </p>
        </div>
      </div>
    </>
  );
}
