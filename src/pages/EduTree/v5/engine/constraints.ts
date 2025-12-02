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
/**
 * Generic institution policy validator
 * Works with any institution that has been seeded in institution_credit_limits
 */
export function validateInstitutionPolicies(
  basket: BasketItem[],
  institutionCode: string,
  limits: InstitutionCreditLimit[],
  genEdCategories: GenEdCategory[],
  equivalencies?: AltCreditEquivalency[]
): Violation[] {
  const violations: Violation[] = [];

  // Helper: Get limit value by type
  const getLimit = (type: string): number | null => {
    return limits.find(l => l.limit_type === type)?.credit_value ?? null;
  };

  // Summarize plan credits
  const summary = {
    total: basket.reduce((sum, i) => sum + i.credits, 0),
    residency: basket
      .filter(i => i.providerType === 'university' && i.providerCode === institutionCode)
      .reduce((sum, i) => sum + i.credits, 0),
    upperDivision: basket
      .filter(i => (i.level ?? 0) >= 300)
      .reduce((sum, i) => sum + i.credits, 0),
    altCredits: basket
      .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
      .reduce((sum, i) => sum + i.credits, 0),
    transfer: basket
      .filter(i => i.providerType !== 'university' || i.providerCode !== institutionCode)
      .reduce((sum, i) => sum + i.credits, 0),
    byProvider: {} as Record<string, number>,
  };

  // Count per-provider credits
  basket.forEach(i => {
    const code = i.providerCode?.toUpperCase() || 'UNKNOWN';
    summary.byProvider[code] = (summary.byProvider[code] ?? 0) + i.credits;
  });

  // 1. RESIDENCY REQUIREMENT
  const residencyMin = getLimit('min_residency');
  if (residencyMin != null && summary.residency < residencyMin) {
    violations.push({
      type: 'residency',
      severity: 'error',
      message: `Need ${residencyMin - summary.residency} more ${institutionCode} credits to meet ${residencyMin}-credit residency requirement`,
      affectedCourses: [],
      suggestedFix: `Replace alternative credits with ${institutionCode} courses`,
      metadata: { current: summary.residency, required: residencyMin },
    });
  }

  // 2. UPPER-DIVISION REQUIREMENT
  const upperDivMin = getLimit('upper_division_min');
  if (upperDivMin != null && summary.upperDivision < upperDivMin) {
    violations.push({
      type: 'upper_division',
      severity: 'error',
      message: `Need ${upperDivMin - summary.upperDivision} more upper-division (300/400 level) credits (current: ${summary.upperDivision}/${upperDivMin})`,
      affectedCourses: [],
      suggestedFix: 'Add more 300/400 level courses',
      metadata: { current: summary.upperDivision, required: upperDivMin },
    });
  }

  // 3. PER-PROVIDER CAPS
  const providerLimits: Record<string, string> = {
    CLEP: 'clep_max',
    DSST: 'dsst_max',
    SOPHIA: 'sophia_max',
    STUDY_COM: 'study_com_max',
  };

  Object.entries(providerLimits).forEach(([code, limitType]) => {
    const limit = getLimit(limitType);
    const credits = summary.byProvider[code] ?? 0;
    if (limit != null && credits > limit) {
      violations.push({
        type: 'provider_cap',
        severity: 'error',
        message: `${code} credits (${credits}) exceed ${limit}-credit limit by ${credits - limit}`,
        affectedCourses: basket.filter(i => i.providerCode?.toUpperCase() === code).map(i => i.courseId),
        suggestedFix: `Remove ${credits - limit} credits from ${code} or replace with other providers`,
        metadata: { current: credits, limit, provider: code },
      });
    }
  });

  // 4. TOTAL TRANSFER CAP
  const totalTransferMax = getLimit('total_transfer');
  if (totalTransferMax != null && summary.transfer > totalTransferMax) {
    violations.push({
      type: 'total_transfer',
      severity: 'error',
      message: `Total transfer credits (${summary.transfer}) exceed ${totalTransferMax}-credit limit`,
      affectedCourses: [],
      suggestedFix: `Replace ${summary.transfer - totalTransferMax} transfer credits with ${institutionCode} courses`,
      metadata: { current: summary.transfer, limit: totalTransferMax },
    });
  }

  // 5. ALT CREDIT CAP
  const altCreditMax = getLimit('alt_credit_max');
  if (altCreditMax != null && summary.altCredits > altCreditMax) {
    violations.push({
      type: 'transfer_cap',
      severity: 'error',
      message: `Alternative credits (${summary.altCredits}) exceed ${altCreditMax}-credit limit`,
      affectedCourses: [],
      suggestedFix: 'Replace some alt-credit courses with university courses',
      metadata: { current: summary.altCredits, limit: altCreditMax },
    });
  }

  // 6. RA CREDIT MINIMUM
  const raMin = getLimit('min_ra_credit');
  if (raMin != null) {
    // Count RA credits: university courses are assumed RA
    const raCredits = basket
      .filter(i => i.providerType === 'university')
      .reduce((sum, i) => sum + i.credits, 0);
    if (raCredits < raMin) {
      violations.push({
        type: 'residency',
        severity: 'error',
        message: `Regionally-accredited credits (${raCredits}) below required ${raMin}`,
        affectedCourses: [],
        suggestedFix: 'Add more courses from regionally-accredited institutions',
        metadata: { current: raCredits, required: raMin },
      });
    }
  }

  // 7. GEN-ED CATEGORY REQUIREMENTS
  const genEdCreditsByCategory = new Map<string, number>();
  
  if (equivalencies && equivalencies.length > 0) {
    basket.forEach(item => {
      const equiv = equivalencies.find(
        eq => eq.alt_source_code === item.providerCode && item.courseId.includes(eq.alt_identifier)
      );
      if (equiv?.gened_category_code) {
        const current = genEdCreditsByCategory.get(equiv.gened_category_code) ?? 0;
        genEdCreditsByCategory.set(equiv.gened_category_code, current + item.credits);
      }
      if (item.requirementArea) {
        const current = genEdCreditsByCategory.get(item.requirementArea) ?? 0;
        genEdCreditsByCategory.set(item.requirementArea, current + item.credits);
      }
    });
  }

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
        metadata: { current: earned, required, category: category.category_code },
      });
    }
  });

  // 8. INSTITUTION-SPECIFIC RULES
  applyInstitutionSpecificRules(institutionCode, basket, summary, violations);

  return violations;
}

