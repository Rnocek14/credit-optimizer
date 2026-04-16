/**
 * Pure scoring functions for degree templates.
 * All scores normalized to 0..1 (higher = better) within the candidate pool.
 */
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { SCORE_BOUNDS } from './config';

export interface ScoreInputs {
  cost: number;
  weeks: number;
  /** 0..1 — fraction of total credits coverable by alt/transfer credit */
  transferFit: number;
}

export interface ScoredTemplate {
  template: MarketplaceDegreeTemplate;
  raw: ScoreInputs;
  /** Normalized 0..1 (higher = better) per dimension within the pool */
  normalized: { cost: number; time: number; transfer: number };
}

/** Optional user-owned credit set — when provided, transfer fit becomes personalized. */
export interface UserCreditInventory {
  /** Credit identifiers the user already holds (e.g. 'SOPHIA:intro-business') */
  ownedCredits: Set<string>;
}

export function getCost(t: MarketplaceDegreeTemplate): number {
  return t.totals?.costUsd ?? t.est?.costUsd ?? Number.POSITIVE_INFINITY;
}

export function getWeeks(t: MarketplaceDegreeTemplate): number {
  return t.totals?.weeks ?? t.est?.weeks ?? Number.POSITIVE_INFINITY;
}

/**
 * Theoretical transfer fit: how much of the degree CAN be filled with alt credit.
 * Uses twoPhaseData.altCredits as the ceiling.
 */
export function getTheoreticalTransferFit(t: MarketplaceDegreeTemplate): number {
  const total = t.totals?.credits ?? t.est?.credits ?? 120;
  const alt = t.twoPhaseData?.altCredits ?? 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, alt / total));
}

/**
 * Estimated transfer fit from a coarse "credits per provider" picker.
 *
 * Used by /compare where users tell us "I have 12 CLEP credits + 30 Sophia credits"
 * via toggles + sliders, instead of picking individual courses. We:
 *   1. Walk the template's alt-credit slots and tally how many credits each provider can fill.
 *   2. Cap each source by what the user actually claims to have.
 *   3. Return matched / totalCredits, clamped to [0, 1].
 *
 * This is *directionally accurate* — perfect precision requires the course-level picker.
 */
export function getEstimatedTransferFitFromPicker(
  t: MarketplaceDegreeTemplate,
  creditsBySource: Partial<Record<string, number>>
): number {
  const total = t.totals?.credits ?? t.est?.credits ?? 120;
  if (total <= 0) return 0;

  // Tally template's alt-credit capacity per provider
  const capacityBySource = new Map<string, number>();
  for (const year of t.yearTemplates ?? []) {
    for (const mod of year.moduleTemplates ?? []) {
      const opt = mod.options?.[0];
      if (!opt?.providerCode) continue;
      const code = opt.providerCode.toUpperCase();
      // Only count alt-credit / testing-center options as "transferrable"
      if (opt.providerType !== 'testing_center' && !opt.isAltCredit) continue;
      capacityBySource.set(code, (capacityBySource.get(code) ?? 0) + (opt.credits ?? 3));
    }
  }

  // Match user's claimed credits against template capacity
  let matched = 0;
  for (const [source, capacity] of capacityBySource) {
    const owned = creditsBySource[source] ?? 0;
    matched += Math.min(owned, capacity);
  }

  return Math.max(0, Math.min(1, matched / total));
}

/**
 * Personalized transfer fit: how much of the degree the user PERSONALLY can fill
 * with credits they already own. Walks template slots and counts matches.
 *
 * Until the course-level picker ships, /compare uses getEstimatedTransferFitFromPicker.
 */
export function getPersonalizedTransferFit(
  t: MarketplaceDegreeTemplate,
  inventory: UserCreditInventory
): number {
  const total = t.totals?.credits ?? t.est?.credits ?? 120;
  if (total <= 0 || inventory.ownedCredits.size === 0) return 0;

  let matched = 0;
  for (const year of t.yearTemplates ?? []) {
    for (const mod of year.moduleTemplates ?? []) {
      const opt = mod.options?.[0];
      if (!opt?.providerCode || !opt.courseId) continue;
      const key = `${opt.providerCode.toUpperCase()}:${opt.courseId}`;
      if (inventory.ownedCredits.has(key)) {
        matched += opt.credits ?? 3;
      }
    }
  }
  return Math.max(0, Math.min(1, matched / total));
}

/**
 * Normalize a list of raw inputs into 0..1 scores per dimension.
 * Lower cost/weeks → higher score. Higher transferFit → higher score.
 */
export function scorePool(
  templates: MarketplaceDegreeTemplate[],
  opts: { inventory?: UserCreditInventory } = {}
): ScoredTemplate[] {
  if (templates.length === 0) return [];

  const raws: ScoreInputs[] = templates.map((t) => ({
    cost: getCost(t),
    weeks: getWeeks(t),
    transferFit: opts.inventory
      ? getPersonalizedTransferFit(t, opts.inventory)
      : getTheoreticalTransferFit(t),
  }));

  const finiteCosts = raws.map((r) => r.cost).filter(Number.isFinite);
  const finiteWeeks = raws.map((r) => r.weeks).filter(Number.isFinite);

  const minCost = finiteCosts.length ? Math.min(...finiteCosts) : 0;
  const maxCost = finiteCosts.length ? Math.max(...finiteCosts) : 0;
  const minWeeks = finiteWeeks.length ? Math.min(...finiteWeeks) : 0;
  const maxWeeks = finiteWeeks.length ? Math.max(...finiteWeeks) : 0;

  const costSpread = Math.max(maxCost - minCost, SCORE_BOUNDS.minCostSpread);
  const weeksSpread = Math.max(maxWeeks - minWeeks, SCORE_BOUNDS.minWeeksSpread);

  return templates.map((template, i) => {
    const raw = raws[i];
    const costScore = Number.isFinite(raw.cost)
      ? 1 - (raw.cost - minCost) / costSpread
      : 0;
    const timeScore = Number.isFinite(raw.weeks)
      ? 1 - (raw.weeks - minWeeks) / weeksSpread
      : 0;
    return {
      template,
      raw,
      normalized: {
        cost: clamp01(costScore),
        time: clamp01(timeScore),
        transfer: clamp01(raw.transferFit),
      },
    };
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Apply weighted blend to a normalized scored template. */
export function applyWeights(
  s: ScoredTemplate,
  w: { cost: number; time: number; transfer: number }
): number {
  return s.normalized.cost * w.cost + s.normalized.time * w.time + s.normalized.transfer * w.transfer;
}
