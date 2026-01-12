/**
 * Evidence Decay Calculation for Transfer Credit Verification
 * 
 * Transfer evidence degrades over time as:
 * - Catalog years change
 * - Policies evolve
 * - Institutional agreements expire
 * 
 * This module calculates time-decayed confidence scores.
 */

import { differenceInMonths, differenceInYears } from 'date-fns';

/**
 * Decay configuration by evidence type
 * Higher-quality evidence decays slower
 */
export const EVIDENCE_DECAY_CONFIG: Record<string, {
  decayStartMonths: number;  // When decay begins
  decayRatePerYear: number;  // % lost per year after start
  minimumConfidence: number; // Floor (never goes below)
}> = {
  // Tier 1: Graduation-confirmed (slowest decay)
  graduation_confirmed: {
    decayStartMonths: 48,    // 4 years before decay
    decayRatePerYear: 0.05,  // 5% per year
    minimumConfidence: 0.70, // Strong floor
  },
  
  // Tier 2: Policy-verified (moderate decay)
  equivalency_table: {
    decayStartMonths: 24,
    decayRatePerYear: 0.10,
    minimumConfidence: 0.50,
  },
  policy_provider_acceptance: {
    decayStartMonths: 24,
    decayRatePerYear: 0.10,
    minimumConfidence: 0.50,
  },
  catalog_statement: {
    decayStartMonths: 12,    // Catalog-specific = faster decay
    decayRatePerYear: 0.15,
    minimumConfidence: 0.40,
  },
  
  // Tier 3: Transcript acceptance
  transcript_accepted: {
    decayStartMonths: 24,
    decayRatePerYear: 0.10,
    minimumConfidence: 0.50,
  },
  
  // Tier 4: Advisor pre-approval (context-specific, faster decay)
  advisor_preapproval: {
    decayStartMonths: 12,
    decayRatePerYear: 0.20,
    minimumConfidence: 0.30,
  },
  
  // Tier 5: Crowd signals (faster decay, needs fresh confirmation)
  crowd_verified: {
    decayStartMonths: 18,
    decayRatePerYear: 0.15,
    minimumConfidence: 0.40,
  },
  crowd_single: {
    decayStartMonths: 12,
    decayRatePerYear: 0.25,
    minimumConfidence: 0.20,
  },
  
  // Default for unknown types
  default: {
    decayStartMonths: 24,
    decayRatePerYear: 0.10,
    minimumConfidence: 0.50,
  },
};

/**
 * Calculate decayed confidence based on evidence age
 * 
 * @param baseConfidence - Original confidence score (0-1)
 * @param lastConfirmedAt - When evidence was last confirmed
 * @param evidenceType - Type of evidence (affects decay rate)
 * @param customDecayMonths - Override default decay start
 */
export function calculateDecayedConfidence(
  baseConfidence: number,
  lastConfirmedAt: Date | string | null,
  evidenceType?: string,
  customDecayMonths?: number
): number {
  // No date = no decay calculation possible
  if (!lastConfirmedAt) return baseConfidence;
  
  const confirmedDate = typeof lastConfirmedAt === 'string' 
    ? new Date(lastConfirmedAt) 
    : lastConfirmedAt;
  
  // Invalid date
  if (isNaN(confirmedDate.getTime())) return baseConfidence;
  
  // Get decay config for this evidence type
  const config = EVIDENCE_DECAY_CONFIG[evidenceType || 'default'] 
    || EVIDENCE_DECAY_CONFIG.default;
  
  const decayStartMonths = customDecayMonths ?? config.decayStartMonths;
  
  // Calculate months since confirmation
  const monthsAgo = differenceInMonths(new Date(), confirmedDate);
  
  // No decay yet
  if (monthsAgo <= decayStartMonths) {
    return baseConfidence;
  }
  
  // Calculate decay
  const monthsOverThreshold = monthsAgo - decayStartMonths;
  const yearsOverThreshold = monthsOverThreshold / 12;
  const decayFactor = 1 - (yearsOverThreshold * config.decayRatePerYear);
  
  // Apply decay with floor
  const decayedConfidence = baseConfidence * Math.max(decayFactor, 0);
  
  return Math.max(decayedConfidence, config.minimumConfidence);
}

