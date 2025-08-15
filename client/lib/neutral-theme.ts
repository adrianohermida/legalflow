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

    // Sistema funcional monocromático aprimorado
    primary: "#0d1117", // Preto quase absoluto
    primaryHover: "#111827", // Quase preto
    primaryLight: "#f6f7f8", // Branco levemente acinzentado
    primaryActive: "#060a0f", // Preto absoluto

    secondary: "#4b5563", // Cinza médio
    secondaryHover: "#374151", // Cinza escuro
    secondaryLight: "#eef0f2", // Cinza ultra claro
    secondaryActive: "#434954", // Cinza médio escuro

    background: "#ffffff", // Branco puro
    backgroundSecondary: "#fcfcfc", // Branco quase absoluto
    backgroundTertiary: "#f9fafb", // Quase branco
    backgroundQuaternary: "#f6f7f8", // Branco levemente acinzentado

    surface: "#ffffff", // Branco puro
    surfaceHover: "#fcfcfc", // Branco quase absoluto
    surfaceActive: "#f9fafb", // Quase branco
    surfaceElevated: "#fcfcfc", // Branco quase absoluto

    text: "#0d1117", // Preto quase absoluto
    textSecondary: "#374151", // Cinza escuro
    textTertiary: "#4b5563", // Cinza médio
    textMuted: "#6b7280", // Cinza neutro
    textDisabled: "#9ca3af", // Cinza médio-claro
    textPlaceholder: "#c8cdd3", // Cinza claro médio

    border: "#e5e7eb", // Cinza muito claro
    borderSecondary: "#dde0e4", // Cinza muito claro médio
    borderHover: "#d1d5db", // Cinza claro
    borderFocus: "#374151", // Cinza escuro
    borderActive: "#2f3944", // Cinza escuro médio

    // Estados em tons de cinza com melhor diferenciação
    success: "#2f3944", // Cinza escuro médio
    successLight: "#eef0f2", // Cinza ultra claro
    warning: "#5d646d", // Cinza neutro escuro
    warningLight: "#f3f4f6", // Branco acinzentado
    error: "#111827", // Quase preto
    errorLight: "#f6f7f8", // Branco levemente acinzentado
    info: "#434954", // Cinza médio escuro
    infoLight: "#f9fafb", // Quase branco
  },

  dark: {
    // Base monocromática invertida
    black: "#ffffff",
    white: "#000000",

    // Escala de cinza invertida expandida
    gray: {
      25: "#060a0f", // Preto quase absoluto
      50: "#0d1117", // Preto quase absoluto
      75: "#111827", // Quase preto
      100: "#1a202c", // Cinza muito escuro médio
      150: "#1f2937", // Cinza muito escuro
      200: "#2f3944", // Cinza escuro médio
      250: "#374151", // Cinza escuro
      300: "#434954", // Cinza médio escuro
      350: "#4b5563", // Cinza médio
      400: "#5d646d", // Cinza neutro escuro
      450: "#6b7280", // Cinza neutro
      500: "#8a9199", // Cinza médio-claro escuro
      550: "#9ca3af", // Cinza médio-claro
      600: "#c8cdd3", // Cinza claro médio
      650: "#d1d5db", // Cinza claro
      700: "#dde0e4", // Cinza muito claro médio
      750: "#e5e7eb", // Cinza muito claro
      800: "#eef0f2", // Cinza ultra claro
      850: "#f3f4f6", // Branco acinzentado
      900: "#f6f7f8", // Branco levemente acinzentado
      925: "#f9fafb", // Quase branco
      950: "#fcfcfc", // Branco quase absoluto
    },

    // Sistema funcional monocromático aprimorado (modo escuro)
    primary: "#fcfcfc", // Branco quase absoluto
    primaryHover: "#f9fafb", // Quase branco
    primaryLight: "#1a202c", // Cinza muito escuro médio
    primaryActive: "#ffffff", // Branco absoluto

    secondary: "#9ca3af", // Cinza médio-claro
    secondaryHover: "#d1d5db", // Cinza claro
    secondaryLight: "#2f3944", // Cinza escuro médio
    secondaryActive: "#8a9199", // Cinza médio-claro escuro

    background: "#0d1117", // Preto quase absoluto
    backgroundSecondary: "#060a0f", // Preto absoluto
    backgroundTertiary: "#111827", // Quase preto
    backgroundQuaternary: "#1a202c", // Cinza muito escuro médio

    surface: "#1a202c", // Cinza muito escuro médio
    surfaceHover: "#1f2937", // Cinza muito escuro
    surfaceActive: "#2f3944", // Cinza escuro médio
    surfaceElevated: "#111827", // Quase preto

    text: "#fcfcfc", // Branco quase absoluto
    textSecondary: "#e5e7eb", // Cinza muito claro
    textTertiary: "#d1d5db", // Cinza claro
    textMuted: "#9ca3af", // Cinza médio-claro
    textDisabled: "#6b7280", // Cinza neutro
    textPlaceholder: "#5d646d", // Cinza neutro escuro

    border: "#374151", // Cinza escuro
    borderSecondary: "#2f3944", // Cinza escuro médio
    borderHover: "#4b5563", // Cinza médio
    borderFocus: "#e5e7eb", // Cinza muito claro
    borderActive: "#434954", // Cinza médio escuro

    // Estados em tons de cinza (modo escuro) com melhor diferenciação
    success: "#dde0e4", // Cinza muito claro médio
    successLight: "#2f3944", // Cinza escuro médio
    warning: "#c8cdd3", // Cinza claro médio
    warningLight: "#1f2937", // Cinza muito escuro
    error: "#f6f7f8", // Branco levemente acinzentado
    errorLight: "#1a202c", // Cinza muito escuro médio
    info: "#d1d5db", // Cinza claro
    infoLight: "#111827", // Quase preto
  },
};

