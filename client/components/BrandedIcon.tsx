import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface BrandedIconProps {
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  background?: boolean;
  rounded?: boolean;
}

const VARIANT_STYLES = {
  default: 'text-gray-600 bg-gray-100',
  primary: 'text-blue-600 bg-blue-100',
  secondary: 'text-purple-600 bg-purple-100',
  success: 'text-green-600 bg-green-100',
  warning: 'text-orange-600 bg-orange-100',
  danger: 'text-red-600 bg-red-100',
  info: 'text-cyan-600 bg-cyan-100',
};

const SIZE_STYLES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const BACKGROUND_SIZES = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export default function BrandedIcon({
  icon: Icon,
  variant = 'default',
  size = 'md',
  className,
  background = false,
  rounded = true,
}: BrandedIconProps) {
  const variantStyles = VARIANT_STYLES[variant];
  const iconSize = SIZE_STYLES[size];
  const backgroundSize = BACKGROUND_SIZES[size];

  if (background) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          backgroundSize,
          variantStyles.split(' ')[1], // bg color
          rounded ? 'rounded-full' : 'rounded-lg',
          className
        )}
      >
        <Icon 
          className={cn(
            iconSize,
            variantStyles.split(' ')[0] // text color
          )}
        />
      </div>
    );
  }

  return (
    <Icon
      className={cn(
        iconSize,
        variantStyles.split(' ')[0], // text color only
        className
      )}
    />
  );
}

// Utility function to get contextual icon variants
export const getContextualVariant = (context: string): BrandedIconProps['variant'] => {
  const contextMap: Record<string, BrandedIconProps['variant']> = {
    // Process contexts
    processo: 'primary',
    movimentacao: 'info',
    publicacao: 'success',
    audiencia: 'warning',
    documento: 'secondary',
    
    // Status contexts
    ativo: 'success',
    pendente: 'warning',
    cancelado: 'danger',
    concluido: 'success',
    
    // Actions
    editar: 'primary',
    excluir: 'danger',
    visualizar: 'info',
    adicionar: 'success',
    
    // Areas
    trabalhista: 'blue',
    civil: 'purple',
    criminal: 'red',
    tributario: 'orange',
    previdenciario: 'green',
    
    default: 'default',
  };

  return contextMap[context.toLowerCase()] || 'default';
};

// Pre-configured icon components for common use cases
export const ProcessoIcon = ({ className, ...props }: Omit<BrandedIconProps, 'icon' | 'variant'>) => (
  <BrandedIcon 
    icon={props.icon || require('lucide-react').FileText} 
    variant="primary" 
    className={className}
    {...props} 
  />
);

export const StatusIcon = ({ status, className, ...props }: Omit<BrandedIconProps, 'icon' | 'variant'> & { status: string }) => (
  <BrandedIcon 
    icon={props.icon || require('lucide-react').Circle} 
    variant={getContextualVariant(status)} 
    className={className}
    {...props} 
  />
);

export const ActionIcon = ({ action, className, ...props }: Omit<BrandedIconProps, 'icon' | 'variant'> & { action: string }) => (
  <BrandedIcon 
    icon={props.icon || require('lucide-react').Settings} 
    variant={getContextualVariant(action)} 
    className={className}
    {...props} 
  />
);
