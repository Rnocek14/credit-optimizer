/**
 * Week 1: Year Planner Engine - Scaffold
 * Anchor-aware semester planning that respects:
 * 1. Requirement blocks (degree completion)
 * 2. Transfer rules (anchor school policies)
 * 3. Prerequisites (course ordering)
 * 4. Load targets (semester balancing)
 */

import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { ModuleData, MarketplaceOption } from '../types/v5';
import type { RequirementBlock, RuleType } from '@/lib/types/eduTree';
import type { ScoringWeights as EngineScoringWeights } from '../types/v5';
import { scoreOptions, compareByScore, type ScoredOption } from './optionFilters';
import { calculateAnchorTotals } from '../utils/anchorPolicyAdapter';

// Map engine weights (cri) to scoring weights (quality)
function mapWeights(engineWeights: EngineScoringWeights): { cost: number; time: number; quality: number } {
  return {
    cost: engineWeights.cost,
    time: engineWeights.time,
    quality: engineWeights.cri, // Map cri → quality
  };
}

// ============= Interfaces =============

export interface YearPreset {
  id: string;
  label: string;
  description: string;
  targetLoads: { fall: number; spring: number }; // Target credits per semester
  weights: EngineScoringWeights; // Reuse from autoCompletePlan
  filters?: string[]; // 'self-paced-only', 'async-friendly', 'prefer-fast-paced'
  strategy?: 'balanced' | 'sprint' | 'working-adult' | 'transfer-maximizer' | 'residency-closer';
}

export interface SemesterPlan {
  fall: BasketItem[];
  spring: BasketItem[];
  summer?: BasketItem[]; // Future: optional summer term
  warnings: Violation[];
  metadata: {
    totalCredits: number;
    totalCost: number;
    totalWeeks: number;
    avgCri: number;
    fallLoad: number; // credits
    springLoad: number;
    aceCreditsUsed: number;
    residencyCreditsEarned: number;
    upperDivisionCreditsEarned: number;
  };
}

export interface Violation {
  type: 'transfer_cap' | 'residency' | 'upper_division' | 'prerequisite' | 'overload';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedCourses: string[];
  suggestedFix?: string;
}

export interface PartnerPolicy {
  partner_name: string;
  max_alt_credits: number; // ACE/NCCRS transfer cap
  min_residency_credits: number; // Institutional credit requirement
  upper_division_min: number; // 300/400 level requirement
  notes?: string;
}

// ============= Presets =============

export const YEAR_PRESETS: YearPreset[] = [
  {
    id: 'balanced-15-15',
    label: 'Balanced 15/15',
    description: 'Standard full-time load with even distribution',
    targetLoads: { fall: 15, spring: 15 },
    weights: { cost: 0.25, time: 0.20, cri: 0.35 },
    strategy: 'balanced',
  },
  {
    id: 'sprint-18-12',
    label: 'Sprint 18/12',
    description: 'Front-load Fall for faster completion',
    targetLoads: { fall: 18, spring: 12 },
    weights: { cost: 0.15, time: 0.50, cri: 0.25 },
    filters: ['prefer-fast-paced'],
    strategy: 'sprint',
  },
  {
    id: 'working-adult-9-9',
    label: 'Working Adult 9/9',
    description: 'Part-time load with flexible, self-paced courses',
    targetLoads: { fall: 9, spring: 9 },
    weights: { cost: 0.30, time: 0.05, cri: 0.20 },
    filters: ['self-paced-only', 'async-friendly'],
    strategy: 'working-adult',
  },
  {
    id: 'transfer-maximizer',
    label: 'Transfer-Maximizer',
    description: 'Fill with ACE/NCCRS credits (stops 6cr before cap)',
    targetLoads: { fall: 15, spring: 15 },
    weights: { cost: 0.60, time: 0.20, cri: 0.10 },
    strategy: 'transfer-maximizer',
  },
  {
    id: 'residency-closer',
    label: 'Residency-Closer',
    description: 'Prioritize institutional courses to meet residency requirement',
    targetLoads: { fall: 15, spring: 15 },
    weights: { cost: 0.10, time: 0.10, cri: 0.20 },
    strategy: 'residency-closer',
  },
];

// ============= Helper Functions =============

function sumCredits(items: BasketItem[]): number {
  return items.reduce((sum, i) => sum + i.credits, 0);
}

