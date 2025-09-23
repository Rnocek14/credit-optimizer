/**
 * Enhanced progress indicator for course completion and track progress
 */

import React, { useMemo } from 'react';
import { CheckCircle, Circle, Clock, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { COPY } from '../constants/copy';

interface ProgressIndicatorProps {
  completed: number;
  inProgress: number;
  total: number;
  trackName?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressIndicator({
  completed,
  inProgress,
  total,
  trackName,
  showDetails = true,
  size = 'md'
}: ProgressIndicatorProps) {
  const { completedPct, inProgressPct, locked } = useMemo(() => {
    const locked = Math.max(0, total - completed - inProgress);
    return {
      locked,
      completedPct: total > 0 ? (completed / total) * 100 : 0,
      inProgressPct: total > 0 ? (inProgress / total) * 100 : 0,
    };
  }, [completed, inProgress, total]);

  const sizeClasses = {
    sm: 'text-xs h-6',
    md: 'text-sm h-8', 
    lg: 'text-base h-10'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="progress-indicator space-y-2">
      {/* Header */}
      {trackName && (
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
            {trackName}
          </h3>
          <Badge variant="outline" className={sizeClasses[size]}>
            {completed}/{total}
          </Badge>
        </div>
      )}

      {/* Progress Bar */}
      <div className="relative">
        <Progress 
          value={completedPct} 
          className="h-3"
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemax={total}
          aria-valuetext={`${completed} of ${total} courses completed`}
        />
        {inProgress > 0 && (
          <div 
            className="absolute top-0 left-0 h-full bg-yellow-500/50 rounded-full transition-all"
            style={{ width: `${Math.min(inProgressPct, 100 - completedPct)}%` }}
          />
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {completed != null && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className={iconSizes[size]} />
              <span>{completed} {COPY.complete}</span>
            </div>
          )}
          
          {inProgress != null && inProgress > 0 && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Clock className={iconSizes[size]} />
              <span>{inProgress} {COPY.inProgress}</span>
            </div>
          )}
          
          {locked != null && locked > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className={iconSizes[size]} />
              <span>{locked} {COPY.locked}</span>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="text-xs text-muted-foreground text-center">
        {completedPct.toFixed(0)}% {COPY.complete}
        {inProgress > 0 && ` • ${inProgress} in progress`}
      </div>
    </div>
  );
}