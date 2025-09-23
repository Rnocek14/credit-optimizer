/**
 * Enhanced progress indicator for course completion and track progress
 */

import React from 'react';
import { CheckCircle, Circle, Clock, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const completedPercentage = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercentage = total > 0 ? (inProgress / total) * 100 : 0;
  const locked = total - completed - inProgress;

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
    <div className="space-y-2">
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
        <Progress value={completedPercentage} className="h-3" />
        {inProgress > 0 && (
          <div 
            className="absolute top-0 left-0 h-full bg-yellow-500/50 rounded-full transition-all"
            style={{ width: `${Math.min(inProgressPercentage, 100 - completedPercentage)}%` }}
          />
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className={iconSizes[size]} />
            <span>{completed} Complete</span>
          </div>
          
          {inProgress > 0 && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Clock className={iconSizes[size]} />
              <span>{inProgress} In Progress</span>
            </div>
          )}
          
          {locked > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className={iconSizes[size]} />
              <span>{locked} Locked</span>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="text-xs text-muted-foreground text-center">
        {completedPercentage.toFixed(0)}% Complete
        {inProgress > 0 && ` • ${inProgress} in progress`}
      </div>
    </div>
  );
}