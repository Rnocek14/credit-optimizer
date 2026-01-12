/**
 * Tiered Savings Calculator
 * 
 * Calculates savings using evidence tiers to avoid "fake 80%" claims.
 * 
 * TRUST RULES:
 * 1. Tier A = rule with evidence + policy verified + high confidence
 * 2. If policy caps are unknown, everything stays Tier B even with evidence
 * 3. Guaranteed savings = only what we can prove
 * 4. Possible savings = what's likely but not verified
 */

import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import type { VerifiedPolicy } from '@/lib/degree/verifiedPolicyService';
import type { 
  EvidenceTier, 
  EvidenceTierBreakdown, 
  TieredSavings,
  TransferEvidenceClassification 
} from '@/types/evidenceTiers';
import { TIERED_SAVINGS_THRESHOLDS } from '@/types/evidenceTiers';

// Re-export for convenience
export { TIERED_SAVINGS_THRESHOLDS } from '@/types/evidenceTiers';

/**
 * Extended transfer verification result with tier info
 */
export interface TieredTransferResult {
  courseCode: string;
  providerCode: string;
  status: 'verified' | 'elective' | 'review' | 'unknown';
  tier: EvidenceTier;
  confidence: number | null;
  evidenceUrl: string | null;
  ruleSource: string | null;
  credits: number;
  costUsd: number;
}

/**
 * Classify a transfer rule into an evidence tier
 * 
 * CRITICAL: Tier A REQUIRES policy verification
 */
export function classifyTier(
  hasRule: boolean,
  rule: { evidence_url?: string | null; confidence?: number | null; rule_source?: string | null } | null,
  policy: VerifiedPolicy | null
): EvidenceTier {
  // No rule = Tier C (unverified)
  if (!hasRule || !rule) return 'C';
  
  // Policy must be verified with high confidence for Tier A
  const policyOk = !!policy?.verified && policy.confidence >= TIERED_SAVINGS_THRESHOLDS.MIN_POLICY_CONFIDENCE_FOR_TIER_A;
  
  // Rule must have evidence URL and high confidence for Tier A
  const hasEvidence = !!rule.evidence_url && rule.evidence_url.startsWith('http');
  const highConfidence = (rule.confidence ?? 0) >= TIERED_SAVINGS_THRESHOLDS.MIN_RULE_CONFIDENCE_FOR_TIER_A;
  
  // Tier A: All three conditions met
  if (policyOk && hasEvidence && highConfidence) return 'A';
  
  // Tier B: Has rule but missing evidence or policy verification
  return 'B';
}

/**
 * Compute evidence tier breakdown from transfer results
 */
export function computeTierBreakdown(
  results: TieredTransferResult[]
): EvidenceTierBreakdown {
  const breakdown: EvidenceTierBreakdown = {
    tierA: { credits: 0, costUsd: 0, courses: [], count: 0 },
    tierB: { credits: 0, costUsd: 0, courses: [], count: 0 },
    tierC: { credits: 0, costUsd: 0, courses: [], count: 0 },
  };
  
  for (const result of results) {
    const tierKey = `tier${result.tier}` as keyof EvidenceTierBreakdown;
    const tier = breakdown[tierKey];
    
    tier.credits += result.credits;
    tier.costUsd += result.costUsd;
    tier.courses.push(result.courseCode);
    tier.count++;
  }
  
  return breakdown;
}

/**
 * Calculate tiered savings for a marketplace template
 * 
 * Returns null if:
 * - No baseline exists
 * - Baseline cost is invalid
 * - No savings (multi-school costs more)
 */
