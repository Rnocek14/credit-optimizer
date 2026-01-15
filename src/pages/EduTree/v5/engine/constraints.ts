import type { BasketItem, Constraints } from '../state/usePlanBasket';
import {
  type CreditLossReport,
  type CreditLossItem,
  createEmptyCreditLossReport,
  addLostItem,
  calculateCapExceedance,
  formatCreditLossReport,
} from './creditLoss';
import { countsTowardAltCap } from '../utils/altCredit';
import { isTransferCredit, isAltCredit, isResidentCredit } from '../utils/creditClassification';
import { VIOLATION_TYPES, type ViolationType } from './violationTypes';

// Bucket mode types for transfer/alt credit policy
export type BucketMode = 'separate' | 'combined' | 'unknown';

export interface PolicyData {
  transfer_alt_bucket_mode?: BucketMode;
  max_alt_credit?: number;
  max_transfer_credits?: number;
  max_transfer_alt_combined_credits?: number;
  degree_credit_total?: number;
  residency_credits?: number;
  capstone_in_residence?: boolean;
  // Upper-division enforcement
  min_upper_division_credits?: number;
  // Per-provider caps (optional - only enforce if present in policy pack)
  provider_caps?: Record<string, number>; // e.g. { CLEP: 60, DSST: 60 }
}

