/**
 * Responsive Grid Component
 * Mobile-first grid system with consistent breakpoints
 */

import React from "react";
import { cn } from "../../lib/utils";
import { GRID_PATTERNS, type Breakpoint } from "../../lib/responsive-design";

interface ResponsiveGridProps {
  children: React.ReactNode;
  pattern?: keyof typeof GRID_PATTERNS;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  // Custom grid configurations
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
  };
  gap?: "sm" | "md" | "lg";
}

export function ResponsiveGrid({
  children,
  pattern,
  className = "",
  as: Component = "div",
  cols,
  gap = "md",
}: ResponsiveGridProps) {
  // Use predefined pattern or generate custom grid
  let gridClasses = "";

  if (pattern) {
    gridClasses = GRID_PATTERNS[pattern];
  } else if (cols) {
    // Generate custom grid classes
    const gridCols = ["grid"];

    if (cols.xs) gridCols.push(`grid-cols-${cols.xs}`);
    if (cols.sm) gridCols.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) gridCols.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) gridCols.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) gridCols.push(`xl:grid-cols-${cols.xl}`);
    if (cols["2xl"]) gridCols.push(`2xl:grid-cols-${cols["2xl"]}`);

    // Add gap
    const gapClasses = {
      sm: "gap-2 sm:gap-3",
      md: "gap-4 sm:gap-6",
      lg: "gap-6 sm:gap-8",
    };

    gridClasses = [...gridCols, gapClasses[gap]].join(" ");
  } else {
    // Default to cards pattern
    gridClasses = GRID_PATTERNS.cards;
  }

  return (
    <Component className={cn(gridClasses, className)}>{children}</Component>
  );
}

/**
 * Specialized grid components for common use cases
 */

// Dashboard stats grid
export function StatsGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveGrid pattern="dashboardStats" className={className}>
      {children}
    </ResponsiveGrid>
  );
}

// Card grid for items/products/content
export function CardGrid({
  children,
  className = "",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "small" | "default" | "large";
}) {
  const patterns = {
    small: "cardsSmall",
    default: "cards",
    large: "cardsLarge",
  } as const;

  return (
    <ResponsiveGrid pattern={patterns[size]} className={className}>
      {children}
    </ResponsiveGrid>
  );
}

// Form grid for form fields
export function FormGrid({
  children,
  className = "",
  columns = 2,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const cols = {
    1: { xs: 1 },
    2: { xs: 1, md: 2 },
    3: { xs: 1, sm: 2, lg: 3 },
  };

  return (
    <ResponsiveGrid cols={cols[columns]} gap="md" className={className}>
      {children}
    </ResponsiveGrid>
  );
}

// Sidebar layout grid
export function SidebarGrid({
  children,
  className = "",
  sidebarSize = "default",
}: {
  children: React.ReactNode;
  className?: string;
  sidebarSize?: "narrow" | "default";
}) {
  const pattern = sidebarSize === "narrow" ? "sidebarNarrow" : "sidebar";

  return (
    <ResponsiveGrid pattern={pattern} className={className}>
      {children}
    </ResponsiveGrid>
  );
}

// Masonry grid for irregular content
export function MasonryGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(GRID_PATTERNS.masonry, className)}>{children}</div>;
}

/**
 * Grid item wrapper with responsive behavior
 */
export function GridItem({
  children,
  className = "",
  span = 1,
  spanSm,
  spanMd,
  spanLg,
  spanXl,
  span2xl,
}: {
  children: React.ReactNode;
  className?: string;
  span?: number;
  spanSm?: number;
  spanMd?: number;
  spanLg?: number;
  spanXl?: number;
  span2xl?: number;
}) {
  const spanClasses = [];

  if (span > 1) spanClasses.push(`col-span-${span}`);
  if (spanSm) spanClasses.push(`sm:col-span-${spanSm}`);
  if (spanMd) spanClasses.push(`md:col-span-${spanMd}`);
  if (spanLg) spanClasses.push(`lg:col-span-${spanLg}`);
  if (spanXl) spanClasses.push(`xl:col-span-${spanXl}`);
  if (span2xl) spanClasses.push(`2xl:col-span-${span2xl}`);

  return <div className={cn(spanClasses.join(" "), className)}>{children}</div>;
}

/**
 * Auto-fit grid that automatically adjusts column count based on content
 */
export function AutoGrid({
  children,
  className = "",
  minWidth = "280px",
  gap = "md",
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
  gap?: "sm" | "md" | "lg";
}) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <div
      className={cn("grid", gapClasses[gap], className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stack component for vertical layouts with responsive spacing
 */
export function Stack({
  children,
  className = "",
  spacing = "md",
  horizontal = false,
  align = "stretch",
  justify = "start",
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
  horizontal?: boolean;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}) {
  const spacingClasses = horizontal
    ? {
        sm: "space-x-2 sm:space-x-3",
        md: "space-x-4 sm:space-x-6",
        lg: "space-x-6 sm:space-x-8",
      }
    : {
        sm: "space-y-2 sm:space-y-3",
        md: "space-y-4 sm:space-y-6",
        lg: "space-y-6 sm:space-y-8",
      };

  const alignClasses = {
    start: horizontal ? "items-start" : "items-start",
    center: horizontal ? "items-center" : "items-center",
    end: horizontal ? "items-end" : "items-end",
    stretch: horizontal ? "items-stretch" : "items-stretch",
  };

  const justifyClasses = {
    start: horizontal ? "justify-start" : "justify-start",
    center: horizontal ? "justify-center" : "justify-center",
    end: horizontal ? "justify-end" : "justify-end",
    between: horizontal ? "justify-between" : "justify-between",
  };

  return (
    <div
      className={cn(
        "flex",
        horizontal ? "flex-row" : "flex-col",
        spacingClasses[spacing],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive flex component that switches direction based on screen size
 */
export function ResponsiveFlex({
  children,
  className = "",
  direction = "column-reverse",
  gap = "md",
  align = "stretch",
  justify = "start",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "column" | "column-reverse" | "row" | "row-reverse";
  gap?: "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}) {
  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  };

  const directionClasses = {
    column: "flex-col sm:flex-row",
    "column-reverse": "flex-col-reverse sm:flex-row",
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
  };

  const alignClasses = {
    start: "items-start sm:items-start",
    center: "items-center sm:items-center",
    end: "items-end sm:items-end",
    stretch: "items-stretch sm:items-stretch",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "flex",
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}
