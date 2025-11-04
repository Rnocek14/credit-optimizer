import type { ModuleData } from '@/pages/EduTree/v5/types/v5';
import type { BasketItem } from '@/pages/EduTree/v5/state/usePlanBasket';

export type YearBucket = 1 | 2 | 3 | 4;

export interface YearTotals {
  creditsPlanned: number;
  creditsEarned: number;
  creditsRequired: number;
  costEstimated: number;
  weeksEstimated: number;
  transferUsed: number;
  residencyCredits: number;
  examCredits: number;
  byCategory: Record<string, { credits: number; satisfied: boolean }>;
}

export interface YearPolicyState {
  transferCapOk: boolean;
  residencyProgressOk: boolean;
  prerequisitesMet: boolean;
  warnings: string[];
  blocks: string[];
}

export interface YearNodeVM {
  id: `year-${YearBucket}`;
  year: YearBucket;
  semester?: 'fall' | 'spring' | 'summer' | null;
  modules: ModuleData[];
  totals: YearTotals;
  policy: YearPolicyState;
  collapsed: boolean;
  position: { x: number; y: number };
}

export type AnchorPolicies = {
  max_transfer_credits: number;
  max_exam_credits: number;
  residency_required: number;
};

/**
 * Aggregate modules for a single year with policy validation
 */
export function aggregateYear(
  year: YearBucket,
  modules: ModuleData[],
  basketItems: BasketItem[],
  policies: AnchorPolicies
): YearNodeVM {
  const totals: YearTotals = {
    creditsPlanned: 0,
    creditsEarned: 0,
    creditsRequired: 0,
    costEstimated: 0,
    weeksEstimated: 0,
    transferUsed: 0,
    residencyCredits: 0,
    examCredits: 0,
    byCategory: {},
  };

  // Aggregate module data
  for (const m of modules) {
    const cr = Number(m.creditsRequired ?? 0);
    totals.creditsPlanned += cr;
    totals.creditsEarned += Number(m.creditsEarned ?? 0);
    totals.creditsRequired += cr;

    const cat = m.fulfills_area || 'uncategorized';
    const entry = totals.byCategory[cat] ?? { credits: 0, satisfied: false };
    entry.credits += cr;
    entry.satisfied = Boolean(m.selectedSummary?.isComplete || entry.satisfied);
    totals.byCategory[cat] = entry;
  }

  // Aggregate basket items for cost/time/policy tracking
  const yearItems = basketItems.filter(item => {
    const itemModule = modules.find(m => m.id === item.moduleId);
    return !!itemModule;
  });

  for (const item of yearItems) {
    const cr = Number(item.credits ?? 0);
    totals.costEstimated += Number(item.cost_usd ?? 0);
    totals.weeksEstimated = Math.max(
      totals.weeksEstimated,
      Number(item.duration_weeks ?? 0)
    );

    // Policy tracking based on provider type
    if (item.providerType === 'mooc' || item.providerType === 'testing_center') {
      totals.transferUsed += cr;
      if (item.providerType === 'testing_center') {
        totals.examCredits += cr;
      }
    } else if (item.providerType === 'university') {
      totals.residencyCredits += cr;
    }
  }

  // Policy validation
  const policy: YearPolicyState = {
    transferCapOk: totals.transferUsed <= policies.max_transfer_credits,
    residencyProgressOk: true, // Per-year we don't block; checked at program level
    prerequisitesMet: modules.every(
      m => m.selectedSummary?.isComplete !== false
    ),
    warnings: [],
    blocks: [],
  };

  if (!policy.transferCapOk) {
    policy.warnings.push(
      `Transfer usage ${totals.transferUsed}/${policies.max_transfer_credits} exceeds cap`
    );
  }

  if (totals.examCredits > policies.max_exam_credits) {
    policy.warnings.push(
      `Exam credits ${totals.examCredits}/${policies.max_exam_credits} exceeds cap`
    );
  }

  if (!policy.prerequisitesMet) {
    policy.blocks.push('Missing prerequisites in this year');
  }

  return {
    id: `year-${year}`,
    year,
    modules,
    totals,
    policy,
    collapsed: true,
    position: { x: 0, y: 0 },
  };
}

/**
 * Aggregate all years with modules grouped by year
 */
export function aggregateAllYears(
  planModulesByYear: Record<YearBucket, ModuleData[]>,
  basketItems: BasketItem[],
  policies: AnchorPolicies
): YearNodeVM[] {
  return (Object.keys(planModulesByYear) as unknown as YearBucket[])
    .sort((a, b) => a - b)
    .map(y =>
      aggregateYear(y, planModulesByYear[y] || [], basketItems, policies)
    );
}

/**
 * Get policy badges for year card display
 */
export function getPolicyBadges(
  y: YearNodeVM,
  policies: AnchorPolicies
): Array<{ label: string; tone: 'ok' | 'warn' | 'error'; note?: string }> {
  const badges: Array<{
    label: string;
    tone: 'ok' | 'warn' | 'error';
    note?: string;
  }> = [];

  if (y.totals.transferUsed >= policies.max_transfer_credits * 0.9) {
    badges.push({
      label: 'Transfer Cap',
      tone:
        y.totals.transferUsed > policies.max_transfer_credits ? 'error' : 'warn',
      note: `${y.totals.transferUsed}/${policies.max_transfer_credits}`,
    });
  }

  if (y.totals.residencyCredits >= policies.residency_required) {
    badges.push({ label: 'Residency Met', tone: 'ok' });
  }

  return badges;
}
