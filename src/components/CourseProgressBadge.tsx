import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { CourseProgress } from '@/hooks/useCourseProgress';

interface CourseProgressBadgeProps {
  progress?: CourseProgress;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CourseProgressBadge({ 
  progress, 
  showProgress = true, 
  size = 'md' 
}: CourseProgressBadgeProps) {
  if (!progress) {
    return (
      <Badge variant="outline" className="gap-1">
        <PlayCircle className="h-3 w-3" />
        Not Started
      </Badge>
    );
  }

  const getStatusConfig = (status: CourseProgress['status']) => {
    switch (status) {
      case 'completed':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          label: 'Completed',
          color: 'text-green-600'
        };
      case 'in_progress':
        return {
          variant: 'secondary' as const,
          icon: PlayCircle,
          label: 'In Progress',
          color: 'text-blue-600'
        };
      case 'paused':
        return {
          variant: 'outline' as const,
          icon: PauseCircle,
          label: 'Paused',
          color: 'text-orange-600'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Clock,
          label: 'Not Started',
          color: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig(progress.status);
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-2">
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
        {progress.status === 'in_progress' && showProgress && (
          <span className="text-xs">({progress.progress_percentage}%)</span>
        )}
      </Badge>
      
      {showProgress && progress.status === 'in_progress' && (
        <Progress 
          value={progress.progress_percentage} 
          className="h-2" 
        />
      )}
    </div>
  );
}