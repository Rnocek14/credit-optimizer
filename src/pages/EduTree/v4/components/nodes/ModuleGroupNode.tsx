/**
 * ModuleGroupNode - ReactFlow parent node for sub-requirements
 * Contains child course nodes and provides visual grouping hierarchy
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleGroupNodeData {
  label: string;
  moduleId: string;
  icon?: string;
  description?: string;
  level?: 'bucket' | 'sequence';
  courseCount?: number;
  creditsEarned?: number;
  creditsRequired?: number;
  onClick?: () => void;
}

interface ModuleGroupNodeProps {
  data: ModuleGroupNodeData;
}

export function ModuleGroupNode({ data }: ModuleGroupNodeProps) {
  const { 
    label, 
    icon, 
    description, 
    level = 'sequence',
    courseCount = 0,
    creditsEarned = 0,
    creditsRequired = 0,
    onClick
  } = data;
  
  const isBucket = level === 'bucket';
  const completionPercent = creditsRequired > 0
    ? (creditsEarned / creditsRequired) * 100
    : 0;
  
  return (
    <div 
      className={cn(
        "relative cursor-pointer backdrop-blur-sm border-2 rounded-xl shadow-lg transition-all duration-200",
        "hover:shadow-2xl hover:scale-[1.02] hover:border-primary p-5",
        isBucket ? "bg-primary/5 border-primary/30" : "bg-card/80 border-border"
      )}
      onClick={onClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {icon && (
          <span className={cn("flex-shrink-0", isBucket ? "text-5xl" : "text-4xl")}>
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-bold leading-tight", isBucket ? "text-2xl" : "text-xl")}>
            {label}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      
      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="text-sm">
          📚 {courseCount} {courseCount === 1 ? 'course' : 'courses'}
        </Badge>
        <Badge variant={completionPercent === 100 ? 'default' : 'secondary'} className="text-sm">
          {Math.round(completionPercent)}% Complete
        </Badge>
        <Badge variant="outline" className="text-sm">
          {creditsEarned} / {creditsRequired} credits
        </Badge>
      </div>
      
      {/* Progress Ring (Visual) */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div 
          className="absolute inset-y-0 left-0 bg-primary transition-all"
          style={{ width: `${completionPercent}%` }}
        />
      </div>
      
      {/* Click CTA */}
      <div className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
        <span>Click to manage courses</span>
        <ChevronRight className="h-4 w-4" />
      </div>
      
      {/* ReactFlow handles (invisible) */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
