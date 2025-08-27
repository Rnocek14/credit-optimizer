import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SkillComponent {
  skillId: string;
  current: number;
  target: number;
  weight: number;
}

interface SkillBreakdownBarsProps {
  components: SkillComponent[];
  className?: string;
}

export function SkillBreakdownBars({ components, className }: SkillBreakdownBarsProps) {
  const formatSkillLabel = (skillId: string) => {
    return skillId
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (!components || components.length === 0) {
    return (
      <div className={cn('text-center py-4 text-muted-foreground', className)}>
        No skill breakdown available
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {components.map((component, index) => {
        const percentage = Math.min(100, (component.current / component.target) * 100);
        
        return (
          <div key={component.skillId || index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium w-32 truncate" title={formatSkillLabel(component.skillId)}>
                {formatSkillLabel(component.skillId)}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{component.current}</span>
                <span>/</span>
                <span>{component.target}</span>
                <span className="text-xs">({Math.round(percentage)}%)</span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={percentage} 
                className="h-2"
              />
              <div 
                className={cn(
                  'absolute top-0 left-0 h-2 rounded-full transition-all duration-500',
                  getProgressColor(component.current, component.target)
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}