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
}
const REQUIRED_CREDITS = 120;

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
export function validateGraduationReadiness(
  basket: BasketItem[],
  policy: PartnerPolicy
): GraduationReadiness {
  const totals = calculateBasketTotals(basket);
  
  // 1. Total Credits Check
  const totalShortfall = Math.max(0, REQUIRED_CREDITS - totals.totalCredits);
  const totalCredits: GraduationRequirement = {
    name: 'Total Credits',
    earned: totals.totalCredits,
    required: REQUIRED_CREDITS,
    met: totals.totalCredits >= REQUIRED_CREDITS,
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
    const msg = `Need ${totalCredits.shortfall} more credits to reach ${REQUIRED_CREDITS} total`;
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
    (totals.totalCredits / REQUIRED_CREDITS) * 100
  ));

  return {
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
