import type { BasketItem, Constraints } from '../state/usePlanBasket';

export interface Violation {
  type: 'budget' | 'workload' | 'deadline' | 'prerequisite' | 'transfer_cap' | 'conflict' | 'residency' | 'upper_division' | 'provider_cap' | 'gened_incomplete' | 'total_transfer';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedCourses: string[];
  suggestedFix?: string;
  metadata?: {
    current?: number;
    required?: number;
    limit?: number;
    provider?: string;
    category?: string;
  };
}

interface MarketplaceOption {
  courseId: string;
  title?: string;
  providerType?: string | null;
  prereq_course_ids?: string[];
  equivalency_key?: string;
}

// Types for TESU policy validation
interface InstitutionCreditLimit {
  limit_type:
    | 'total_transfer'
    | 'alt_credit_max'
    | 'comm_college_max'
    | 'min_ra_credit'
    | 'min_residency'
    | 'clep_max'
    | 'dsst_max'
    | 'upper_division_min'
    | 'sophia_max'
    | 'study_com_max';
  credit_value: number;
  notes: string | null;
}

interface GenEdCategory {
  id: string;
  framework_id: string;
  category_code: string;
  category_name: string;
  credits_required: number;
  min_grade: string | null;
}

interface AltCreditEquivalency {
  alt_credit_id: string;
  gened_category_code: string | null;
  requirement_area: string | null;
  level: number;
  alt_source_code: string;
  alt_identifier: string;
  institutional_course_code: string;
}

