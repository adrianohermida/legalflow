/**
 * CONFIGURAÇÃO DE BRANDING MONOCROMÁTICO
 * Sistema de branding exclusivamente preto/branco/cinza
 * ZERO COLOR POLICY - Foco total no desenvolvimento
 */

// Configuração de branding MONOCROMÁTICA
export const MONOCHROMATIC_BRAND_CONFIG = {
  // Identidade visual
  name: "Sistema Monocromático",
  tagline: "Desenvolvimento Focado - Zero Distração",

  // Paleta monocromática exclusiva
  colors: {
    // Base
    black: "#000000",
    white: "#ffffff",

    // Escala principal
    primary: {
      50: "#f9fafb", // Quase branco
      100: "#f3f4f6", // Branco acinzentado
      200: "#e5e7eb", // Cinza muito claro
      300: "#d1d5db", // Cinza claro
      400: "#9ca3af", // Cinza médio-claro
      500: "#6b7280", // Cinza neutro
      600: "#4b5563", // Cinza médio
      700: "#374151", // Cinza escuro
      800: "#1f2937", // Cinza muito escuro
      900: "#111827", // Quase preto
    },

    // Todas as outras cores = cinza (zero color override)
    secondary: "#4b5563",
    accent: "#374151",
    neutral: "#6b7280",

    // Estados funcionais em cinza
    success: "#374151", // Cinza escuro
    warning: "#6b7280", // Cinza neutro
    error: "#1f2937", // Cinza muito escuro
    info: "#4b5563", // Cinza médio
  },

  // Tipografia monocromática
  typography: {
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "Consolas", "monospace"],
    },
    colors: {
      primary: "#111827", // Quase preto
      secondary: "#374151", // Cinza escuro
      muted: "#6b7280", // Cinza neutro
      disabled: "#9ca3af", // Cinza médio-claro
    },
  },

  // Componentes UI monocromáticos
  components: {
    button: {
      primary: {
        bg: "#111827", // Quase preto
        text: "#ffffff", // Branco
        hover: "#1f2937", // Cinza muito escuro
      },
      secondary: {
        bg: "#f3f4f6", // Branco acinzentado
        text: "#111827", // Quase preto
        hover: "#e5e7eb", // Cinza muito claro
      },
      ghost: {
        bg: "transparent",
        text: "#374151", // Cinza escuro
        hover: "#f9fafb", // Quase branco
      },
    },

    input: {
      bg: "#ffffff", // Branco
      border: "#e5e7eb", // Cinza muito claro
      text: "#111827", // Quase preto
      placeholder: "#9ca3af", // Cinza médio-claro
      focus: "#374151", // Cinza escuro
    },

    card: {
      bg: "#ffffff", // Branco
      border: "#e5e7eb", // Cinza muito claro
      shadow: "rgba(0, 0, 0, 0.05)", // Sombra sutil
    },
  },

  // Layout monocromático
  layout: {
    header: {
      bg: "#ffffff", // Branco
      border: "#e5e7eb", // Cinza muito claro
      text: "#111827", // Quase preto
    },
    sidebar: {
      bg: "#f9fafb", // Quase branco
      border: "#e5e7eb", // Cinza muito claro
      text: "#374151", // Cinza escuro
    },
    main: {
      bg: "#ffffff", // Branco
      text: "#111827", // Quase preto
    },
  },
};

// CSS Variables do tema monocromático
export const MONOCHROMATIC_CSS_VARIABLES = {
  // Base
  "--brand-black": MONOCHROMATIC_BRAND_CONFIG.colors.black,
  "--brand-white": MONOCHROMATIC_BRAND_CONFIG.colors.white,

  // Escala principal
  "--brand-50": MONOCHROMATIC_BRAND_CONFIG.colors.primary[50],
  "--brand-100": MONOCHROMATIC_BRAND_CONFIG.colors.primary[100],
  "--brand-200": MONOCHROMATIC_BRAND_CONFIG.colors.primary[200],
  "--brand-300": MONOCHROMATIC_BRAND_CONFIG.colors.primary[300],
  "--brand-400": MONOCHROMATIC_BRAND_CONFIG.colors.primary[400],
  "--brand-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[500],
  "--brand-600": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
  "--brand-700": MONOCHROMATIC_BRAND_CONFIG.colors.primary[700],
  "--brand-800": MONOCHROMATIC_BRAND_CONFIG.colors.primary[800],
  "--brand-900": MONOCHROMATIC_BRAND_CONFIG.colors.primary[900],

  // Funcionais
  "--brand-primary": MONOCHROMATIC_BRAND_CONFIG.colors.primary[900],
  "--brand-secondary": MONOCHROMATIC_BRAND_CONFIG.colors.secondary,
  "--brand-success": MONOCHROMATIC_BRAND_CONFIG.colors.success,
  "--brand-warning": MONOCHROMATIC_BRAND_CONFIG.colors.warning,
  "--brand-error": MONOCHROMATIC_BRAND_CONFIG.colors.error,
  "--brand-info": MONOCHROMATIC_BRAND_CONFIG.colors.info,

  // Layout
  "--brand-bg": MONOCHROMATIC_BRAND_CONFIG.layout.main.bg,
  "--brand-text": MONOCHROMATIC_BRAND_CONFIG.layout.main.text,
  "--brand-border": MONOCHROMATIC_BRAND_CONFIG.components.card.border,
};

// Regras de validação monocromática
export const COLOR_VALIDATION_RULES = {
  // Cores permitidas (apenas tons de cinza puros)
  allowed: [
    "#000000",
    "#111827",
    "#1f2937",
    "#374151",
    "#4b5563",
    "#6b7280",
    "#9ca3af",
    "#d1d5db",
    "#e5e7eb",
    "#f3f4f6",
    "#f9fafb",
    "#ffffff",
  ],

  // Cores estritamente proibidas
  forbidden: [
    // Qualquer cor que não seja preto/branco/cinza puro
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "cyan",
    "teal",
    "lime",
    "amber",
    "indigo",
    "violet",
    "fuchsia",
    "rose",
    "emerald",
    "sky",
  ],

  // Função de validação
  isValid: (color: string): boolean => {
    // Permitir apenas hex codes de tons de cinza puros
    if (!color.startsWith("#")) return false;

    const hex = color.replace("#", "");
    if (hex.length !== 6) return false;

    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // R = G = B para tons de cinza puros
    return r === g && g === b;
  },
};

// Função para aplicar o tema monocromático
export function applyMonochromaticBrand(): void {
  const root = document.documentElement;

  Object.entries(MONOCHROMATIC_CSS_VARIABLES).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Forçar override de qualquer cor não neutra
  const colorOverrides = {
    "--blue-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--green-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--red-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[700],
    "--yellow-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[500],
    "--purple-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--orange-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--pink-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--indigo-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--teal-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
    "--cyan-500": MONOCHROMATIC_BRAND_CONFIG.colors.primary[600],
  };

  Object.entries(colorOverrides).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  console.log("✅ Branding monocromático aplicado - ZERO cores detectadas");
}

// Auto-aplicar tema na importação
if (typeof window !== "undefined") {
  applyMonochromaticBrand();
}

export default MONOCHROMATIC_BRAND_CONFIG;