// CSS Variables expandidas para o tema monocromático
export const MONOCHROMATIC_CSS_VARS = {
  light: {
    // Cores base
    "--mono-black": MONOCHROMATIC_THEME.light.black,
    "--mono-white": MONOCHROMATIC_THEME.light.white,

    // Escala de cinza completa
    "--mono-gray-25": MONOCHROMATIC_THEME.light.gray[25],
    "--mono-gray-50": MONOCHROMATIC_THEME.light.gray[50],
    "--mono-gray-75": MONOCHROMATIC_THEME.light.gray[75],
    "--mono-gray-100": MONOCHROMATIC_THEME.light.gray[100],
    "--mono-gray-150": MONOCHROMATIC_THEME.light.gray[150],
    "--mono-gray-200": MONOCHROMATIC_THEME.light.gray[200],
    "--mono-gray-250": MONOCHROMATIC_THEME.light.gray[250],
    "--mono-gray-300": MONOCHROMATIC_THEME.light.gray[300],
    "--mono-gray-350": MONOCHROMATIC_THEME.light.gray[350],
    "--mono-gray-400": MONOCHROMATIC_THEME.light.gray[400],
    "--mono-gray-450": MONOCHROMATIC_THEME.light.gray[450],
    "--mono-gray-500": MONOCHROMATIC_THEME.light.gray[500],
    "--mono-gray-550": MONOCHROMATIC_THEME.light.gray[550],
    "--mono-gray-600": MONOCHROMATIC_THEME.light.gray[600],
    "--mono-gray-650": MONOCHROMATIC_THEME.light.gray[650],
    "--mono-gray-700": MONOCHROMATIC_THEME.light.gray[700],
    "--mono-gray-750": MONOCHROMATIC_THEME.light.gray[750],
    "--mono-gray-800": MONOCHROMATIC_THEME.light.gray[800],
    "--mono-gray-850": MONOCHROMATIC_THEME.light.gray[850],
    "--mono-gray-900": MONOCHROMATIC_THEME.light.gray[900],
    "--mono-gray-925": MONOCHROMATIC_THEME.light.gray[925],
    "--mono-gray-950": MONOCHROMATIC_THEME.light.gray[950],

    // Cores funcionais
    "--mono-primary": MONOCHROMATIC_THEME.light.primary,
    "--mono-primary-hover": MONOCHROMATIC_THEME.light.primaryHover,
    "--mono-primary-light": MONOCHROMATIC_THEME.light.primaryLight,
    "--mono-primary-active": MONOCHROMATIC_THEME.light.primaryActive,

    "--mono-secondary": MONOCHROMATIC_THEME.light.secondary,
    "--mono-secondary-hover": MONOCHROMATIC_THEME.light.secondaryHover,
    "--mono-secondary-light": MONOCHROMATIC_THEME.light.secondaryLight,
    "--mono-secondary-active": MONOCHROMATIC_THEME.light.secondaryActive,

    // Backgrounds
    "--mono-background": MONOCHROMATIC_THEME.light.background,
    "--mono-background-secondary":
      MONOCHROMATIC_THEME.light.backgroundSecondary,
    "--mono-background-tertiary": MONOCHROMATIC_THEME.light.backgroundTertiary,
    "--mono-background-quaternary":
      MONOCHROMATIC_THEME.light.backgroundQuaternary,

    // Surfaces
    "--mono-surface": MONOCHROMATIC_THEME.light.surface,
    "--mono-surface-hover": MONOCHROMATIC_THEME.light.surfaceHover,
    "--mono-surface-active": MONOCHROMATIC_THEME.light.surfaceActive,
    "--mono-surface-elevated": MONOCHROMATIC_THEME.light.surfaceElevated,

    // Textos
    "--mono-text": MONOCHROMATIC_THEME.light.text,
    "--mono-text-secondary": MONOCHROMATIC_THEME.light.textSecondary,
    "--mono-text-tertiary": MONOCHROMATIC_THEME.light.textTertiary,
    "--mono-text-muted": MONOCHROMATIC_THEME.light.textMuted,
    "--mono-text-disabled": MONOCHROMATIC_THEME.light.textDisabled,
    "--mono-text-placeholder": MONOCHROMATIC_THEME.light.textPlaceholder,

    // Bordas
    "--mono-border": MONOCHROMATIC_THEME.light.border,
    "--mono-border-secondary": MONOCHROMATIC_THEME.light.borderSecondary,
    "--mono-border-hover": MONOCHROMATIC_THEME.light.borderHover,
    "--mono-border-focus": MONOCHROMATIC_THEME.light.borderFocus,
    "--mono-border-active": MONOCHROMATIC_THEME.light.borderActive,

    // Estados
    "--mono-success": MONOCHROMATIC_THEME.light.success,
    "--mono-success-light": MONOCHROMATIC_THEME.light.successLight,
    "--mono-warning": MONOCHROMATIC_THEME.light.warning,
    "--mono-warning-light": MONOCHROMATIC_THEME.light.warningLight,
    "--mono-error": MONOCHROMATIC_THEME.light.error,
    "--mono-error-light": MONOCHROMATIC_THEME.light.errorLight,
    "--mono-info": MONOCHROMATIC_THEME.light.info,
    "--mono-info-light": MONOCHROMATIC_THEME.light.infoLight,
  },
  dark: {
    // Cores base (invertidas)
    "--mono-black": MONOCHROMATIC_THEME.dark.black,
    "--mono-white": MONOCHROMATIC_THEME.dark.white,

    // Escala de cinza invertida completa
    "--mono-gray-25": MONOCHROMATIC_THEME.dark.gray[25],
    "--mono-gray-50": MONOCHROMATIC_THEME.dark.gray[50],
    "--mono-gray-75": MONOCHROMATIC_THEME.dark.gray[75],
    "--mono-gray-100": MONOCHROMATIC_THEME.dark.gray[100],
    "--mono-gray-150": MONOCHROMATIC_THEME.dark.gray[150],
    "--mono-gray-200": MONOCHROMATIC_THEME.dark.gray[200],
    "--mono-gray-250": MONOCHROMATIC_THEME.dark.gray[250],
    "--mono-gray-300": MONOCHROMATIC_THEME.dark.gray[300],
    "--mono-gray-350": MONOCHROMATIC_THEME.dark.gray[350],
    "--mono-gray-400": MONOCHROMATIC_THEME.dark.gray[400],
    "--mono-gray-450": MONOCHROMATIC_THEME.dark.gray[450],
    "--mono-gray-500": MONOCHROMATIC_THEME.dark.gray[500],
    "--mono-gray-550": MONOCHROMATIC_THEME.dark.gray[550],
    "--mono-gray-600": MONOCHROMATIC_THEME.dark.gray[600],
    "--mono-gray-650": MONOCHROMATIC_THEME.dark.gray[650],
    "--mono-gray-700": MONOCHROMATIC_THEME.dark.gray[700],
    "--mono-gray-750": MONOCHROMATIC_THEME.dark.gray[750],
    "--mono-gray-800": MONOCHROMATIC_THEME.dark.gray[800],
    "--mono-gray-850": MONOCHROMATIC_THEME.dark.gray[850],
    "--mono-gray-900": MONOCHROMATIC_THEME.dark.gray[900],
    "--mono-gray-925": MONOCHROMATIC_THEME.dark.gray[925],
    "--mono-gray-950": MONOCHROMATIC_THEME.dark.gray[950],

    // Cores funcionais (modo escuro)
    "--mono-primary": MONOCHROMATIC_THEME.dark.primary,
    "--mono-primary-hover": MONOCHROMATIC_THEME.dark.primaryHover,
    "--mono-primary-light": MONOCHROMATIC_THEME.dark.primaryLight,
    "--mono-primary-active": MONOCHROMATIC_THEME.dark.primaryActive,

    "--mono-secondary": MONOCHROMATIC_THEME.dark.secondary,
    "--mono-secondary-hover": MONOCHROMATIC_THEME.dark.secondaryHover,
    "--mono-secondary-light": MONOCHROMATIC_THEME.dark.secondaryLight,
    "--mono-secondary-active": MONOCHROMATIC_THEME.dark.secondaryActive,

    // Backgrounds (modo escuro)
    "--mono-background": MONOCHROMATIC_THEME.dark.background,
    "--mono-background-secondary": MONOCHROMATIC_THEME.dark.backgroundSecondary,
    "--mono-background-tertiary": MONOCHROMATIC_THEME.dark.backgroundTertiary,
    "--mono-background-quaternary":
      MONOCHROMATIC_THEME.dark.backgroundQuaternary,

    // Surfaces (modo escuro)
    "--mono-surface": MONOCHROMATIC_THEME.dark.surface,
    "--mono-surface-hover": MONOCHROMATIC_THEME.dark.surfaceHover,
    "--mono-surface-active": MONOCHROMATIC_THEME.dark.surfaceActive,
    "--mono-surface-elevated": MONOCHROMATIC_THEME.dark.surfaceElevated,

    // Textos (modo escuro)
    "--mono-text": MONOCHROMATIC_THEME.dark.text,
    "--mono-text-secondary": MONOCHROMATIC_THEME.dark.textSecondary,
    "--mono-text-tertiary": MONOCHROMATIC_THEME.dark.textTertiary,
    "--mono-text-muted": MONOCHROMATIC_THEME.dark.textMuted,
    "--mono-text-disabled": MONOCHROMATIC_THEME.dark.textDisabled,
    "--mono-text-placeholder": MONOCHROMATIC_THEME.dark.textPlaceholder,

    // Bordas (modo escuro)
    "--mono-border": MONOCHROMATIC_THEME.dark.border,
    "--mono-border-secondary": MONOCHROMATIC_THEME.dark.borderSecondary,
    "--mono-border-hover": MONOCHROMATIC_THEME.dark.borderHover,
    "--mono-border-focus": MONOCHROMATIC_THEME.dark.borderFocus,
    "--mono-border-active": MONOCHROMATIC_THEME.dark.borderActive,

    // Estados (modo escuro)
    "--mono-success": MONOCHROMATIC_THEME.dark.success,
    "--mono-success-light": MONOCHROMATIC_THEME.dark.successLight,
    "--mono-warning": MONOCHROMATIC_THEME.dark.warning,
    "--mono-warning-light": MONOCHROMATIC_THEME.dark.warningLight,
    "--mono-error": MONOCHROMATIC_THEME.dark.error,
    "--mono-error-light": MONOCHROMATIC_THEME.dark.errorLight,
    "--mono-info": MONOCHROMATIC_THEME.dark.info,
    "--mono-info-light": MONOCHROMATIC_THEME.dark.infoLight,
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
