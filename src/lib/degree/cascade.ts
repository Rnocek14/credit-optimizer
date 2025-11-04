import { useMemo, useCallback } from 'react';
import { aggregateAllYears, type YearBucket } from './yearNodes';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import type { ModuleData } from '@/pages/EduTree/v5/types/v5';

/**
 * Cascade change hook - recomputes year aggregations when plan changes
 * Call recomputeYears() after template apply, anchor change, or course swap
 */
export function useCascadeDegree(modules: ModuleData[]) {
  const items = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);

  const policies = useMemo(
    () => ({
      max_transfer_credits: constraints?.max_ace_credits ?? 90,
      max_exam_credits: 30,
      residency_required: 30,
    }),
    [constraints]
  );

  const recomputeYears = useCallback(() => {
    // Group modules by year
    const byYear = modules.reduce<Record<YearBucket, ModuleData[]>>(
      (acc, m) => {
        const y = (m.year ?? 1) as YearBucket;
        if (!acc[y]) acc[y] = [];
        acc[y].push(m);
        return acc;
      },
      { 1: [], 2: [], 3: [], 4: [] }
    );

    // Recompute year aggregations
    const yearNodes = aggregateAllYears(byYear, items, policies);

    // Log for debugging
    console.log('[Cascade] Year nodes recomputed:', yearNodes);

    return yearNodes;
  }, [modules, items, policies]);

  return { recomputeYears };
}