export interface Violation {
  type: ViolationType;
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
    creditLoss?: number;
    lostItems?: CreditLossItem[];
    bucketMode?: BucketMode;
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
      type: VIOLATION_TYPES.BUDGET,
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
        type: VIOLATION_TYPES.WORKLOAD,
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
        type: VIOLATION_TYPES.DEADLINE,
        severity: 'error',
        message: `Plan requires ${realisticWeeks} weeks (${basket.length} courses, max ${concurrency} concurrent) but only ${weeksUntilDeadline} weeks until graduation`,
        affectedCourses: basket.map(i => i.courseId),
        suggestedFix: 'Adjust deadline or select faster-paced courses'
      });
    }
  }
  
  // 4. Transfer/Alt cap enforcement (bucket-mode aware, NO heuristics)
  // Uses canonical classification from creditClassification.ts
  const institutionCode = constraints.target_school || '';
  
  // Helper to build classifiable item from basket item
  const toClassifiable = (item: BasketItem) => ({
    providerType: item.providerType,
    providerCode: (item as any).providerCode,
    isAltCredit: (item as any).isAltCredit,
    aceNccrs: (item as any).aceNccrs,
    credits: item.credits,
  });
  
  // Classification predicates (reusable, no double-counting)
  const countsAsResident = (i: BasketItem) => isResidentCredit(toClassifiable(i), institutionCode);
  const countsAsTransfer = (i: BasketItem) => isTransferCredit(toClassifiable(i), institutionCode);
  const countsAsAlt = (i: BasketItem) => isAltCredit(toClassifiable(i));
  // Combined = (transfer OR alt) AND NOT resident
  // Defensive: even if bad data marks resident course as alt, exclude it from combined bucket
  const countsTowardCombined = (i: BasketItem) => {
    if (countsAsResident(i)) return false; // Resident credits never count toward combined cap
    return countsAsTransfer(i) || countsAsAlt(i);
  };
  
  // Calculate credits using canonical classification
  const transferCredits = basket.filter(countsAsTransfer).reduce((s, i) => s + i.credits, 0);
  const altCredits = basket.filter(countsAsAlt).reduce((s, i) => s + i.credits, 0);
  
  // Get bucket mode and caps from constraints (passed from policy data)
  const bucketMode = (constraints as any).transfer_alt_bucket_mode as BucketMode | undefined;
  const policyAltCap = (constraints as any).max_alt_credit as number | undefined;
  const constraintsAltCap = constraints.max_ace_credits;
  const maxTransferAltCombined = (constraints as any).max_transfer_alt_combined_credits as number | undefined;
  const maxTransferCredits = (constraints as any).max_transfer_credits as number | undefined;
  
  // Pick single effective alt cap (policy takes precedence, no duplicates)
  const effectiveAltCap = policyAltCap ?? constraintsAltCap ?? null;
  
  // Helper: get affected course IDs by predicate
  const getCourseIds = (pred: (i: BasketItem) => boolean) =>
    basket.filter(pred).map(i => i.courseId);
  
  if (bucketMode === 'combined') {
    if (maxTransferAltCombined == null) {
      // Combined mode but missing combined cap = policy invalid
      violations.push({
        type: VIOLATION_TYPES.POLICY_UNVERIFIED,
        severity: 'error',
        message: `bucketMode=combined but max_transfer_alt_combined_credits is missing.`,
        affectedCourses: [],
        suggestedFix: 'Verify policy source and populate max_transfer_alt_combined_credits',
        metadata: { bucketMode: 'combined' },
      });
    } else {
      // Combined bucket: all non-resident credit sources share one cap
      // Use countsTowardCombined to avoid double-counting items that are both transfer AND alt
      const combinedTotal = basket
        .filter(countsTowardCombined)
        .reduce((s, i) => s + i.credits, 0);

      if (combinedTotal > maxTransferAltCombined) {
        violations.push({
          type: VIOLATION_TYPES.COMBINED_CAP,
          severity: 'error',
          message: `${combinedTotal} combined transfer+alt credits exceeds ${maxTransferAltCombined} limit`,
          affectedCourses: getCourseIds(countsTowardCombined),
          suggestedFix: 'Replace some transfer/alt credits with resident courses',
          metadata: { current: combinedTotal, limit: maxTransferAltCombined, bucketMode: 'combined' },
        });
      }
    }
  } else if (bucketMode === 'separate') {
    // Separate buckets: enforce each cap independently
    // 1. Alt credit cap (single effective cap, no duplicates)
    if (effectiveAltCap != null && altCredits > effectiveAltCap) {
      violations.push({
        type: VIOLATION_TYPES.ALT_CAP,
        severity: 'error',
        message: `${altCredits} alt credits exceeds ${effectiveAltCap} noncollegiate limit`,
        affectedCourses: getCourseIds(countsAsAlt),
        suggestedFix: 'Replace some alt-credit courses with RA transfer or resident courses',
        metadata: { current: altCredits, limit: effectiveAltCap, bucketMode: 'separate' },
      });
    }
    
    // 2. Transfer cap (if school has one)
    if (maxTransferCredits != null && transferCredits > maxTransferCredits) {
      violations.push({
        type: VIOLATION_TYPES.TRANSFER_CAP,
        severity: 'error',
        message: `${transferCredits} transfer credits exceeds ${maxTransferCredits} limit`,
        affectedCourses: getCourseIds(countsAsTransfer),
        suggestedFix: 'Replace some transfer credits with resident courses',
        metadata: { current: transferCredits, limit: maxTransferCredits, bucketMode: 'separate' },
      });
    }
  } else {
    // Unknown bucket mode = policy unverified, emit error (no heuristic fallback)
    violations.push({
      type: VIOLATION_TYPES.POLICY_UNVERIFIED,
      severity: 'error',
      message: `transfer_alt_bucket_mode is '${bucketMode ?? 'undefined'}'. Cannot enforce transfer/alt caps without verified bucket mode.`,
      affectedCourses: [],
      suggestedFix: 'Verify policy source and set transfer_alt_bucket_mode to separate or combined',
      metadata: { bucketMode: (bucketMode ?? 'unknown') as BucketMode },
    });
  }
  
  // 5. UPPER-DIVISION REQUIREMENT (blocks "degree complete" claims if unmet)
  // Level >= 300 is considered upper-division
  const minUpperDivCredits = (constraints as any).min_upper_division_credits as number | undefined;
  if (minUpperDivCredits != null) {
    const upperDivisionCredits = basket
      .filter(item => {
        const level = (item as any).level ?? 0;
        return level >= 300;
      })
      .reduce((sum, item) => sum + item.credits, 0);
    
    if (upperDivisionCredits < minUpperDivCredits) {
      violations.push({
        type: VIOLATION_TYPES.UPPER_DIVISION,
        severity: 'error',
        message: `${upperDivisionCredits} upper-division credits is below required ${minUpperDivCredits}`,
        affectedCourses: basket.map(i => i.courseId),
        suggestedFix: 'Add more 300/400 level courses or swap in upper-division equivalents',
        metadata: { current: upperDivisionCredits, required: minUpperDivCredits },
      });
    }
  }
  
  // 6. Prerequisite check
  const courseIds = new Set(basket.map(i => i.courseId));
  basket.forEach(item => {
    const opt = allOptions.find(o => o.courseId === item.courseId);
    const unmetPrereqs = (opt?.prereq_course_ids || []).filter(pid => !courseIds.has(pid));
    
    if (unmetPrereqs.length > 0) {
      violations.push({
        type: VIOLATION_TYPES.PREREQUISITE,
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
  
  equivalencyGroups.forEach((courses, _key) => {
    if (courses.length > 1) {
      violations.push({
        type: VIOLATION_TYPES.CONFLICT,
        severity: 'warning',
        message: `Duplicate equivalent courses (${courses.length} versions of same course)`,
        affectedCourses: courses,
        suggestedFix: 'Keep only one version - won\'t earn duplicate credit'
      });
    }
  });
  
  // 7. INSTITUTION-SPECIFIC RULES (policy-driven)
  // Pass policy data for policy-driven enforcement using constraint fields
  // IMPORTANT: Do NOT default capstoneInResidence to true; undefined means "unknown, warn + don't enforce"
  const policyData: InstitutionRulesPolicy = {
    institutionCode,
    capstoneInResidence: (constraints as any).capstone_in_residence, // Tri-state: true/false/undefined
    minResidencyCredits: (constraints as any).min_residency_credits,
  };
  
  // Summary for institution rules
  const planSummary = {
    total: basket.reduce((s, i) => s + i.credits, 0),
    residency: basket.filter(i => isResidentCredit(toClassifiable(i), institutionCode)).reduce((s, i) => s + i.credits, 0),
    upperDivision: basket.filter(i => ((i as any).level ?? 0) >= 300).reduce((s, i) => s + i.credits, 0),
  };
  
  applyInstitutionSpecificRules(policyData, basket, planSummary, violations);
  
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
      .filter(i => countsTowardAltCap({ isAltCredit: (i as any).isAltCredit, aceNccrs: (i as any).aceNccrs, providerType: i.providerType as any }))
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
      type: VIOLATION_TYPES.RESIDENCY,
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
      type: VIOLATION_TYPES.UPPER_DIVISION,
      severity: 'error',
      message: `Need ${upperDivMin - summary.upperDivision} more upper-division (300/400 level) credits (current: ${summary.upperDivision}/${upperDivMin})`,
      affectedCourses: [],
      suggestedFix: 'Add more 300/400 level courses',
      metadata: { current: summary.upperDivision, required: upperDivMin },
    });
  }

  // 3. PER-PROVIDER CAPS (ONLY from policy pack, no hardcoded legacy keys)
  // NOTE: Legacy keys like clep_max, dsst_max are deprecated.
  // Provider caps should come from policy_data.provider_caps or institution_credit_limits
  // with explicit provenance. We still check the legacy keys in limits for backward
  // compatibility, but DO NOT hardcode new caps here.
  const legacyProviderLimitKeys: Record<string, string> = {
    CLEP: 'clep_max',
    DSST: 'dsst_max',
    SOPHIA: 'sophia_max',
    STUDY_COM: 'study_com_max',
  };

  // Only enforce if the limit actually exists in the data (not assumed)
  Object.entries(legacyProviderLimitKeys).forEach(([code, limitType]) => {
    const limit = getLimit(limitType);
    // CRITICAL: Only enforce if limit is explicitly set (not null/undefined)
    // This prevents hardcoded assumptions about provider caps
    if (limit == null) return;
    
    const credits = summary.byProvider[code] ?? 0;
    if (credits > limit) {
      const creditLoss = credits - limit;
      const providerItems = basket
        .filter(i => i.providerCode?.toUpperCase() === code)
        .map(i => ({ courseId: i.courseId, credits: i.credits, providerCode: i.providerCode }));
      const lostItems = calculateCapExceedance(providerItems, credits, limit, 'provider', code);
      
      violations.push({
        type: VIOLATION_TYPES.PROVIDER_CAP,
        severity: 'error',
        message: `${code} credits (${credits}) exceed ${limit}-credit limit. Credit loss: ${creditLoss}`,
        affectedCourses: lostItems.map(i => i.courseId),
        suggestedFix: `Remove ${creditLoss} credits from ${code} or replace with other providers`,
        metadata: { 
          current: credits, 
          limit, 
          provider: code,
          creditLoss,
          lostItems,
        },
      });
    }
  });

  // 4. TOTAL TRANSFER CAP - with explicit creditLoss tracking
  const totalTransferMax = getLimit('total_transfer');
  if (totalTransferMax != null && summary.transfer > totalTransferMax) {
    const creditLoss = summary.transfer - totalTransferMax;
    const transferItems = basket
      .filter(i => i.providerType !== 'university' || i.providerCode !== institutionCode)
      .map(i => ({ courseId: i.courseId, credits: i.credits, providerCode: i.providerCode }));
    const lostItems = calculateCapExceedance(transferItems, summary.transfer, totalTransferMax, 'transfer');
    
    violations.push({
      type: VIOLATION_TYPES.TOTAL_TRANSFER,
      severity: 'error',
      message: `Total transfer credits (${summary.transfer}) exceed ${totalTransferMax}-credit limit. Credit loss: ${creditLoss}`,
      affectedCourses: lostItems.map(i => i.courseId),
      suggestedFix: `Replace ${creditLoss} transfer credits with ${institutionCode} courses`,
      metadata: { 
        current: summary.transfer, 
        limit: totalTransferMax,
        creditLoss,
        lostItems,
      },
    });
  }

  // 5. ALT CREDIT CAP - with explicit creditLoss tracking
  const altCreditMax = getLimit('alt_credit_max');
  if (altCreditMax != null && summary.altCredits > altCreditMax) {
    const creditLoss = summary.altCredits - altCreditMax;
    const altItems = basket
      .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
      .map(i => ({ courseId: i.courseId, credits: i.credits, providerCode: i.providerCode }));
    const lostItems = calculateCapExceedance(altItems, summary.altCredits, altCreditMax, 'alt');
    
    violations.push({
      type: VIOLATION_TYPES.TRANSFER_CAP,
      severity: 'error',
      message: `Alternative credits (${summary.altCredits}) exceed ${altCreditMax}-credit limit. Credit loss: ${creditLoss}`,
      affectedCourses: lostItems.map(i => i.courseId),
      suggestedFix: 'Replace some alt-credit courses with university courses',
      metadata: { 
        current: summary.altCredits, 
        limit: altCreditMax,
        creditLoss,
        lostItems,
      },
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
        type: VIOLATION_TYPES.RESIDENCY,
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
        type: VIOLATION_TYPES.GENED_INCOMPLETE,
        severity: 'error',
        message: `${category.category_name}: Need ${required - earned} more credits (${earned}/${required})`,
        affectedCourses: [],
        suggestedFix: `Add courses in ${category.category_name} category`,
        metadata: { current: earned, required, category: category.category_code },
      });
    }
  });

  // 8. INSTITUTION-SPECIFIC RULES (policy-driven)
  // Build policy from limits array
  // Note: capstone_in_residence is not in InstitutionCreditLimit type; default to true for safety
  const minResidency = getLimit('min_residency');
  
  const policyData: InstitutionRulesPolicy = {
    institutionCode,
    capstoneInResidence: undefined, // Tri-state: unknown from limits table; will warn
    minResidencyCredits: minResidency ?? undefined,
  };
  applyInstitutionSpecificRules(policyData, basket, summary, violations);

  return violations;
}

