/**
 * SISTEMA NEUTRO DEFINITIVO - ZERO YELLOW GUARANTEED
 * Sistema de cores exclusivamente preto/branco com configuração admin
 */

// Tema Neutro Absoluto - Sem possibilidade de amarelo
export const NEUTRAL_THEME = {
  light: {
    // Cores primárias - apenas tons de cinza
    primary: "#000000", // Preto absoluto
    primaryHover: "#1f2937", // Cinza escuro
    primaryLight: "#f9fafb", // Cinza muito claro

    // Fundos - apenas branco/cinza
    background: "#ffffff", // Branco puro
    backgroundSecondary: "#f9fafb", // Cinza muito claro
    backgroundTertiary: "#f3f4f6", // Cinza claro

    // Textos - apenas preto/cinza
    text: "#000000", // Preto absoluto
    textSecondary: "#374151", // Cinza médio
    textMuted: "#6b7280", // Cinza claro

    // Bordas - apenas cinza
    border: "#e5e7eb", // Cinza borda
    borderHover: "#d1d5db", // Cinza borda hover

    // Estados - sem amarelo/dourado
    success: "#059669", // Verde puro
    danger: "#dc2626", // Vermelho puro
    warning: "#7c2d12", // Marrom (sem amarelo)
    info: "#1e40af", // Azul puro
  },

  dark: {
    // Cores primárias - apenas brancos/cinzas
    primary: "#ffffff", // Branco absoluto
    primaryHover: "#f3f4f6", // Cinza muito claro
    primaryLight: "#1f2937", // Cinza escuro

    // Fundos - apenas preto/cinza escuro
    background: "#000000", // Preto absoluto
    backgroundSecondary: "#111827", // Cinza muito escuro
    backgroundTertiary: "#1f2937", // Cinza escuro

    // Textos - apenas branco/cinza
    text: "#ffffff", // Branco absoluto
    textSecondary: "#d1d5db", // Cinza claro
    textMuted: "#9ca3af", // Cinza médio

    // Bordas - apenas cinza escuro
    border: "#374151", // Cinza escuro
    borderHover: "#4b5563", // Cinza médio

    // Estados - sem amarelo/dourado
    success: "#10b981", // Verde claro
    danger: "#ef4444", // Vermelho claro
    warning: "#92400e", // Marrom escuro (sem amarelo)
    info: "#3b82f6", // Azul claro
  },
} as const;

// Configuração de Branding Admin (vazia por padrão)
export interface AdminBrandConfig {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  companyName?: string;
}

export const DEFAULT_ADMIN_BRAND: AdminBrandConfig = {
  enabled: false, // Por padrão, usa apenas neutro
  primaryColor: "#000000",
  secondaryColor: "#6b7280",
  accentColor: "#1f2937",
  companyName: "LegalFlow",
};

// Lista de cores completamente BANIDAS
export const FORBIDDEN_COLORS = [
  // Todos os amarelos
  "#ffff00",
  "#ffd700",
  "#ffb347",
  "#ffa500",
  "#ff8c00",
  "#daa520",
  "#b8860b",
  "#fff8dc",
  "#fffacd",
  "#ffffe0",
  "#fffff0",
  "#ffefd5",
  "#ffe4b5",
  "#ffdab9",
  "#eee8aa",
  "#f0e68c",
  "#bdb76b",
  "#f5deb3",
  "#ffe4e1",
  "#faf0e6",
  // Todos os limes/verdes claros
  "#32cd32",
  "#00ff00",
  "#adff2f",
  "#9acd32",
  "#90ee90",
  "#98fb98",
  "#00fa9a",
  "#00ff7f",
  "#7cfc00",
  "#7fff00",
  "#ccff00",
  "#c0ff8c",
  // Beiges e tons quentes que podem aparecer amarelos
  "#f5f5dc",
  "#ffe4c4",
  "#ffdead",
  "#d2b48c",
  "#deb887",
  "#f4a460",
  "#cd853f",
];

export type NeutralThemeMode = "light" | "dark";
export type NeutralTheme = typeof NEUTRAL_THEME;
