/**
 * Responsive Container Component
 * Mobile-first container system with consistent padding and max-widths
 */

import React from "react";
import { cn } from "../../lib/utils";
import { SPACING_PATTERNS, COMMON_PATTERNS } from "../../lib/responsive-design";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  centerContent?: boolean;
  gutter?: boolean;
}

export function ResponsiveContainer({
  children,
  className = "",
  as: Component = "div",
  size = "lg",
  padding = "md",
  centerContent = true,
  gutter = true,
}: ResponsiveContainerProps) {
  // Size configurations
  const sizeClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    full: "max-w-none",
  };

  // Padding configurations
  const paddingClasses = {
    none: "",
    sm: "px-4 sm:px-6",
    md: "px-4 sm:px-6 lg:px-8",
    lg: "px-4 sm:px-6 lg:px-8 xl:px-12",
  };

  const baseClasses = [
    "w-full",
    gutter && centerContent ? "mx-auto" : "",
    sizeClasses[size],
    paddingClasses[padding],
  ].filter(Boolean);

  return (
    <Component className={cn(baseClasses.join(" "), className)}>
      {children}
    </Component>
  );
}

/**
 * Page Container - Main page wrapper
 */
export function PageContainer({
  children,
  className = "",
  withPadding = true,
}: {
  children: React.ReactNode;
  className?: string;
  withPadding?: boolean;
}) {
  return (
    <ResponsiveContainer
      size="xl"
      padding={withPadding ? "md" : "none"}
      className={cn("py-6 lg:py-8", className)}
    >
      {children}
    </ResponsiveContainer>
  );
}

/**
 * Section Container - Content sections within pages
 */
export function SectionContainer({
  children,
  className = "",
  spacing = "md",
  background = "transparent",
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
  background?: "transparent" | "white" | "gray";
}) {
  const spacingClasses = {
    sm: "py-6 sm:py-8",
    md: "py-8 sm:py-12",
    lg: "py-12 sm:py-16",
  };

  const backgroundClasses = {
    transparent: "",
    white: "bg-white",
    gray: "bg-gray-50",
  };

  return (
    <section className={cn(backgroundClasses[background], className)}>
      <ResponsiveContainer className={spacingClasses[spacing]}>
        {children}
      </ResponsiveContainer>
    </section>
  );
}

/**
 * Card Container - Wrapper for card content
 */
export function CardContainer({
  children,
  className = "",
  padding = "md",
  border = true,
  shadow = true,
  rounded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  border?: boolean;
  shadow?: boolean;
  rounded?: boolean;
}) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  const baseClasses = [
    "bg-white",
    border && "border border-gray-200",
    shadow && "shadow-sm",
    rounded && "rounded-lg",
    paddingClasses[padding],
  ].filter(Boolean);

  return <div className={cn(baseClasses.join(" "), className)}>{children}</div>;
}

/**
 * Modal Container - Responsive modal wrapper
 */
export function ModalContainer({
  children,
  className = "",
  size = "md",
  padding = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md sm:max-w-lg",
    lg: "max-w-lg sm:max-w-xl lg:max-w-2xl",
    xl: "max-w-xl sm:max-w-2xl lg:max-w-4xl",
    full: "max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl",
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto bg-white rounded-lg shadow-xl",
        sizeClasses[size],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Header Container - Page header wrapper
 */
export function HeaderContainer({
  children,
  className = "",
  sticky = false,
  background = "white",
  border = true,
}: {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
  background?: "white" | "transparent" | "gray";
  border?: boolean;
}) {
  const backgroundClasses = {
    white: "bg-white",
    transparent: "bg-transparent",
    gray: "bg-gray-50",
  };

  const baseClasses = [
    backgroundClasses[background],
    border && "border-b border-gray-200",
    sticky && "sticky top-0 z-40",
  ].filter(Boolean);

  return (
    <header className={cn(baseClasses.join(" "), className)}>
      <ResponsiveContainer
        padding="md"
        className="h-16 lg:h-20 flex items-center"
      >
        {children}
      </ResponsiveContainer>
    </header>
  );
}

/**
 * Footer Container - Page footer wrapper
 */
export function FooterContainer({
  children,
  className = "",
  background = "gray",
  spacing = "lg",
}: {
  children: React.ReactNode;
  className?: string;
  background?: "white" | "gray" | "dark";
  spacing?: "sm" | "md" | "lg";
}) {
  const backgroundClasses = {
    white: "bg-white border-t border-gray-200",
    gray: "bg-gray-50 border-t border-gray-200",
    dark: "bg-gray-900 text-white",
  };

  const spacingClasses = {
    sm: "py-6 sm:py-8",
    md: "py-8 sm:py-12",
    lg: "py-12 sm:py-16",
  };

  return (
    <footer className={cn(backgroundClasses[background], className)}>
      <ResponsiveContainer className={spacingClasses[spacing]}>
        {children}
      </ResponsiveContainer>
    </footer>
  );
}

/**
 * Sidebar Container - Responsive sidebar wrapper
 */
export function SidebarContainer({
  children,
  className = "",
  width = "default",
  padding = "md",
  background = "white",
  border = true,
}: {
  children: React.ReactNode;
  className?: string;
  width?: "narrow" | "default" | "wide";
  padding?: "sm" | "md" | "lg";
  background?: "white" | "gray";
  border?: boolean;
}) {
  const widthClasses = {
    narrow: "w-64",
    default: "w-72",
    wide: "w-80",
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  const backgroundClasses = {
    white: "bg-white",
    gray: "bg-gray-50",
  };

  const baseClasses = [
    "hidden lg:block lg:flex-shrink-0",
    widthClasses[width],
    backgroundClasses[background],
    border && "border-r border-gray-200",
    paddingClasses[padding],
  ].filter(Boolean);

  return (
    <aside className={cn(baseClasses.join(" "), className)}>{children}</aside>
  );
}

/**
 * Content Container - Main content area wrapper
 */
export function ContentContainer({
  children,
  className = "",
  spacing = "md",
  maxWidth = true,
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
  maxWidth?: boolean;
}) {
  const spacingClasses = {
    sm: "space-y-4",
    md: "space-y-6",
    lg: "space-y-8",
  };

  const baseClasses = [
    "flex-1",
    maxWidth && "max-w-none",
    spacingClasses[spacing],
  ].filter(Boolean);

  return (
    <main className={cn(baseClasses.join(" "), className)}>{children}</main>
  );
}

/**
 * Form Container - Wrapper for form content
 */
export function FormContainer({
  children,
  className = "",
  spacing = "md",
  maxWidth = "md",
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
  maxWidth?: "sm" | "md" | "lg" | "none";
}) {
  const spacingClasses = {
    sm: "space-y-4",
    md: "space-y-6",
    lg: "space-y-8",
  };

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    none: "max-w-none",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto",
        maxWidthClasses[maxWidth],
        spacingClasses[spacing],
        className,
      )}
    >
      {children}
    </div>
  );
}
