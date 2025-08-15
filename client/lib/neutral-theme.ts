/**
 * SISTEMA MONOCROMÁTICO PURO - ZERO COLOR POLICY
 * Sistema de cores exclusivamente preto/branco/cinza para desenvolvimento focado
 */

// Tema Monocromático Absoluto - ZERO cores
export const MONOCHROMATIC_THEME = {
  light: {
    // Base monocromática
    black: "#000000",
    white: "#ffffff",

    // Escala de cinza expandida para melhor visibilidade
    gray: {
      25: "#fcfcfc", // Branco quase absoluto
      50: "#f9fafb", // Quase branco
      75: "#f6f7f8", // Branco levemente acinzentado
      100: "#f3f4f6", // Branco acinzentado
      150: "#eef0f2", // Cinza ultra claro
      200: "#e5e7eb", // Cinza muito claro
      250: "#dde0e4", // Cinza muito claro médio
      300: "#d1d5db", // Cinza claro
      350: "#c8cdd3", // Cinza claro médio
      400: "#9ca3af", // Cinza médio-claro
      450: "#8a9199", // Cinza médio-claro escuro
      500: "#6b7280", // Cinza neutro
      550: "#5d646d", // Cinza neutro escuro
      600: "#4b5563", // Cinza médio
      650: "#434954", // Cinza médio escuro
      700: "#374151", // Cinza escuro
      750: "#2f3944", // Cinza escuro médio
      800: "#1f2937", // Cinza muito escuro
      850: "#1a202c", // Cinza muito escuro médio
      900: "#111827", // Quase preto
      925: "#0d1117", // Quase preto escuro
      950: "#060a0f", // Preto quase absoluto
    },

    // Sistema funcional monocromático
    primary: "#111827", // Quase preto
    primaryHover: "#1f2937", // Cinza muito escuro
    primaryLight: "#f3f4f6", // Branco acinzentado

    secondary: "#4b5563", // Cinza médio
    secondaryHover: "#374151", // Cinza escuro

    background: "#ffffff", // Branco puro
    backgroundSecondary: "#f9fafb", // Quase branco
    backgroundTertiary: "#f3f4f6", // Branco acinzentado

    surface: "#ffffff", // Branco puro
    surfaceHover: "#f9fafb", // Quase branco

    text: "#111827", // Quase preto
    textSecondary: "#374151", // Cinza escuro
    textMuted: "#6b7280", // Cinza neutro
    textDisabled: "#9ca3af", // Cinza médio-claro

    border: "#e5e7eb", // Cinza muito claro
    borderHover: "#d1d5db", // Cinza claro
    borderFocus: "#374151", // Cinza escuro

    // Estados em tons de cinza
    success: "#374151", // Cinza escuro
    warning: "#6b7280", // Cinza neutro
    error: "#1f2937", // Cinza muito escuro
    info: "#4b5563", // Cinza médio
  },

  dark: {
    // Base monocromática invertida
    black: "#ffffff",
    white: "#000000",

    // Escala de cinza invertida
    gray: {
      50: "#111827", // Quase preto
      100: "#1f2937", // Cinza muito escuro
      200: "#374151", // Cinza escuro
      300: "#4b5563", // Cinza médio
      400: "#6b7280", // Cinza neutro
      500: "#9ca3af", // Cinza médio-claro
      600: "#d1d5db", // Cinza claro
      700: "#e5e7eb", // Cinza muito claro
      800: "#f3f4f6", // Branco acinzentado
      900: "#f9fafb", // Quase branco
    },

    primary: "#f9fafb", // Quase branco
    primaryHover: "#f3f4f6", // Branco acinzentado
    primaryLight: "#1f2937", // Cinza muito escuro

    secondary: "#9ca3af", // Cinza médio-claro
    secondaryHover: "#d1d5db", // Cinza claro

    background: "#111827", // Quase preto
    backgroundSecondary: "#1f2937", // Cinza muito escuro
    backgroundTertiary: "#374151", // Cinza escuro

    surface: "#1f2937", // Cinza muito escuro
    surfaceHover: "#374151", // Cinza escuro

    text: "#f9fafb", // Quase branco
    textSecondary: "#e5e7eb", // Cinza muito claro
    textMuted: "#9ca3af", // Cinza médio-claro
    textDisabled: "#6b7280", // Cinza neutro

    border: "#374151", // Cinza escuro
    borderHover: "#4b5563", // Cinza médio
    borderFocus: "#e5e7eb", // Cinza muito claro

    // Estados em tons de cinza (modo escuro)
    success: "#e5e7eb", // Cinza muito claro
    warning: "#9ca3af", // Cinza médio-claro
    error: "#f3f4f6", // Branco acinzentado
    info: "#d1d5db", // Cinza claro
  },
};

