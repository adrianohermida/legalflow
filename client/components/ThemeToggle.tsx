import React from 'react';
import { Button } from './ui/button';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon, Palette } from 'lucide-react';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'menu';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ 
  variant = 'icon', 
  showLabel = false,
  className 
}: ThemeToggleProps) {
  const { mode, toggleMode } = useTheme();
  
  const Icon = mode === 'light' ? Moon : Sun;
  const label = mode === 'light' ? 'Modo Escuro' : 'Modo Claro';
  
  if (variant === 'menu') {
    return (
      <button
        onClick={toggleMode}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-neutral-100 transition-colors',
          className
        )}
      >
        <Icon className="w-4 h-4" />
        {showLabel && <span>{label}</span>}
      </button>
    );
  }
  
  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMode}
        className={cn('gap-2', className)}
      >
        <Icon className="w-4 h-4" />
        {showLabel && <span className="hidden sm:inline">{label}</span>}
      </Button>
    );
  }
  
  // Default: icon variant
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      className={cn('w-9 h-9 p-0', className)}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

// Componente adicional para link de branding no menu
export function BrandingMenuLink({ className }: { className?: string }) {
  return (
    <a
      href="/branding"
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-neutral-100 transition-colors',
        className
      )}
    >
      <Palette className="w-4 h-4" />
      <span>Controle de Branding</span>
    </a>
  );
}
