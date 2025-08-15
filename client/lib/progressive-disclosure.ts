/**
 * Progressive Disclosure Utilities
 * F1.0 - Padrão UX para revelação gradual de informações
 */

import { useState, useCallback } from 'react';

// Hook para gerenciar states de progressive disclosure
export function useProgressiveDisclosure(initialExpanded = false) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);
  
  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);
  
  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    setIsExpanded
  };
}

// Hook para multiple disclosure panels
export function useMultipleDisclosure<T extends string>(
  keys: T[],
  initialState: Record<T, boolean> = {} as Record<T, boolean>
) {
  const [state, setState] = useState<Record<T, boolean>>(() => {
    const initial = {} as Record<T, boolean>;
    keys.forEach(key => {
      initial[key] = initialState[key] ?? false;
    });
    return initial;
  });
  
  const toggle = useCallback((key: T) => {
    setState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);
  
  const expand = useCallback((key: T) => {
    setState(prev => ({
      ...prev,
      [key]: true
    }));
  }, []);
  
  const collapse = useCallback((key: T) => {
    setState(prev => ({
      ...prev,
      [key]: false
    }));
  }, []);
  
  const expandAll = useCallback(() => {
    setState(prev => {
      const newState = {} as Record<T, boolean>;
      keys.forEach(key => {
        newState[key] = true;
      });
      return newState;
    });
  }, [keys]);
  
  const collapseAll = useCallback(() => {
    setState(prev => {
      const newState = {} as Record<T, boolean>;
      keys.forEach(key => {
        newState[key] = false;
      });
      return newState;
    });
  }, [keys]);
  
  return {
    state,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
    isExpanded: (key: T) => state[key] ?? false
  };
}

// Configurações de disclosure por contexto
export const disclosurePresets = {
  // Processo Detail - revelar gradualmente seções
  processoDetail: {
    basicInfo: true,    // Sempre visível
    timeline: false,    // Expandir sob demanda
    documents: false,   // Expandir sob demanda
    parties: false,     // Expandir sob demanda
    financials: false,  // Expandir sob demanda
    monitoring: false   // Expandir sob demanda
  },
  
  // Cliente Profile - revelação progressiva
  clienteProfile: {
    basicInfo: true,    // Sempre visível
    processes: false,   // Expandir sob demanda
    activities: false,  // Expandir sob demanda
    journey: false,     // Expandir sob demanda
    payments: false     // Expandir sob demanda
  },
  
  // Dashboard cards - progressive details
  dashboard: {
    quickStats: true,   // Sempre visível
    recentActivity: true, // Sempre visível
    detailedCharts: false, // Expandir sob demanda
    systemHealth: false   // Expandir sob demanda
  },
  
  // Inbox - filtros e detalhes progressivos
  inbox: {
    basicFilters: true,   // Sempre visível
    advancedFilters: false, // Expandir sob demanda
    bulkActions: false,     // Expandir sob demanda
    messageDetails: false   // Expandir sob demanda
  }
} as const;

// Utility para salvar estado no localStorage
export function usePersistedDisclosure(key: string, initialExpanded = false) {
  const getStoredValue = (): boolean => {
    try {
      const stored = localStorage.getItem(`disclosure-${key}`);
      return stored ? JSON.parse(stored) : initialExpanded;
    } catch {
      return initialExpanded;
    }
  };
  
  const [isExpanded, setIsExpanded] = useState(getStoredValue);
  
  const toggle = useCallback(() => {
    setIsExpanded(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem(`disclosure-${key}`, JSON.stringify(newValue));
      } catch {
        // Ignore localStorage errors
      }
      return newValue;
    });
  }, [key]);
  
  const expand = useCallback(() => {
    setIsExpanded(true);
    try {
      localStorage.setItem(`disclosure-${key}`, JSON.stringify(true));
    } catch {
      // Ignore localStorage errors
    }
  }, [key]);
  
  const collapse = useCallback(() => {
    setIsExpanded(false);
    try {
      localStorage.setItem(`disclosure-${key}`, JSON.stringify(false));
    } catch {
      // Ignore localStorage errors
    }
  }, [key]);
  
  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    setIsExpanded
  };
}

// Classes CSS utilitárias para animações de disclosure
export const disclosureClasses = {
  trigger: "cursor-pointer select-none transition-colors hover:bg-gray-50 focus:bg-gray-50",
  content: "transition-all duration-200 ease-in-out overflow-hidden",
  expanded: "opacity-100 max-h-screen",
  collapsed: "opacity-0 max-h-0",
  icon: "transition-transform duration-200 ease-in-out",
  iconExpanded: "rotate-180",
  iconCollapsed: "rotate-0"
};
