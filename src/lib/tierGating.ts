/**
 * Tier Gating Utilities
 * 
 * Deterministic checks for feature access based on user's subscription tier.
 * These functions work with the tier data returned from quota-check.
 */

import type { PlanTier } from '@/types/subscriptionTiers';
import { TIER_CONFIGS, getTierConfig, tierHasFeature } from '@/types/subscriptionTiers';
import type { TrustFinding } from '@/pages/EduTree/v5/engine/trustStatusDashboard';

// ============================================================================
// Feature Access Checks
// ============================================================================

/**
 * Check if the user can access the comparison feature
 */
export function canAccessComparison(tier: PlanTier): boolean {
  return tierHasFeature(tier, 'canCompare');
}

/**
 * Check if the user can access multi-school optimizer
 */
export function canAccessOptimizer(tier: PlanTier): boolean {
  return tierHasFeature(tier, 'canOptimizeMulti');
}

/**
 * Check if the user can export plans
 */
export function canAccessExport(tier: PlanTier): boolean {
  return tierHasFeature(tier, 'canExport');
}

/**
 * Get the maximum number of anchors for a tier
 */
export function getMaxAnchors(tier: PlanTier): number {
  return getTierConfig(tier).limits.maxAnchors;
}

/**
 * Check if the tier requires trust tier A/B for comparisons
 */
export function shouldFilterByTrustTier(tier: PlanTier): boolean {
  return getTierConfig(tier).requiresTrustTierAB;
}

// ============================================================================
// Trust Tier Filtering
// ============================================================================

export type TrustTier = 'A' | 'B' | 'C';

/**
 * Filter institutions by trust tier based on user's plan tier.
 * Multi-compare and multi-optimizer users only see Tier A/B.
 */
export function filterByTrustTier<T extends { trustTier: TrustTier }>(
  items: T[],
  userTier: PlanTier
): T[] {
  if (!shouldFilterByTrustTier(userTier)) {
    return items;
  }
  
  // Only allow Tier A and B for tiers that require trust filtering
  return items.filter(item => item.trustTier === 'A' || item.trustTier === 'B');
}

/**
 * Check if an institution with a given trust tier is accessible to the user
 */
export function isTrustTierAccessible(trustTier: TrustTier, userTier: PlanTier): boolean {
  if (!shouldFilterByTrustTier(userTier)) {
    return true;
  }
  return trustTier === 'A' || trustTier === 'B';
}

// ============================================================================
// Gating Results
// ============================================================================

export interface GateCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: PlanTier;
  upgradeMessage?: string;
}

/**
 * Check if user can access a gated feature with detailed result
 */
export function checkFeatureGate(
  currentTier: PlanTier,
  requiredFeature: 'compare' | 'optimizer' | 'export',
  context?: { trustTier?: TrustTier; anchorCount?: number }
): GateCheckResult {
  const config = getTierConfig(currentTier);
  
  // Check feature access
  const featureMap = {
    compare: config.features.canCompare,
    optimizer: config.features.canOptimizeMulti,
    export: config.features.canExport,
  };
  
  if (!featureMap[requiredFeature]) {
    const upgradeMap: Record<typeof requiredFeature, PlanTier> = {
      compare: 'multi_compare',
      optimizer: 'multi_optimizer',
      export: 'single_school',
    };
    
    return {
      allowed: false,
      reason: `Your current plan doesn't include ${requiredFeature} access.`,
      upgradeRequired: upgradeMap[requiredFeature],
      upgradeMessage: getUpgradeMessage(requiredFeature),
    };
  }
  
  // Check trust tier if applicable
  if (context?.trustTier && config.requiresTrustTierAB) {
    if (context.trustTier === 'C') {
      return {
        allowed: false,
        reason: 'This institution has incomplete verification (Tier C).',
        upgradeMessage: 'Only institutions with verified policies (Tier A/B) can be used in comparisons.',
      };
    }
  }
  
  // Check anchor count
  if (context?.anchorCount !== undefined && config.limits.maxAnchors !== -1) {
    if (context.anchorCount >= config.limits.maxAnchors) {
      return {
        allowed: false,
        reason: `You've reached the maximum of ${config.limits.maxAnchors} anchor school(s) for your plan.`,
        upgradeRequired: 'multi_compare',
        upgradeMessage: 'Upgrade to compare more institutions.',
      };
    }
  }
  
  return { allowed: true };
}

function getUpgradeMessage(feature: 'compare' | 'optimizer' | 'export'): string {
  switch (feature) {
    case 'compare':
      return 'Upgrade to Multi-School Compare to compare degree paths across institutions.';
    case 'optimizer':
      return 'Upgrade to Multi-School Optimizer for full optimization across all verified institutions.';
    case 'export':
      return 'Upgrade to Single School or higher to export your degree plans.';
  }
}

// ============================================================================
// Recommendation Gating
// ============================================================================

/**
 * Determine if we can show a "Recommended Best School" or just "Options"
 * Only show recommendation if ALL compared packs are Tier A
 */
export function canShowRecommendation(trustTiers: TrustTier[]): boolean {
  return trustTiers.length > 0 && trustTiers.every(tier => tier === 'A');
}

/**
 * Get the recommendation disclaimer based on trust tiers
 */
export function getRecommendationDisclaimer(trustTiers: TrustTier[]): string {
  if (canShowRecommendation(trustTiers)) {
    return 'Recommendation based on fully verified institutional policies.';
  }
  
  const hasTierB = trustTiers.some(t => t === 'B');
  const hasTierC = trustTiers.some(t => t === 'C');
  
  if (hasTierC) {
    return 'Some institutions have incomplete verification. Results shown as options only.';
  }
  
  if (hasTierB) {
    return 'Comparison based on pack-level verification. Verify with official sources.';
  }
  
  return 'Results shown for informational purposes only.';
}
