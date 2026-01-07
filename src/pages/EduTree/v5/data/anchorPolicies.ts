/**
 * Hardcoded anchor policy packs for major institutions
 * These define transfer limits, residency requirements, and other program constraints
 * 
 * Later: migrate to database table for dynamic management
 */

export type AnchorKey = 'TESU' | 'WGU' | 'UMGC' | 'COSC';

export interface AnchorPolicy {
  partner_name: string;
  max_alt_credits: number;
  min_residency_credits: number;
  upper_division_min: number;
  notes?: string;
}

/**
 * IMPORTANT: These values MUST match database `partner_policies` table
 * Last synced: 2025-01 from partner_policies table
 * 
 * Database source of truth:
 * - TESU: max_alt=80, min_residency=15, upper_div=30
 * - WGU: max_alt=78, min_residency=42, upper_div=0 (competency-based)
 * - UMGC: max_alt=90, min_residency=30, upper_div=15
 * - COSC: max_alt=90, min_residency=30, upper_div=15
 */
export const ANCHOR_POLICIES: Record<AnchorKey, AnchorPolicy> = {
  TESU: {
    partner_name: 'Thomas Edison State University',
    max_alt_credits: 80,        // Was 113, synced to DB
    min_residency_credits: 15,  // Was 30, synced to DB  
    upper_division_min: 30,     // Was 18, synced to DB
    notes: 'Highly transfer-friendly, accepts ACE/NCCRS. Flat-rate tuition per term.',
  },
  COSC: {
    partner_name: 'Charter Oak State College',
    max_alt_credits: 90,
    min_residency_credits: 30,
    upper_division_min: 15,
    notes: 'Connecticut state college with flexible transfer policies and competency-based options.',
  },
  WGU: {
    partner_name: 'Western Governors University',
    max_alt_credits: 78,
    min_residency_credits: 42,
    upper_division_min: 0,      // Competency-based, no strict upper-div requirement
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
