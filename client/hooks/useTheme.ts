import { createContext, useContext, useEffect, useState } from "react";
import {
  THEME_CONFIG,
  APPROVED_BRAND_COLORS,
  BLOCKED_COLORS,
  type ThemeMode,
} from "../lib/theme-config";

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  colors: typeof THEME_CONFIG.light | typeof THEME_CONFIG.dark;
  isColorApproved: (color: string) => boolean;
  getApprovedColor: (color: string) => string;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Hook para validação rigorosa de cores
export function useColorValidation() {
  const isColorApproved = (color: string): boolean => {
    // Normaliza a cor
    const normalizedColor = color.toLowerCase().trim();

    // Verifica se está na lista de cores bloqueadas
    if (BLOCKED_COLORS.includes(normalizedColor as any)) {
      console.warn(`🚫 Cor bloqueada detectada: ${color}`);
      return false;
    }

    // Verifica se contém termos proibidos
    const forbiddenTerms = ["yellow", "amber", "gold", "lime", "chartreuse"];
    if (forbiddenTerms.some((term) => normalizedColor.includes(term))) {
      console.warn(`🚫 Termo proibido detectado na cor: ${color}`);
      return false;
    }

    // Verifica se está nas cores aprovadas
    const allApprovedColors = Object.values(APPROVED_BRAND_COLORS).flatMap(
      (palette) =>
        typeof palette === "object" ? Object.values(palette) : [palette],
    );

    return allApprovedColors.includes(normalizedColor);
  };

  const getApprovedColor = (requestedColor: string): string => {
    if (isColorApproved(requestedColor)) {
      return requestedColor;
    }

    // Se não aprovada, retorna cor principal como fallback
    console.warn(
      `🔄 Cor não aprovada "${requestedColor}" substituída por cor principal`,
    );
    return APPROVED_BRAND_COLORS.primary[700];
  };

  return { isColorApproved, getApprovedColor };
}

// Sistema de detecção de preferência do usuário
export function useSystemTheme(): ThemeMode {
  const [systemTheme, setSystemTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return systemTheme;
}

// Aplicação das CSS custom properties
export function applyThemeToCSSVariables(mode: ThemeMode) {
  const colors = THEME_CONFIG[mode];
  const root = document.documentElement;

  // Aplica todas as variáveis CSS
  root.style.setProperty("--theme-primary", colors.primary);
  root.style.setProperty("--theme-primary-hover", colors.primaryHover);
  root.style.setProperty("--theme-primary-light", colors.primaryLight);
  root.style.setProperty("--theme-background", colors.background);
  root.style.setProperty(
    "--theme-background-secondary",
    colors.backgroundSecondary,
  );
  root.style.setProperty("--theme-text", colors.text);
  root.style.setProperty("--theme-text-secondary", colors.textSecondary);
  root.style.setProperty("--theme-text-muted", colors.textMuted);
  root.style.setProperty("--theme-border", colors.border);
  root.style.setProperty("--theme-border-hover", colors.borderHover);
  root.style.setProperty("--theme-success", colors.success);
  root.style.setProperty("--theme-warning", colors.warning);
  root.style.setProperty("--theme-danger", colors.danger);
  root.style.setProperty("--theme-info", colors.info);

  // Adiciona classe de tema no body
  document.body.className = document.body.className.replace(/theme-\w+/g, "");
  document.body.classList.add(`theme-${mode}`);
}
