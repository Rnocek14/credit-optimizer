import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EduCourse } from '@/lib/types/eduTree';

interface CourseNodeProps {
  course: EduCourse;
  isCompleted?: boolean;
  equivalencies?: any[];
}

export function CourseNode({ course, isCompleted = false, equivalencies = [] }: CourseNodeProps) {
  return (
    <div className={`
      relative p-3 rounded-lg border-2 bg-card min-w-[180px] max-w-[200px]
      transition-all duration-200 hover:shadow-md
      ${isCompleted ? 'border-primary bg-primary/5' : 'border-border'}
    `}>
      {/* Course code */}
      <div className="text-xs font-mono text-muted-foreground mb-1">
        {course.code}
      </div>
      
      {/* Course title */}
      <div className="font-semibold text-sm leading-tight mb-2 line-clamp-2">
        {course.title}
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