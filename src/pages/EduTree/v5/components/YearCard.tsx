import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LoadHealth, CreditsSummary, ModulesSummary, YearPanelHint } from '../types/v5';
import type { NodeSelectedSummary } from '../types/nodeProgress';
import { usePlanStore } from '../state/usePlanStore';
import { usePlanBasket } from '../state/usePlanBasket';
import { PROGRAM_MODULES } from '@/fixtures/v5/programModules';
import { formatCost, formatDuration, formatCRI } from '../utils/formatters';
import { toast } from 'sonner';
import { logEvent } from '@/lib/analytics';


interface YearCardProps {
  year: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onClick?: (hint?: YearPanelHint) => void;
  creditsSummary: CreditsSummary;
  selectedSummary?: NodeSelectedSummary;
  loadHealth: LoadHealth;
  modulesSummary: ModulesSummary;
  warnings?: string[];
}

export function YearCard({ 
  year, 
  isCollapsed, 
  onToggle,
  onClick,
  creditsSummary,
  selectedSummary,
  loadHealth,
  modulesSummary,
  warnings 
}: YearCardProps) {
  const yearHeadingRef = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  
  const progressPercentage = creditsSummary.required > 0
    ? (creditsSummary.planned / creditsSummary.required) * 100 
    : 0;

  // Optimized: Use Set for O(1) lookup instead of O(n) array.includes()
  const yearModuleIdSet = useMemo(() => {
    const ids = PROGRAM_MODULES.filter(m => m.year === year).map(m => m.id);
    return new Set(ids);
  }, [year]);

  const hasCoursesPlanned = usePlanBasket(
    useShallow(state => state.items.some(item => yearModuleIdSet.has(item.moduleId)))
  );

  // Legacy semester credits for metrics display
  const { fallCredits, springCredits } = usePlanStore(
    useShallow(s => {
      const fallSemester = s.semesters[`${year}-fall`] || { credits: 0, courseIds: [] };
      const springSemester = s.semesters[`${year}-spring`] || { credits: 0, courseIds: [] };
      return {
        fallCredits: fallSemester.credits,
        springCredits: springSemester.credits,
      };
    })
  );

  const getLoadHealthBadge = () => {
    switch (loadHealth) {
      case 'underloaded':
        return { emoji: '📘', label: 'Light', variant: 'secondary' as const };
      case 'overloaded':
        return { emoji: '🔴', label: 'Heavy', variant: 'destructive' as const };
      default:
        return { emoji: '🟢', label: 'Balanced', variant: 'success' as const };
    }
  };

  const loadBadge = getLoadHealthBadge();
  const moduleText = modulesSummary.total === 1 ? 'module' : 'modules';
  const isComplete = creditsSummary.planned >= creditsSummary.required;
  
  return (
    <div
      data-year={year}
      onClick={(e) => {
        e.stopPropagation();
        console.log('[YearCard] Click detected:', { year, hasOnClick: !!onClick });
        
        // Check if clicking a button (like collapse chevron)
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
          console.log('[YearCard] Click on button, ignoring');
          return; // Let the button handle it
        }
        
        // Card body click: open panel if available, else toggle
        if (onClick) {
          console.log('[YearCard] Calling onClick handler for year:', year);
          onClick();
        } else {
          console.log('[YearCard] No onClick, toggling collapse');
          onToggle();
        }
      }}
      className={`
        year-card
        px-6 py-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        min-w-[200px]
        flex flex-col gap-3
        hover:scale-[1.02] hover:shadow-lg
        ${isCollapsed 
          ? `collapsed opacity-70 min-h-[90px] border-dashed ${isComplete ? 'bg-success/5 border-success/30' : 'bg-primary/5 border-primary'}` 
          : `expanded min-h-[140px] ${isComplete ? 'bg-success/10 border-success/70 shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'bg-primary/10 border-primary'}`
        }
      `}
    >
      {/* Header: Clean 3-tier layout */}
      <div className="space-y-2">
        {/* Tier 1: Title + Complete Badge + Chevron */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 
              ref={yearHeadingRef}
              tabIndex={-1}
              className="text-primary font-bold text-lg outline-none focus:ring-2 focus:ring-primary/20 rounded px-1"
            >
              Year {year}
            </h3>
            {isComplete && (
              <Badge variant="success" size="sm" className="text-[10px] h-5 ml-1">
                ✓ Complete
              </Badge>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isCollapsed ? 'Expand year' : 'Collapse year'}
            className="p-1.5 hover:bg-primary/20 rounded transition-colors min-w-[28px] min-h-[28px]"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        
        {/* Tier 2: Progress bar */}
        <div className="flex items-center gap-2">
          <Progress value={progressPercentage} className="h-1.5 flex-1 bg-white/12" />
        </div>
        
        {/* Tier 3: Consolidated metrics line */}
        <div className="flex items-center justify-center gap-x-2 gap-y-1 text-[13px] leading-[1.4] text-foreground/85 font-medium flex-wrap mt-1">
          <span className="whitespace-nowrap">
            {creditsSummary.planned}/{creditsSummary.required > 0 ? creditsSummary.required : '?'} credits
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="whitespace-nowrap">
            {modulesSummary.completed}/{modulesSummary.total} {moduleText}
          </span>
          {selectedSummary && !selectedSummary.isEmpty && (
            <>
              <span className="text-muted-foreground">•</span>
              {selectedSummary.cost != null ? (
                <span className="whitespace-nowrap">Est. {formatCost(selectedSummary.cost)}</span>
              ) : (
                <span className="inline-block h-3.5 w-16 rounded bg-muted/30 animate-pulse align-middle" />
              )}
              <span className="text-muted-foreground">•</span>
              {selectedSummary.weeks != null ? (
                <span className="whitespace-nowrap">{selectedSummary.weeks} weeks</span>
              ) : (
                <span className="inline-block h-3.5 w-14 rounded bg-muted/30 animate-pulse align-middle" />
              )}
              <span className="text-muted-foreground">•</span>
              <span className="whitespace-nowrap">
                <abbr title="Course Readiness Index" className="no-underline cursor-help">CRI</abbr> {formatCRI(selectedSummary.avgCri)}
              </span>
            </>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={loadBadge.variant} size="sm" className="text-[13px] font-medium h-5 px-2 ml-1 cursor-help">
                  Load: {loadBadge.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Based on planned credits and weekly hours</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {isCollapsed ? (
        /* Collapsed State: Compact Summary */
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <div>{modulesSummary.total} {moduleText} • {modulesSummary.completed} complete • {creditsSummary.planned} cr</div>
          {selectedSummary && !selectedSummary.isEmpty && (
            <div className="text-[10px]">
              ${selectedSummary.cost} • {selectedSummary.weeks}w • CRI {Math.round(selectedSummary.avgCri)}
            </div>
          )}
        </div>
      ) : (
        /* Expanded State: Full Details */
        <>
          {/* Quick Actions Toolbar - Demoted to tertiary */}
          <div className="flex gap-3 justify-center pt-1 pb-2 border-t border-muted/30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(); // Opens year panel with templates
              }}
              className="text-[10px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 transition-colors py-2 min-h-[36px]"
            >
              📋 Browse templates
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                
                // 1. Identify all modules for this year
                const yearModules = PROGRAM_MODULES.filter(m => m.year === year);
                const moduleIds = yearModules.map(m => m.id);
                
                if (import.meta.env.DEV) {
                  console.log('[YearCard] Clear Year clicked:', {
                    year,
                    moduleCount: moduleIds.length,
                    moduleIds,
                  });
                }
                
                // 2. Preview what will be removed
                const basket = usePlanBasket.getState();
                const itemsToRemove = basket.items.filter(item => 
                  moduleIds.includes(item.moduleId)
                );
                
                if (itemsToRemove.length === 0) {
                  toast.message("Nothing to clear", {
                    description: `Year ${year} has no courses.`,
                  });
                  return;
                }
                
                // 3. Confirm with user
                const courseCount = itemsToRemove.length;
                const moduleCount = new Set(itemsToRemove.map(i => i.moduleId)).size;
                
                if (!window.confirm(
                  `Clear all courses from Year ${year}?\n\n` +
                  `This will remove ${courseCount} course${courseCount !== 1 ? 's' : ''} ` +
                  `across ${moduleCount} module${moduleCount !== 1 ? 's' : ''}.\n\n` +
                  `This cannot be undone.`
                )) {
                  if (import.meta.env.DEV) {
                    console.log('[YearCard] User cancelled clear');
                  }
                  return;
                }
                
  // 4. Execute full clear across both stores
  if (import.meta.env.DEV) {
    console.log('[YearCard] Clearing:', {
      courses: itemsToRemove.map(i => ({ id: i.courseId, module: i.moduleId })),
    });
  }
  
  // 4a. Remove course items ONLY from this year's modules (batch operation)
  // CRITICAL: Can't use removeItem(courseId) because same course may exist in other years
  basket.removeItemsByModuleIds(moduleIds);
  
  // 4b. Clear module template states
  moduleIds.forEach(moduleId => {
    basket.clearModuleState(moduleId);
  });
  
  // 4c. Clear semester metadata in legacy store
  const clearYear = usePlanStore.getState().clearYear;
  clearYear(year);
                
                // 5. Confirm success
                if (import.meta.env.DEV) {
                  console.log('[YearCard] Clear complete:', {
                    remainingItems: usePlanBasket.getState().items.length,
                    remainingSemesters: Object.keys(usePlanStore.getState().semesters),
                  });
                }
                
                toast.success("Year cleared", {
                  description: `Removed ${courseCount} course${courseCount !== 1 ? 's' : ''} from Year ${year}.`,
                });
                
                // Invalidate queries for all modules in this year to refresh UI
                const clearYearModules = PROGRAM_MODULES.filter(m => m.year === year);
                clearYearModules.forEach(mod => {
                  void queryClient.invalidateQueries({
                    predicate: q => Array.isArray(q.queryKey)
                      && q.queryKey[0] === 'module-templates-ranked'
                      && q.queryKey[1] === mod.id
                  });
                });
                
                // Track telemetry
                logEvent('plan_year_cleared', {
                  year,
                  removedCourses: courseCount,
                  removedModules: moduleCount,
                  remainingItems: usePlanBasket.getState().items.length
                });
                
                // Move focus to year heading for SR users
                setTimeout(() => {
                  yearHeadingRef.current?.focus();
                }, 100);
              }}
              disabled={!hasCoursesPlanned}
              title={!hasCoursesPlanned ? "Nothing to clear" : "Clear all courses from this year"}
              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:no-underline py-2 min-h-[36px]"
            >
              🗑️ Clear year
            </button>
          </div>
          
          {/* Year Summary & Actions */}
          <div className="mt-2 pt-2 border-t border-muted space-y-3 min-h-[88px]">
            {!hasCoursesPlanned ? (
              <>
                {/* Empty state hint */}
                <div className="text-center text-[11px] text-muted-foreground">
                  {modulesSummary.total} {moduleText} to plan • {creditsSummary.required} credits required
                </div>
                
                {/* Primary CTA */}
                <div className="space-y-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick?.({ focusTab: 'templates' });
                      // TODO: Parent should move focus to Templates panel heading after panel opens
                    }}
                    className="w-full px-4 py-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md transition-all shadow-sm inline-flex items-center justify-center gap-2"
                    aria-label={`Apply a year template for Year ${year} - auto-fill courses across Fall and Spring`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5">🎯</span>
                    <span>Apply Year {year} Template</span>
                  </button>
                  <p className="text-center text-[11px] text-muted-foreground min-h-[16px]">
                    We'll balance courses across Fall and Spring.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Status subtext - dynamic with live region for a11y */}
                <p 
                  key={
                    isComplete ? 'complete'
                      : (fallCredits > 0 || springCredits > 0) ? `planned-${fallCredits}-${springCredits}`
                      : `modules-${modulesSummary.completed}`
                  }
                  role="status" 
                  aria-live="polite" 
                  aria-atomic="true"
                  className="text-center text-[11px] text-muted-foreground"
                >
                  {isComplete ? (
                    <span className="text-success font-medium">
                      ✅ Year planned ({fallCredits > 0 && springCredits > 0 ? `🍂 ${fallCredits} cr • 🌸 ${springCredits} cr` : `${creditsSummary.planned} cr`})
                    </span>
                  ) : (fallCredits > 0 || springCredits > 0) ? (
                    <span>Planning: {fallCredits > 0 ? `🍂 ${fallCredits} cr` : ''}{fallCredits > 0 && springCredits > 0 ? ' • ' : ''}{springCredits > 0 ? `🌸 ${springCredits} cr` : ''}</span>
                  ) : (
                    <span>{modulesSummary.completed} of {modulesSummary.total} {moduleText} complete</span>
                  )}
                </p>
              </>
            )}
          </div>
          
          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="text-center text-[9px] text-destructive">
              ⚠️ {warnings[0]}
              {warnings.length > 1 && ` +${warnings.length - 1} more`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