/**
 * Check if evidence is stale and needs re-verification
 */
export function isEvidenceStale(
  lastConfirmedAt: Date | string | null,
  evidenceType?: string,
  thresholdMonths?: number
): boolean {
  if (!lastConfirmedAt) return true;
  
  const confirmedDate = typeof lastConfirmedAt === 'string' 
    ? new Date(lastConfirmedAt) 
    : lastConfirmedAt;
  
  if (isNaN(confirmedDate.getTime())) return true;
  
  const config = EVIDENCE_DECAY_CONFIG[evidenceType || 'default'] 
    || EVIDENCE_DECAY_CONFIG.default;
  
  const staleThreshold = thresholdMonths ?? config.decayStartMonths;
  const monthsAgo = differenceInMonths(new Date(), confirmedDate);
  
  return monthsAgo > staleThreshold;
}

/**
 * Get human-readable freshness label
 */
export function getEvidenceFreshnessLabel(
  lastConfirmedAt: Date | string | null,
  evidenceType?: string
): { label: string; color: 'green' | 'yellow' | 'orange' | 'red' } {
  if (!lastConfirmedAt) {
    return { label: 'Never verified', color: 'red' };
  }
  
  const confirmedDate = typeof lastConfirmedAt === 'string' 
    ? new Date(lastConfirmedAt) 
    : lastConfirmedAt;
  
  if (isNaN(confirmedDate.getTime())) {
    return { label: 'Unknown', color: 'red' };
  }
  
  const config = EVIDENCE_DECAY_CONFIG[evidenceType || 'default'] 
    || EVIDENCE_DECAY_CONFIG.default;
  
  const monthsAgo = differenceInMonths(new Date(), confirmedDate);
  const yearsAgo = differenceInYears(new Date(), confirmedDate);
  
  if (monthsAgo <= 6) {
    return { label: 'Recently verified', color: 'green' };
  }
  
  if (monthsAgo <= config.decayStartMonths) {
    return { 
      label: yearsAgo > 0 ? `Verified ${yearsAgo}y ago` : `Verified ${monthsAgo}mo ago`, 
      color: 'green' 
    };
  }
  
  if (monthsAgo <= config.decayStartMonths * 1.5) {
    return { 
      label: `Aging (${yearsAgo > 0 ? `${yearsAgo}y` : `${monthsAgo}mo`} old)`, 
      color: 'yellow' 
    };
  }
  
  if (monthsAgo <= config.decayStartMonths * 2) {
    return { 
      label: `Stale (${yearsAgo}y old)`, 
      color: 'orange' 
    };
  }
  
  return { 
    label: `Outdated (${yearsAgo}y+ old)`, 
    color: 'red' 
  };
}

/**
 * Calculate catalog year relevance
 * Current catalog year has full weight, older years decay
 */
export function calculateCatalogYearRelevance(
  catalogYear: string | null,
  currentCatalogYear?: string
): number {
  if (!catalogYear) return 0.7; // Unknown = moderate penalty
  
  // Parse years like "2024-2025" or "2024"
  const parseYear = (year: string): number => {
    const match = year.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
  };
  
  const evidenceYear = parseYear(catalogYear);
  const currentYear = currentCatalogYear 
    ? parseYear(currentCatalogYear) 
    : new Date().getFullYear();
  
  const yearsDiff = currentYear - evidenceYear;
  
  if (yearsDiff <= 0) return 1.0;      // Current or future
  if (yearsDiff === 1) return 0.95;    // Last year
  if (yearsDiff === 2) return 0.85;    // 2 years ago
  if (yearsDiff <= 4) return 0.70;     // 3-4 years
  
  return 0.50; // 5+ years old
}
