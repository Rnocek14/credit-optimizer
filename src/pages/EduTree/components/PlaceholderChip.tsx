import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlaceholderWithCourses, getPlaceholderProgressText } from '@/lib/types/eduTree';

interface PlaceholderChipProps {
  placeholder: PlaceholderWithCourses;
  completedCourseIds: Set<string>;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function PlaceholderChip({ 
  placeholder, 
  completedCourseIds, 
  isExpanded, 
  onToggle,
  className = ""
}: PlaceholderChipProps) {
  const progressText = getPlaceholderProgressText(placeholder, placeholder.courses);
  const completedCount = placeholder.courses.filter(c => completedCourseIds.has(c.id)).length;
  const isComplete = completedCount >= (placeholder.k || placeholder.courses.length);
  
  return (
    <Card className={`p-3 border-dashed transition-all duration-200 ${className} ${
      isExpanded ? 'border-primary/50 bg-primary/5' : 'border-muted hover:border-primary/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0 hover:bg-primary/10"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
          
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium truncate">
              {placeholder.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              {progressText} • {completedCount}/{placeholder.courses.length} completed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          <Badge 
            variant={isComplete ? "default" : "secondary"}
            className="text-xs"
          >
            {isComplete ? "Complete" : "Pending"}
          </Badge>
          
          {placeholder.courses.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {placeholder.courses.length} options
            </Badge>
          )}
        </div>
      </div>
      
      {isExpanded && placeholder.courses.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 animate-accordion-down">
          <div className="grid gap-2">
            {placeholder.courses.slice(0, 5).map(course => (
              <div 
                key={course.id}
                className={`flex items-center justify-between p-2 rounded text-xs ${
                  completedCourseIds.has(course.id) 
                    ? 'bg-success/10 text-success-foreground' 
                    : 'bg-muted/50'
                }`}
              >
                <div>
                  <span className="font-medium">{course.code}</span>
                  <span className="ml-2 text-muted-foreground">{course.title}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {course.credits} cr
                </Badge>
              </div>
            ))}
            
            {placeholder.courses.length > 5 && (
              <div className="text-center py-2 text-xs text-muted-foreground">
                +{placeholder.courses.length - 5} more options
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Show children placeholders if any */}
      {isExpanded && placeholder.children && placeholder.children.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          {placeholder.children.map(child => (
            <PlaceholderChip
              key={child.id}
              placeholder={child}
              completedCourseIds={completedCourseIds}
              isExpanded={false}
              onToggle={() => {}}
              className="ml-4 scale-95"
            />
          ))}
        </div>
      )}
    </Card>
  );
}