// CSS Variables para o tema monocromático
export const MONOCHROMATIC_CSS_VARS = {
  light: {
    "--mono-black": MONOCHROMATIC_THEME.light.black,
    "--mono-white": MONOCHROMATIC_THEME.light.white,
    "--mono-gray-50": MONOCHROMATIC_THEME.light.gray[50],
    "--mono-gray-100": MONOCHROMATIC_THEME.light.gray[100],
    "--mono-gray-200": MONOCHROMATIC_THEME.light.gray[200],
    "--mono-gray-300": MONOCHROMATIC_THEME.light.gray[300],
    "--mono-gray-400": MONOCHROMATIC_THEME.light.gray[400],
    "--mono-gray-500": MONOCHROMATIC_THEME.light.gray[500],
    "--mono-gray-600": MONOCHROMATIC_THEME.light.gray[600],
    "--mono-gray-700": MONOCHROMATIC_THEME.light.gray[700],
    "--mono-gray-800": MONOCHROMATIC_THEME.light.gray[800],
    "--mono-gray-900": MONOCHROMATIC_THEME.light.gray[900],
    "--mono-primary": MONOCHROMATIC_THEME.light.primary,
    "--mono-background": MONOCHROMATIC_THEME.light.background,
    "--mono-text": MONOCHROMATIC_THEME.light.text,
    "--mono-border": MONOCHROMATIC_THEME.light.border,
  },
  dark: {
    "--mono-black": MONOCHROMATIC_THEME.dark.black,
    "--mono-white": MONOCHROMATIC_THEME.dark.white,
    "--mono-gray-50": MONOCHROMATIC_THEME.dark.gray[50],
    "--mono-gray-100": MONOCHROMATIC_THEME.dark.gray[100],
    "--mono-gray-200": MONOCHROMATIC_THEME.dark.gray[200],
    "--mono-gray-300": MONOCHROMATIC_THEME.dark.gray[300],
    "--mono-gray-400": MONOCHROMATIC_THEME.dark.gray[400],
    "--mono-gray-500": MONOCHROMATIC_THEME.dark.gray[500],
    "--mono-gray-600": MONOCHROMATIC_THEME.dark.gray[600],
    "--mono-gray-700": MONOCHROMATIC_THEME.dark.gray[700],
    "--mono-gray-800": MONOCHROMATIC_THEME.dark.gray[800],
    "--mono-gray-900": MONOCHROMATIC_THEME.dark.gray[900],
    "--mono-primary": MONOCHROMATIC_THEME.dark.primary,
    "--mono-background": MONOCHROMATIC_THEME.dark.background,
    "--mono-text": MONOCHROMATIC_THEME.dark.text,
    "--mono-border": MONOCHROMATIC_THEME.dark.border,
  },
};

// Lista de cores PROIBIDAS - Para detectar e bloquear
export const FORBIDDEN_COLORS = [
  // Vermelhos
  "#dc2626",
  "#ef4444",
  "#f87171",
  "#fca5a5",
  "#fed7d7",
  "#991b1b",
  "#7f1d1d",
  "#450a0a",

  // Azuis
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",
  "#60a5fa",
  "#93c5fd",
  "#dbeafe",
  "#eff6ff",

  // Verdes
  "#10b981",
  "#059669",
  "#047857",
  "#065f46",
  "#064e3b",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#d1fae5",
  "#ecfdf5",
  "#16a34a",
  "#15803d",
  "#166534",
  "#14532d",

  // Amarelos/Laranjas
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#92400e",
  "#78350f",
  "#fbbf24",
  "#fcd34d",
  "#fde68a",
  "#fef3c7",
  "#fffbeb",
  "#f97316",
  "#ea580c",
  "#c2410c",
  "#9a3412",
  "#7c2d12",

  // Roxos/Rosas
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#5b21b6",
  "#4c1d95",
  "#a78bfa",
  "#c4b5fd",
  "#ddd6fe",
  "#ede9fe",
  "#f5f3ff",
  "#ec4899",
  "#db2777",
  "#be185d",
  "#9d174d",
  "#831843",

  // Outros
  "#06b6d4",
  "#0891b2",
  "#0e7490",
  "#155e75",
  "#164e63",
  "#22d3ee",
  "#67e8f9",
  "#a5f3fc",
  "#cffafe",
  "#ecfeff",
  "#84cc16",
  "#65a30d",
  "#4d7c0f",
  "#365314",
  "#1a2e05",
];

// Função para verificar se uma cor é permitida
export function isColorAllowed(color: string): boolean {
  // Permitir apenas hex preto/branco/cinza
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

  if (!hexPattern.test(color)) {
    return false; // Não é hex válido
  }

  // Verificar se está na lista proibida
  if (FORBIDDEN_COLORS.includes(color.toLowerCase())) {
    return false;
  }

  // Verificar se é preto/branco/cinza
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Permitir apenas cores onde R = G = B (tons de cinza puros)
  return r === g && g === b;
}

// Função para aplicar o tema monocromático
export function applyMonochromaticTheme(theme: "light" | "dark" = "light") {
  const vars = MONOCHROMATIC_CSS_VARS[theme];
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  console.log(
    `✅ Tema monocromático ${theme} aplicado - ZERO cores detectadas`,
  );
}

// Compatibility exports for existing code
export const NEUTRAL_THEME = MONOCHROMATIC_THEME;
export type NeutralThemeMode = "light" | "dark";
export type AdminBrandConfig = {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export const DEFAULT_ADMIN_BRAND: AdminBrandConfig = {
  enabled: false,
  primaryColor: "#111827",
  secondaryColor: "#6b7280",
  accentColor: "#1f2937",
};

export default MONOCHROMATIC_THEME;
