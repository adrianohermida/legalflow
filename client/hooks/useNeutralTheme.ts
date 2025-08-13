import { useState, useEffect } from 'react';
import { NEUTRAL_THEME, FORBIDDEN_COLORS, type NeutralThemeMode, type AdminBrandConfig, DEFAULT_ADMIN_BRAND } from '../lib/neutral-theme';

/**
 * Hook Neutro Absoluto - Sem Dependência de Context
 * Funciona independentemente e garante zero amarelo
 */
export function useNeutralTheme() {
  const [mode, setMode] = useState<NeutralThemeMode>('light');
  const [adminConfig, setAdminConfig] = useState<AdminBrandConfig>(DEFAULT_ADMIN_BRAND);

  // Detecta preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setMode(mediaQuery.matches ? 'dark' : 'light');
    
    const handler = (e: MediaQueryListEvent) => {
      setMode(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Carrega configuração admin salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin-brand-config');
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
    applyNeutralTheme(mode, adminConfig);
  }, [mode, adminConfig]);

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  const updateAdminConfig = (config: Partial<AdminBrandConfig>) => {
    const newConfig = { ...adminConfig, ...config };
    
    // Valida cores antes de aplicar
    const validatedConfig = {
      ...newConfig,
      primaryColor: isColorSafe(newConfig.primaryColor) ? newConfig.primaryColor : '#000000',
      secondaryColor: isColorSafe(newConfig.secondaryColor) ? newConfig.secondaryColor : '#6b7280',
      accentColor: isColorSafe(newConfig.accentColor) ? newConfig.accentColor : '#1f2937',
    };
    
    setAdminConfig(validatedConfig);
    
    try {
      localStorage.setItem('admin-brand-config', JSON.stringify(validatedConfig));
    } catch {
      console.warn('Não foi possível salvar configuração');
    }
  };

  const colors = NEUTRAL_THEME[mode];

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

// Validação rigorosa de cores
export function isColorSafe(color: string): boolean {
  if (!color) return false;
  
  const normalizedColor = color.toLowerCase().trim();
  
  // Verifica lista de cores proibidas
  if (FORBIDDEN_COLORS.includes(normalizedColor)) {
    console.warn(`🚫 Cor proibida detectada: ${color}`);
    return false;
  }
  
  // Verifica termos proibidos
  const forbiddenTerms = ['yellow', 'amber', 'gold', 'lime', 'chartreuse', 'beige', 'cream'];
  if (forbiddenTerms.some(term => normalizedColor.includes(term))) {
    console.warn(`🚫 Termo proibido detectado na cor: ${color}`);
    return false;
  }
  
  // Verifica valores RGB que podem ser amarelos
  if (normalizedColor.startsWith('#')) {
    const hex = normalizedColor.substring(1);
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Detecta tons amarelados (muito vermelho + verde, pouco azul)
      if (r > 200 && g > 200 && b < 100) {
        console.warn(`🚫 Tom amarelado detectado: ${color} (R:${r}, G:${g}, B:${b})`);
        return false;
      }
    }
  }
  
  return true;
}

// Retorna cor segura ou fallback
export function getSafeColor(requestedColor: string, fallback: string = '#000000'): string {
  return isColorSafe(requestedColor) ? requestedColor : fallback;
}

// Aplica tema neutro ao CSS
export function applyNeutralTheme(mode: NeutralThemeMode, adminConfig: AdminBrandConfig) {
  const colors = NEUTRAL_THEME[mode];
  const root = document.documentElement;
  
  // Aplica cores neutras base
  root.style.setProperty('--theme-primary', adminConfig.enabled ? getSafeColor(adminConfig.primaryColor, colors.primary) : colors.primary);
  root.style.setProperty('--theme-primary-hover', colors.primaryHover);
  root.style.setProperty('--theme-primary-light', colors.primaryLight);
  root.style.setProperty('--theme-background', colors.background);
  root.style.setProperty('--theme-background-secondary', colors.backgroundSecondary);
  root.style.setProperty('--theme-background-tertiary', colors.backgroundTertiary);
  root.style.setProperty('--theme-text', colors.text);
  root.style.setProperty('--theme-text-secondary', colors.textSecondary);
  root.style.setProperty('--theme-text-muted', colors.textMuted);
  root.style.setProperty('--theme-border', colors.border);
  root.style.setProperty('--theme-border-hover', colors.borderHover);
  root.style.setProperty('--theme-success', colors.success);
  root.style.setProperty('--theme-danger', colors.danger);
  root.style.setProperty('--theme-warning', colors.warning);
  root.style.setProperty('--theme-info', colors.info);
  
  // FORÇA todas as variáveis brand para neutro
  root.style.setProperty('--brand-50', mode === 'light' ? '249 250 251' : '31 41 55');
  root.style.setProperty('--brand-100', mode === 'light' ? '243 244 246' : '55 65 81');
  root.style.setProperty('--brand-700', mode === 'light' ? '0 0 0' : '255 255 255');
  root.style.setProperty('--brand-900', mode === 'light' ? '31 41 55' : '243 244 246');
  
  // Aplica classe do tema
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${mode}`);
  
  console.log(`✅ Tema neutro aplicado: ${mode}`, { adminEnabled: adminConfig.enabled });
}
