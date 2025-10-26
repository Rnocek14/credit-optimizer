/**
 * ModuleCard - Collapsible module node for sub-requirements
 * Displays progress, description, and allows browsing marketplace options
 * INTERACTION: Full card click opens panel, chevron toggles collapse
 */
import React, { useCallback } from 'react';
import { SubRequirement, SubRequirementStatus } from '../../types/v4';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { trackTelemetryEvent } from '@/utils/telemetry';

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
  const optionsCount = validation.missing.length;

  // Robust click guard: prevent accidental opens from text selection, interactive descendants
  const onCardActivate = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 1) Selection guard (don't open if user is selecting text)
    const sel = window.getSelection?.();
    if (sel && sel.type === 'Range') return;

    // 2) Interactive-descendant guard (buttons, inputs, links, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [contenteditable], [data-interactive]')) {
      return;
    }

    // 3) Track telemetry and open panel
    void trackTelemetryEvent({
      task: 'module_card_clicked',
      scope: 'module',
      complexity: { 
        moduleId: module.id, 
        optionsCount, 
        hasCompleted: validation.completed.length > 0,
        source: 'card_click' 
      }
    });

    onBrowseOptions();
  }, [onBrowseOptions, module.id, optionsCount, validation.completed.length]);

  // Keyboard activation (Enter/Space)
  const onCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void trackTelemetryEvent({
        task: 'module_card_clicked',
        scope: 'module',
        complexity: { 
          moduleId: module.id, 
          optionsCount, 
          source: 'keyboard' 
        }
      });
      onBrowseOptions();
    }
  }, [onBrowseOptions, module.id, optionsCount]);

  // Chevron toggle with telemetry
  const onChevronToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void trackTelemetryEvent({
      task: 'module_chevron_toggled',
      scope: 'module',
      complexity: { moduleId: module.id, expanded: isCollapsed }
    });
    onToggle();
  }, [onToggle, module.id, isCollapsed]);

  return (
    <Card 
      className="w-[280px] p-3 bg-card border-border shadow-sm cursor-pointer 
                 hover:scale-[1.01] hover:shadow-md 
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                 transition-all duration-200 animate-fade-in"
      onClick={onCardActivate}
      onKeyDown={onCardKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open ${module.label} module to browse options`}
    >
      {/* Header: Icon + Label + Stats + Chevron */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {module.icon && <span className="text-xl flex-shrink-0">{module.icon}</span>}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground leading-tight truncate">
              {module.label}
            </h4>
            {isCollapsed && optionsCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {optionsCount} {optionsCount === 1 ? 'option' : 'options'} available
              </span>
            )}
          </div>
        </div>
        
        {/* Progress Stats + Ring + Chevron */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-semibold text-foreground">
              {validation.creditsEarned}/{validation.creditsNeeded}
            </div>
            <div className="text-[10px] text-muted-foreground">credits</div>
          </div>
          
          {/* Smaller Progress Ring (36x36) */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="transform -rotate-90" width="36" height="36">
              <circle 
                cx="18" 
                cy="18" 
                r="14" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                fill="none" 
                className="text-muted opacity-20"
              />
              <circle 
                cx="18" 
                cy="18" 
                r="14" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                fill="none" 
                className="text-primary transition-all duration-300"
                strokeDasharray={`${2 * Math.PI * 14}`}
                strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
              {Math.round(progress)}%
            </div>
          </div>
          
          {/* Chevron Toggle Button */}
          <button
            onClick={onChevronToggle}
            className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
            aria-label={isCollapsed ? 'Expand module details' : 'Collapse module details'}
            aria-expanded={!isCollapsed}
            data-interactive="true"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Description */}
          {module.description && (
            <p className="text-xs text-muted-foreground italic mb-2">
              {module.description}
            </p>
          )}

          {/* Course Summary Section */}
          {totalCourses > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">
                  📦 {validation.completed.length} of {totalCourses} courses selected
                </span>
                <Badge variant={validation.isComplete ? 'default' : 'secondary'} className="text-[10px]">
                  {validation.isComplete ? '✓ Complete' : 'In Progress'}
                </Badge>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
