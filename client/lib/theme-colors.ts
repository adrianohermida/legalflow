/**
 * Centralized Theme Colors - AdvogaAI Design System
 * Provides consistent color usage across components
 * Follows monochromatic design with brand accent
 */

export const colors = {
  // Primary brand colors
  brand: {
    primary: "var(--brand-700)", // #285245 - Main brand color
    primaryDark: "var(--brand-800)", // #245240 - Darker variant
    primaryLight: "var(--brand-100)", // #e9f3ef - Light background
    accent: "var(--brand-600)", // #2d6050 - Accent color
  },

  // Neutral grays - main structure
  neutral: {
    900: "var(--mono-gray-900)", // #111827 - Almost black
    800: "var(--mono-gray-800)", // #1f2937 - Very dark gray
    700: "var(--mono-gray-700)", // #374151 - Dark gray
    600: "var(--mono-gray-600)", // #4b5563 - Medium gray
    500: "var(--mono-gray-500)", // #6b7280 - Neutral gray
    400: "var(--mono-gray-400)", // #9ca3af - Light gray
    300: "var(--mono-gray-300)", // #d1d5db - Very light gray
    200: "var(--mono-gray-200)", // #e5e7eb - Ultra light gray
    100: "var(--mono-gray-100)", // #f3f4f6 - Almost white
    50: "var(--mono-gray-50)",   // #f9fafb - White-ish
  },

  // Semantic colors
  semantic: {
    success: "var(--success)", // #16a34a - Green for success
    warning: "var(--warn)",    // #f59e0b - Yellow for warnings
    error: "var(--danger)",    // #ef4444 - Red for errors
    info: "var(--brand-700)",  // Brand color for info
  },

  // Surface colors
  surface: {
    primary: "var(--mono-white)",     // #ffffff
    secondary: "var(--mono-gray-50)", // #f9fafb
    elevated: "var(--mono-white)",    // #ffffff with shadow
    overlay: "rgba(0, 0, 0, 0.50)",   // Modal overlays
  },
};

export const themeUtils = {
  // Get style object for primary button
  primaryButton: {
    backgroundColor: colors.brand.primary,
    color: colors.surface.primary,
    border: `1px solid ${colors.brand.primary}`,
  },

  // Get style object for primary button hover
  primaryButtonHover: {
    backgroundColor: colors.brand.primaryDark,
    color: colors.surface.primary,
    border: `1px solid ${colors.brand.primaryDark}`,
  },

  // Get style object for secondary button
  secondaryButton: {
    backgroundColor: "transparent",
    color: colors.neutral[700],
    border: `1px solid ${colors.neutral[300]}`,
  },

  // Get style object for active sidebar item
  sidebarActive: {
    backgroundColor: colors.brand.primary,
    color: colors.surface.primary,
  },

  // Get style object for badge with brand color
  brandBadge: {
    backgroundColor: colors.brand.primary,
    color: colors.surface.primary,
  },

  // Get style object for success badge
  successBadge: {
    backgroundColor: colors.semantic.success,
    color: colors.surface.primary,
  },

  // Get style object for warning badge
  warningBadge: {
    backgroundColor: colors.semantic.warning,
    color: colors.surface.primary,
  },

  // Get style object for error badge
  errorBadge: {
    backgroundColor: colors.semantic.error,
    color: colors.surface.primary,
  },

  // Get focus ring styles
  focusRing: {
    outline: "none",
    boxShadow: `0 0 0 3px ${colors.brand.primaryLight}`,
  },

  // Get card shadow
  cardShadow: {
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  },

  // Get elevated card shadow
  elevatedCardShadow: {
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
};

// Helper functions for common patterns
export const getStatusColor = (status: "success" | "warning" | "error" | "info" | "neutral") => {
  switch (status) {
    case "success":
      return colors.semantic.success;
    case "warning":
      return colors.semantic.warning;
    case "error":
      return colors.semantic.error;
    case "info":
      return colors.brand.primary;
    case "neutral":
    default:
      return colors.neutral[500];
  }
};

export const getBadgeVariant = (variant: "primary" | "success" | "warning" | "error" | "secondary") => {
  switch (variant) {
    case "primary":
      return themeUtils.brandBadge;
    case "success":
      return themeUtils.successBadge;
    case "warning":
      return themeUtils.warningBadge;
    case "error":
      return themeUtils.errorBadge;
    case "secondary":
    default:
      return {
        backgroundColor: colors.neutral[100],
        color: colors.neutral[700],
      };
  }
};

// CSS custom properties for use in components
export const cssVars = {
  "--advoga-brand-primary": colors.brand.primary,
  "--advoga-brand-primary-dark": colors.brand.primaryDark,
  "--advoga-brand-primary-light": colors.brand.primaryLight,
  "--advoga-neutral-700": colors.neutral[700],
  "--advoga-neutral-500": colors.neutral[500],
  "--advoga-neutral-300": colors.neutral[300],
  "--advoga-neutral-100": colors.neutral[100],
  "--advoga-surface-primary": colors.surface.primary,
  "--advoga-success": colors.semantic.success,
  "--advoga-warning": colors.semantic.warning,
  "--advoga-error": colors.semantic.error,
};

export default colors;
