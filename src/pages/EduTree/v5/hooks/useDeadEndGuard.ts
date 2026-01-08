/**
 * Dead-End Guard Hook
 * 
 * Provides selection-time blocking to prevent degree-bricking choices.
 * This is defense-in-depth: even if UI hides dead-ends, this blocks at selection time.
 */

import { useCallback, useMemo } from 'react';
import { usePlanBasket, type BasketItem, type Constraints } from '../state/usePlanBasket';
import { checkForDeadEnd, annotateOptionsWithDeadEnds, type RemainingModule, type DeadEndCheck } from '../engine/deadEndDetector';
import type { MarketplaceOption } from '../types/v5';
import { toast } from 'sonner';

export interface DeadEndGuardResult {
  /** Check if an option would create a dead-end */
  wouldCreateDeadEnd: (option: MarketplaceOption, remainingModules: RemainingModule[]) => DeadEndCheck;
  
  /** Attempt to select with blocking - returns false if blocked */
  guardedSelect: (
    option: MarketplaceOption,
    moduleId: string,
    remainingModules: RemainingModule[],
    onAllowed: (item: BasketItem) => void
  ) => boolean;
  
  /** Annotate options with dead-end info for UI display */
  annotateOptions: (
    options: MarketplaceOption[],
    remainingModules: RemainingModule[]
  ) => Array<MarketplaceOption & { deadEnd?: DeadEndCheck }>;
  
  /** Get only viable options (filtered) */
  getViableOptions: (
    options: MarketplaceOption[],
    remainingModules: RemainingModule[]
  ) => MarketplaceOption[];
}

/**
 * Hook that provides dead-end detection and selection guarding
 */
export function useDeadEndGuard(): DeadEndGuardResult {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);

  const wouldCreateDeadEnd = useCallback(
    (option: MarketplaceOption, remainingModules: RemainingModule[]): DeadEndCheck => {
      return checkForDeadEnd(option, basket, constraints, remainingModules);
    },
    [basket, constraints]
  );

  const guardedSelect = useCallback(
    (
      option: MarketplaceOption,
      moduleId: string,
      remainingModules: RemainingModule[],
      onAllowed: (item: BasketItem) => void
    ): boolean => {
      const check = checkForDeadEnd(option, basket, constraints, remainingModules);
      
      if (check.isDeadEnd) {
        // Block selection with informative toast
        const primaryReason = check.reasons[0] || 'Would make degree completion impossible';
        const additionalReasons = check.reasons.slice(1, 3);
        
        toast.error('Selection Blocked', {
          description: primaryReason,
          duration: 6000,
        });
        
        // Log for debugging
        console.warn('[DeadEndGuard] Blocked selection:', {
          courseId: option.courseId,
          reasons: check.reasons,
          snapshot: check.snapshot,
        });
        
        return false;
      }
      
      // Selection allowed - create basket item
      const item: BasketItem = {
        moduleId,
        courseId: option.courseId,
        title: option.title ?? option.courseId,
        credits: option.credits ?? 0,
        cost_usd: option.cost_usd ?? 0,
        duration_weeks: option.duration_weeks ?? 8,
        workload_weekly_hours: option.workload_weekly_hours ?? (option.credits ? option.credits * 2.5 : 0),
        cri_score: option.cri_score ?? 0,
        providerType: option.providerType,
        status: 'pinned',
      };
      
      onAllowed(item);
      return true;
    },
    [basket, constraints]
  );

  const annotateOptions = useCallback(
    (options: MarketplaceOption[], remainingModules: RemainingModule[]) => {
      return annotateOptionsWithDeadEnds(options, basket, constraints, remainingModules);
    },
    [basket, constraints]
  );

  const getViableOptions = useCallback(
    (options: MarketplaceOption[], remainingModules: RemainingModule[]) => {
      return options.filter(opt => {
        const check = checkForDeadEnd(opt, basket, constraints, remainingModules);
        return !check.isDeadEnd;
      });
    },
    [basket, constraints]
  );

  return {
    wouldCreateDeadEnd,
    guardedSelect,
    annotateOptions,
    getViableOptions,
  };
}

/**
 * Format dead-end reasons for tooltip display
 */
export function formatDeadEndTooltip(check: DeadEndCheck): string {
  if (!check.isDeadEnd || check.reasons.length === 0) {
    return '';
  }
  
  const lines: string[] = [];
  
  // Primary reason as headline
  lines.push(`⚠️ ${check.reasons[0]}`);
  
  // Additional reasons (up to 2 more)
  for (let i = 1; i < Math.min(check.reasons.length, 3); i++) {
    lines.push(`• ${check.reasons[i]}`);
  }
  
  // Snapshot data if available
  if (check.snapshot) {
    const { totalCredits, noncollegiateCredits, residencyCredits, remainingModuleCount } = check.snapshot;
    lines.push('');
    lines.push(`Current: ${totalCredits}cr total, ${residencyCredits}cr residency`);
    lines.push(`Remaining: ${remainingModuleCount} modules`);
  }
  
  return lines.join('\n');
}
