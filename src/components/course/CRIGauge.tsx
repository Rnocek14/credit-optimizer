import React from 'react';
import { cn } from '@/lib/utils';

interface CRIGaugeProps {
  value: number;
  target?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CRIGauge({ value, target, className, size = 'md' }: CRIGaugeProps) {
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

  return (
    <div className={cn('relative', sizeClasses[size], className)} role="img" aria-label="Career Readiness Index">
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
          <div className={cn('text-muted-foreground', size === 'sm' ? 'text-[8px]' : 'text-[10px]')}>
            Target: {target}
          </div>
        )}
      </div>
    </div>
  );
}