import { useState, useCallback } from 'react';
import { autoCompletePlan, type PlanAutoCompleteResult } from '../engine/autoCompletePlan';
import type { ModuleData, Constraints, ScoringWeights } from '../types/exports';
import { usePlanBasket } from '../state/usePlanBasket';
import { toast } from 'sonner';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { logEvent } from '@/lib/analytics';

type AutoFillState = 'idle' | 'running' | 'success' | 'error';

/**
 * Phase 1c.2: Preview-first auto-fill hook
 * - Runs autoCompletePlan engine without immediate mutation
 * - Provides run/accept/reject actions with telemetry
 * - Maps {cost,time,cri} weights to {cost,time,quality} for scoring
 */
export function useAutoFillPlan(
  modules: ModuleData[],
  constraints: Constraints,
  weights: ScoringWeights
) {
  const [state, setState] = useState<AutoFillState>('idle');
  const [result, setResult] = useState<PlanAutoCompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedConstraints, setCapturedConstraints] = useState<string | null>(null);

  const basket = usePlanBasket(s => s.items);
  const addItem = usePlanBasket(s => s.addItem);

  const run = useCallback(() => {
    setState('running');
    setError(null);
    
    // Capture constraints snapshot for change detection
    setCapturedConstraints(JSON.stringify(constraints));

    const unfilled = modules.filter(m => (m.creditsRequired - m.creditsEarned) > 0);
    
    // Track start event
    void trackTelemetryEvent({
      task: 'autofill_started',
      scope: 'plan',
      complexity: {
        modulesCount: modules.length,
        unfilledCount: unfilled.length,
        constraintsUsed: Object.entries(constraints)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k]) => k),
      },
    });

    logEvent('autofill_started', {
      modulesCount: modules.length,
      unfilledCount: unfilled.length,
    });

    try {
      // Map scoring weights: cri → quality for engine compatibility
      const engineWeights: ScoringWeights = {
        cost: weights.cost,
        time: weights.time,
        cri: weights.cri, // Engine uses 'cri' field
      };

      const planResult = autoCompletePlan(modules, basket, constraints, engineWeights);
      
      setResult(planResult);
      setState('success');

      // Track completion event
      void trackTelemetryEvent({
        task: 'autofill_completed',
        scope: 'plan',
        success: true,
        complexity: {
          status: planResult.status,
          suggestionsCount: planResult.suggestions.length,
          totals: planResult.totals,
          ...(planResult.stoppedReason && { stoppedReason: planResult.stoppedReason }),
        },
      });

      logEvent('autofill_completed', {
        status: planResult.status,
        suggestionsCount: planResult.suggestions.length,
        totalCost: planResult.totals.totalCost,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-fill failed';
      setError(message);
      setState('error');

      void trackTelemetryEvent({
        task: 'autofill_completed',
        scope: 'plan',
        success: false,
        complexity: { error: message },
      });

      toast.error('Auto-fill failed', { description: message });
    }
  }, [modules, basket, constraints, weights]);

  const accept = useCallback(() => {
    if (!result || result.suggestions.length === 0) return;

    const itemsSnapshot = [...result.suggestions];
    
    // Bulk add to basket
    itemsSnapshot.forEach(item => addItem(item));

    // Show success toast with bulk undo
    toast.success('Added to plan', {
      description: `${itemsSnapshot.length} course${itemsSnapshot.length !== 1 ? 's' : ''} added`,
      action: {
        label: 'Undo All',
        onClick: () => {
          // Bulk remove
          const removeItem = usePlanBasket.getState().removeItem;
          itemsSnapshot.forEach(item => removeItem(item.courseId));
          toast.message('Changes undone');
          
          logEvent('autofill_undo_bulk', {
            count: itemsSnapshot.length,
          });
        },
      },
      duration: 5000,
    });

    // Track acceptance
    void trackTelemetryEvent({
      task: 'autofill_accepted',
      scope: 'plan',
      complexity: {
        suggestionsCount: itemsSnapshot.length,
        totalCost: result.totals.totalCost,
        totalWeeks: result.totals.totalWeeks,
        aceCredits: result.totals.aceCredits,
      },
    });

    logEvent('autofill_accepted', {
      count: itemsSnapshot.length,
      totalCost: result.totals.totalCost,
    });

    // Reset state
    setState('idle');
    setResult(null);
  }, [result, addItem]);

  const reject = useCallback(() => {
    if (result) {
      void trackTelemetryEvent({
        task: 'autofill_rejected',
        scope: 'plan',
        complexity: {
          suggestionsCount: result.suggestions.length,
          status: result.status,
        },
      });

      logEvent('autofill_rejected', {
        count: result.suggestions.length,
        status: result.status,
      });
    }

    setState('idle');
    setResult(null);
    setError(null);
  }, [result]);

  return {
    isRunning: state === 'running',
    result,
    error,
    run,
    accept,
    reject,
    constraintsChanged: capturedConstraints !== null && capturedConstraints !== JSON.stringify(constraints),
  };
}
