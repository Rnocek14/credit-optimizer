/**
 * TwoPhaseTimeline Component
 * 
 * Displays a visual breakdown of alt-credit vs. enrollment phases.
 * Makes the timeline transparent and honest:
 * - Alt-credit prep: User-paced, before enrollment
 * - Enrollment: Institutional pace, fixed duration
 */

import { Clock, BookOpen, GraduationCap } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import type { TwoPhaseBreakdown } from '@/lib/twoPhaseTimeline';
import { formatPhaseDuration, weeksToMonths } from '@/lib/twoPhaseTimeline';

interface TwoPhaseTimelineProps {
  breakdown: TwoPhaseBreakdown;
  /** Compact mode for card display, expanded for detail view */
  variant?: 'compact' | 'expanded';
  className?: string;
}

export function TwoPhaseTimeline({ 
  breakdown, 
  variant = 'compact',
  className 
}: TwoPhaseTimelineProps) {
  const { 
    altCreditWeeks, 
    enrollmentWeeks, 
    totalWeeks, 
    altCredits, 
    institutionalCredits,
    isAltCreditPath 
  } = breakdown;

  // For non-alt-credit paths, show simple timeline
  if (!isAltCreditPath) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2 cursor-help", className)}>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{weeksToMonths(totalWeeks)}</div>
                <div className="text-xs text-muted-foreground">Months</div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              Estimated time to complete at typical enrollment pace (~15 credits/term).
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Calculate proportions for visual bar
  const altProportion = altCreditWeeks / totalWeeks;
  const enrollProportion = enrollmentWeeks / totalWeeks;

  if (variant === 'compact') {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("cursor-help", className)}>
              {/* Total time header */}
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{weeksToMonths(totalWeeks)}</div>
                  <div className="text-xs text-muted-foreground">Est. months</div>
                </div>
              </div>
              
              {/* Visual timeline bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50 dark:bg-white/10 mt-1">
                <div 
                  className="bg-primary/60 transition-all"
                  style={{ width: `${altProportion * 100}%` }}
                />
                <div 
                  className="bg-primary transition-all"
                  style={{ width: `${enrollProportion * 100}%` }}
                />
              </div>
              
              {/* Phase labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>{formatPhaseDuration(altCreditWeeks)} alt-credit</span>
                <span>{formatPhaseDuration(enrollmentWeeks)} enrolled</span>
              </div>
              
              {/* Overlap hint - slightly larger for visibility */}
              <div className="text-[10px] text-muted-foreground/80 mt-1 italic">
                Often overlap to finish sooner
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm p-3">
            <div className="space-y-2">
              <p className="text-xs font-medium">Two-Phase Timeline</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3 w-3 text-primary/60" />
                  <span className="text-muted-foreground">Alt-credit prep:</span>
                  <span className="font-medium">{formatPhaseDuration(altCreditWeeks)}</span>
                  <span className="text-muted-foreground">({altCredits} cr)</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Enrollment:</span>
                  <span className="font-medium">{formatPhaseDuration(enrollmentWeeks)}</span>
                  <span className="text-muted-foreground">({institutionalCredits} cr)</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
                Assumes ~4 weeks per 3-credit alt course. Your pace may vary—many learners overlap prep + enrollment.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Expanded variant for detail views
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="text-2xl font-bold">{weeksToMonths(totalWeeks)} months</div>
          <div className="text-sm text-muted-foreground">Total estimated timeline</div>
        </div>
      </div>
      
      {/* Visual timeline bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/50 dark:bg-white/10">
        <div 
          className="bg-primary/60 transition-all flex items-center justify-center"
          style={{ width: `${altProportion * 100}%` }}
        >
          {altProportion > 0.15 && (
            <span className="text-[9px] font-medium text-primary-foreground">Prep</span>
          )}
        </div>
        <div 
          className="bg-primary transition-all flex items-center justify-center"
          style={{ width: `${enrollProportion * 100}%` }}
        >
          {enrollProportion > 0.15 && (
            <span className="text-[9px] font-medium text-primary-foreground">Enrolled</span>
          )}
        </div>
      </div>
      
      {/* Phase details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary/60" />
            Alt-Credit Prep
          </div>
          <div className="text-lg font-semibold">{formatPhaseDuration(altCreditWeeks)}</div>
          <div className="text-xs text-muted-foreground">{altCredits} credits • Self-paced</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-primary" />
            Enrollment
          </div>
          <div className="text-lg font-semibold">{formatPhaseDuration(enrollmentWeeks)}</div>
          <div className="text-xs text-muted-foreground">{institutionalCredits} credits • Institutional pace</div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
        💡 The prep phase is user-paced—complete alt credits at your own speed before enrolling. 
        Many students overlap phases to graduate faster.
      </p>
    </div>
  );
}
