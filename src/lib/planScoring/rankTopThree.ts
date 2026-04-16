/**
 * Pick top 3 templates representing the 3 strategies:
 *   - Best Overall (weighted blend)
 *   - Fastest      (lowest weeks, cost tiebreaker)
 *   - Cheapest     (lowest cost, time tiebreaker)
 *
 * Guarantees:
 *   - Always returns DISTINCT templates (no duplicates)
 *   - If pool has < 3 distinct templates, falls back to honest "Top N" (no fake variety)
 */
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import {
  scorePool,
  applyWeights,
  getCost,
  getWeeks,
  type UserCreditInventory,
  type ScoredTemplate,
} from './scorePlan';
import { STRATEGY_WEIGHTS } from './config';

export type StrategyBadge = 'Best Overall' | 'Fastest' | 'Cheapest' | 'Next Best' | 'Third Best';

export interface RankedPlan {
  template: MarketplaceDegreeTemplate;
  badge: StrategyBadge;
  /** Cost in USD (raw, not normalized) */
  cost: number;
  /** Weeks to degree (raw, not normalized) */
  weeks: number;
  /** Years (rounded to 1 decimal) — convenience for UI */
  years: number;
  /** Transfer fit 0..1 → percent for UI */
  transferPercent: number;
  /** Composite "best overall" score 0..1 — useful for sorting/debugging */
  overallScore: number;
  /** One-line proof-point copy for the badge (e.g. "Saves $4.2k vs avg") */
  proofPoint: string;
  /** Two short supporting stats for the small print line */
  supportingStats: [string, string];
}

interface RankOptions {
  /** When provided, transfer fit is personalized to the user's owned credits. */
  inventory?: UserCreditInventory;
}

export function rankTopThree(
  templates: MarketplaceDegreeTemplate[],
  opts: RankOptions = {}
): RankedPlan[] {
  if (templates.length === 0) return [];

  const scored = scorePool(templates, opts);

  // Pre-compute pool averages for proof-point copy
  const finiteCosts = scored.map((s) => s.raw.cost).filter(Number.isFinite);
  const finiteWeeks = scored.map((s) => s.raw.weeks).filter(Number.isFinite);
  const avgCost = avg(finiteCosts);
  const avgWeeks = avg(finiteWeeks);

  // 1. Best Overall
  const withOverall = scored.map((s) => ({
    s,
    overall: applyWeights(s, STRATEGY_WEIGHTS.bestOverall),
  }));
  const bestOverall = pickBest(withOverall, (a, b) => b.overall - a.overall)?.s;

  // 2. Cheapest (excluding chosen)
  const cheapest = pickBest(
    scored.filter((s) => s !== bestOverall),
    (a, b) => a.raw.cost - b.raw.cost || a.raw.weeks - b.raw.weeks
  );

  // 3. Fastest (excluding the previous two)
  const fastest = pickBest(
    scored.filter((s) => s !== bestOverall && s !== cheapest),
    (a, b) => a.raw.weeks - b.raw.weeks || a.raw.cost - b.raw.cost
  );

  const ordered: Array<{ scored: ScoredTemplate; badge: StrategyBadge } | null> = [
    bestOverall ? { scored: bestOverall, badge: 'Best Overall' } : null,
    cheapest    ? { scored: cheapest,    badge: 'Cheapest' }     : null,
    fastest     ? { scored: fastest,     badge: 'Fastest' }      : null,
  ].filter((x): x is { scored: ScoredTemplate; badge: StrategyBadge } => Boolean(x));

  // Honest fallback: if pool < 3 distinct, relabel
  if (ordered.length < 3) {
    const fallbackBadges: StrategyBadge[] = ['Best Overall', 'Next Best', 'Third Best'];
    return ordered.slice(0, 3).map((entry, i) => buildRanked(entry.scored, fallbackBadges[i], avgCost, avgWeeks, withOverall));
  }

  return ordered.map((entry) => buildRanked(entry.scored, entry.badge, avgCost, avgWeeks, withOverall));
}

function buildRanked(
  s: ScoredTemplate,
  badge: StrategyBadge,
  avgCost: number,
  avgWeeks: number,
  withOverall: Array<{ s: ScoredTemplate; overall: number }>
): RankedPlan {
  const cost = s.raw.cost;
  const weeks = s.raw.weeks;
  const overall = withOverall.find((w) => w.s === s)?.overall ?? 0;
  const transferPct = Math.round(s.normalized.transfer * 100);
  const totalCredits = s.template.totals?.credits ?? s.template.est?.credits ?? 120;
  const altCredits = s.template.twoPhaseData?.altCredits ?? Math.round((s.normalized.transfer) * totalCredits);

  return {
    template: s.template,
    badge,
    cost,
    weeks,
    years: Math.round((weeks / 52) * 10) / 10,
    transferPercent: transferPct,
    overallScore: overall,
    proofPoint: buildProofPoint(badge, cost, weeks, altCredits, avgCost, avgWeeks),
    supportingStats: buildSupportingStats(badge, cost, weeks, altCredits),
  };
}

function buildProofPoint(
  badge: StrategyBadge,
  cost: number,
  weeks: number,
  altCredits: number,
  avgCost: number,
  avgWeeks: number
): string {
  switch (badge) {
    case 'Cheapest': {
      const savings = avgCost - cost;
      return savings > 500 ? `Saves ${formatCost(savings)} vs avg` : formatCost(cost) + ' total';
    }
    case 'Fastest': {
      const monthsSaved = Math.round(((avgWeeks - weeks) / 4.33));
      return monthsSaved >= 2 ? `${monthsSaved} months faster` : `${(weeks / 52).toFixed(1)} years to degree`;
    }
    case 'Best Overall':
      return `${formatCost(cost)} · ${(weeks / 52).toFixed(1)} yrs · ${altCredits} transfer credits`;
    default:
      return `${formatCost(cost)} · ${(weeks / 52).toFixed(1)} yrs`;
  }
}

function buildSupportingStats(
  badge: StrategyBadge,
  cost: number,
  weeks: number,
  altCredits: number
): [string, string] {
  const yrs = `${(weeks / 52).toFixed(1)} years`;
  const transfer = `up to ${altCredits} transfer credits`;
  const total = formatCost(cost) + ' total';
  switch (badge) {
    case 'Cheapest':
      return [yrs, transfer];
    case 'Fastest':
      return [total, transfer];
    case 'Best Overall':
    default:
      return [total, yrs];
  }
}

function formatCost(c: number): string {
  if (!Number.isFinite(c)) return '—';
  if (c >= 1000) return `$${(c / 1000).toFixed(1)}k`;
  return `$${Math.round(c).toLocaleString()}`;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

function pickBest<T>(arr: T[], cmp: (a: T, b: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return [...arr].sort(cmp)[0];
}
