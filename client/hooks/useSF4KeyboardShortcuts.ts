import { useEffect, useCallback } from "react";
import { sf4Telemetry } from "../lib/sf4-telemetry";

interface SF4KeyboardShortcutsProps {
  onCommandK: () => void;
  onEscape: () => void;
  onEnter: () => void;
  onTabSwitch: (tab: "publicacoes" | "movimentacoes") => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  currentTab: "publicacoes" | "movimentacoes";
  isDialogOpen: boolean;
}

export function useSF4KeyboardShortcuts({
  onCommandK,
  onEscape,
  onEnter,
  onTabSwitch,
  onClearFilters,
  onRefresh,
  currentTab,
  isDialogOpen,
}: SF4KeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or textareas
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true" ||
        target.role === "textbox";

      // Command/Ctrl + K - Focus search (works everywhere)
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onCommandK();
        sf4Telemetry.trackEvent({
          event_name: "sf4_filter_change",
          properties: {
            shortcut_used: "cmd_k",
            action_type: "keyboard_shortcut",
            tab: currentTab,
          },
        });
        return;
      }

      // Escape - Close dialogs
      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
        return;
      }

      // Don't process other shortcuts when dialog is open or input is focused
      if (isDialogOpen || isInputFocused) {
        // Enter - Confirm action in dialogs
        if (event.key === "Enter" && isDialogOpen) {
          onEnter();
        }
        return;
      }

      switch (event.key) {
        // Tab switching
        case "1":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            onTabSwitch("publicacoes");
            sf4Telemetry.trackTabSwitch(currentTab, "publicacoes");
          }
          break;

        case "2":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            onTabSwitch("movimentacoes");
            sf4Telemetry.trackTabSwitch(currentTab, "movimentacoes");
          }
          break;

        // Clear all filters - C
        case "c":
        case "C":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            onClearFilters();
            sf4Telemetry.trackEvent({
              event_name: "sf4_filter_change",
              properties: {
                shortcut_used: "c_clear_filters",
                action_type: "keyboard_shortcut",
                tab: currentTab,
              },
            });
          }
          break;

        // Refresh - R or F5
        case "r":
        case "R":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            onRefresh();
            sf4Telemetry.trackEvent({
              event_name: "sf4_filter_change",
              properties: {
                shortcut_used: "r_refresh",
                action_type: "keyboard_shortcut",
                tab: currentTab,
              },
            });
          }
          break;

        case "F5":
          event.preventDefault();
          onRefresh();
          sf4Telemetry.trackEvent({
            event_name: "sf4_filter_change",
            properties: {
              shortcut_used: "f5_refresh",
              action_type: "keyboard_shortcut",
              tab: currentTab,
            },
          });
          break;

        // Help - ? or H
        case "?":
        case "h":
        case "H":
          if (!event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            showKeyboardShortcutsHelp();
          }
          break;
      }
    },
    [
      onCommandK,
      onEscape,
      onEnter,
      onTabSwitch,
      onClearFilters,
      onRefresh,
      currentTab,
      isDialogOpen,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Helper function to show keyboard shortcuts
  const showKeyboardShortcutsHelp = useCallback(() => {
    const shortcuts = [
      { key: "Cmd/Ctrl + K", description: "Focar na busca" },
      { key: "1", description: "Aba Publicações" },
      { key: "2", description: "Aba Movimentações" },
      { key: "C", description: "Limpar filtros" },
      { key: "R ou F5", description: "Atualizar dados" },
      { key: "Esc", description: "Fechar modais" },
      { key: "Enter", description: "Confirmar ação em modais" },
      { key: "? ou H", description: "Mostrar atalhos" },
    ];

    const helpText = shortcuts
      .map((s) => `${s.key}: ${s.description}`)
      .join("\n");

    alert(`Atalhos do Teclado - SF-4 Inbox:\n\n${helpText}`);
  }, []);

  return {
    showKeyboardShortcutsHelp,
  };
}

// Focus management utilities for accessibility
export const sf4A11yUtils = {
  // Focus first focusable element in container
  focusFirst: (container: HTMLElement | null) => {
    if (!container) return;

    const focusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ) as HTMLElement;

    if (focusable) {
      focusable.focus();
    }
  },

  // Focus search input specifically
  focusSearch: () => {
    const searchInput = document.querySelector("#search") as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select(); // Select all text for easy replacement
    }
  },

  // Announce to screen readers
  announce: (message: string) => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Set page title for better navigation
  setPageTitle: (title: string) => {
    document.title = `${title} - SF-4 Inbox Legal`;
  },

  // Focus management for modal dialogs
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);

    // Focus first element when modal opens
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  },

  // Generate accessible labels for data
  getAccessibleDate: (dateString: string | null): string => {
    if (!dateString) return "Data não informada";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Data inválida";
    }
  },

  // Generate accessible descriptions for actions
  getActionDescription: (
    action: string,
    itemType: string,
    cnj?: string,
  ): string => {
    const processInfo = cnj ? ` do processo ${cnj}` : " sem processo vinculado";

    switch (action) {
      case "vincular":
        return `Vincular ${itemType}${processInfo} a um número CNJ`;
      case "criar_etapa":
        return `Criar nova etapa na jornada${processInfo}`;
      case "notificar":
        return `Notificar responsável sobre ${itemType}${processInfo}`;
      case "buscar_cadastrar":
        return `Buscar informações adicionais e cadastrar${processInfo}`;
      default:
        return `Ação em ${itemType}${processInfo}`;
    }
  },
};
