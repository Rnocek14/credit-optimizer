/**
 * compareInsights — derive the human "why" from a scored CompareRow set.
 *
 * Two outputs:
 *   1. headline:  "You'd save $14k and 1.2 yrs by choosing TESU over SNHU."
 *   2. reasons:   bullet list explaining why the top row is the best fit.
 *
 * Pure function, no React, easy to unit test.
 */
import type { CompareRow } from './buildCompareRows';
import { formatCost, formatYears } from './buildCompareRows';
import type { GoalPreference } from '@/hooks/useQuickPlanGeneration';

export interface CompareHeadline {
  /** The school we're recommending */
  bestSchool: string;
  /** The school with the biggest gap on the user's primary metric */
  worstSchool: string;
  /** "You'd save $14k and 1.2 yrs by choosing TESU over SNHU." */
  text: string;
  /** Cost delta in dollars (>= 0). 0 if no meaningful gap. */
  costDelta: number;
  /** Time delta in weeks (>= 0). 0 if no meaningful gap. */
  weeksDelta: number;
  /** Credits-accepted delta (best - worst, >= 0). */
  creditsDelta: number;
}

export interface CompareReason {
  /** Short human label for the bullet */
  label: string;
  /** lucide-icon name to render upstream */
  icon: 'dollar' | 'clock' | 'graduation' | 'sparkle';
}

/**
 * Build the top-of-page emotional hook based on the worst-case alternative.
 * Returns null when the pool has fewer than 2 schools (no comparison to make).
 */
export function buildCompareHeadline(
  rows: CompareRow[],
  goal: GoalPreference,
  personalized: boolean
): CompareHeadline | null {
  if (rows.length < 2) return null;
  const best = rows[0]; // sorted by composite score
  // Worst = lowest composite score in the pool
  const worst = rows[rows.length - 1];
  if (!best || !worst || best.template.id === worst.template.id) return null;

  const costDelta = Math.max(0, worst.cost - best.cost);
  const weeksDelta = Math.max(0, worst.weeks - best.weeks);
  const acceptedBest = personalized ? best.matchedCredits : best.acceptedCeiling;
  const acceptedWorst = personalized ? worst.matchedCredits : worst.acceptedCeiling;
  const creditsDelta = Math.max(0, acceptedBest - acceptedWorst);

  // Compose the sentence based on goal / strongest delta
  const fragments: string[] = [];
  if (costDelta >= 1000) fragments.push(formatCost(costDelta));
  if (weeksDelta >= 8) fragments.push(formatYears(weeksDelta));
  if (creditsDelta >= 6 && fragments.length < 2) {
    fragments.push(`${creditsDelta} extra credits`);
  }

  let text: string;
  if (fragments.length === 0) {
    // No meaningful spread — soften the message
    text = `${best.school} ranks #1 across ${rows.length} verified schools.`;
  } else {
    const savings = fragments.length === 1
      ? fragments[0]
      : fragments.slice(0, -1).join(', ') + ' and ' + fragments[fragments.length - 1];
    text = `Save ${savings} by choosing ${best.school} over ${worst.school}.`;
  }

  return {
    bestSchool: best.school,
    worstSchool: worst.school,
    text,
    costDelta,
    weeksDelta,
    creditsDelta,
  };
}

/**
 * Derive the bullet list under the recommended school.
 * Each bullet ties back to a concrete data point so users can verify.
 */
export function buildBestFitReasons(
  rows: CompareRow[],
  personalized: boolean
): CompareReason[] {
  if (rows.length === 0) return [];
  const best = rows[0];
  const reasons: CompareReason[] = [];

  // Cost reason — show absolute or "lowest in pool"
  if (best.isCheapest) {
    reasons.push({
      label: `Lowest total cost (${formatCost(best.cost)})`,
      icon: 'dollar',
    });
  } else if (rows.length > 1) {
    const cheapest = rows.find((r) => r.isCheapest);
    if (cheapest) {
      const diff = best.cost - cheapest.cost;
      if (diff > 0 && diff < 5000) {
        reasons.push({
          label: `Within ${formatCost(diff)} of the cheapest option`,
          icon: 'dollar',
        });
      }
    }
  }

  // Time reason
  if (best.isFastest) {
    reasons.push({
      label: `Fastest path (${formatYears(best.weeks)})`,
      icon: 'clock',
    });
  } else {
    reasons.push({
      label: `Finishes in ${formatYears(best.weeks)}`,
      icon: 'clock',
    });
  }

  // Credit reason
  const accepted = personalized ? best.matchedCredits : best.acceptedCeiling;
  if (best.isMostCreditFriendly) {
    reasons.push({
      label: personalized
        ? `Accepts the most of your credits (${accepted} of ${best.totalCredits})`
        : `Accepts the most alt credits (up to ${accepted})`,
      icon: 'graduation',
    });
  } else if (accepted > 0) {
    reasons.push({
      label: personalized
        ? `Transfers in ${accepted} of your credits`
        : `Accepts up to ${accepted} alt credits`,
      icon: 'graduation',
    });
  }

  // Composite reason — only when there isn't already a strong story
  if (reasons.length < 3) {
    reasons.push({
      label: 'Best balance across cost, time, and credit fit',
      icon: 'sparkle',
    });
  }

  return reasons.slice(0, 4);
}
