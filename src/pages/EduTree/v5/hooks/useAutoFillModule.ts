/**
 * Module-level Quick Pick hook
 * Automatically selects the best option for a single module
 */

import { useCallback } from 'react';
import { usePlanBasket } from '../state/usePlanBasket';
import { autoCompletePlan } from '../engine/autoCompletePlan';
import { toast } from 'sonner';
import { trackTelemetryEvent } from '@/utils/telemetry';
import type { ModuleData, ScoringWeights } from '../types/v5';

export function useAutoFillModule() {
  const basket = usePlanBasket(s => s.items);
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);
  const constraints = usePlanBasket(s => s.constraints);

  const quickPick = useCallback(async (
    module: ModuleData,
    weights?: ScoringWeights
  ) => {
    try {
      console.log('[QuickPick] Starting for module:', module.id);

      // Use balanced weights by default
      const defaultWeights: ScoringWeights = {
        cost: 0.25,
        time: 0.20,
        cri: 0.35,
      };

      // Run autocomplete for this single module
      const result = await autoCompletePlan(
        [module], // Single module
        basket,
        constraints,
        weights || defaultWeights
      );

      if (result.status === 'ok' && result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        
        // Track telemetry
        void trackTelemetryEvent({
          task: 'quick_pick_applied',
          scope: 'module',
          complexity: {
            moduleId: module.id,
            courseId: suggestion.courseId,
            cost: suggestion.cost_usd,
          },
        });

        // Store state for undo
        const previousItems = basket.filter(b => b.moduleId === module.id);
        
        // Add the suggestion
        addItem(suggestion);

        // Show success toast with undo
        toast.success(`Quick Pick: ${suggestion.title}`, {
          description: `Added ${suggestion.credits}cr • ${suggestion.cost_usd ? `$${suggestion.cost_usd}` : 'Free'}`,
          action: {
            label: 'Undo',
            onClick: () => {
              // Remove added item
              removeItem(suggestion.courseId);
              
              // Restore previous items
              previousItems.forEach(item => addItem(item));

              // Track undo
              void trackTelemetryEvent({
                task: 'quick_pick_undone',
                scope: 'module',
                complexity: { moduleId: module.id },
              });

              toast.info('Quick Pick undone');
            },
          },
        });

        console.log('[QuickPick] Successfully added:', suggestion.title);
      } else {
        const totalOptions = module.marketplaceOptions?.length || 0;
        toast.error('No options available', {
          description: totalOptions > 0 
            ? `${totalOptions} options found but filtered out by constraints. Try adjusting your budget or CRI requirements.`
            : 'Try browsing options manually',
        });
        console.log('[QuickPick] No suggestions generated:', {
          totalOptions,
          result: result.status,
          stoppedReason: result.stoppedReason
        });
      }
    } catch (error) {
      console.error('[QuickPick] Error:', error);
      toast.error('Quick Pick failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [basket, addItem, removeItem, constraints]);

  return { quickPick };
}
