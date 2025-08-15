/**
 * DisclosurePanel Component
 * F1.0 - Progressive Disclosure para revelação gradual de conteúdo
 */

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  useProgressiveDisclosure,
  disclosureClasses,
} from "../../lib/progressive-disclosure";

interface DisclosurePanelProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  persistKey?: string;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  headerActions?: React.ReactNode;
  onToggle?: (expanded: boolean) => void;
}

export function DisclosurePanel({
  title,
  children,
  defaultExpanded = false,
  persistKey,
  className,
  titleClassName,
  contentClassName,
  icon,
  disabled = false,
  headerActions,
  onToggle,
}: DisclosurePanelProps) {
  const { isExpanded, toggle } = useProgressiveDisclosure(defaultExpanded);

  const handleToggle = () => {
    if (disabled) return;
    toggle();
    onToggle?.(isExpanded);
  };

  return (
    <div className={cn("border border-gray-200 rounded-lg", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          disclosureClasses.trigger,
          "w-full flex items-center justify-between p-4 text-left",
          "border-b border-gray-200 last:border-b-0",
          disabled && "opacity-50 cursor-not-allowed",
          titleClassName,
        )}
        aria-expanded={isExpanded}
        aria-controls={`disclosure-content-${persistKey || "panel"}`}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0 text-gray-500">{icon}</div>}
          <div className="font-medium text-gray-900">{title}</div>
        </div>

        <div className="flex items-center gap-2">
          {headerActions}
          <ChevronDown
            className={cn(
              disclosureClasses.icon,
              "h-4 w-4 text-gray-500",
              isExpanded
                ? disclosureClasses.iconExpanded
                : disclosureClasses.iconCollapsed,
            )}
          />
        </div>
      </button>

      {/* Content */}
      <div
        id={`disclosure-content-${persistKey || "panel"}`}
        className={cn(
          disclosureClasses.content,
          isExpanded ? disclosureClasses.expanded : disclosureClasses.collapsed,
          contentClassName,
        )}
        style={{
          maxHeight: isExpanded ? "none" : "0",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {isExpanded && <div className="p-4">{children}</div>}
      </div>
    </div>
  );
}

// Variante compacta para uso em cards
export function DisclosureCard({
  title,
  children,
  defaultExpanded = false,
  className,
  ...props
}: Omit<DisclosurePanelProps, "className"> & { className?: string }) {
  return (
    <DisclosurePanel
      {...props}
      title={title}
      defaultExpanded={defaultExpanded}
      className={cn("bg-white shadow-sm", className)}
      titleClassName="hover:bg-gray-50"
    >
      {children}
    </DisclosurePanel>
  );
}

// Variante inline para uso em listas
export function DisclosureInline({
  title,
  children,
  defaultExpanded = false,
  className,
  ...props
}: Omit<DisclosurePanelProps, "className"> & { className?: string }) {
  return (
    <DisclosurePanel
      {...props}
      title={title}
      defaultExpanded={defaultExpanded}
      className={cn(
        "border-0 border-b border-gray-200 rounded-none",
        className,
      )}
      titleClassName="p-3"
      contentClassName="border-t border-gray-100"
    >
      {children}
    </DisclosurePanel>
  );
}

// Grupo de panels com controles expand/collapse all
interface DisclosureGroupProps {
  children: React.ReactNode;
  className?: string;
  showControls?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export function DisclosureGroup({
  children,
  className,
  showControls = true,
  onExpandAll,
  onCollapseAll,
}: DisclosureGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {showControls && (
        <div className="flex justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={onExpandAll}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Expandir tudo
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={onCollapseAll}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Recolher tudo
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
