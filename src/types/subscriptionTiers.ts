/**
 * Subscription Tiers for Degree Marketplace
 * 
 * Tier model aligned with Truth & Trust philosophy:
 * - Single-school: Lower operational cost, one anchor, high trust
 * - Multi-compare: Decision-grade comparisons, requires Tier A/B packs
 * - Multi-optimizer: Full optimization, gated to verified schools
 */

// ============================================================================
// Core Types
// ============================================================================

export type PlanTier = 'free' | 'single_school' | 'multi_compare' | 'multi_optimizer';

export interface TierFeatures {
  /** Whether user can compare multiple institutions */
  canCompare: boolean;
  /** Whether user can run multi-school optimization */
  canOptimizeMulti: boolean;
  /** Whether user can export plans/scenarios */
  canExport: boolean;
  /** Whether user gets priority support */
  hasPrioritySupport: boolean;
}

export interface TierLimits {
  /** Maximum number of anchor schools (-1 = unlimited) */
  maxAnchors: number;
  /** Maximum analyses per month */
  maxAnalysesPerMonth: number;
  /** Maximum saved scenarios */
  maxSavedScenarios: number;
}

export interface TierConfig {
  /** Display name for the tier */
  displayName: string;
  /** Short description */
  description: string;
  /** Feature flags */
  features: TierFeatures;
  /** Usage limits */
  limits: TierLimits;
  /** Whether comparisons require Tier A/B trust packs only */
  requiresTrustTierAB: boolean;
}

// ============================================================================
// Tier Configuration Constants
// ============================================================================

export const TIER_CONFIGS: Record<PlanTier, TierConfig> = {
  free: {
    displayName: 'Free',
    description: 'Explore degree paths with basic features',
    features: {
      canCompare: false,
      canOptimizeMulti: false,
      canExport: false,
      hasPrioritySupport: false,
    },
    limits: {
      maxAnchors: 1,
      maxAnalysesPerMonth: 5,
      maxSavedScenarios: 1,
    },
    requiresTrustTierAB: false,
  },
  
  single_school: {
    displayName: 'Single School',
    description: 'Full features for one graduation institution',
    features: {
      canCompare: false,
      canOptimizeMulti: false,
      canExport: true,
      hasPrioritySupport: false,
    },
    limits: {
      maxAnchors: 1,
      maxAnalysesPerMonth: 20,
      maxSavedScenarios: 5,
    },
    requiresTrustTierAB: false,
  },
  
  multi_compare: {
    displayName: 'Multi-School Compare',
    description: 'Compare degree paths across multiple institutions',
    features: {
      canCompare: true,
      canOptimizeMulti: false,
      canExport: true,
      hasPrioritySupport: false,
    },
    limits: {
      maxAnchors: 5,
      maxAnalysesPerMonth: 50,
      maxSavedScenarios: 10,
    },
    // Only show Tier A/B institutions in comparisons
    requiresTrustTierAB: true,
  },
  
  multi_optimizer: {
    displayName: 'Multi-School Optimizer',
    description: 'Full optimization across all verified institutions',
    features: {
      canCompare: true,
      canOptimizeMulti: true,
      canExport: true,
      hasPrioritySupport: true,
    },
    limits: {
      maxAnchors: -1, // Unlimited verified anchors
      maxAnalysesPerMonth: 100,
      maxSavedScenarios: 25,
    },
    // All comparisons/optimizations gated to verified packs
    requiresTrustTierAB: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the configuration for a given tier
 */
export function getTierConfig(tier: PlanTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Check if a tier has access to a specific feature
 */
export function tierHasFeature(tier: PlanTier, feature: keyof TierFeatures): boolean {
  return TIER_CONFIGS[tier].features[feature];
}

/**
 * Get the display name for a tier
 */
export function getTierDisplayName(tier: PlanTier): string {
  return TIER_CONFIGS[tier].displayName;
}

/**
 * Check if upgrading from one tier to another is valid
 */
export function isValidUpgrade(fromTier: PlanTier, toTier: PlanTier): boolean {
  const tierOrder: PlanTier[] = ['free', 'single_school', 'multi_compare', 'multi_optimizer'];
  return tierOrder.indexOf(toTier) > tierOrder.indexOf(fromTier);
}

/**
 * Get the next tier for upgrade (if any)
 */
export function getNextTier(currentTier: PlanTier): PlanTier | null {
  const tierOrder: PlanTier[] = ['free', 'single_school', 'multi_compare', 'multi_optimizer'];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1];
  }
  return null;
}
