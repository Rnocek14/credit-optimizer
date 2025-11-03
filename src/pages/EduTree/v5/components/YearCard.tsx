import { ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { LoadHealth, CreditsSummary, ModulesSummary, YearPanelHint } from '../types/v5';
import type { NodeSelectedSummary } from '../types/nodeProgress';
import { DroppableSemester } from './drag/DroppableSemester';
import { usePlanStore } from '../state/usePlanStore';

function SemesterLane({ 
  year, 
  term,
  basketItems,
  onAutoFill
}: { 
  year: number; 
  term: 'fall' | 'spring';
  basketItems: Array<{
    courseId: string;
    credits: number;
    workload_weekly_hours: number;
    semester?: string;
  }>;
  onAutoFill?: (opts: { year: number; term: 'fall' | 'spring' }) => void;
}) {
  // ✅ Phase 2: Compute semester metrics directly from basket items
  const semesterCourses = basketItems.filter(item => item.semester === term);
  const credits = semesterCourses.reduce((sum, c) => sum + c.credits, 0);
  const workloadHours = semesterCourses.reduce((sum, c) => sum + (c.workload_weekly_hours || 0), 0);
  
  const header = term === 'fall' ? `Fall • Year ${year}` : `Spring • Year ${year}`;
  
  return (
    <DroppableSemester 
      id={`${year}-${term}`}
      header={header}
      credits={credits}
      workloadHours={workloadHours}
    >
      {semesterCourses.length > 0 ? (
        <div className="space-y-1">
          {semesterCourses.map(item => (
            <div 
              key={item.courseId}
              className="text-[10px] px-2 py-1 bg-card rounded border border-border"
            >
              {item.courseId} ({item.credits}cr)
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-32 flex-col items-center justify-center text-sm text-muted-foreground">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAutoFill?.({ year, term });
            }}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary/90 text-primary-foreground hover:bg-primary transition-colors shadow-sm min-h-[32px]"
            aria-label={`Auto-fill ${term === 'fall' ? 'Fall' : 'Spring'} Year ${year}`}
          >
            {term === 'fall' && year === 1 ? '🎯 Auto-fill Fall 1' : `📚 Auto-fill ${term === 'fall' ? 'Fall' : 'Spring'} ${year}`}
          </button>
        </div>
      )}
    </DroppableSemester>
  );
}

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
  basketItems?: Array<{
    courseId: string;
    credits: number;
    workload_weekly_hours: number;
    semester?: string;
    moduleId: string;
  }>;
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
  warnings,
  basketItems = []
}: YearCardProps) {
  const progressPercentage = creditsSummary.required > 0 
    ? (creditsSummary.planned / creditsSummary.required) * 100 
    : 0;

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
        
        {/* Tier 2: Progress + Stats + Load Badge (single row) */}
        <div className="flex items-center gap-2">
          <Progress value={progressPercentage} className="h-1.5 flex-1 bg-white/12" />
          <span className="text-[11px] text-foreground/90 font-medium whitespace-nowrap">
            {creditsSummary.planned}/{creditsSummary.required} cr
          </span>
          <span className="text-[11px] text-muted-foreground">•</span>
          <span className="text-[11px] text-foreground/80 whitespace-nowrap">
            {modulesSummary.completed}/{modulesSummary.total} {moduleText}
          </span>
          <Badge variant={loadBadge.variant} size="sm" className="text-[10px] h-5 px-2">
            {loadBadge.emoji} {loadBadge.label}
          </Badge>
        </div>
        
        {/* Tier 3: Meta (Cost/Time/CRI) - improved contrast */}
        {selectedSummary && !selectedSummary.isEmpty && (
          <div className="text-center text-[11px] text-foreground/85 font-medium">
            ${selectedSummary.cost} • {selectedSummary.weeks}w • CRI {Math.round(selectedSummary.avgCri)}
          </div>
        )}
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
          {/* Quick Actions Toolbar */}
          <div className="flex gap-2 justify-center pt-1 pb-2 border-t border-muted/30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(); // Opens year panel with templates
              }}
              className="text-[11px] text-primary hover:text-primary/80 hover:underline font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-primary/10 transition-colors"
            >
              📋 Browse Templates
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Wire up clear year action
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              🗑️ Clear Year
            </button>
          </div>
          
          {/* Semester Lanes */}
          <div className="mt-2 pt-2 border-t border-muted">
            <div className="grid grid-cols-2 gap-3">
              <SemesterLane 
                year={year} 
                term="fall"
                basketItems={basketItems}
                onAutoFill={({ year, term }) => {
                  console.log('[YearCard] Auto-fill clicked:', { year, term, event: 'open_year_templates_from_lane' });
                  if (!onClick) {
                    console.warn('[YearCard] onClick missing; cannot open Year panel');
                    return;
                  }
                  onClick({ focusTab: 'templates', focusTerm: term });
                }}
              />
              <SemesterLane 
                year={year} 
                term="spring"
                basketItems={basketItems}
                onAutoFill={({ year, term }) => {
                  console.log('[YearCard] Auto-fill clicked:', { year, term, event: 'open_year_templates_from_lane' });
                  if (!onClick) {
                    console.warn('[YearCard] onClick missing; cannot open Year panel');
                    return;
                  }
                  onClick({ focusTab: 'templates', focusTerm: term });
                }}
              />
            </div>
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
