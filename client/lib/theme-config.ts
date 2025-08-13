/**
 * Sistema Centralizado de Configuração de Branding
 * Bloqueia qualquer cor não aprovada e força consistência total
 */

// Paleta de cores APROVADAS - Hermida Maia Advocacia
export const APPROVED_BRAND_COLORS = {
  // Verde Hermida Maia - Cores principais (anti-yellow optimized)
  primary: {
    50: "#f0f7f4", // Mais verde, menos amarelo
    100: "#dcf0e6", // Verde mais puro
    200: "#d3e7df",
    300: "#b0d4c4",
    400: "#86bda4",
    500: "#62a285",
    600: "#4d8169",
    700: "#285245", // COR PRINCIPAL
    800: "#214239",
    900: "#1b3a2f",
  },

  // Cores neutras (cinza controlado)
  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Status colors (específicos e controlados)
  status: {
    success: "#16a34a",
    warning: "#d97706", // Controlado - não amarelo
    danger: "#ef4444",
    info: "#285245", // Usa a cor principal
  },

  // Superfícies (fundos)
  surface: {
    light: "#ffffff",
    lighter: "#f9fafb",
    dark: "#0f1114",
    darker: "#0a0a0b",
  },
} as const;

// Configuração de temas
export const THEME_CONFIG = {
  light: {
    primary: APPROVED_BRAND_COLORS.primary[700],
    primaryHover: APPROVED_BRAND_COLORS.primary[900],
    primaryLight: APPROVED_BRAND_COLORS.primary[100],

    background: APPROVED_BRAND_COLORS.surface.light,
    backgroundSecondary: APPROVED_BRAND_COLORS.surface.lighter,

    text: APPROVED_BRAND_COLORS.neutral[900],
    textSecondary: APPROVED_BRAND_COLORS.neutral[600],
    textMuted: APPROVED_BRAND_COLORS.neutral[500],

    border: APPROVED_BRAND_COLORS.neutral[200],
    borderHover: APPROVED_BRAND_COLORS.primary[200],

    success: APPROVED_BRAND_COLORS.status.success,
    warning: APPROVED_BRAND_COLORS.status.warning,
    danger: APPROVED_BRAND_COLORS.status.danger,
    info: APPROVED_BRAND_COLORS.status.info,
  },

  dark: {
    primary: APPROVED_BRAND_COLORS.primary[400],
    primaryHover: APPROVED_BRAND_COLORS.primary[300],
    primaryLight: APPROVED_BRAND_COLORS.primary[900],

    background: APPROVED_BRAND_COLORS.surface.dark,
    backgroundSecondary: APPROVED_BRAND_COLORS.surface.darker,

    text: APPROVED_BRAND_COLORS.neutral[100],
    textSecondary: APPROVED_BRAND_COLORS.neutral[300],
    textMuted: APPROVED_BRAND_COLORS.neutral[400],

    border: APPROVED_BRAND_COLORS.neutral[700],
    borderHover: APPROVED_BRAND_COLORS.primary[600],

    success: APPROVED_BRAND_COLORS.status.success,
    warning: APPROVED_BRAND_COLORS.status.warning,
    danger: APPROVED_BRAND_COLORS.status.danger,
    info: APPROVED_BRAND_COLORS.primary[400],
  },
} as const;

// Lista de cores PROIBIDAS (bloqueadas)
export const BLOCKED_COLORS = [
  // Amarelos/Ambers PROIBIDOS
  "#ffff00",
  "#ffd700",
  "#ffb347",
  "#ffa500",
  "#ff8c00",
  "#fff8dc",
  "#fffacd",
  "#ffffe0",
  "#fffff0",
  "#ffefd5",
  // Limes PROIBIDOS
  "#32cd32",
  "#00ff00",
  "#adff2f",
  "#9acd32",
  "#90ee90",
  // Outros não aprovados
  "#ff69b4",
  "#ff1493",
  "#dc143c",
  "#8a2be2",
] as const;

export type ThemeMode = "light" | "dark";
export type ApprovedColors = typeof APPROVED_BRAND_COLORS;
export type ThemeConfig = typeof THEME_CONFIG;
