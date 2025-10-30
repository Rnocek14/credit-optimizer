/**
 * Week 1: Year Planner Engine - Scaffold
 * Anchor-aware semester planning that respects:
 * 1. Requirement blocks (degree completion)
 * 2. Transfer rules (anchor school policies)
 * 3. Prerequisites (course ordering)
 * 4. Load targets (semester balancing)
 */

import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { ModuleData, MarketplaceOption, ScoringWeights } from '../types/v5';
import type { RequirementBlock, RuleType } from '@/lib/types/eduTree';

// ============= Interfaces =============

export interface YearPreset {
  id: string;
  label: string;
  description: string;
  targetLoads: { fall: number; spring: number }; // Target credits per semester
  weights: ScoringWeights; // Reuse from autoCompletePlan
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

// ============= Core Functions (Stubs) =============

/**
 * Week 1 Scaffold: Build a semester plan for a given year
 * Returns empty plan with no-op warnings for now
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
  console.log('[yearPlanner] buildYearPlan called (Week 1 Scaffold)', {
    preset: preset.id,
    year,
    modulesCount: modules.length,
    blocksCount: blocks.length,
    anchorPolicy: anchorPolicy?.partner_name,
  });

  // Week 1: Return empty plan
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

  // TODO: Implement actual planning logic
  // 1. Seed with pinned items
  // 2. Identify unmet requirement blocks
  // 3. Score and select best options per preset
  // 4. Assign to semesters based on load targets
  // 5. Validate prerequisites
  // 6. Rebalance if needed
  // 7. Validate anchor policies

  return plan;
}

/**
 * Week 1 Scaffold: Validate plan against anchor policies
 */
export function validateAnchorPolicies(
  plan: SemesterPlan,
  policy: PartnerPolicy,
  totals: { aceCredits: number; residencyCredits: number; upperDivisionCredits: number }
): Violation[] {
  console.log('[yearPlanner] validateAnchorPolicies called (Week 1 Scaffold)', {
    policy: policy.partner_name,
    totals,
  });

  const warnings: Violation[] = [];

  // TODO: Implement validation logic
  // 1. Check transfer cap (with safety margin)
  // 2. Check residency requirement
  // 3. Check upper-division requirement

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