export function validatePlan(
  basket: BasketItem[],
  allOptions: MarketplaceOption[],
  constraints: Constraints
): Violation[] {
  const violations: Violation[] = [];
  
  // 1. Budget check
  const totalCost = basket.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  if (constraints.max_budget_usd && totalCost > constraints.max_budget_usd) {
    violations.push({
      type: 'budget',
      severity: 'error',
      message: `Plan exceeds budget by $${(totalCost - constraints.max_budget_usd).toFixed(0)}`,
      affectedCourses: basket.map(i => i.courseId),
      suggestedFix: 'Try auto-complete with budget constraint or remove expensive courses'
    });
  }
  
  // 2. Workload check (total weekly hours, not average) - Phase 1a: guard against undefined
  if (basket.length > 0) {
    const totalWeeklyHours = basket.reduce((sum, i) => sum + (i.workload_weekly_hours ?? 0), 0);
    if (constraints.max_weekly_hours && totalWeeklyHours > constraints.max_weekly_hours) {
      violations.push({
        type: 'workload',
        severity: 'warning',
        message: `Total ${totalWeeklyHours}hrs/wk exceeds ${constraints.max_weekly_hours}hrs/wk limit`,
        affectedCourses: basket.filter(i => i.workload_weekly_hours > 10).map(i => i.courseId),
        suggestedFix: 'Reduce concurrent courses or choose lighter alternatives'
      });
    }
  }
  
  // 3. Deadline feasibility (with concurrency)
  if (constraints.target_graduation_date) {
    const concurrency = constraints.max_concurrent_courses ?? 2;
    const serialWeeks = basket.reduce((sum, i) => sum + (i.duration_weeks ?? 8), 0);
    const realisticWeeks = Math.ceil(serialWeeks / concurrency);
    const weeksUntilDeadline = Math.floor(
      (constraints.target_graduation_date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
    );
    
    if (realisticWeeks > weeksUntilDeadline) {
      violations.push({
        type: 'deadline',
        severity: 'error',
        message: `Plan requires ${realisticWeeks} weeks (${basket.length} courses, max ${concurrency} concurrent) but only ${weeksUntilDeadline} weeks until graduation`,
        affectedCourses: basket.map(i => i.courseId),
        suggestedFix: 'Adjust deadline or select faster-paced courses'
      });
    }
  }
  
  // 4. Transfer cap (ACE/NCCRS credits) - Phase 1a: use providerType from basket directly
  const aceCredits = basket
    .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
    .reduce((sum, i) => sum + i.credits, 0);
    
  if (constraints.max_ace_credits && aceCredits > constraints.max_ace_credits) {
    violations.push({
      type: 'transfer_cap',
      severity: 'error',
      message: `${aceCredits} ACE/alt credits exceeds ${constraints.max_ace_credits} transfer limit`,
      affectedCourses: basket.map(i => i.courseId),
      suggestedFix: 'Replace some alt-credit courses with university courses'
    });
  }
  
  // 5. Prerequisite check
  const courseIds = new Set(basket.map(i => i.courseId));
  basket.forEach(item => {
    const opt = allOptions.find(o => o.courseId === item.courseId);
    const unmetPrereqs = (opt?.prereq_course_ids || []).filter(pid => !courseIds.has(pid));
    
    if (unmetPrereqs.length > 0) {
      violations.push({
        type: 'prerequisite',
        severity: 'error',
        message: `${opt?.title || item.courseId} requires ${unmetPrereqs.length} prerequisite(s)`,
        affectedCourses: [item.courseId],
        suggestedFix: 'Add prerequisites to plan first'
      });
    }
  });
  
  // 6. Equivalency conflict (same course from multiple providers)
  const equivalencyGroups = new Map<string, string[]>();
  basket.forEach(item => {
    const opt = allOptions.find(o => o.courseId === item.courseId);
    if (opt?.equivalency_key) {
      if (!equivalencyGroups.has(opt.equivalency_key)) {
        equivalencyGroups.set(opt.equivalency_key, []);
      }
      equivalencyGroups.get(opt.equivalency_key)!.push(item.courseId);
    }
  });
  
  equivalencyGroups.forEach((courses, key) => {
    if (courses.length > 1) {
      violations.push({
        type: 'conflict',
        severity: 'warning',
        message: `Duplicate equivalent courses (${courses.length} versions of same course)`,
        affectedCourses: courses,
        suggestedFix: 'Keep only one version - won\'t earn duplicate credit'
      });
    }
  });
  
  return violations;
}

/**
 * TESU-specific policy validator
 * Enforces institution-specific requirements that go beyond generic constraints
 * 
 * @param basket - All selected courses in the plan
 * @param limits - Credit limits from institution_credit_limits table
 * @param genEdCategories - Gen-ed requirements from gened_categories table
 * @param equivalencies - Alt credit equivalencies for looking up gen-ed categories
 * @returns Array of TESU policy violations
 */
export function validateTESUPolicies(
  basket: BasketItem[],
  limits: InstitutionCreditLimit[],
  genEdCategories: GenEdCategory[],
  equivalencies?: AltCreditEquivalency[]
): Violation[] {
  const violations: Violation[] = [];

  // Helper: Get limit value by type
  const getLimit = (type: string): number | null => {
    return limits.find(l => l.limit_type === type)?.credit_value ?? null;
  };

  // 1. RESIDENCY REQUIREMENT (min credits from TESU)
  const residencyMin = getLimit('min_residency') ?? 15;
  const residencyCredits = basket
    .filter(i => i.providerType === 'university' && i.providerCode === 'TESU')
    .reduce((sum, i) => sum + i.credits, 0);

  if (residencyCredits < residencyMin) {
    violations.push({
      type: 'residency',
      severity: 'error',
      message: `Need ${residencyMin - residencyCredits} more TESU credits to meet ${residencyMin}-credit residency requirement`,
      affectedCourses: [],
      suggestedFix: 'Replace alternative credits with TESU courses',
      metadata: {
        current: residencyCredits,
        required: residencyMin,
      },
    });
  }

  // 2. UPPER-DIVISION REQUIREMENT (min credits at 300/400 level)
  const upperDivMin = getLimit('upper_division_min') ?? 30;
  const upperDivCredits = basket
    .filter(i => (i.level ?? 0) >= 300)
    .reduce((sum, i) => sum + i.credits, 0);

  if (upperDivCredits < upperDivMin) {
    violations.push({
      type: 'upper_division',
      severity: 'error',
      message: `Need ${upperDivMin - upperDivCredits} more upper-division (300/400 level) credits (current: ${upperDivCredits}/${upperDivMin})`,
      affectedCourses: [],
      suggestedFix: 'Add more 300/400 level courses',
      metadata: {
        current: upperDivCredits,
        required: upperDivMin,
      },
    });
  }

  // 3. PER-PROVIDER CAPS
  const providerCaps: Record<string, { limit: number; name: string }> = {
    CLEP: { limit: getLimit('clep_max') ?? 40, name: 'CLEP' },
    DSST: { limit: getLimit('dsst_max') ?? 30, name: 'DSST' },
    SOPHIA: { limit: getLimit('sophia_max') ?? 90, name: 'Sophia Learning' },
    STUDY_COM: { limit: getLimit('study_com_max') ?? 30, name: 'Study.com' },
  };

  Object.entries(providerCaps).forEach(([code, { limit, name }]) => {
    const providerCredits = basket
      .filter(i => i.providerCode?.toUpperCase() === code)
      .reduce((sum, i) => sum + i.credits, 0);

    if (providerCredits > limit) {
      const affectedCourses = basket
        .filter(i => i.providerCode?.toUpperCase() === code)
        .map(i => i.courseId);

      violations.push({
        type: 'provider_cap',
        severity: 'error',
        message: `${name} credits (${providerCredits}) exceed ${limit}-credit limit by ${providerCredits - limit}`,
        affectedCourses,
        suggestedFix: `Remove ${providerCredits - limit} credits from ${name} or replace with other providers`,
        metadata: {
          current: providerCredits,
          limit,
          provider: code,
        },
      });
    }
  });

  // 4. TOTAL TRANSFER CAP (max non-residency credits)
  const totalTransferMax = getLimit('total_transfer') ?? 113;
  const totalTransferCredits = basket
    .filter(i => i.providerType !== 'university' || i.providerCode !== 'TESU')
    .reduce((sum, i) => sum + i.credits, 0);

  if (totalTransferCredits > totalTransferMax) {
    violations.push({
      type: 'total_transfer',
      severity: 'error',
      message: `Total transfer credits (${totalTransferCredits}) exceed ${totalTransferMax}-credit limit`,
      affectedCourses: [],
      suggestedFix: `Replace ${totalTransferCredits - totalTransferMax} transfer credits with TESU courses`,
      metadata: {
        current: totalTransferCredits,
        limit: totalTransferMax,
      },
    });
  }

  // 5. GEN-ED CATEGORY REQUIREMENTS
  // Build a map of category_code -> credits earned
  const genEdCreditsByCategory = new Map<string, number>();
  
  if (equivalencies && equivalencies.length > 0) {
    basket.forEach(item => {
      // Try to find gen-ed category through equivalencies
      const equiv = equivalencies.find(
        eq => 
          eq.alt_source_code === item.providerCode &&
          item.courseId.includes(eq.alt_identifier)
      );

      if (equiv?.gened_category_code) {
        const current = genEdCreditsByCategory.get(equiv.gened_category_code) ?? 0;
        genEdCreditsByCategory.set(equiv.gened_category_code, current + item.credits);
      }

      // Also check requirementArea if it matches a gen-ed category
      if (item.requirementArea) {
        const current = genEdCreditsByCategory.get(item.requirementArea) ?? 0;
        genEdCreditsByCategory.set(item.requirementArea, current + item.credits);
      }
    });
  }

  // Check each required category
  genEdCategories.forEach(category => {
    const earned = genEdCreditsByCategory.get(category.category_code) ?? 0;
    const required = category.credits_required;

    if (earned < required) {
      violations.push({
        type: 'gened_incomplete',
        severity: 'error',
        message: `${category.category_name}: Need ${required - earned} more credits (${earned}/${required})`,
        affectedCourses: [],
        suggestedFix: `Add courses in ${category.category_name} category`,
        metadata: {
          current: earned,
          required,
          category: category.category_code,
        },
      });
    }
  });

  return violations;
}
