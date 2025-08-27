/**
 * Polished Page Layout Component
 * Provides consistent spacing, animations, and visual hierarchy
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PolishedPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function PolishedPageLayout({ 
  children, 
  className,
  containerSize = 'xl',
  spacing = 'md',
  animate = true
}: PolishedPageLayoutProps) {
  const containerClasses = {
    sm: 'container-sm',
    md: 'container-md', 
    lg: 'container-lg',
    xl: 'container-xl',
    full: 'container-full'
  };

  const spacingClasses = {
    none: '',
    sm: 'py-6',
    md: 'py-8',
    lg: 'py-12'
  };

  return (
    <div className={cn(
      'min-h-screen bg-background',
      animate && 'animate-fade-in-up',
      className
    )}>
      <div className={cn(
        containerClasses[containerSize],
        spacingClasses[spacing]
      )}>
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-h1">{title}</h1>
          {description && <p className="text-body text-muted-foreground max-w-2xl">{description}</p>}
        </div>
        {children && (
          <div className="flex items-center gap-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export function Section({ title, description, children, className, spacing = 'md' }: SectionProps) {
  const spacingClasses = {
    sm: 'space-component',
    md: 'space-content', 
    lg: 'space-section'
  };

  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-h2 mb-2">{title}</h2>}
          {description && <p className="text-body text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}