/**
 * Graduation Readiness Validator
 * Comprehensive check for degree completion requirements
 */

import type { BasketItem } from '../state/usePlanBasket';
import type { PartnerPolicy } from '../engine/yearPlanner';

export interface GraduationRequirement {
  name: string;
  earned: number;
  required: number;
  met: boolean;
  shortfall: number;
  severity: 'ok' | 'warning' | 'error';
}

/**
 * Optional overrides for graduation requirements.
 * When provided, these take precedence over policy defaults.
 * Use for degree-level-specific totals (associate vs bachelor).
 */
export interface GraduationRequirementOverrides {
  /** Total credits required for degree (e.g., 120 for bachelor, 60 for associate) */
  requiredTotalCredits?: number;
}

export interface GraduationReadiness {
  totalCredits: GraduationRequirement;
  residency: GraduationRequirement;
  upperDivision: GraduationRequirement;
  transferCap: GraduationRequirement;
  isGraduationReady: boolean;
  /** True when upper-division requirement is verifiable (policy has min_upper_division_credits) */
  isUpperDivisionVerified: boolean;
  blockers: string[];
  warnings: string[];
  progressPercent: number;
  /** Degree level used for this validation (for audit trail) */
  degreeLevel?: 'bachelor' | 'associate';
}

/**
 * Default credit requirements by degree level.
 * These are fallbacks when policy doesn't specify.
 * IMPORTANT: Policy values should take precedence when available.
 */
const DEFAULT_CREDITS_BY_DEGREE = {
  bachelor: 120,
  associate: 60,
} as const;

/**
 * Calculate totals from basket items with proper provider type detection
 */
function calculateBasketTotals(basket: BasketItem[]) {
  let totalCredits = 0;
  let aceCredits = 0;
  let residencyCredits = 0;
  let upperDivisionCredits = 0;

  for (const item of basket) {
    totalCredits += item.credits;
    
    // ACE/NCCRS credits: MOOCs and testing centers
    if (item.providerType === 'mooc' || item.providerType === 'testing_center') {
      aceCredits += item.credits;
    }
    
    // Residency: University courses (institutional credits)
    if (item.providerType === 'university') {
      residencyCredits += item.credits;
    }
    
    // Upper division: 300+ level courses
    if ((item.level || 0) >= 300) {
      upperDivisionCredits += item.credits;
    }
  }

  return { totalCredits, aceCredits, residencyCredits, upperDivisionCredits };
}

/**
 * Validate graduation readiness against anchor school policies
 */
/**
 * Validate graduation readiness against anchor school policies.
 * 
 * @param basket - All courses in the student's plan
 * @param policy - Anchor school policy data
 * @param overrides - Optional overrides (e.g., for degree-level-specific totals)
 */