function sumCost(items: BasketItem[]): number {
  const total = items.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  console.log('[yearPlanner] sumCost:', { count: items.length, total, sample: items[0]?.cost_usd });
  return total;
}

function maxWeeks(items: BasketItem[]): number {
  const weeks = Math.max(0, ...items.map(i => i.duration_weeks ?? 0));
  console.log('[yearPlanner] maxWeeks:', { count: items.length, weeks, sample: items[0]?.duration_weeks });
  return weeks;
}

function avgCri(items: BasketItem[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, i) => sum + i.cri_score, 0) / items.length;
}

function isAceOption(item: BasketItem | MarketplaceOption): boolean {
  return item.providerType === 'mooc' || item.providerType === 'testing_center';
}

function toBasketItem(option: ScoredOption, semester: 'fall' | 'spring', moduleId: string): BasketItem {
  return {
    moduleId,
    courseId: option.courseId,
    title: option.title,
    credits: option.credits,
    cost_usd: option.cost_usd,
    duration_weeks: option.duration_weeks,
    workload_weekly_hours: option.workload_weekly_hours ?? option.credits * 2.5,
    cri_score: option.cri_score ?? option.scoreBreakdown?.cri ?? 0,
    status: 'auto-filled',
    providerType: option.providerType,
    source: {
      type: 'template',
      templateLabel: `Year ${semester}`,
    },
    autoFillReason: `Year planner: ${semester}`,
  };
}

// ============= Core Functions =============

/**
 * Week 1.5: Build a semester plan for a given year
 * Implements strategy-based scoring and assignment
 */
