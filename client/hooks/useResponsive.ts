/**
 * Responsive Hooks for Mobile-First Design
 * React hooks for managing responsive behavior and breakpoints
 */

import { useState, useEffect, useCallback } from 'react';
import { BREAKPOINTS, type Breakpoint } from '../lib/responsive-design';

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      if (typeof window === 'undefined') return 'xs';
      
      const breakpoints = Object.entries(BREAKPOINTS);
      breakpoints.reverse(); // Start from largest
      
      for (const [bp, size] of breakpoints) {
        if (window.matchMedia(`(min-width: ${size})`).matches) {
          return bp as Breakpoint;
        }
      }
      
      return 'xs';
    };

    const updateBreakpoint = () => {
      setBreakpoint(getBreakpoint());
    };

    // Set initial breakpoint
    updateBreakpoint();

    // Listen for window resize
    window.addEventListener('resize', updateBreakpoint);
    
    return () => {
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, []);

  return breakpoint;
}

/**
 * Hook to check if screen matches specific breakpoint
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * Hook to check if screen is at or above specific breakpoint
 */
export function useBreakpointUp(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]})`);
}

/**
 * Hook to check if screen is below specific breakpoint
 */
export function useBreakpointDown(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(max-width: calc(${BREAKPOINTS[breakpoint]} - 1px))`);
}

/**
 * Hook to check if screen is between two breakpoints
 */
export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  const minQuery = `(min-width: ${BREAKPOINTS[min]})`;
  const maxQuery = `(max-width: calc(${BREAKPOINTS[max]} - 1px))`;
  return useMediaQuery(`${minQuery} and ${maxQuery}`);
}

/**
 * Hook to check if screen is mobile (below sm breakpoint)
 */
export function useIsMobile(): boolean {
  return useBreakpointDown('sm');
}

/**
 * Hook to check if screen is tablet (between sm and lg)
 */
export function useIsTablet(): boolean {
  return useBreakpointBetween('sm', 'lg');
}

/**
 * Hook to check if screen is desktop (lg and above)
 */
export function useIsDesktop(): boolean {
  return useBreakpointUp('lg');
}

/**
 * Hook for responsive values based on breakpoint
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const breakpoint = useBreakpoint();
  
  // Find the most appropriate value for current breakpoint
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  // Look for value starting from current breakpoint and going down
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  return defaultValue;
}

/**
 * Hook for responsive grid columns
 */
export function useResponsiveColumns(config: Partial<Record<Breakpoint, number>>, defaultCols = 1): number {
  return useResponsiveValue(config, defaultCols);
}

/**
 * Hook for responsive spacing
 */
export function useResponsiveSpacing(config: Partial<Record<Breakpoint, string>>, defaultSpacing = '1rem'): string {
  return useResponsiveValue(config, defaultSpacing);
}

/**
 * Hook for responsive sidebar state
 */
export function useSidebarState(defaultOpen = false) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(defaultOpen);
    }
  }, [isMobile, defaultOpen]);

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    isMobile,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    setIsOpen,
  };
}

/**
 * Hook for responsive modal size
 */
export function useModalSize(): 'sm' | 'md' | 'lg' | 'xl' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  if (isMobile) return 'sm';
  if (isTablet) return 'md';
  return 'lg';
}

/**
 * Hook for responsive table behavior (switch to cards on mobile)
 */
export function useResponsiveTable() {
  const isMobile = useIsMobile();
  
  return {
    showAsCards: isMobile,
    showAsTable: !isMobile,
    isMobile,
  };
}

/**
 * Hook for responsive navigation menu
 */
export function useNavigationMenu() {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMenuOpen(false);
    }
  }, [isMobile]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return {
    isMobile,
    isMenuOpen,
    toggleMenu,
    closeMenu,
    setIsMenuOpen,
  };
}

/**
 * Hook for responsive form layout
 */
export function useFormLayout() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  return {
    isMobile,
    isTablet,
    stackVertically: isMobile,
    useFullWidth: isMobile,
    compactSpacing: isMobile,
    showLabelsInline: !isMobile,
  };
}

/**
 * Hook for responsive image sizes
 */
export function useResponsiveImageSize() {
  const breakpoint = useBreakpoint();
  
  const getSizeMultiplier = (): number => {
    switch (breakpoint) {
      case 'xs': return 1;
      case 'sm': return 1.2;
      case 'md': return 1.4;
      case 'lg': return 1.6;
      case 'xl': return 1.8;
      case '2xl': return 2;
      default: return 1;
    }
  };
  
  const getImageSize = (baseSize: number): number => {
    return Math.round(baseSize * getSizeMultiplier());
  };
  
  return {
    breakpoint,
    multiplier: getSizeMultiplier(),
    getImageSize,
  };
}

/**
 * Hook for responsive container padding
 */
export function useContainerPadding(): string {
  const breakpoint = useBreakpoint();
  
  const paddingMap: Record<Breakpoint, string> = {
    xs: 'px-4',
    sm: 'px-6',
    md: 'px-8',
    lg: 'px-8',
    xl: 'px-12',
    '2xl': 'px-16',
  };
  
  return paddingMap[breakpoint] || 'px-4';
}

/**
 * Hook for responsive typography scale
 */
export function useTypographyScale() {
  const breakpoint = useBreakpoint();
  
  const getScale = (baseSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'): string => {
    const scaleMap: Record<Breakpoint, Record<string, string>> = {
      xs: {
        xs: 'text-xs',
        sm: 'text-xs',
        base: 'text-sm',
        lg: 'text-base',
        xl: 'text-lg',
        '2xl': 'text-xl',
        '3xl': 'text-2xl',
        '4xl': 'text-3xl',
      },
      sm: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
      },
      md: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
      },
      lg: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
      },
      xl: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
      },
      '2xl': {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
      },
    };
    
    return scaleMap[breakpoint]?.[baseSize] || scaleMap.xs[baseSize];
  };
  
  return { getScale, breakpoint };
}

/**
 * Hook for responsive component visibility
 */
export function useResponsiveVisibility() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    hideOnMobile: !isMobile,
    hideOnTablet: !isTablet,
    hideOnDesktop: !isDesktop,
    showOnMobile: isMobile,
    showOnTablet: isTablet,
    showOnDesktop: isDesktop,
  };
}
