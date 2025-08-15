/**
 * MOBILE-FIRST DESIGN SYSTEM
 * Implementing consistent breakpoints and responsive design
 */

// Mobile-first breakpoints as suggested
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Responsive utilities
export const RESPONSIVE_UTILS = {
  // Container utilities
  container: {
    xs: 'max-w-none px-4',
    sm: 'max-w-screen-sm px-6',
    md: 'max-w-screen-md px-6',
    lg: 'max-w-screen-lg px-8',
    xl: 'max-w-screen-xl px-8',
    '2xl': 'max-w-screen-2xl px-8'
  },
  
  // Grid utilities
  grid: {
    cols1: 'grid-cols-1',
    cols2: 'sm:grid-cols-2',
    cols3: 'md:grid-cols-3',
    cols4: 'lg:grid-cols-4',
    cols6: 'xl:grid-cols-6'
  },
  
  // Text utilities
  text: {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl'
  },
  
  // Spacing utilities
  spacing: {
    xs: 'p-2 sm:p-3',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
    xl: 'p-8 sm:p-12'
  }
};

// Design tokens
export const DESIGN_TOKENS = {
  colors: {
    primary: {
      50: '#f4f9f6',
      100: '#e9f3ef',
      200: '#a0d0ab',
      300: '#6bb085',
      400: '#4a9370',
      500: '#327a5b',
      600: '#2d6050',
      700: '#285245',
      800: '#245240',
      900: '#1b3a2f',
      950: '#0f251e'
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    semantic: {
      success: '#16a34a',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      heading: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace']
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1.6' }],
      sm: ['0.875rem', { lineHeight: '1.6' }],
      base: ['1rem', { lineHeight: '1.7' }],
      lg: ['1.125rem', { lineHeight: '1.7' }],
      xl: ['1.25rem', { lineHeight: '1.6' }],
      '2xl': ['1.5rem', { lineHeight: '1.5' }],
      '3xl': ['1.875rem', { lineHeight: '1.4' }],
      '4xl': ['2.25rem', { lineHeight: '1.3' }]
    }
  },
  
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem'
  },
  
  borderRadius: {
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px'
  },
  
  boxShadow: {
    soft: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
    strong: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
    focus: '0 0 0 3px rgba(40, 82, 69, 0.2)'
  }
};

// Responsive helpers
export function generateResponsiveClasses(baseClass: string): string {
  return `${baseClass} sm:${baseClass} md:${baseClass} lg:${baseClass} xl:${baseClass}`;
}

export function getContainerClasses(size: keyof typeof RESPONSIVE_UTILS.container = 'lg'): string {
  return `w-full mx-auto ${RESPONSIVE_UTILS.container[size]}`;
}

export function getGridClasses(cols: keyof typeof RESPONSIVE_UTILS.grid): string {
  return `grid gap-4 ${RESPONSIVE_UTILS.grid[cols]}`;
}

export default {
  BREAKPOINTS,
  RESPONSIVE_UTILS,
  DESIGN_TOKENS,
  generateResponsiveClasses,
  getContainerClasses,
  getGridClasses
};
