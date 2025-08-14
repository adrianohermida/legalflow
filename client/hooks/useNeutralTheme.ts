import { useState, useEffect } from "react";
import {
  MONOCHROMATIC_THEME,
  FORBIDDEN_COLORS,
  applyMonochromaticTheme,
} from "../lib/neutral-theme";

// Types for the monocromatic theme
type MonochromaticMode = "light" | "dark";

type AdminBrandConfig = {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

// Default admin config for monocromatic theme
const DEFAULT_ADMIN_BRAND: AdminBrandConfig = {
  enabled: false, // Disabled by default for pure monocromatic
  primaryColor: "#111827", // Gray-900
  secondaryColor: "#6b7280", // Gray-500
  accentColor: "#1f2937", // Gray-800
};

/**
 * Hook Monocromático - Zero Color Policy
 * Funciona com sistema 100% preto/branco/cinza
 */
export function useNeutralTheme() {
  const [mode, setMode] = useState<MonochromaticMode>("light");
  const [adminConfig, setAdminConfig] =
    useState<AdminBrandConfig>(DEFAULT_ADMIN_BRAND);

  // Detecta preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setMode(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setMode(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Carrega configuração admin salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin-brand-config");
      if (saved) {
        const parsed = JSON.parse(saved);
        setAdminConfig({ ...DEFAULT_ADMIN_BRAND, ...parsed });
      }
    } catch {
      // Ignora erro e usa padrão
    }
  }, []);

  // Aplica tema ao CSS
  useEffect(() => {
    applyMonochromaticTheme(mode);
    applyAdminConfig(adminConfig);
  }, [mode, adminConfig]);

  const toggleMode = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
  };

  const updateAdminConfig = (config: Partial<AdminBrandConfig>) => {
    const newConfig = { ...adminConfig, ...config };

    // Valida cores antes de aplicar - apenas tons de cinza permitidos
    const validatedConfig = {
      ...newConfig,
      primaryColor: isColorSafe(newConfig.primaryColor)
        ? newConfig.primaryColor
        : "#111827",
      secondaryColor: isColorSafe(newConfig.secondaryColor)
        ? newConfig.secondaryColor
        : "#6b7280",
      accentColor: isColorSafe(newConfig.accentColor)
        ? newConfig.accentColor
        : "#1f2937",
    };

    setAdminConfig(validatedConfig);

    try {
      localStorage.setItem(
        "admin-brand-config",
        JSON.stringify(validatedConfig),
      );
    } catch {
      console.warn("Não foi possível salvar configuração");
    }
  };

  const colors = MONOCHROMATIC_THEME[mode];

  return {
    mode,
    setMode,
    toggleMode,
    colors,
    adminConfig,
    updateAdminConfig,
    isColorSafe,
    getSafeColor,
  };
}

// Validação rigorosa de cores - APENAS tons de cinza puros
export function isColorSafe(color: string): boolean {
  if (!color) return false;

  const normalizedColor = color.toLowerCase().trim();

  // Verifica lista de cores proibidas
  if (FORBIDDEN_COLORS.includes(normalizedColor)) {
    console.warn(`🚫 Cor proibida detectada: ${color}`);
    return false;
  }

  // Verifica se é hexadecimal válido
  if (!normalizedColor.startsWith("#") || normalizedColor.length !== 7) {
    console.warn(`🚫 Formato de cor inválido: ${color}`);
    return false;
  }

  // Verifica se é um tom de cinza puro (R = G = B)
  const hex = normalizedColor.substring(1);
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // ZERO COLOR POLICY: Apenas R = G = B permitido
  if (r !== g || g !== b) {
    console.warn(
      `🚫 Cor não monocromática detectada: ${color} (R:${r}, G:${g}, B:${b}) - Apenas tons de cinza puros são permitidos`,
    );
    return false;
  }

  return true;
}

// Retorna cor segura ou fallback monocromático
export function getSafeColor(
  requestedColor: string,
  fallback: string = "#111827",
): string {
  return isColorSafe(requestedColor) ? requestedColor : fallback;
}

// Aplica configuração admin ao CSS
function applyAdminConfig(adminConfig: AdminBrandConfig) {
  if (!adminConfig.enabled) return;

  const root = document.documentElement;

  // Aplica apenas se as cores passarem na validação monocromática
  const safePrimary = getSafeColor(adminConfig.primaryColor, "#111827");
  const safeSecondary = getSafeColor(adminConfig.secondaryColor, "#6b7280");
  const safeAccent = getSafeColor(adminConfig.accentColor, "#1f2937");

  root.style.setProperty("--mono-primary-override", safePrimary);
  root.style.setProperty("--mono-secondary-override", safeSecondary);
  root.style.setProperty("--mono-accent-override", safeAccent);

  console.log(`✅ Configuração admin aplicada (monocromática):`, {
    primary: safePrimary,
    secondary: safeSecondary,
    accent: safeAccent,
  });
}

// Export do default para compatibilidade
export { DEFAULT_ADMIN_BRAND };
export type { AdminBrandConfig, MonochromaticMode as NeutralThemeMode };