export function validateGraduationReadiness(
  basket: BasketItem[],
  policy: PartnerPolicy,
  overrides?: GraduationRequirementOverrides
): GraduationReadiness {
  const totals = calculateBasketTotals(basket);
  
  // Determine required credits: override > policy > default
  // Policy should expose totalCreditsBachelor / totalCreditsAssociate in the future
  const policyTotal = (policy as any).totalCreditsBachelor ?? (policy as any).degree_credit_total;
  const requiredCredits = overrides?.requiredTotalCredits 
    ?? policyTotal 
    ?? DEFAULT_CREDITS_BY_DEGREE.bachelor;
  
  // Infer degree level for audit trail
  const degreeLevel: 'bachelor' | 'associate' = requiredCredits <= 65 ? 'associate' : 'bachelor';
  
  // 1. Total Credits Check
  const totalShortfall = Math.max(0, requiredCredits - totals.totalCredits);
  const totalCredits: GraduationRequirement = {
    name: 'Total Credits',
    earned: totals.totalCredits,
    required: requiredCredits,
    met: totals.totalCredits >= requiredCredits,
    shortfall: totalShortfall,
    severity: totalShortfall === 0 ? 'ok' : totalShortfall > 30 ? 'error' : 'warning',
  };

  // 2. Residency Check
  const residencyShortfall = Math.max(0, policy.min_residency_credits - totals.residencyCredits);
  const residency: GraduationRequirement = {
    name: 'Residency Credits',
    earned: totals.residencyCredits,
    required: policy.min_residency_credits,
    met: totals.residencyCredits >= policy.min_residency_credits,
    shortfall: residencyShortfall,
    severity: residencyShortfall === 0 ? 'ok' : residencyShortfall > 12 ? 'error' : 'warning',
  };

  // 3. Upper Division Check (skip if policy doesn't require it)
  const upperDivRequired = policy.upper_division_min || 0;
  const upperDivShortfall = Math.max(0, upperDivRequired - totals.upperDivisionCredits);
  const upperDivision: GraduationRequirement = {
    name: 'Upper-Division Credits (300/400)',
    earned: totals.upperDivisionCredits,
    required: upperDivRequired,
    met: upperDivRequired === 0 || totals.upperDivisionCredits >= upperDivRequired,
    shortfall: upperDivShortfall,
    severity: upperDivRequired === 0 || upperDivShortfall === 0 ? 'ok' : upperDivShortfall > 9 ? 'error' : 'warning',
  };

  // 4. Transfer Cap Check (inverted - must NOT exceed)
  const overTransfer = Math.max(0, totals.aceCredits - policy.max_alt_credits);
  const transferCap: GraduationRequirement = {
    name: 'Transfer Credit Cap',
    earned: totals.aceCredits,
    required: policy.max_alt_credits,
    met: totals.aceCredits <= policy.max_alt_credits,
    shortfall: -overTransfer, // Negative = over limit
    severity: overTransfer === 0 ? 'ok' : 'error',
  };

  // Compile blockers and warnings
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!totalCredits.met) {
    const msg = `Need ${totalCredits.shortfall} more credits to reach ${requiredCredits} total`;
    totalCredits.severity === 'error' ? blockers.push(msg) : warnings.push(msg);
  }

  if (!residency.met) {
    const msg = `Need ${residency.shortfall} more institutional credits for residency`;
    residency.severity === 'error' ? blockers.push(msg) : warnings.push(msg);
  }

  if (!upperDivision.met) {
    const msg = `Need ${upperDivision.shortfall} more upper-division (300/400) credits`;
    upperDivision.severity === 'error' ? blockers.push(msg) : warnings.push(msg);
  }

  if (!transferCap.met) {
    blockers.push(`Exceeds transfer cap by ${overTransfer} credits - replace ACE courses with institutional`);
  }

  // Upper-division is only verified if the policy explicitly sets the requirement
  // Use canonical resolver from shared module for consistency
  const { getMinUpperDivisionCredits } = require('./policyFieldResolvers');
  const minUL = getMinUpperDivisionCredits(policy);
  const isUpperDivisionVerified = minUL !== null;

  const isGraduationReady = blockers.length === 0 && 
    totalCredits.met && 
    residency.met && 
    upperDivision.met && 
    transferCap.met;

  // Progress calculation (weighted by importance)
  const progressPercent = Math.min(100, Math.round(
    (totals.totalCredits / requiredCredits) * 100
  ));

  return {
    degreeLevel,
    totalCredits,
    residency,
    upperDivision,
    transferCap,
    isGraduationReady,
    isUpperDivisionVerified,
    blockers,
    warnings,
    progressPercent,
  };
}

/**
 * Get human-readable graduation status
 */
export function getGraduationStatusLabel(readiness: GraduationReadiness): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Additional context when completion cannot be fully verified */
  caveat?: string;
} {
  // Truth guard: if upper-division is not verified, we cannot claim "Ready to Graduate"
  if (readiness.isGraduationReady && !readiness.isUpperDivisionVerified) {
    return { 
      label: '⚠ Requirements Met*', 
      variant: 'secondary',
      caveat: 'Upper-division requirement unverified'
    };
  }

  if (readiness.isGraduationReady) {
    return { label: '✓ Ready to Graduate', variant: 'default' };
  }
  
  if (readiness.blockers.length > 0) {
    return { label: `${readiness.blockers.length} Blocker(s)`, variant: 'destructive' };
  }
  
  if (readiness.warnings.length > 0) {
    return { label: `${readiness.warnings.length} Warning(s)`, variant: 'secondary' };
  }
  
  return { label: 'In Progress', variant: 'outline' };
}