export function buildYearPlan(
  preset: YearPreset,
  year: number,
  modules: ModuleData[],
  blocks: RequirementBlock[],
  allOptions: MarketplaceOption[],
  basket: BasketItem[],
  constraints: Constraints,
  anchorPolicy?: PartnerPolicy
): SemesterPlan {
  console.log('[yearPlanner] buildYearPlan called', {
    preset: preset.id,
    year,
    modulesCount: modules.length,
    blocksCount: blocks.length,
    anchorPolicy: anchorPolicy?.partner_name,
  });

  // Calculate effective ACE limit with safety margin for Transfer-Max
  let effectiveAceLimit = constraints.max_ace_credits ?? 90;
  if (preset.strategy === 'transfer-maximizer' && anchorPolicy) {
    effectiveAceLimit = Math.min(effectiveAceLimit, anchorPolicy.max_alt_credits - 6);
    console.log('[yearPlanner] Transfer-Max safety margin:', {
      originalCap: anchorPolicy.max_alt_credits,
      safeLimit: effectiveAceLimit,
    });
  }

  const plan: SemesterPlan = {
    fall: [],
    spring: [],
    warnings: [],
    metadata: {
      totalCredits: 0,
      totalCost: 0,
      totalWeeks: 0,
      avgCri: 0,
      fallLoad: 0,
      springLoad: 0,
      aceCreditsUsed: 0,
      residencyCreditsEarned: 0,
      upperDivisionCreditsEarned: 0,
    },
  };

  // 1. Seed with pinned items from basket for this year
  const basketCourseIds = new Set(basket.map(b => b.courseId));

  // 2. Find unmet modules with marketplace options
  const unmetModules = modules.filter(m => {
    const creditsNeeded = m.creditsRequired - (m.creditsEarned || 0);
    const hasOptions = (m.marketplaceOptions?.length || 0) > 0;
    return creditsNeeded > 0 && hasOptions;
  });

  console.log('[yearPlanner] Found unmet modules:', unmetModules.length);

  // Calculate running totals
  let aceUsed = basket.filter(isAceOption).reduce((sum, i) => sum + i.credits, 0);
  let residencyEarned = basket.filter(i => i.providerType === 'university').reduce((sum, i) => sum + i.credits, 0);

  // 3. Score and assign options to semesters
  for (const module of unmetModules) {
    const options = module.marketplaceOptions || [];

    // Diagnostic: log option data quality before scoring
    console.log('[yearPlanner] Module options', {
      moduleId: module.id,
      moduleLabel: (module as any).label,
      optionsCount: options.length,
      hasCost: options.some(o => o.cost_usd != null),
      hasDuration: options.some(o => o.duration_weeks != null),
      hasCri: options.some(o => o.cri_score != null),
      sampleOption: options[0] ? {
        title: options[0].title,
        cost: options[0].cost_usd,
        duration: options[0].duration_weeks,
        cri: options[0].cri_score,
        provider: options[0].providerType,
      } : null,
    });

    const scoringWeights = mapWeights(preset.weights);
    const scored = scoreOptions(options, scoringWeights).sort(compareByScore);

    console.log('[yearPlanner] Scored options', {
      moduleId: module.id,
      scoredCount: scored.length,
      topScore: scored[0]?.score,
      topOption: scored[0] ? {
        title: scored[0].title,
        score: scored[0].score,
        breakdown: scored[0].scoreBreakdown,
      } : null,
    });

    if (scored.length === 0) {
      console.warn('[yearPlanner] No scored options for module', module.id);
      continue;
    }

    let selectedOption: ScoredOption | null = null;

    // Strategy-specific selection logic
    if (preset.strategy === 'transfer-maximizer') {
      // Prefer ACE/NCCRS until near cap
      const aceOptions = scored.filter(o => isAceOption(o) && aceUsed + o.credits <= effectiveAceLimit);
      selectedOption = aceOptions[0] || scored[0];
    } else if (preset.strategy === 'residency-closer' && anchorPolicy) {
      // Force university courses until residency met
      if (residencyEarned < anchorPolicy.min_residency_credits) {
        const universityOptions = scored.filter(o => o.providerType === 'university');
        selectedOption = universityOptions[0] || scored[0];
      } else {
        selectedOption = scored[0];
      }
    } else {
      // Balanced, Sprint, Working Adult - use best scored option
      selectedOption = scored[0];
    }

    if (!selectedOption) {
      console.warn('[yearPlanner] No selectedOption for module', module.id);
      continue;
    }

    // Skip if already in basket for this module (allow same course for different modules)
    const alreadyInSameModule = basket.some(b => 
      b.courseId === selectedOption.courseId && b.moduleId === module.id
    );
    if (alreadyInSameModule) {
      console.log('[yearPlanner] Skipping duplicate', {
        courseId: selectedOption.courseId,
        title: selectedOption.title,
        moduleId: module.id,
        alreadyInSameModule: true,
      });
      continue;
    }

    // Assign to lighter semester
    const fallLoad = sumCredits(plan.fall);
    const springLoad = sumCredits(plan.spring);

    console.log('[yearPlanner] Attempting placement', {
      courseId: selectedOption.courseId,
      title: selectedOption.title,
      credits: selectedOption.credits,
      fallLoad,
      springLoad,
      targetFall: preset.targetLoads.fall,
      targetSpring: preset.targetLoads.spring,
      willFitFall: fallLoad + selectedOption.credits <= preset.targetLoads.fall && fallLoad <= springLoad,
      willFitSpring: springLoad + selectedOption.credits <= preset.targetLoads.spring,
    });

    if (fallLoad + selectedOption.credits <= preset.targetLoads.fall && fallLoad <= springLoad) {
      plan.fall.push(toBasketItem(selectedOption, 'fall', module.id));
      console.log('[yearPlanner] ✅ Placed in FALL', {
        courseId: selectedOption.courseId,
        title: selectedOption.title,
        newFallLoad: sumCredits(plan.fall),
      });
    } else if (springLoad + selectedOption.credits <= preset.targetLoads.spring) {
      plan.spring.push(toBasketItem(selectedOption, 'spring', module.id));
      console.log('[yearPlanner] ✅ Placed in SPRING', {
        courseId: selectedOption.courseId,
        title: selectedOption.title,
        newSpringLoad: sumCredits(plan.spring),
      });
    } else {
      // Both semesters full
      console.warn('[yearPlanner] ❌ Both semesters full, stopping', {
        courseId: selectedOption.courseId,
        fallLoad,
        springLoad,
        targetLoads: preset.targetLoads,
      });
      break;
    }

    // Update running totals
    if (isAceOption(selectedOption)) aceUsed += selectedOption.credits;
    if (selectedOption.providerType === 'university') residencyEarned += selectedOption.credits;
  }

  // 4. Calculate metadata
  const allItems = [...plan.fall, ...plan.spring];
  const totals = calculateAnchorTotals(allItems);

  plan.metadata = {
    totalCredits: sumCredits(allItems),
    totalCost: sumCost(allItems),
    totalWeeks: maxWeeks(allItems),
    avgCri: avgCri(allItems),
    fallLoad: sumCredits(plan.fall),
    springLoad: sumCredits(plan.spring),
    aceCreditsUsed: totals.aceCredits,
    residencyCreditsEarned: totals.residencyCredits,
    upperDivisionCreditsEarned: totals.upperDivisionCredits,
  };

  // 5. Validate anchor policies
  if (anchorPolicy) {
    plan.warnings = validateAnchorPolicies(plan, anchorPolicy, totals);
  }

  console.log('[yearPlanner] Plan generated:', {
    fall: plan.fall.length,
    spring: plan.spring.length,
    warnings: plan.warnings.length,
    metadata: plan.metadata,
  });

  return plan;
}

