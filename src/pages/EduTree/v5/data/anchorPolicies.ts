/**
 * Hardcoded anchor policy packs for major institutions
 * These define transfer limits, residency requirements, and other program constraints
 * 
 * Later: migrate to database table for dynamic management
 */

export type AnchorKey = 'TESU' | 'WGU' | 'UMGC';

export interface AnchorPolicy {
  partner_name: string;
  max_alt_credits: number;
  min_residency_credits: number;
  upper_division_min: number;
  notes?: string;
}

export const ANCHOR_POLICIES: Record<AnchorKey, AnchorPolicy> = {
  TESU: {
    partner_name: 'Thomas Edison State University',
    max_alt_credits: 113,
    min_residency_credits: 30,
    upper_division_min: 18,
    notes: 'Highly transfer-friendly, accepts ACE/NCCRS. Flat-rate tuition per term.',
  },
  WGU: {
    partner_name: 'Western Governors University',
    max_alt_credits: 78,
    min_residency_credits: 42,
    upper_division_min: 0,
    notes: 'Competency-based, subscription model ($3,985/6mo term). Self-paced acceleration possible.',
  },
  UMGC: {
    partner_name: 'University of Maryland Global Campus',
    max_alt_credits: 90,
    min_residency_credits: 30,
    upper_division_min: 15,
    notes: 'Military-friendly, standard semester system. Per-credit tuition.',
  },
};

/**
 * Get anchor policy by school code, with type safety
 */
export function getAnchorPolicy(anchorSchool: string): AnchorPolicy | undefined {
  return ANCHOR_POLICIES[anchorSchool as AnchorKey];
}
