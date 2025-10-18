/**
 * ModuleCard - Collapsible module node for sub-requirements
 * Displays progress, description, and allows browsing marketplace options
 */
import React from 'react';
import { SubRequirement, SubRequirementStatus } from '../../types/v4';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';

interface ModuleCardProps {
  module: SubRequirement;
  validation: SubRequirementStatus;
  isCollapsed: boolean;
  onToggle: () => void;
  onBrowseOptions: () => void;
}

export function ModuleCard({ 
  module, 
  validation, 
  isCollapsed, 
  onToggle, 
  onBrowseOptions 
}: ModuleCardProps) {
  const progress = validation.creditsNeeded > 0
    ? (validation.creditsEarned / validation.creditsNeeded) * 100
    : validation.completed.length > 0 ? 100 : 0;
  
  const completionText = validation.creditsNeeded > 0
    ? `${validation.creditsEarned} / ${validation.creditsNeeded} credits`
    : `${validation.completed.length} / ${(validation.completed.length + validation.missing.length)} courses`;

  const totalCourses = validation.completed.length + validation.missing.length;
  const hiddenCount = isCollapsed ? totalCourses : 0;

  return (
    <Card className="w-[280px] p-3 bg-card border-border shadow-sm hover:shadow-md transition-all">
      {/* Header: Icon + Label + Toggle */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1">
          {module.icon && <span className="text-xl">{module.icon}</span>}
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-foreground leading-tight">
              {module.label}
            </h4>
            {isCollapsed && totalCourses > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {totalCourses} {totalCourses === 1 ? 'course' : 'courses'} hidden
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 w-6 p-0 hover:bg-muted"
          aria-label={isCollapsed ? 'Expand module' : 'Collapse module'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          {/* Progress Bar */}
          <div className="mb-2">
            <Progress value={progress} className="h-2 mb-1" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completionText}</span>
              <Badge variant={validation.isComplete ? 'default' : 'secondary'} className="text-[10px]">
                {validation.isComplete ? '✓ Complete' : 'In Progress'}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {module.description && (
            <p className="text-xs text-muted-foreground italic mb-3">
              {module.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBrowseOptions}
              disabled={validation.isComplete}
              className="flex-1 h-8 text-xs"
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Browse Options
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