/**
 * Week 1.5: Validate plan against anchor policies
 */
export function validateAnchorPolicies(
  plan: SemesterPlan,
  policy: PartnerPolicy,
  totals: { aceCredits: number; residencyCredits: number; upperDivisionCredits: number }
): Violation[] {
  console.log('[yearPlanner] validateAnchorPolicies called', {
    policy: policy.partner_name,
    totals,
  });

  const warnings: Violation[] = [];

  // 1. Check transfer cap (with safety margin)
  if (totals.aceCredits > policy.max_alt_credits) {
    warnings.push({
      type: 'transfer_cap',
      severity: 'error',
      message: `Exceeds transfer cap by ${totals.aceCredits - policy.max_alt_credits} credits`,
      affectedCourses: plan.fall.concat(plan.spring)
        .filter(i => isAceOption(i))
        .map(i => i.courseId),
      suggestedFix: `Replace ${Math.ceil((totals.aceCredits - policy.max_alt_credits) / 3)} ACE courses with university courses`,
    });
  } else if (totals.aceCredits > policy.max_alt_credits - 6) {
    warnings.push({
      type: 'transfer_cap',
      severity: 'warning',
      message: `Approaching transfer cap (${totals.aceCredits}/${policy.max_alt_credits} credits used)`,
      affectedCourses: [],
      suggestedFix: 'Consider institutional courses for remaining modules',
    });
  }

  // 2. Check residency requirement
  if (totals.residencyCredits < policy.min_residency_credits) {
    const shortfall = policy.min_residency_credits - totals.residencyCredits;
    warnings.push({
      type: 'residency',
      severity: shortfall > 12 ? 'error' : 'warning',
      message: `Need ${shortfall} more institutional credits to meet residency requirement`,
      affectedCourses: [],
      suggestedFix: `Add ${Math.ceil(shortfall / 3)} university courses`,
    });
  }

  // 3. Check upper-division requirement
  if (totals.upperDivisionCredits < policy.upper_division_min) {
    const shortfall = policy.upper_division_min - totals.upperDivisionCredits;
    warnings.push({
      type: 'upper_division',
      severity: shortfall > 9 ? 'error' : 'warning',
      message: `Need ${shortfall} more upper-division credits (300/400 level)`,
      affectedCourses: [],
      suggestedFix: `Replace lower-division courses with 300/400 level options`,
    });
  }

  return warnings;
}

/**
 * Week 1 Scaffold: Rebalance semester loads
 */
export function rebalanceSemesters(
  plan: SemesterPlan,
  targetLoads: { fall: number; spring: number }
): void {
  console.log('[yearPlanner] rebalanceSemesters called (Week 1 Scaffold)', {
    currentLoads: { fall: plan.metadata.fallLoad, spring: plan.metadata.springLoad },
    targetLoads,
  });

  // TODO: Implement rebalancing logic
  // 1. Calculate imbalance
  // 2. Move courses from heavier semester to lighter
  // 3. Respect prerequisites
  // 4. Recalculate loads
}

/**
 * Week 1 Scaffold: Validate prerequisite order
 */
export function validatePrerequisiteOrder(
  plan: SemesterPlan,
  allOptions: MarketplaceOption[]
): Violation[] {
  console.log('[yearPlanner] validatePrerequisiteOrder called (Week 1 Scaffold)', {
    fallCount: plan.fall.length,
    springCount: plan.spring.length,
  });

  const warnings: Violation[] = [];

  // TODO: Implement prerequisite validation
  // 1. Build prerequisite graph
  // 2. Check if any course is placed before its prereq
  // 3. Return violations with suggested fixes

  return warnings;
}
