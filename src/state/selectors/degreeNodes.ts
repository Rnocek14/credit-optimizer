import { useMemo } from 'react';
import {
  aggregateAllYears,
  type YearBucket,
} from '@/lib/degree/yearNodes';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import type { ModuleData } from '@/pages/EduTree/v5/types/v5';

/**
 * Hook to compute year-level view models from basket + modules
 * Returns aggregated year nodes with totals and policy validation
 */
export function useYearNodesVM(modules: ModuleData[]) {
  const items = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);

  const yearNodes = useMemo(() => {
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

    // Get policies from constraints
    const policies = {
      max_transfer_credits: constraints?.max_ace_credits ?? 90,
      max_exam_credits: 30,
      residency_required: 30,
    };

    return aggregateAllYears(byYear, items, policies);
  }, [modules, items, constraints]);

  return yearNodes;
}
