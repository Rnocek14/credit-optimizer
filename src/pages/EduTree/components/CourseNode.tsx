import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EduCourse, AltCreditOption } from '@/lib/types/eduTree';
import { ChevronDown, ChevronRight, Info, Clock, DollarSign } from 'lucide-react';

interface CourseNodeProps {
  course: EduCourse;
  isCompleted?: boolean;
  equivalencies?: AltCreditOption[];
  onClick?: (course: EduCourse) => void;
}

export function CourseNode({ course, isCompleted = false, equivalencies = [], onClick }: CourseNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDescription = course.description && course.description.length > 0;
  const hasLearningOutcomes = course.learning_outcomes && course.learning_outcomes.length > 0;
  const hasDetails = hasDescription || hasLearningOutcomes;

  const getDifficultyLevel = (levelYear: number) => {
    if (levelYear <= 1) return { label: 'Foundation', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' };
    if (levelYear <= 2) return { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200' };
    return { label: 'Advanced', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' };
  };

  const difficulty = getDifficultyLevel(course.level_year);

  return (
    <div className={`
      relative p-4 rounded-lg border-2 bg-card w-[320px]
      transition-all duration-200 hover:shadow-md cursor-pointer
      ${isCompleted ? 'border-primary bg-primary/10 ring-1 ring-primary/20' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
    `}
    onClick={onClick ? () => onClick(course) : undefined}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-xs font-mono text-muted-foreground mb-1">
            {course.code}
          </div>
          <div className="font-semibold text-sm leading-tight mb-2">
            {course.title}
          </div>
        </div>
        {onClick && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClick(course);
            }}
          >
            <Info className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Course badges */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        <Badge variant="outline" className="text-xs">
          {course.credits} cr
        </Badge>
        
        <Badge 
          variant={course.is_core ? "default" : "secondary"} 
          className="text-xs"
        >
          {course.area.replace('_', ' ')}
        </Badge>
        
        <Badge className={`text-xs ${difficulty.color}`}>
          {difficulty.label}
        </Badge>
        
        {course.is_capstone && (
          <Badge variant="destructive" className="text-xs">
            Capstone
          </Badge>
        )}
      </div>

      {/* Expandable description */}
      {hasDetails && (
        <div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            Details
          </Button>
          
          {isExpanded && (
            <div className="mt-2 text-xs text-muted-foreground space-y-2">
              {hasDescription && (
                <p className="line-clamp-3">{course.description}</p>
              )}
              {hasLearningOutcomes && (
                <div>
                  <div className="font-medium text-foreground mb-1">Learning Outcomes:</div>
                  <ul className="space-y-1 pl-2">
                    {course.learning_outcomes.slice(0, 3).map((outcome, idx) => (
                      <li key={idx} className="text-xs">• {outcome}</li>
                    ))}
                    {course.learning_outcomes.length > 3 && (
                      <li className="text-xs font-medium">+ {course.learning_outcomes.length - 3} more...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Alternative credit options */}
      {equivalencies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs text-primary font-medium">Alternative Credit</div>
            <Badge variant="outline" className="text-xs">
              {equivalencies.length} option{equivalencies.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-1">
            {equivalencies.slice(0, 2).map((equiv, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">{equiv.provider}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {equiv.estimated_hours && (
                    <div className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{equiv.estimated_hours}h</span>
                    </div>
                  )}
                  {equiv.cost_estimate && (
                    <div className="flex items-center gap-0.5 text-green-600">
                      <DollarSign className="h-2.5 w-2.5" />
                      <span>{equiv.cost_estimate}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {equivalencies.length > 2 && (
              <div className="text-xs text-muted-foreground">
                + {equivalencies.length - 2} more options
              </div>
            )}
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