/**
 * Reference-rate tests.
 *
 * Two jobs:
 *
 * 1. Prove the editorial rates match the seeded `institution_pricing_packs`
 *    rows the planner actually computes from. This reads the migration SQL
 *    directly rather than restating its numbers, so the two cannot drift.
 *    Before this, TESU's per-credit rate shipped as $519, $419, ~$400 and $564
 *    in four different places.
 *
 * 2. Pin the per-COURSE vs per-CREDIT distinction. `finish-bachelors-under-10k`
 *    charged StraighterLine's $79 course fee against every credit — 60 × $79 =
 *    $4,740 instead of 20 × $79 = $1,580 — overstating one line by $3,160 and
 *    the guide's headline total with it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  INSTITUTION_RATES,
  PROVIDER_RATES,
  providerCostForCredits,
  monthsSince,
  formatRateCaveat,
} from '../referenceRates';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/** Per-credit rates as actually committed in the pricing seed migration. */
function seededPerCreditRates(): Record<string, number> {
  const file = readdirSync(MIGRATIONS_DIR).find((f) => f.startsWith('20260113052238'));
  if (!file) throw new Error('pricing seed migration 20260113052238 not found');
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

  const rates: Record<string, number> = {};
  // Each pack is inserted as ('CODE', 'active', '{ ... "per_credit_usd": N ... }'
  const re = /\('([A-Z]+)',\s*'active',\s*'\{[^}]*?"per_credit_usd":\s*(\d+)/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) rates[m[1]] = Number(m[2]);
  return rates;
}

describe('editorial rates reconcile with the seeded pricing packs', () => {
  const seeded = seededPerCreditRates();

  it('actually parsed the migration (guards a vacuous pass)', () => {
    expect(Object.keys(seeded).length).toBeGreaterThan(0);
    expect(seeded.TESU).toBeGreaterThan(0);
  });

  it.each(Object.keys(INSTITUTION_RATES))(
    '%s per-credit rate matches the seeded pack',
    (code) => {
      // If this fails, the migration and the editorial constant disagree.
      // Fix whichever is wrong — do not just sync the numbers.
      expect(INSTITUTION_RATES[code].perCreditUsd).toBe(seeded[code]);
    }
  );

  it('TESU is the seeded 564, not any of the three numbers the guides used', () => {
    expect(INSTITUTION_RATES.TESU.perCreditUsd).toBe(564);
    expect([519, 419, 400]).not.toContain(INSTITUTION_RATES.TESU.perCreditUsd);
  });

  it('carries the in-state rate, which the guides omitted entirely', () => {
    // $353 vs $564 is a 60% swing on the largest line item in a plan.
    expect(INSTITUTION_RATES.TESU.perCreditInStateUsd).toBe(353);
  });

  it('every institution rate cites a source and an effective date', () => {
    for (const rate of Object.values(INSTITUTION_RATES)) {
      expect(rate.sourceUrl).toMatch(/^https:\/\//);
      expect(rate.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rate.seedMigration).toMatch(/^\d{14}$/);
    }
  });
});

describe('providerCostForCredits — per COURSE, not per credit', () => {
  it('charges StraighterLine 20 course fees for 60 credits, not 60', () => {
    // 8 months membership + 20 courses. The bug computed 60 course fees.
    const cost = providerCostForCredits('STRAIGHTERLINE', 60, 8);
    expect(cost).toBe(99 * 8 + 79 * 20);
    expect(cost).toBe(2372);
  });

  it('does not reproduce the $5,532 figure the guide shipped', () => {
    const wrong = 99 * 8 + 79 * 60; // 5532
    expect(providerCostForCredits('STRAIGHTERLINE', 60, 8)).not.toBe(wrong);
    expect(wrong - providerCostForCredits('STRAIGHTERLINE', 60, 8)!).toBe(3160);
  });

  it('bills a flat subscription by month, ignoring credit volume', () => {
    // Sophia is unlimited: 30 credits and 90 credits cost the same per month.
    expect(providerCostForCredits('SOPHIA', 30, 4)).toBe(396);
    expect(providerCostForCredits('SOPHIA', 90, 4)).toBe(396);
  });

  it('bills exams per exam, rounding partial courses up', () => {
    expect(providerCostForCredits('CLEP', 6, 1)).toBe(95 * 2);
    // 4 credits still needs 2 exams.
    expect(providerCostForCredits('CLEP', 4, 1)).toBe(95 * 2);
  });

  it('charges at least one month of a subscription', () => {
    expect(providerCostForCredits('SOPHIA', 3, 0)).toBe(99);
  });

  it('returns null for an unknown provider rather than guessing zero', () => {
    expect(providerCostForCredits('NOT_A_PROVIDER', 30, 4)).toBeNull();
    expect(providerCostForCredits('SOPHIA', 0, 4)).toBeNull();
  });
});

describe('provider rates are internally consistent', () => {
  it('quotes the Study.com tier that actually earns transferable credit', () => {
    // providers.ts previously said "from $95/month" — a tier without
    // college-credit courses — next to a transfer recommendation.
    expect(PROVIDER_RATES.STUDYCOM.monthlyUsd).toBe(199);
    expect(PROVIDER_RATES.STUDYCOM.summary).toContain('College Plus');
  });

  it('models StraighterLine as membership AND per-course, not one or the other', () => {
    expect(PROVIDER_RATES.STRAIGHTERLINE.model).toBe('subscription_plus_course');
    expect(PROVIDER_RATES.STRAIGHTERLINE.monthlyUsd).toBe(99);
    expect(PROVIDER_RATES.STRAIGHTERLINE.perCourseUsd).toBe(79);
  });

  it('every provider rate carries an as-of date and source', () => {
    for (const rate of Object.values(PROVIDER_RATES)) {
      expect(rate.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rate.sourceUrl).toMatch(/^https:\/\//);
      expect(rate.summary.length).toBeGreaterThan(0);
    }
  });
});

describe('staleness is surfaced, not hidden', () => {
  const NOW = new Date('2026-09-15T00:00:00Z');

  it('reports how old a rate is', () => {
    expect(monthsSince('2024-09-01', NOW)).toBe(24);
  });

  it('never reports a negative age for a future date', () => {
    expect(monthsSince('2027-01-01', NOW)).toBe(0);
  });

  it('the caveat names the date and tells the reader to verify', () => {
    const caveat = formatRateCaveat('TESU', NOW);
    expect(caveat).toContain('2024-09-01');
    expect(caveat).toContain('24 months ago');
    expect(caveat).toMatch(/confirm current rates/i);
  });

  it('refuses to vouch for an institution it has no rate for', () => {
    expect(formatRateCaveat('PHOENIX', NOW)).toMatch(/unverified/i);
  });
});
