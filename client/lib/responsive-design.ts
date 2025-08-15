/**
 * Mobile-First Responsive Design System
 * Consistent breakpoints and responsive utilities for Legalflow
 */

// Breakpoint definitions (mobile-first approach)
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Responsive Grid Patterns
 * Mobile-first grid configurations for consistent layouts
 */
export const GRID_PATTERNS = {
  // Cards/Items grids
  cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  cardsSmall: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3',
  cardsLarge: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6',
  
  // Dashboard layouts
  dashboard: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  dashboardStats: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  
  // Content layouts
  sidebar: 'grid grid-cols-1 lg:grid-cols-4 gap-6',
  sidebarNarrow: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
  twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  
  // Form layouts
  form: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  formWide: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
  formCompact: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4',
  
  // Table responsive
  table: 'overflow-x-auto',
  tableCard: 'grid grid-cols-1 gap-4 sm:hidden', // Mobile card view for tables
  
  // Masonry/Pinterest style
  masonry: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4',
} as const;

/**
 * Responsive Spacing Patterns
 * Consistent spacing that scales with screen size
 */
export const SPACING_PATTERNS = {
  // Container padding
  containerPadding: 'px-4 sm:px-6 lg:px-8',
  containerPaddingLarge: 'px-4 sm:px-6 lg:px-8 xl:px-12',
  
  // Section spacing
  sectionSpacing: 'space-y-6 lg:space-y-8',
  sectionSpacingLarge: 'space-y-8 lg:space-y-12',
  sectionSpacingCompact: 'space-y-4 lg:space-y-6',
  
  // Component spacing
  componentSpacing: 'space-y-4',
  componentSpacingLarge: 'space-y-6',
  componentSpacingCompact: 'space-y-2',
  
  // Gap patterns
  gapDefault: 'gap-4 lg:gap-6',
  gapLarge: 'gap-6 lg:gap-8',
  gapCompact: 'gap-2 lg:gap-4',
} as const;

/**
 * Responsive Typography Patterns
 * Mobile-first typography that scales appropriately
 */
export const TYPOGRAPHY_PATTERNS = {
  // Headings
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
  h3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
  h4: 'text-base sm:text-lg lg:text-xl font-medium',
  h5: 'text-sm sm:text-base lg:text-lg font-medium',
  
  // Body text
  body: 'text-sm sm:text-base',
  bodyLarge: 'text-base sm:text-lg',
  bodySmall: 'text-xs sm:text-sm',
  
  // UI text
  label: 'text-sm font-medium',
  caption: 'text-xs text-gray-600',
  helper: 'text-xs text-gray-500',
} as const;

/**
 * Responsive Component Sizes
 * Standard sizes that adapt to screen size
 */
export const COMPONENT_SIZES = {
  // Buttons
  button: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base',
    lg: 'px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg',
  },
  
  // Inputs
  input: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 sm:px-4 sm:py-3 text-sm sm:text-base',
    lg: 'px-4 py-3 sm:px-6 sm:py-4 text-base',
  },
  
  // Cards
  card: {
    sm: 'p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  },
  
  // Modals
  modal: {
    sm: 'max-w-sm',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl lg:max-w-4xl',
    full: 'max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl',
  },
  
  // Icons
  icon: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5 sm:w-6 sm:h-6',
    lg: 'w-6 h-6 sm:w-8 sm:h-8',
    xl: 'w-8 h-8 sm:w-10 sm:h-10',
  },
} as const;

/**
 * Responsive Navigation Patterns
 * Mobile-first navigation configurations
 */
export const NAVIGATION_PATTERNS = {
  // Mobile menu
  mobileMenu: 'block lg:hidden',
  desktopMenu: 'hidden lg:block',
  
  // Sidebar
  sidebarMobile: 'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform lg:translate-x-0 lg:static lg:inset-0',
  sidebarDesktop: 'hidden lg:block lg:w-64 lg:flex-shrink-0',
  
  // Navigation items
  navItem: 'block px-4 py-2 text-sm sm:text-base lg:px-6 lg:py-3',
  navItemMobile: 'block w-full text-left px-4 py-3',
  navItemDesktop: 'hidden lg:block px-4 py-2',
  
  // Header
  header: 'px-4 sm:px-6 lg:px-8 h-16 lg:h-20',
  headerContent: 'flex items-center justify-between h-full',
} as const;

/**
 * Utility Functions
 */

/**
 * Generate responsive class string based on pattern
 */
