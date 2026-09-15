/**
 * Committed policy ground truth.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Institution policy numbers live in two places that drifted apart silently:
 *
 *   1. `institutionPolicies.ts` — TypeScript constants the app actually
 *      computes with.
 *   2. `institution_policy_ground_truth` — rows seeded by migration, which the
 *      policy-pack activation trigger treats as authoritative.
 *
 * The 2026-09-15 audit found them contradicting each other with nothing
 * detecting it: COSC was 90 transfer / 30 residency in code against 114 / 6 in
 * ground truth, and WGU's alt-credit cap read 78 in code against
 * `max_ace_nccrs_credits = 45` in ground truth — a 33-credit overstatement on
 * the single number that decides how much Sophia a student buys.
 *
 * This module transcribes the committed migration rows so the divergence is
 * checkable. `policyGroundTruthReconciliation.test.ts` fails the build if the
 * two sources disagree, which turns a silent contradiction into a deliberate
 * decision someone has to make.
 *
 * PROVENANCE IS NOT UNIFORM — read `provenance` before trusting a number.
 * A row marked 'seeded' is a placeholder someone inserted to get a pipeline
 * moving, not a fact about the institution. Matching a wrong number is not an
 * improvement over diverging from it.
 *
 * SOURCE OF TRUTH: the migrations cited per entry. If a migration changes,
 * change this file in the same commit — the test is what will tell you.
 */

/** How much weight a ground-truth row actually carries. */
export type GroundTruthProvenance =
  /** A human read the institution's own catalog/policy page. Trust this. */
  | 'manual_verification'
  /** AI-extracted, then human-reviewed. Reasonable, worth re-checking. */
  | 'human_review_from_ai_extraction'
  /** Inserted to unblock a pipeline. NOT a verified fact. */
  | 'seeded';

export interface PolicyGroundTruth {
  institution: string;
  academicYear: string;
  /** Minimum credits that must be earned at the institution. */
  residencyCredits: number;
  /** Ceiling on total credits transferable in. */
  maxTransferCredits: number;
  /** Ceiling on ACE/NCCRS (alt-credit) specifically. Null when not recorded. */
  maxAceNccrsCredits: number | null;
  totalCreditsBachelor: number | null;
  provenance: GroundTruthProvenance;
  sourceUrl: string;
  /** Migration file that inserted this row. */
  migration: string;
  notes?: string;
}

export const POLICY_GROUND_TRUTH: Record<string, PolicyGroundTruth> = {
  TESU: {
    institution: 'TESU',
    academicYear: '2024-2025',
    residencyCredits: 15,
    maxTransferCredits: 117,
    maxAceNccrsCredits: 90,
    totalCreditsBachelor: null, // not recorded in this row
    provenance: 'manual_verification',
    sourceUrl: 'https://tesu.smartcatalogiq.com/current/undergraduate-catalog',
    migration: '20260109033526',
    notes:
      '117 max transfer from a 4-year; 90 max from a 2-year or ACE/NCCRS; 15 credits residency.',
  },

  COSC: {
    institution: 'COSC',
    academicYear: '2024-2025',
    residencyCredits: 6,
    maxTransferCredits: 114,
    maxAceNccrsCredits: null,
    totalCreditsBachelor: 120,
    provenance: 'manual_verification',
    sourceUrl:
      'https://www.charteroak.edu/catalog/current/degree-requirements/undergraduate-academic-policies/',
    migration: '20260109044935',
    notes:
      'Residency is 6 because Cornerstone (3cr) and Capstone (3cr) cannot be transferred; ' +
      'max transfer is computed as total_credits_required - residency_credits = 120 - 6.',
  },

  SNHU: {
    institution: 'SNHU',
    academicYear: '2024-2025',
    residencyCredits: 30,
    maxTransferCredits: 90,
    maxAceNccrsCredits: null,
    totalCreditsBachelor: 120,
    provenance: 'human_review_from_ai_extraction',
    sourceUrl: 'https://www.snhu.edu/admission/transferring-credits',
    migration: '20260109210411',
  },

  WGU: {
    institution: 'WGU',
    academicYear: '2025',
    residencyCredits: 24,
    maxTransferCredits: 90,
    maxAceNccrsCredits: 45,
    totalCreditsBachelor: 120,
    // The ground-truth row itself is verified_by='system' ("Seeded for Phase A
    // activation"), BUT the WGU policy pack inserted by the same migration
    // carries field_provenance source='human_override' with the WGU transfer
    // page as source_url for residency_credits=24 and max_transfer_credits=90,
    // and policy_data.max_alt_credit=45. Two records agree; the TypeScript
    // constants (42/78/78) cite only a generic landing page and sit under a
    // file header reading "PENDING canonical verification".
    provenance: 'seeded',
    sourceUrl: 'https://www.wgu.edu/admissions/transferring-credits.html',
    migration: '20260111183654',
    notes:
      'Pack field_provenance marks residency + max_transfer as human_override. ' +
      'Still worth re-verifying against the live WGU catalog before relying on it.',
  },

  EMPIRE: {
    institution: 'EMPIRE',
    academicYear: '2025',
    residencyCredits: 12,
    maxTransferCredits: 96,
    maxAceNccrsCredits: 64,
    totalCreditsBachelor: 120,
    provenance: 'seeded',
    sourceUrl: 'https://www.suny.edu/empire/',
    migration: '20260111183654',
  },

  EXCELSIOR: {
    institution: 'EXCELSIOR',
    academicYear: '2025',
    residencyCredits: 9,
    maxTransferCredits: 108,
    maxAceNccrsCredits: 81,
    totalCreditsBachelor: 120,
    provenance: 'seeded',
    sourceUrl: 'https://www.excelsior.edu/admissions/transfer-credit/',
    migration: '20260111183654',
  },
};

/**
 * Institutions in `institutionPolicies.ts` with NO ground-truth row at all.
 *
 * Their constants are unreconcilable by construction — nothing in the database
 * corroborates them. They must not be presented to users as verified.
 */
export const INSTITUTIONS_WITHOUT_GROUND_TRUTH: readonly string[] = ['UMGC'];

export function getGroundTruth(code: string): PolicyGroundTruth | undefined {
  return POLICY_GROUND_TRUTH[code.toUpperCase()];
}

/** True when a ground-truth row was established by a human reading a catalog. */
export function isHumanVerified(gt: PolicyGroundTruth): boolean {
  return (
    gt.provenance === 'manual_verification' ||
    gt.provenance === 'human_review_from_ai_extraction'
  );
}
