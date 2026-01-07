import { useMemo } from 'react';
import {
  aggregateAllYears,
  type YearBucket,
} from '@/lib/degree/yearNodes';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import type { ModuleData } from '@/pages/EduTree/v5/types/v5';
import { getPolicyOrDefault, getResidencyCredits, getNoncollegiateCap } from '@/lib/degree/institutionPolicies';

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

    // Get policies from central service
    const targetSchool = constraints?.target_school || 'TESU';
    const policy = getPolicyOrDefault(targetSchool);
    const policies = {
      max_transfer_credits: getNoncollegiateCap(targetSchool),
      max_exam_credits: 30, // Legacy field, not used for TESU validation
      residency_required: getResidencyCredits(targetSchool),
    };

    return aggregateAllYears(byYear, items, policies);
  }, [modules, items, constraints]);

  return yearNodes;
}
