/**
 * Policy reconciliation tests.
 *
 * These exist to make one specific class of bug impossible to ship silently:
 * `institutionPolicies.ts` (what the app computes with) disagreeing with
 * `institution_policy_ground_truth` (what the activation trigger treats as
 * authoritative), with nothing detecting it.
 *
 * Found by the 2026-09-15 audit:
 *   - COSC:  90 transfer / 30 residency in code vs 114 / 6 in ground truth
 *   - WGU:   alt-credit cap 78 in code vs max_ace_nccrs_credits 45 in ground
 *            truth — a 33-credit overstatement on the number that decides how
 *            much alt-credit a student buys, shown behind a "Verified" badge
 *
 * If one of these fails, DO NOT simply edit the constant to match. Work out
 * which source is right, fix that one, and update both together. Matching a
 * wrong number is not an improvement over diverging from it.
 */
import { describe, it, expect } from 'vitest';
import {
  getPolicy,
  getResidencyCredits,
  getNoncollegiateCap,
  getAvailableInstitutions,
} from '../institutionPolicies';
import {
  POLICY_GROUND_TRUTH,
  INSTITUTIONS_WITHOUT_GROUND_TRUTH,
  getGroundTruth,
  isHumanVerified,
} from '../policyGroundTruth';

/** Institutions present in BOTH the TS registry and ground truth. */
const RECONCILABLE = getAvailableInstitutions().filter((code) => getGroundTruth(code));

describe('constants reconcile with committed ground truth', () => {
  it('has something to reconcile (guards against a vacuously passing suite)', () => {
    expect(RECONCILABLE.length).toBeGreaterThan(0);
  });

  it.each(RECONCILABLE)('%s: residency credits match ground truth', (code) => {
    const gt = getGroundTruth(code)!;
    expect(getResidencyCredits(code, 'standard')).toBe(gt.residencyCredits);
  });

  it.each(RECONCILABLE)('%s: max transfer credits match ground truth', (code) => {
    const gt = getGroundTruth(code)!;
    expect(getPolicy(code)?.maxTransferTotal).toBe(gt.maxTransferCredits);
  });

  it.each(RECONCILABLE)('%s: alt-credit cap matches ground truth where recorded', (code) => {
    const gt = getGroundTruth(code)!;
    if (gt.maxAceNccrsCredits === null) return; // nothing recorded to compare
    expect(getNoncollegiateCap(code, 'bachelor')).toBe(gt.maxAceNccrsCredits);
  });

  it.each(RECONCILABLE)('%s: total bachelor credits match ground truth where recorded', (code) => {
    const gt = getGroundTruth(code)!;
    if (gt.totalCreditsBachelor === null) return;
    expect(getPolicy(code)?.totalCreditsBachelor).toBe(gt.totalCreditsBachelor);
  });
});

describe('the specific regressions the audit found', () => {
  it('COSC residency is the catalog-verified 6, not the placeholder 30', () => {
    expect(getResidencyCredits('COSC', 'standard')).toBe(6);
  });

  it('COSC max transfer is 114 (120 total - 6 residency), not 90', () => {
    expect(getPolicy('COSC')?.maxTransferTotal).toBe(114);
  });

  it('WGU alt-credit cap is 45, not 78', () => {
    // The 33-credit overstatement. At Sophia's ~$33/credit this is the
    // difference between a plan that works and ~$1,100 of unusable coursework.
    expect(getNoncollegiateCap('WGU', 'bachelor')).toBe(45);
  });

  it('WGU residency is 24, not 42', () => {
    expect(getResidencyCredits('WGU', 'standard')).toBe(24);
  });

  it('WGU still excludes Sophia and Study.com', () => {
    // Reconciling the caps must not quietly widen the provider allowlist.
    const providers = getPolicy('WGU')!.noncollegiatePool.includedProviders;
    expect(providers).not.toContain('SOPHIA');
    expect(providers).not.toContain('STUDYCOM');
  });
});

describe('unreconcilable institutions are declared, not silently trusted', () => {
  it('every registry institution either has ground truth or is declared as lacking it', () => {
    const undeclared = getAvailableInstitutions().filter(
      (code) => !getGroundTruth(code) && !INSTITUTIONS_WITHOUT_GROUND_TRUTH.includes(code)
    );
    // A new institution added without ground truth must be declared here
    // deliberately, so nobody can add one and have it silently read as policy.
    expect(undeclared).toEqual([]);
  });

  it('institutions with no ground truth carry a sub-verified confidence', () => {
    for (const code of INSTITUTIONS_WITHOUT_GROUND_TRUTH) {
      const policy = getPolicy(code);
      if (!policy) continue;
      // Nothing corroborates these numbers, so they must never present as
      // canonical (95+) or even "needs confirmation" (75-94).
      expect(policy.overallConfidence).toBeLessThan(75);
    }
  });
});

describe('ground-truth provenance is honest about itself', () => {
  it('records provenance for every entry', () => {
    for (const gt of Object.values(POLICY_GROUND_TRUTH)) {
      expect(gt.provenance).toBeTruthy();
      expect(gt.sourceUrl).toMatch(/^https?:\/\//);
      expect(gt.migration).toMatch(/^\d{14}$/);
    }
  });

  it('does not claim human verification for seeded rows', () => {
    // WGU/EMPIRE/EXCELSIOR were "Seeded for Phase A activation" by
    // verified_by='system'. That is a placeholder, not a verification.
    expect(isHumanVerified(POLICY_GROUND_TRUTH.WGU)).toBe(false);
    expect(isHumanVerified(POLICY_GROUND_TRUTH.EXCELSIOR)).toBe(false);
    expect(isHumanVerified(POLICY_GROUND_TRUTH.TESU)).toBe(true);
    expect(isHumanVerified(POLICY_GROUND_TRUTH.COSC)).toBe(true);
  });

  it('gives a seed-backed institution a lower confidence than a catalog-verified one', () => {
    const wgu = getPolicy('WGU')!.overallConfidence;
    const cosc = getPolicy('COSC')!.overallConfidence;
    expect(wgu).toBeLessThan(cosc);
  });
});