export function calculateTieredSavings(
  template: MarketplaceDegreeTemplate,
  tieredResults: TieredTransferResult[],
  policy: VerifiedPolicy | null
): TieredSavings | null {
  const baseline = template.singleSchoolBaseline;
  
  // Guard: no baseline or invalid baseline
  if (!baseline || baseline.costUsd <= 0) return null;
  
  const breakdown = computeTierBreakdown(tieredResults);
  
  // Calculate what each tier saves compared to if those courses were at anchor school
  // Tier A savings = proven transfers that definitely work
  // Tier B savings = likely transfers that need verification
  // Tier C = courses with no rules (might transfer, might not)
  
  const tierASavings = breakdown.tierA.costUsd > 0 
    ? calculateTierSavings(breakdown.tierA.credits, baseline, template)
    : 0;
    
  const tierBSavings = breakdown.tierB.costUsd > 0
    ? calculateTierSavings(breakdown.tierB.credits, baseline, template)
    : 0;
    
  const tierCSavings = breakdown.tierC.costUsd > 0
    ? calculateTierSavings(breakdown.tierC.credits, baseline, template)
    : 0;
  
  // Total savings from template (current calculation)
  const totalSavings = baseline.costUsd - template.totals.costUsd;
  
  // Guard: no savings
  if (totalSavings <= 0) return null;
  
  // Conservative approach: guaranteed = only what Tier A proves
  // The actual savings calculation should be based on transfer vs anchor cost
  const guaranteedSavings = Math.min(tierASavings, totalSavings);
  const possibleSavings = Math.min(tierASavings + tierBSavings, totalSavings);
  
  const guaranteedPercent = Math.round((guaranteedSavings / baseline.costUsd) * 100);
  const possiblePercent = Math.round((possibleSavings / baseline.costUsd) * 100);
  const maximumPercent = Math.round((totalSavings / baseline.costUsd) * 100);
  
  const totalCourses = breakdown.tierA.count + breakdown.tierB.count + breakdown.tierC.count;
  
  return {
    guaranteedSavings,
    possibleSavings,
    maximumSavings: totalSavings,
    
    guaranteedPercent,
    possiblePercent,
    maximumPercent,
    
    breakdown,
    
    totalCourses,
    verifiedCourses: breakdown.tierA.count,
    
    policyVerified: policy?.verified ?? false,
    policyConfidence: policy?.confidence ?? 0,
    policyEvidenceUrl: policy?.evidenceUrl,
    
    anchorSchool: template.anchorSchool,
    baselineCost: baseline.costUsd,
    optimizedCost: template.totals.costUsd,
  };
}

/**
 * Calculate savings for credits in a tier
 * 
 * This estimates how much was saved by taking these credits externally
 * vs. taking them at the anchor school.
 */
function calculateTierSavings(
  credits: number,
  baseline: NonNullable<MarketplaceDegreeTemplate['singleSchoolBaseline']>,
  template: MarketplaceDegreeTemplate
): number {
  if (credits <= 0 || baseline.costUsd <= 0) return 0;
  
  // Calculate per-credit cost at anchor school
  const baselineCredits = template.totals.credits || 120;
  const perCreditCost = baseline.costUsd / baselineCredits;
  
  // Estimate what these credits would have cost at anchor
  const anchorCost = credits * perCreditCost;
  
  // The actual cost of these credits in the multi-school plan is already
  // reflected in the template.totals.costUsd, so the savings is approximately
  // the anchor cost for these credits minus their actual cost
  // For simplicity, we use a ratio based on overall savings
  const savingsRatio = (baseline.costUsd - template.totals.costUsd) / baseline.costUsd;
  
  return Math.round(anchorCost * savingsRatio);
}

/**
 * Format tiered savings for display
 */
export function formatTieredSavings(savings: TieredSavings): {
  verified: string;
  possible: string;
  maximum: string;
} {
  const format = (amount: number): string => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };
  
  return {
    verified: format(savings.guaranteedSavings),
    possible: format(savings.possibleSavings),
    maximum: format(savings.maximumSavings),
  };
}

/**
 * Determine if savings should be displayed
 */
export function shouldShowSavings(savings: TieredSavings | null): boolean {
  if (!savings) return false;
  return savings.maximumSavings >= TIERED_SAVINGS_THRESHOLDS.MIN_SAVINGS_AMOUNT;
}

/**
 * Determine if "Verified Savings" label should be shown
 */
export function shouldShowVerifiedLabel(savings: TieredSavings): boolean {
  const tierAPercent = (savings.breakdown.tierA.count / savings.totalCourses) * 100;
  return savings.policyVerified && tierAPercent >= TIERED_SAVINGS_THRESHOLDS.MIN_TIER_A_PERCENT_FOR_VERIFIED_LABEL;
}
