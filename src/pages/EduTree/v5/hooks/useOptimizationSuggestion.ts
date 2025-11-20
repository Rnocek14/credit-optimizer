/**
 * Credit Optimizer Hook
 * Analyzes current plan and suggests cost/time optimizations
 */

import { useState, useEffect, useCallback } from 'react';
import { usePlanBasket } from '../state/usePlanBasket';
import { calculateTotals } from '../utils/totalsCalculator';
import type { OptimizationSuggestion, OptimizationSwap, OptimizationSummary } from '../types/optimizer';
import type { MarketplaceOption } from '../types/v5';
import { toast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';

interface UseOptimizationSuggestionOptions {
  modules: any[];
  allOptions: MarketplaceOption[];
  anchorLabel?: string;
  minCostSaved?: number;
  minMonthsSaved?: number;
  enabled?: boolean;
}

interface UseOptimizationSuggestionResult {
  suggestion: OptimizationSuggestion | null;
  loading: boolean;
  error: string | null;
  showBanner: boolean;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  dismissBanner: () => void;
  applyOptimization: () => Promise<void>;
}

export function useOptimizationSuggestion(
  options: UseOptimizationSuggestionOptions
): UseOptimizationSuggestionResult {
  const {
    modules,
    allOptions,
    anchorLabel = 'your degree program',
    minCostSaved = 1000,
    minMonthsSaved = 3,
    enabled = true,
  } = options;

  const items = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);

  const [suggestion, setSuggestion] = useState<OptimizationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setSuggestion({ hasSuggestion: false, summary: null, swaps: [] });
      return;
    }

    setLoading(true);
    console.log('[Credit Optimizer] Analyzing plan...', { itemsCount: items.length, modulesCount: modules.length });

    try {
      // Calculate current plan totals
      const currentTotals = calculateTotals(items, constraints);
      const currentCost = currentTotals.totalCost;
      const currentMonths = Math.ceil(currentTotals.totalWeeks / 4.33); // weeks to months

      // Find optimization opportunities
      const swaps: OptimizationSwap[] = [];
      const seenModules = new Set<string>(); // Dedupe by module
      let optimizedCost = currentCost;
      let optimizedWeeks = currentTotals.totalWeeks;

      // For each basket item, find cheaper/faster alternatives
      items.forEach(item => {
        // Dedupe: only one swap per module
        if (seenModules.has(item.moduleId)) return;
        
        // Find the module this item belongs to
        const module = modules.find(m => m.id === item.moduleId);
        if (!module) return;

        // Find marketplace options for this module
        const moduleOptions = allOptions.filter(opt => 
          module.requiredCanonicalIds?.some((reqId: string) => 
            opt.satisfies_requirements?.includes(reqId)
          )
        );

        // Find cheaper alternative
        const cheaperOptions = moduleOptions.filter(opt => 
          opt.cost_usd !== null && 
          opt.cost_usd < (item.cost_usd || 0) &&
          opt.courseId !== item.courseId
        ).sort((a, b) => (a.cost_usd || 0) - (b.cost_usd || 0));

        if (cheaperOptions.length > 0) {
          const alternative = cheaperOptions[0];
          const costSavings = (item.cost_usd || 0) - (alternative.cost_usd || 0);

          if (costSavings >= 100) { // Only suggest if savings > $100
            seenModules.add(item.moduleId); // Mark as processed
            
            swaps.push({
              id: `${item.moduleId}-${item.courseId}`,
              requirementLabel: module.label,
              fromTitle: item.title || item.courseId,
              fromProvider: extractProvider(item.courseId),
              fromCost: item.cost_usd || 0,
              toTitle: alternative.title,
              toProvider: alternative.provider,
              toCost: alternative.cost_usd || 0,
              costSaved: costSavings,
              moduleId: item.moduleId,
              fromCourseId: item.courseId,
              toCourseId: alternative.courseId,
            });

            optimizedCost -= costSavings;
            
            // Estimate time savings (rough heuristic)
            const timeSavings = (item.duration_weeks || 8) - (alternative.duration_weeks || 8);
            if (timeSavings > 0) {
              optimizedWeeks -= timeSavings;
            }
          }
        }
      });

      const optimizedMonths = Math.ceil(optimizedWeeks / 4.33);
      const costSaved = currentCost - optimizedCost;
      const monthsSaved = currentMonths - optimizedMonths;

      // Only show suggestion if savings meet threshold
      if (costSaved >= minCostSaved || monthsSaved >= minMonthsSaved) {
        const summary: OptimizationSummary = {
          currentCost,
          optimizedCost,
          currentMonths,
          optimizedMonths,
          costSaved,
          monthsSaved,
          anchorLabel,
          isPolicyCompliant: true, // Note: Always verify with your advisor
        };

        setSuggestion({
          hasSuggestion: true,
          summary,
          swaps: swaps.slice(0, 10), // Limit to top 10 swaps
        });
        
        // Track analytics: banner shown
        trackTelemetryEvent({
          task: 'credit_optimizer_banner_shown',
          complexity: {
            cost_saved: costSaved,
            months_saved: monthsSaved,
            swaps_count: swaps.length,
          }
        }).catch(() => {});
        
        console.log('[Credit Optimizer] Suggestion ready:', { costSaved, monthsSaved, swapsCount: swaps.length });
      } else {
        setSuggestion({ hasSuggestion: false, summary: null, swaps: [] });
        console.log('[Credit Optimizer] No significant savings found');
      }

      setError(null);
    } catch (err) {
      console.error('[Credit Optimizer] Error:', err);
      setError('Unable to calculate optimizations');
      setSuggestion({ hasSuggestion: false, summary: null, swaps: [] });
    } finally {
      setLoading(false);
    }
  }, [items, modules, allOptions, constraints, anchorLabel, minCostSaved, minMonthsSaved, enabled]);

  const showBanner = !!suggestion?.hasSuggestion && !dismissed && !loading && !error;

  const openModal = useCallback(() => {
    setShowModal(true);
    // Track analytics
    trackTelemetryEvent({
      task: 'credit_optimizer_modal_opened',
      complexity: {
        cost_saved: suggestion?.summary?.costSaved || 0,
        months_saved: suggestion?.summary?.monthsSaved || 0,
      }
    }).catch(() => {});
  }, [suggestion]);
  
  const closeModal = useCallback(() => {
    setShowModal(false);
    // Track analytics
    trackTelemetryEvent({
      task: 'credit_optimizer_modal_closed',
      complexity: { action: 'keep_plan' }
    }).catch(() => {});
  }, []);
  
  const dismissBanner = useCallback(() => {
    setDismissed(true);
    // Track analytics
    trackTelemetryEvent({
      task: 'credit_optimizer_banner_dismissed',
      complexity: {}
    }).catch(() => {});
  }, []);

  const applyOptimization = useCallback(async () => {
    if (!suggestion?.hasSuggestion) return;

    try {
      console.log('[Credit Optimizer] Applying', suggestion.swaps.length, 'swaps');
      
      // Track analytics
      trackTelemetryEvent({
        task: 'credit_optimizer_applied',
        complexity: {
          swaps_count: suggestion.swaps.length,
          cost_saved: suggestion.summary?.costSaved || 0,
          months_saved: suggestion.summary?.monthsSaved || 0,
        }
      }).catch(() => {});

      // Apply all swaps (module-specific removal to avoid cross-module conflicts)
      for (const swap of suggestion.swaps) {
        // Remove old course from THIS specific module only
        // Since removeItem removes all instances, we need to be careful
        // Get current basket state
        const currentItems = usePlanBasket.getState().items;
        const itemToRemove = currentItems.find(
          item => item.moduleId === swap.moduleId && item.courseId === swap.fromCourseId
        );
        
        if (itemToRemove) {
          removeItem(swap.fromCourseId);
        }

        // Find the full marketplace option data
        const newOption = allOptions.find(opt => opt.courseId === swap.toCourseId);
        if (!newOption) {
          console.warn('[Credit Optimizer] Could not find marketplace option for:', swap.toCourseId);
          continue;
        }

        // Add new course
        addItem({
          moduleId: swap.moduleId,
          courseId: newOption.courseId,
          title: newOption.title,
          credits: newOption.credits,
          cost_usd: newOption.cost_usd,
          duration_weeks: newOption.duration_weeks,
          workload_weekly_hours: newOption.workload_weekly_hours || newOption.credits * 3,
          cri_score: newOption.cri_score || 0,
          status: 'auto-filled',
          providerType: newOption.providerType,
          providerCode: newOption.providerCode,
          level: newOption.level,
          source: {
            type: 'template',
            templateId: 'credit-optimizer',
            templateLabel: 'Credit Optimizer',
          },
        });
      }

      toast({
        title: "Plan optimized!",
        description: `Applied ${suggestion.swaps.length} course swap${suggestion.swaps.length > 1 ? 's' : ''} to save $${suggestion.summary?.costSaved.toLocaleString()}.`,
      });

      setShowModal(false);
      setDismissed(true); // Don't show banner again after applying
    } catch (err) {
      console.error('[Credit Optimizer] Apply error:', err);
      
      // Track error
      trackTelemetryEvent({
        task: 'credit_optimizer_apply_error',
        complexity: { error: err instanceof Error ? err.message : 'Unknown error' }
      }).catch(() => {});
      
      toast({
        title: "Error applying optimization",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  }, [suggestion, allOptions, addItem, removeItem]);

  return {
    suggestion,
    loading,
    error,
    showBanner,
    showModal,
    openModal,
    closeModal,
    dismissBanner,
    applyOptimization,
  };
}

// Helper to extract provider name from course ID
function extractProvider(courseId: string): string {
  if (courseId.includes('sophia')) return 'Sophia.org';
  if (courseId.includes('sdc')) return 'Study.com';
  if (courseId.includes('tesu')) return 'TESU';
  if (courseId.includes('wgu')) return 'WGU';
  return 'Provider';
}
