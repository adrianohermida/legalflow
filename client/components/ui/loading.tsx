import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  variant?: "spinner" | "dots" | "pulse";
  className?: string;
  fullScreen?: boolean;
  ariaLabel?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = "md",
  text,
  variant = "spinner",
  className,
  fullScreen = false,
  ariaLabel,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const Spinner = () => (
    <Loader2
      className={cn("animate-spin text-neutral-600", sizeClasses[size])}
      aria-hidden="true"
    />
  );

  const Dots = () => (
    <div className="flex space-x-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-neutral-600 rounded-full animate-pulse",
            size === "sm" ? "w-1 h-1" : size === "md" ? "w-2 h-2" : "w-3 h-3",
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1.4s",
          }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div
      className={cn(
        "bg-neutral-200 rounded animate-pulse",
        size === "sm" ? "w-16 h-4" : size === "md" ? "w-24 h-6" : "w-32 h-8",
      )}
      aria-hidden="true"
    />
  );

  const renderVariant = () => {
    switch (variant) {
      case "dots":
        return <Dots />;
      case "pulse":
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };

  const loadingContent = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        textSizeClasses[size],
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={
        ariaLabel || (text ? `Carregando: ${text}` : "Carregando conteúdo")
      }
    >
      {renderVariant()}
      {text && <span className="text-neutral-600 font-medium">{text}</span>}
      <span className="sr-only">
        {text
          ? `Carregando ${text}. Aguarde.`
          : "Carregando conteúdo. Aguarde."}
      </span>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        aria-modal="true"
        aria-labelledby="loading-title"
      >
        <div id="loading-title" className="sr-only">
          Carregando aplicação
        </div>
        {loadingContent}
      </div>
    );
  }

  return loadingContent;
};

// Skeleton loader for content placeholders
interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangle" | "circle";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "text",
  width,
  height,
}) => {
  const baseClasses = "animate-pulse bg-neutral-200 rounded";

  const variantClasses = {
    text: "h-4 w-full",
    rectangle: "w-full h-24",
    circle: "w-10 h-10 rounded-full",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
};

// Loading table component
export const LoadingTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div
    className={cn("space-y-3", className)}
    role="status"
    aria-label="Carregando dados da tabela"
  >
    <span className="sr-only">Carregando dados da tabela. Aguarde.</span>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            className="flex-1"
            variant={rowIndex === 0 ? "text" : "text"}
          />
        ))}
      </div>
    ))}
  </div>
);

// Loading card component
export const LoadingCard: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    className={cn("p-4 border rounded-lg space-y-3", className)}
    role="status"
    aria-label="Carregando cartão de conteúdo"
  >
    <span className="sr-only">Carregando cartão de conteúdo. Aguarde.</span>
    <div className="flex items-center space-x-3">
      <Skeleton variant="circle" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton variant="rectangle" height={60} />
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  </div>
);

export default Loading;
