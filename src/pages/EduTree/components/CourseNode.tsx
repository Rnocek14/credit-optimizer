import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EduCourse } from '@/lib/types/eduTree';

interface CourseNodeProps {
  course: EduCourse;
  isCompleted?: boolean;
  equivalencies?: any[];
  compact?: boolean;
}

export function CourseNode({ course, isCompleted = false, equivalencies = [], compact = false }: CourseNodeProps) {
  return (
    <div className={`
      relative rounded-lg border bg-card transition-all duration-200 hover:shadow-md
      ${compact ? 'p-2 min-w-[180px] max-w-[180px]' : 'p-4 min-w-[220px] max-w-[220px]'}
      ${isCompleted ? 'border-primary bg-primary/10 ring-1 ring-primary/20' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
    `}>
      {/* Course code */}
      <div className={`font-mono text-muted-foreground mb-1 ${compact ? 'text-xs' : 'text-xs'}`}>
        {course.code}
      </div>
      
      {/* Course title with better line height */}
      <div className={`font-semibold leading-tight mb-2 overflow-hidden ${
        compact ? 'text-xs h-6' : 'text-sm h-8'
      }`}>
        <span className="line-clamp-2">{course.title}</span>
      </div>
      
      {/* Course badges */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {course.credits} cr
        </Badge>
        
        <Badge 
          variant={course.is_core ? "default" : "secondary"} 
          className="text-xs"
        >
          {course.area.replace('_', ' ')}
        </Badge>
        
        {course.is_capstone && (
          <Badge variant="destructive" className="text-xs">
            Capstone
          </Badge>
        )}
      </div>
      
      {/* Alternative credit options */}
      {equivalencies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-primary font-medium">
            Alt Credit Available
          </div>
          <div className="text-xs text-muted-foreground">
            {equivalencies[0].provider} • ${equivalencies[0].cost_estimate || 'TBD'}
          </div>
        </div>
      )}
      
      {/* Completion indicator */}
      {isCompleted && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-background rounded-full" />
        </div>
      )}
    </div>
  );
}