export function getResponsiveClass(pattern: keyof typeof GRID_PATTERNS): string;
export function getResponsiveClass(pattern: keyof typeof SPACING_PATTERNS): string;
export function getResponsiveClass(pattern: keyof typeof TYPOGRAPHY_PATTERNS): string;
export function getResponsiveClass(pattern: string): string {
  // Check all pattern objects
  if (pattern in GRID_PATTERNS) {
    return GRID_PATTERNS[pattern as keyof typeof GRID_PATTERNS];
  }
  if (pattern in SPACING_PATTERNS) {
    return SPACING_PATTERNS[pattern as keyof typeof SPACING_PATTERNS];
  }
  if (pattern in TYPOGRAPHY_PATTERNS) {
    return TYPOGRAPHY_PATTERNS[pattern as keyof typeof TYPOGRAPHY_PATTERNS];
  }
  if (pattern in NAVIGATION_PATTERNS) {
    return NAVIGATION_PATTERNS[pattern as keyof typeof NAVIGATION_PATTERNS];
  }
  
  return pattern; // Return as-is if not found
}

/**
 * Check if current screen matches breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINTS[breakpoint]})`);
  return mediaQuery.matches;
}

/**
 * Get current active breakpoint
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'xs';
  
  const breakpoints = Object.entries(BREAKPOINTS);
  breakpoints.reverse(); // Start from largest
  
  for (const [bp, size] of breakpoints) {
    if (window.matchMedia(`(min-width: ${size})`).matches) {
      return bp as Breakpoint;
    }
  }
  
  return 'xs'; // Default to smallest
}

/**
 * Generate responsive classes for component props
 */
export function generateResponsiveClasses(baseClasses: string, responsiveOverrides: Partial<Record<Breakpoint, string>>): string {
  let classes = baseClasses;
  
  Object.entries(responsiveOverrides).forEach(([bp, override]) => {
    if (bp === 'xs') {
      classes += ` ${override}`;
    } else {
      classes += ` ${bp}:${override}`;
    }
  });
  
  return classes;
}

/**
 * Common responsive component patterns
 */
export const COMMON_PATTERNS = {
  // Page containers
  pageContainer: 'container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8',
  pageContent: 'max-w-7xl mx-auto',
  
  // Content sections
  section: 'py-8 sm:py-12 lg:py-16',
  sectionCompact: 'py-6 sm:py-8 lg:py-10',
  
  // Card layouts
  cardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  cardList: 'space-y-4 sm:space-y-6',
  
  // Flex layouts
  flexCenter: 'flex flex-col sm:flex-row items-center gap-4 sm:gap-6',
  flexBetween: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
  flexStack: 'flex flex-col space-y-4 sm:space-y-6',
  
  // Text layouts
  textCenter: 'text-center sm:text-left',
  textCenterMd: 'text-center md:text-left',
  
  // Visibility utilities
  hideMobile: 'hidden sm:block',
  hideDesktop: 'block sm:hidden',
  showMobile: 'block sm:hidden',
  showDesktop: 'hidden sm:block',
} as const;

/**
 * Responsive Image Patterns
 */
export const IMAGE_PATTERNS = {
  avatar: {
    sm: 'w-8 h-8 sm:w-10 sm:h-10',
    md: 'w-10 h-10 sm:w-12 sm:h-12',
    lg: 'w-12 h-12 sm:w-16 sm:h-16',
  },
  logo: {
    sm: 'h-6 sm:h-8',
    md: 'h-8 sm:h-10',
    lg: 'h-10 sm:h-12',
  },
  hero: 'w-full h-48 sm:h-64 lg:h-80 object-cover',
  thumbnail: 'w-16 h-16 sm:w-20 sm:h-20 object-cover',
} as const;

/**
 * Form Responsive Patterns
 */
export const FORM_PATTERNS = {
  // Form containers
  container: 'space-y-6 sm:space-y-8',
  section: 'space-y-4 sm:space-y-6',
  group: 'space-y-4',
  
  // Field layouts
  fieldGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  fieldGridThree: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  fieldStack: 'space-y-4',
  
  // Input sizes
  input: 'w-full px-3 py-2 sm:px-4 sm:py-3',
  textarea: 'w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[100px] sm:min-h-[120px]',
  select: 'w-full px-3 py-2 sm:px-4 sm:py-3',
  
  // Button groups
  buttonGroup: 'flex flex-col sm:flex-row gap-3 sm:gap-4',
  buttonGroupCenter: 'flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4',
} as const;
