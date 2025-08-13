import React, { useEffect, useState } from "react";
import {
  ThemeContext,
  applyThemeToCSSVariables,
  useSystemTheme,
  useColorValidation,
} from "../hooks/useTheme";
import { THEME_CONFIG, type ThemeMode } from "../lib/theme-config";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultMode = "light",
  storageKey = "legalflow-theme",
}: ThemeProviderProps) {
  const systemTheme = useSystemTheme();
  const { isColorApproved, getApprovedColor } = useColorValidation();
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);

  // Carrega tema salvo ou usa preferência do sistema
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && (saved === "light" || saved === "dark")) {
        setModeState(saved);
      } else {
        setModeState(systemTheme);
      }
    } catch {
      setModeState(systemTheme);
    }
  }, [storageKey, systemTheme]);

  // Aplica tema ao CSS
  useEffect(() => {
    applyThemeToCSSVariables(mode);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(storageKey, newMode);
    } catch {
      console.warn("Não foi possível salvar tema no localStorage");
    }
  };

  const toggleMode = () => {
    setMode(mode === "light" ? "dark" : "light");
  };

  const colors = THEME_CONFIG[mode];

  const value = {
    mode,
    toggleMode,
    setMode,
    colors,
    isColorApproved,
    getApprovedColor,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
