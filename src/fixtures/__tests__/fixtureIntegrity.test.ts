/**
 * Fixture integrity tests.
 *
 * The marketplace fixtures are typed `any` at every consumer
 * (`validateTemplate(template: any)`, `as unknown as MarketplaceDegreeTemplate[]`),
 * so TypeScript cannot catch a value that drifts out of its union. These tests
 * are the only thing standing between the fixture JSON and the type contract.
 *
 * What went wrong: the V2 fixtures carried providerType "institutional" (38
 * options) and "exam" (5), neither of which is in ProviderType. Every consumer
 * tests for union members, so those 43 options counted as NEITHER residency nor
 * alt-credit. universityCredits came out 0 for all 11 templates, which fired a
 * user-visible "Need 15 more institutional credits (0/15)" toast on plans that
 * were actually fine.
 */
import { describe, it, expect } from 'vitest';
import v2Fixtures from '../templates/marketplace-v2-templates.json';
import v1Fixtures from '../templates/marketplace-v1-templates.json';
import { normalizeOptimization } from '@/types/optimizationTypes';

/** Members of ProviderType (src/pages/EduTree/v5/types/v5.ts). */
const VALID_PROVIDER_TYPES = new Set(['university', 'mooc', 'bootcamp', 'testing_center']);

type AnyTemplate = Record<string, any>;

const asList = (f: unknown): AnyTemplate[] =>
  (Array.isArray(f) ? f : (f as AnyTemplate).templates ?? []) as AnyTemplate[];

const v2 = asList(v2Fixtures);
const v1 = asList(v1Fixtures);

function everyOption(templates: AnyTemplate[]): AnyTemplate[] {
  const out: AnyTemplate[] = [];
  for (const t of templates) {
    for (const yt of t.yearTemplates ?? []) {
      for (const mt of yt.moduleTemplates ?? []) {
        for (const opt of mt.options ?? []) out.push(opt);
      }
    }
  }
  return out;
}

describe('providerType stays inside its union', () => {
  it('found options to check (guards a vacuous pass)', () => {
    expect(everyOption(v2).length).toBeGreaterThan(100);
  });

  it.each([
    ['v2', v2],
    ['v1', v1],
  ])('%s fixtures use only ProviderType members', (_label, templates) => {
    const bad = everyOption(templates)
      .filter((o) => o.providerType !== undefined && o.providerType !== null)
      .filter((o) => !VALID_PROVIDER_TYPES.has(o.providerType))
      .map((o) => `${o.courseId ?? o.id}: ${o.providerType}`);
    expect(bad).toEqual([]);
  });

  it('no fixture still carries the old aliases', () => {
    const raw = JSON.stringify(v2Fixtures);
    expect(raw).not.toContain('"providerType": "institutional"');
    expect(raw).not.toContain('"providerType": "exam"');
  });

  it('every template yields some university credit, so residency can be met', () => {
    // The symptom of the bug: zero university-typed options meant every plan
    // reported 0 residency credits and warned the user about a shortfall that
    // did not exist.
    for (const t of v2) {
      const uni = everyOption([t]).filter((o) => o.providerType === 'university');
      expect(uni.length, `${t.id} has no university-typed options`).toBeGreaterThan(0);
    }
  });
});

describe('fixture keys resolve the way the lookup builds them', () => {
  it('every fixture optimization normalizes to a known value', () => {
    for (const t of v2) {
      const normalized = normalizeOptimization(t.optimization);
      expect(normalized, `${t.id} → ${t.optimization}`).toBeTruthy();
    }
  });

  it('fixture ids are unique — id is the primary lookup key', () => {
    const ids = v2.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('documents the composite-key collisions that make id-matching necessary', () => {
    // cs-bachelor and business-admin-bachelor share school+optimization at
    // TESU. The composite map keeps the first and warns; the id map is what
    // actually resolves these correctly.
    const composites = v2.map((t) => `${t.anchorSchool}-${normalizeOptimization(t.optimization)}`);
    const collisions = composites.filter((c, i) => composites.indexOf(c) !== i);
    expect(collisions.length).toBeGreaterThan(0);
  });

  it('the seeded DB template ids exist as fixtures, so exact matching works', () => {
    // From supabase/migrations/20260217133250. Two of the three line up
    // exactly; bsba-cosc-multischool-2025 deliberately has no fixture twin
    // (the only COSC fixture is a different track) and falls through to the
    // DB-only transform, which is correct.
    const ids = new Set(v2.map((t) => t.id));
    expect(ids.has('it-bachelor-wgu-multischool-2025')).toBe(true);
    expect(ids.has('cs-bachelor-tesu-multischool-2025')).toBe(true);
    expect(ids.has('bsba-cosc-multischool-2025')).toBe(false);
  });
});

describe('fixture shape basics', () => {
  it('every template names an anchor school', () => {
    for (const t of v2) expect(t.anchorSchool, `${t.id}`).toBeTruthy();
  });

  it('every option carries a positive credit value', () => {
    const bad = everyOption(v2).filter((o) => !(typeof o.credits === 'number' && o.credits > 0));
    expect(bad).toEqual([]);
  });

  it('every option names a provider code', () => {
    const bad = everyOption(v2).filter((o) => !o.providerCode).map((o) => o.courseId ?? o.id);
    expect(bad).toEqual([]);
  });
});
