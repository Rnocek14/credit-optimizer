import React from 'react';
import { cn } from '@/lib/utils';
import { isMobileApp, isIOS, isAndroid } from '@/lib/mobile';

interface MobileLayoutProps {
  children: React.ReactNode;
  className?: string;
  showStatusBar?: boolean;
  safeArea?: boolean;
}

export function MobileLayout({ 
  children, 
  className, 
  showStatusBar = true,
  safeArea = true 
}: MobileLayoutProps) {
  return (
    <div 
      className={cn(
        'min-h-screen bg-background',
        {
          // iOS safe areas
          'pt-safe-top pb-safe-bottom': safeArea && isIOS(),
          // Android status bar handling  
          'pt-6': safeArea && isAndroid(),
          // Web fallback
          'pt-0': !isMobileApp()
        },
        className
      )}
      style={{
        // iOS safe area environment variables
        paddingTop: safeArea && isIOS() ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: safeArea && isIOS() ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: safeArea && isIOS() ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: safeArea && isIOS() ? 'env(safe-area-inset-right)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function MobileContainer({ 
  children, 
  className,
  padding = 'md' 
}: MobileContainerProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={cn(
      'w-full max-w-md mx-auto',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

interface MobileHeaderProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function MobileHeader({ 
  children, 
  className,
  sticky = false 
}: MobileHeaderProps) {
  return (
    <header className={cn(
      'w-full border-b bg-background/95 backdrop-blur',
      {
        'sticky top-0 z-50': sticky
      },
      className
    )}>
      {children}
    </header>
  );
}

interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
}

export function MobileButton({ 
  children, 
  onClick,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false
}: MobileButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-accent'
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm min-h-[44px] min-w-[44px]', // iOS minimum touch target
    md: 'h-11 px-4 text-base min-h-[44px]',
    lg: 'h-13 px-6 text-lg min-h-[48px]'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        {
          'w-full': fullWidth,
          'opacity-50 cursor-not-allowed': disabled
        },
        className
      )}
    >
      {children}
    </button>
  );
}