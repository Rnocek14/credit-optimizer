/**
 * ModuleGroupNode - ReactFlow parent node for sub-requirements
 * Contains child course nodes and provides visual grouping hierarchy
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { SubRequirement, SubRequirementStatus } from '../../types/v4';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';

interface ModuleGroupNodeProps {
  data: {
    module: SubRequirement;
    validation: SubRequirementStatus;
    isCollapsed: boolean;
    onToggle: () => void;
    onBrowseOptions: () => void;
    level?: 'bucket' | 'sequence'; // Level-aware styling
  };
}

export function ModuleGroupNode({ data }: ModuleGroupNodeProps) {
  const { module, validation, isCollapsed, onToggle, onBrowseOptions, level = 'sequence' } = data;
  
  const progress = validation.creditsNeeded > 0
    ? (validation.creditsEarned / validation.creditsNeeded) * 100
    : validation.completed.length > 0 ? 100 : 0;
  
  const totalCourses = validation.completed.length + validation.missing.length;
  const isBucket = level === 'bucket';
  
  return (
    <div 
      className={`backdrop-blur-sm border-2 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl p-4 relative overflow-hidden ${
        isBucket 
          ? 'bg-primary/5 border-primary/30' 
          : 'bg-card/80 border-border'
      }`}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          {module.icon && (
            <span className={`flex-shrink-0 ${isBucket ? 'text-4xl' : 'text-3xl'}`} aria-hidden="true">
              {module.icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold leading-tight mb-1 ${isBucket ? 'text-xl' : 'text-lg'}`}>
              {module.label}
            </h3>
            {module.description && (
              <p className="text-xs text-muted-foreground leading-snug">
                {module.description}
              </p>
            )}
            {isCollapsed && totalCourses > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalCourses} {totalCourses === 1 ? 'course' : 'courses'} hidden
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0 hover:bg-muted flex-shrink-0"
          aria-label={isCollapsed ? 'Expand module' : 'Collapse module'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Expanded content */}
      {!isCollapsed && (
        <>
          {/* Progress Bar */}
          <div className="mb-4">
            <Progress value={progress} className="h-2.5 mb-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                {validation.creditsNeeded > 0
                  ? `${validation.creditsEarned} / ${validation.creditsNeeded} credits`
                  : `${validation.completed.length} / ${totalCourses} courses`}
              </span>
              <Badge variant={validation.isComplete ? 'default' : 'secondary'} className="text-xs">
                {validation.isComplete ? '✓ Complete' : 'In Progress'}
              </Badge>
            </div>
          </div>

          {/* Add Course Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onBrowseOptions}
            className="w-full"
            disabled={validation.isComplete}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Browse Options
          </Button>
        </>
      )}

      {/* ReactFlow handles for connections */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
