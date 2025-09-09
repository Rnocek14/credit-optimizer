import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PlaceholderChip } from './PlaceholderChip';
import { PlaceholderWithCourses, isPlaceholderComplete } from '@/lib/types/eduTree';
import { useNodeResize } from '@/hooks/useNodeResize';
import { useFeatureFlags } from '@/lib/featureFlags';

interface PlaceholderGroupProps {
  id: string;
  data: {
    placeholder: PlaceholderWithCourses;
    completedCourseIds: Set<string>;
    isUnlocked: boolean;
    progress: {
      completed: number;
      required: number;
    };
    level_year: number;
    area: string;
    isHighlighted?: boolean;
    planningLens?: string | null;
  };
}

export function PlaceholderGroup({ id, data }: PlaceholderGroupProps) {
  const flags = useFeatureFlags();
  const [expandedPlaceholders, setExpandedPlaceholders] = useState<Set<string>>(new Set());
  const { attachResizeObserver, detachResizeObserver } = useNodeResize(id);
  
  const { placeholder, completedCourseIds, isUnlocked, progress, isHighlighted } = data;
  const isComplete = isPlaceholderComplete(placeholder, placeholder.courses, completedCourseIds);
  const progressPercent = progress.required > 0 ? Math.round((progress.completed / progress.required) * 100) : 0;

  // Attach resize observer for layout lifecycle
  useEffect(() => {
    if (flags.eduTreeLayoutV2) {
      const nodeElement = document.querySelector(`[data-id="${id}"]`);
      if (nodeElement) {
        attachResizeObserver(nodeElement as HTMLElement);
        return detachResizeObserver;
      }
    }
  }, [flags.eduTreeLayoutV2, id, attachResizeObserver, detachResizeObserver]);

  const toggleExpanded = (placeholderId: string) => {
    setExpandedPlaceholders(prev => {
      const next = new Set(prev);
      if (next.has(placeholderId)) {
        next.delete(placeholderId);
      } else {
        next.add(placeholderId);
      }
      return next;
    });
  };

  const areaColors = {
    foundation: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    mathematics: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800', 
    general_education: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    core: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
    specialization: 'bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-800',
    software_engineering: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950 dark:border-cyan-800',
    capstone: 'bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800'
  };

  const areaColor = areaColors[placeholder.area as keyof typeof areaColors] || areaColors.core;

  return (
    <Card className={`
      w-80 transition-all duration-200 relative
      ${areaColor}
      ${isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''}
      ${!isUnlocked ? 'opacity-60' : ''}
      ${isComplete ? 'border-success' : ''}
    `}>
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Right}  
        className="w-3 h-3 bg-primary border-2 border-background"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Year {placeholder.level_year || '?'}
            </Badge>
            <Badge 
              variant={isComplete ? "default" : "secondary"}
              className="text-xs"
            >
              {isComplete ? "Complete" : "In Progress"}
            </Badge>
          </div>
          
          {!isUnlocked && (
            <Badge variant="destructive" className="text-xs">
              Locked
            </Badge>
          )}
        </div>

        {/* Title */}
        <div className="mb-3">
          <h3 className="text-base font-semibold text-foreground">
            {placeholder.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {placeholder.area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Requirements
          </p>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress.completed}/{progress.required} ({progressPercent}%)
            </span>
          </div>          
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Child Placeholders or Courses */}
        {placeholder.children && placeholder.children.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Choose from specialization tracks:
            </p>
            {placeholder.children.map(child => (
              <PlaceholderChip
                key={child.id}
                placeholder={child}
                completedCourseIds={completedCourseIds}
                isExpanded={expandedPlaceholders.has(child.id)}
                onToggle={() => toggleExpanded(child.id)}
              />
            ))}
          </div>
        ) : placeholder.courses.length > 0 ? (
          <PlaceholderChip
            placeholder={placeholder}
            completedCourseIds={completedCourseIds}
            isExpanded={expandedPlaceholders.has(placeholder.id)}
            onToggle={() => toggleExpanded(placeholder.id)}
          />
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No course options configured
          </div>
        )}
      </div>
    </Card>
  );
}