/**
 * Institution-specific rules that go beyond database limits
 */
function applyInstitutionSpecificRules(
  institutionCode: string,
  basket: BasketItem[],
  summary: { total: number; residency: number; upperDivision: number },
  violations: Violation[]
) {
  switch (institutionCode) {
    case 'TESU': {
      const hasCapstone = basket.some(i => 
        i.courseId?.includes('capstone') || i.requirementArea === 'CAPSTONE'
      );
      if (!hasCapstone && summary.total >= 100) {
        violations.push({
          type: 'residency',
          severity: 'warning',
          message: 'TESU: Consider adding the capstone course to complete residency requirements',
          affectedCourses: [],
          suggestedFix: 'Add TESU capstone course',
        });
      }
      break;
    }
    case 'COSC': {
      // COSC requires exactly 6 institutional credits (cornerstone + capstone)
      if (summary.residency < 6) {
        violations.push({
          type: 'residency',
          severity: 'error',
          message: 'COSC: Plan must include at least 6 institutional credits (cornerstone + capstone)',
          affectedCourses: [],
          suggestedFix: 'Add COSC cornerstone (3cr) and capstone (3cr) courses',
          metadata: { current: summary.residency, required: 6 },
        });
      }
      break;
    }
    case 'EXCELSIOR': {
      // Excelsior has flexible residency but requires capstone
      const hasCapstone = basket.some(i => 
        i.courseId?.toLowerCase().includes('capstone') || i.requirementArea === 'CAPSTONE'
      );
      if (!hasCapstone && summary.total >= 90) {
        violations.push({
          type: 'residency',
          severity: 'warning',
          message: 'Excelsior: Consider adding capstone requirement',
          affectedCourses: [],
          suggestedFix: 'Add Excelsior capstone course',
        });
      }
      break;
    }

    case 'WGU': {
      const hasCapstone = basket.some(i =>
        i.courseId?.toLowerCase().includes('capstone') || i.requirementArea === 'CAPSTONE'
      );

      // Soft expectation: ~30 in-house credits
      if (summary.residency < 30 && summary.total >= 60) {
        violations.push({
          type: 'residency',
          severity: 'warning',
          message:
            'WGU: Plan currently has fewer than ~30 institutional credits; WGU may require more in-house coursework (including capstone).',
          affectedCourses: [],
          suggestedFix:
            'Shift some alt-credit/electives to WGU courses, especially near the end of the plan',
          metadata: { current: summary.residency, required: 30 },
        });
      }

      if (!hasCapstone && summary.total >= 90) {
        violations.push({
          type: 'residency',
          severity: 'warning',
          message:
            'WGU: Capstone-like requirement is typically expected in the home institution near the end of the program.',
          affectedCourses: [],
          suggestedFix: 'Add WGU capstone / final project course to the last term',
        });
      }
      break;
    }
  }
}

/**
 * Legacy TESU validator - now wraps the generic validator
 * @deprecated Use validateInstitutionPolicies instead
 */
export function validateTESUPolicies(
  basket: BasketItem[],
  limits: InstitutionCreditLimit[],
  genEdCategories: GenEdCategory[],
  equivalencies?: AltCreditEquivalency[]
): Violation[] {
  return validateInstitutionPolicies(basket, 'TESU', limits, genEdCategories, equivalencies);
}
