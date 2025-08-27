import React from 'react';
import { cn } from '@/lib/utils';
import { validateCRIScore } from '@/utils/validation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface CRIGaugeProps {
  value: number;
  target?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function CRIGauge({ value, target, className, size = 'md', isLoading = false }: CRIGaugeProps) {
  // Validate input
  if (!validateCRIScore(value)) {
    console.warn('Invalid CRI score provided:', value);
    value = 0;
  }
  
  if (target !== undefined && !validateCRIScore(target)) {
    console.warn('Invalid CRI target provided:', target);
    target = undefined;
  }

  const percentage = Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };

  const getColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className={cn('relative animate-pulse', sizeClasses[size], className)} role="img" aria-label="Loading Career Readiness Index">
        <div className="w-full h-full rounded-full bg-muted" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn('bg-muted rounded h-4 w-8', textSizes[size])} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        className={cn('relative', sizeClasses[size], className)} 
        role="img" 
        aria-label={`Career Readiness Index: ${Math.round(value)} out of 100`}
        aria-describedby={target ? `cri-target-${target}` : undefined}
      >
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className={cn('transition-all duration-500', getColor(value))}
            aria-hidden="true"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn('font-bold', getColor(value), textSizes[size])}>
            {Math.round(value)}
          </div>
          <div className={cn('text-muted-foreground', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
            CRI
          </div>
          {target && target !== value && (
            <div 
              id={`cri-target-${target}`}
              className={cn('text-muted-foreground', size === 'sm' ? 'text-[8px]' : 'text-[10px]')}
            >
              Target: {target}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}