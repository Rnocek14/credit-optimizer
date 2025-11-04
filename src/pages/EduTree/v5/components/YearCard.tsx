import { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LoadHealth, CreditsSummary, ModulesSummary, YearPanelHint } from '../types/v5';
import type { NodeSelectedSummary } from '../types/nodeProgress';
import { usePlanStore } from '../state/usePlanStore';
import { formatCost, formatDuration, formatCRI } from '../utils/formatters';


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
  const progressPercentage = creditsSummary.required > 0 
    ? (creditsSummary.planned / creditsSummary.required) * 100 
    : 0;

  // Calculate semester credits for post-fill summary
  const semesters = usePlanStore(s => s.semesters);
  const { fallCredits, springCredits, hasCoursesPlanned } = useMemo(() => {
    const fallSemester = semesters[`${year}-fall`] || { credits: 0, courseIds: [] };
    const springSemester = semesters[`${year}-spring`] || { credits: 0, courseIds: [] };
    return {
      fallCredits: fallSemester.credits,
      springCredits: springSemester.credits,
      hasCoursesPlanned: fallSemester.courseIds.length > 0 || springSemester.courseIds.length > 0,
    };
  }, [semesters, year]);

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
      onClick={(e) => {
        e.stopPropagation();
        
        // Check if clicking a button (like collapse chevron)
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
          return; // Let the button handle it
        }
        
        // Card body click: open panel if available, else toggle
        if (onClick) {
          onClick();
        } else {
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
            <span className="text-primary font-bold text-lg">Year {year}</span>
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
              <span className="whitespace-nowrap">
                {selectedSummary.cost != null ? `Est. ${formatCost(selectedSummary.cost)}` : 'Est. –'}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="whitespace-nowrap">
                {selectedSummary.weeks != null ? `${selectedSummary.weeks} weeks` : '– weeks'}
              </span>
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
                // TODO: Wire up clear year action
              }}
              disabled={!hasCoursesPlanned}
              title={!hasCoursesPlanned ? "Nothing to clear" : "Clear all courses from this year"}
              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:no-underline py-2 min-h-[36px]"
            >
              🗑️ Clear year
            </button>
          </div>
          
          {/* Year Summary & Actions */}
          <div className="mt-2 pt-2 border-t border-muted space-y-3">
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
                  <p className="text-center text-[11px] text-muted-foreground">
                    We'll balance courses across Fall and Spring.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Status subtext - dynamic with live region for a11y */}
                <p className="text-center text-[11px] text-muted-foreground" aria-live="polite" aria-atomic="true">
                  {isComplete ? (
                    <span className="text-success font-medium">
                      ✅ Year planned ({fallCredits > 0 && springCredits > 0 ? `🍂 ${fallCredits} cr • 🌸 ${springCredits} cr` : `${creditsSummary.planned} cr`})
                    </span>
                  ) : (fallCredits > 0 || springCredits > 0) ? (
                    <span>🍂 {fallCredits} cr • 🌸 {springCredits} cr planned</span>
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
