/**
 * Freshness gate tests.
 *
 * The failure this guards against is silent: a rule verified once, years ago,
 * rendering with a green "Verified" badge forever because nothing ever aged it
 * out. Every case here pins a clock explicitly rather than using the real one.
 */
import { describe, it, expect } from 'vitest';
import {
  classifyRuleFreshness,
  isRuleStale,
  monthsSinceVerified,
  formatVerifiedLabel,
  freshnessCutoffIso,
  RULE_FRESHNESS_DAYS,
} from '../ruleFreshness';

const NOW = new Date('2026-09-15T12:00:00Z');
const daysBefore = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('classifyRuleFreshness', () => {
  it('treats a recently verified rule as fresh', () => {
    expect(classifyRuleFreshness(daysBefore(10), NOW)).toBe('fresh');
  });

  it('treats a rule verified exactly at the boundary as still fresh', () => {
    expect(classifyRuleFreshness(daysBefore(RULE_FRESHNESS_DAYS), NOW)).toBe('fresh');
  });

  it('treats a rule one day past the boundary as stale', () => {
    expect(classifyRuleFreshness(daysBefore(RULE_FRESHNESS_DAYS + 1), NOW)).toBe('stale');
  });

  it('treats the real corpus age (Jan 2026 rules) as stale', () => {
    // The whole rule set was last scraped 2026-01-13 per the pipeline baseline.
    expect(classifyRuleFreshness('2026-01-13T00:00:00Z', NOW)).toBe('stale');
  });

  it('treats a never-stamped rule as unverified, never fresh', () => {
    expect(classifyRuleFreshness(null, NOW)).toBe('unverified');
    expect(classifyRuleFreshness(undefined, NOW)).toBe('unverified');
    expect(classifyRuleFreshness('', NOW)).toBe('unverified');
  });

  it('treats an unparseable timestamp as unverified rather than fresh', () => {
    // A bad date must never fail open into a green badge.
    expect(classifyRuleFreshness('not-a-date', NOW)).toBe('unverified');
  });

  it('treats a future timestamp as corrupt, not fresh', () => {
    expect(classifyRuleFreshness('2027-01-01T00:00:00Z', NOW)).toBe('unverified');
  });
});

describe('isRuleStale', () => {
  it('is false only for genuinely fresh rules', () => {
    expect(isRuleStale(daysBefore(1), NOW)).toBe(false);
  });

  it('is true for both stale and never-verified rules', () => {
    expect(isRuleStale(daysBefore(400), NOW)).toBe(true);
    expect(isRuleStale(null, NOW)).toBe(true);
  });
});

describe('monthsSinceVerified', () => {
  it('reports whole months elapsed', () => {
    expect(monthsSinceVerified('2026-01-13T00:00:00Z', NOW)).toBe(8);
  });

  it('returns null when never verified', () => {
    expect(monthsSinceVerified(null, NOW)).toBeNull();
  });
});

describe('formatVerifiedLabel', () => {
  it('names the month and the elapsed age', () => {
    const label = formatVerifiedLabel('2026-01-13T00:00:00Z', NOW);
    expect(label).toContain('Jan 2026');
    expect(label).toContain('8 months ago');
  });

  it('says so plainly when a rule was never verified', () => {
    expect(formatVerifiedLabel(null, NOW)).toBe('Never verified');
  });

  it('singularises one month', () => {
    expect(formatVerifiedLabel(daysBefore(35), NOW)).toContain('1 month ago');
  });
});

describe('freshnessCutoffIso', () => {
  it('returns a bound that excludes the stale corpus', () => {
    expect(freshnessCutoffIso(NOW) > '2026-01-13T00:00:00Z').toBe(true);
  });
});