/**
 * Policy data for institution-specific rules.
 * This decouples enforcement from hardcoded institution checks.
 */
export interface InstitutionRulesPolicy {
  institutionCode: string;
  /** If true, capstone must be taken at the target institution */
  capstoneInResidence?: boolean;
  /** Minimum residency credits (institution-specific) */
  minResidencyCredits?: number;
}

/**
 * Institution-specific rules that go beyond database limits.
 * 
 * POLICY-DRIVEN: Rules are keyed off policy flags, not hardcoded institution checks.
 * This makes adding new schools trivial: set the policy flags and rules "just work."
 * 
 * IMPORTANT: This function MUST emit proper violation types using VIOLATION_TYPES constants.
 * - CAPSTONE_SUBSTITUTION when capstone is from non-resident provider
 * - RESIDENCY for general residency warnings
 */
export function applyInstitutionSpecificRules(
  policy: InstitutionRulesPolicy,
  basket: BasketItem[],
  summary: { total: number; residency: number; upperDivision: number },
  violations: Violation[]
) {
  const { institutionCode, capstoneInResidence, minResidencyCredits } = policy;
  
  // Helper: Check if a course is a capstone (word-boundary regex to avoid false positives)
  // Priority: requirementArea='CAPSTONE' > isCapstone flag > word-boundary match
  const isCapstone = (item: BasketItem): boolean => 
    (item as any).requirementArea === 'CAPSTONE' ||
    (item as any).isCapstone === true ||
    /\bcapstone\b/i.test(item.courseId || '');
  
  // Helper: Check if a course is resident at the target institution
  const isResident = (item: BasketItem): boolean =>
    item.providerType === 'university' && 
    (item.providerCode?.toUpperCase() === institutionCode.toUpperCase());
  
  // ============================================
  // POLICY-DRIVEN: Capstone in Residence Rule (Tri-state)
  // ============================================
  // - true: Enforce CAPSTONE_SUBSTITUTION (error)
  // - false: Do not enforce
  // - undefined: Do not enforce, emit POLICY_UNVERIFIED warning
  const capstoneCourses = basket.filter(isCapstone);
  const hasCapstone = capstoneCourses.length > 0;
  
  if (capstoneInResidence === true) {
    // Enforce: capstone must be in residence
    const hasResidentCapstone = capstoneCourses.some(isResident);
    
    if (hasCapstone && !hasResidentCapstone) {
      violations.push({
        type: VIOLATION_TYPES.CAPSTONE_SUBSTITUTION,
        severity: 'error',
        message: `${institutionCode}: Capstone must be taken in residence`,
        affectedCourses: capstoneCourses.map(c => c.courseId),
        suggestedFix: `Replace with ${institutionCode} capstone course`,
      });
    }
    
    // Soft warning if near graduation but no capstone
    if (!hasCapstone && summary.total >= 90) {
      violations.push({
        type: VIOLATION_TYPES.RESIDENCY,
        severity: 'warning',
        message: `${institutionCode}: Consider adding capstone course`,
        affectedCourses: [],
        suggestedFix: `Add ${institutionCode} capstone course`,
      });
    }
  } else if (capstoneInResidence == null) {
    // Unknown: warn so policy pack gets updated, but don't block
    if (hasCapstone) {
      violations.push({
        type: VIOLATION_TYPES.POLICY_UNVERIFIED,
        severity: 'warning',
        message: `${institutionCode}: capstoneInResidence policy flag missing; capstone substitution not enforced`,
        affectedCourses: [],
        suggestedFix: 'Add capstone_in_residence flag to policy pack',
      });
    }
  }
  // capstoneInResidence === false: no enforcement, no warning
  
  // ============================================
  // POLICY-DRIVEN: Minimum Residency Rule
  // ============================================
  // Institution-specific residency minimum (e.g., COSC requires 6)
  if (minResidencyCredits !== undefined && summary.residency < minResidencyCredits) {
    violations.push({
      type: VIOLATION_TYPES.RESIDENCY,
      severity: 'error',
      message: `${institutionCode}: Plan must include at least ${minResidencyCredits} institutional credits`,
      affectedCourses: [],
      suggestedFix: `Add ${minResidencyCredits - summary.residency} more ${institutionCode} credits`,
      metadata: { current: summary.residency, required: minResidencyCredits },
    });
  }
  
  // ============================================
  // INSTITUTION-SPECIFIC SOFT WARNINGS (optional)
  // ============================================
  // These are informational and don't block; kept per-institution for now
  switch (institutionCode) {
    case 'COSC':
      // COSC cornerstone reminder (doesn't block, just helpful)
      if (summary.residency >= 3 && summary.residency < 6 && summary.total >= 60) {
        violations.push({
          type: VIOLATION_TYPES.RESIDENCY,
          severity: 'warning',
          message: 'COSC: Consider adding cornerstone course for full institutional requirement',
          affectedCourses: [],
          suggestedFix: 'Add COSC cornerstone (3cr) course',
        });
      }
      break;
      
    case 'WGU':
      // WGU soft expectation of ~30 in-house credits
      if (summary.residency < 30 && summary.total >= 60) {
        violations.push({
          type: VIOLATION_TYPES.RESIDENCY,
          severity: 'warning',
          message: 'WGU: Plan has fewer than ~30 institutional credits; WGU may require more in-house coursework',
          affectedCourses: [],
          suggestedFix: 'Shift some alt-credit/electives to WGU courses',
          metadata: { current: summary.residency, required: 30 },
        });
      }
      break;
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
