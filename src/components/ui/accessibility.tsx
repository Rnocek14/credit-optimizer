/**
 * Accessibility Enhancement Components
 * Provides reusable components that ensure WCAG compliance
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  minSize?: number;
}

/**
 * TouchTarget - Ensures interactive elements meet 44px minimum size
 */
export const TouchTarget = React.forwardRef<HTMLDivElement, TouchTargetProps>(
  ({ children, minSize = 44, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          `min-h-[${minSize}px] min-w-[${minSize}px]`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TouchTarget.displayName = 'TouchTarget';

interface AccessibleTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg';
  contrast?: 'normal' | 'high';
}

/**
 * AccessibleText - Ensures text meets WCAG readability standards
 */
export const AccessibleText = React.forwardRef<HTMLSpanElement, AccessibleTextProps>(
  ({ children, size = 'base', contrast = 'normal', className, ...props }, ref) => {
    const sizeClasses = {
      xs: 'text-readable-xs',   // 14px minimum
      sm: 'text-readable-sm',   // 15px
      base: 'text-readable-base', // 16px
      lg: 'text-readable-lg',   // 18px
    };

    const contrastClasses = {
      normal: 'text-foreground',
      high: 'text-foreground contrast-125',
    };

    return (
      <span
        ref={ref}
        className={cn(
          sizeClasses[size],
          contrastClasses[contrast],
          'leading-relaxed',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
AccessibleText.displayName = 'AccessibleText';

interface FocusRingProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'destructive';
}

/**
 * FocusRing - Provides consistent, accessible focus indicators
 */
export const FocusRing = React.forwardRef<HTMLDivElement, FocusRingProps>(
  ({ children, variant = 'default', className, ...props }, ref) => {
    const variantClasses = {
      default: 'focus-visible:ring-ring',
      primary: 'focus-visible:ring-primary',
      destructive: 'focus-visible:ring-destructive',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FocusRing.displayName = 'FocusRing';

interface MotionSafeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animation?: string;
  reducedAnimation?: string;
}

/**
 * MotionSafe - Respects user's reduced motion preferences
 */
export const MotionSafe = React.forwardRef<HTMLDivElement, MotionSafeProps>(
  ({ children, animation, reducedAnimation, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          animation && `motion-safe:${animation}`,
          reducedAnimation && `motion-reduce:${reducedAnimation}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MotionSafe.displayName = 'MotionSafe';

/**
 * Screen Reader Only - Content visible only to screen readers
 */
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

/**
 * Skip Link - Allows keyboard users to skip to main content
 */
export const SkipLink: React.FC<{ href?: string; children: React.ReactNode }> = ({ 
  href = '#main-content', 
  children 
}) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md text-readable-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    {children}
  </a>
);