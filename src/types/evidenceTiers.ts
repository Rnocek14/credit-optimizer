/**
 * Evidence Tiers for Transfer Credit Verification
 * 
 * Tier A = Rule with evidence + policy pack verified for caps/residency + high confidence
 * Tier B = Rule exists but no evidence OR policy not verified
 * Tier C = No rule found
 * 
 * CRITICAL: Tier A REQUIRES policy verification. A course can be "verified" 
 * and still fail because you hit residency/alt-cap/RA-minimum constraints.
 */

export type EvidenceTier = 'A' | 'B' | 'C';

/**
 * Classification result for a single transfer rule
 */
export interface TransferEvidenceClassification {
  tier: EvidenceTier;
  hasRuleMatch: boolean;
  hasEvidenceUrl: boolean;
  hasPolicyVerification: boolean;
  confidence: number; // 0-1
  ruleSource?: string;
  evidenceUrl?: string;
}

/**
 * Breakdown of courses by evidence tier
 */
export interface EvidenceTierBreakdown {
  tierA: { 
    credits: number; 
    costUsd: number; 
    courses: string[];
    count: number;
  };
  tierB: { 
    credits: number; 
    costUsd: number; 
    courses: string[];
    count: number;
  };
  tierC: { 
    credits: number; 
    costUsd: number; 
    courses: string[];
    count: number;
  };
}

/**
 * Tiered savings calculation result
 * 
 * TRUST RULES:
 * - guaranteedSavings: Only Tier A courses count as "locked in"
 * - possibleSavings: Tier A + B (shown as upside, not promise)
 * - maximumSavings: All courses (current calculation - for reference only)
 */
export interface TieredSavings {
  // Savings amounts
  guaranteedSavings: number;    // Tier A only - what we can prove
  possibleSavings: number;      // Tier A + B - likely but unverified
  maximumSavings: number;       // Tier A + B + C (current calculation)
  
  // Percentages
  guaranteedPercent: number;
  possiblePercent: number;
  maximumPercent: number;
  
  // Breakdown by tier
  breakdown: EvidenceTierBreakdown;
  
  // Total courses analyzed
  totalCourses: number;
  verifiedCourses: number;      // Tier A count
  
  // Policy verification status (CRITICAL for Tier A)
  policyVerified: boolean;
  policyConfidence: number;     // 0-100
  policyEvidenceUrl?: string;
  
  // Provenance
  anchorSchool: string;
  baselineCost: number;
  optimizedCost: number;
}

/**
 * Minimum thresholds for displaying tiered savings
 */
export const TIERED_SAVINGS_THRESHOLDS = {
  /** Minimum Tier A % to show "Verified" savings prominently */
  MIN_TIER_A_PERCENT_FOR_VERIFIED_LABEL: 20,
  
  /** Minimum dollar savings for any savings display */
  MIN_SAVINGS_AMOUNT: 500,
  
  /** Policy confidence threshold for Tier A eligibility */
  MIN_POLICY_CONFIDENCE_FOR_TIER_A: 85,
  
  /** Rule confidence threshold for Tier A eligibility */
  MIN_RULE_CONFIDENCE_FOR_TIER_A: 0.9,
} as const;

/**
 * Get human-readable tier label
 */
export function getTierLabel(tier: EvidenceTier): string {
  switch (tier) {
    case 'A': return 'Verified';
    case 'B': return 'Likely';
    case 'C': return 'Unverified';
  }
}

/**
 * Get tier badge styling
 */
export function getTierBadgeClasses(tier: EvidenceTier): string {
  switch (tier) {
    case 'A': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200';
    case 'B': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
    case 'C': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}
