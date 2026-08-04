/**
 * CompareHeadline — the top-of-page verdict + emotional hook.
 *
 * A cold visitor doesn't know these schools and shouldn't have to read a table
 * to get an answer. We lead with a plain-language verdict naming the winning
 * school and its absolute cost/time, then the savings sentence as the hook.
 *
 * Optional `priorCredits` preface acknowledges the user when they came in
 * from /get-started with credits.
 */
import type { CompareHeadline as Headline } from '../compareInsights';
import type { CompareRow } from '../buildCompareRows';
import { schoolName } from '@/lib/schoolNames';

interface CompareHeadlineProps {
  headline: Headline;
  /** The #1-ranked row, for the absolute verdict line. */
  bestRow?: CompareRow;
  /** Whether ranking used the user's own credits. */
  personalized?: boolean;
  /** Total credits user reported in /get-started, even if not yet picker-mapped. */
  priorCredits?: number;
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function monthsFromWeeks(weeks: number): number {
  return Math.max(1, Math.round(weeks / 4.33));
}

export function CompareHeadline({
  headline,
  bestRow,
  personalized,
  priorCredits,
}: CompareHeadlineProps) {
  const goalWord = bestRow?.isCheapest ? 'cheapest' : bestRow?.isFastest ? 'fastest' : 'best';

  return (
    <div className="max-w-5xl space-y-3">
      {priorCredits && priorCredits > 0 ? (
        <p className="text-sm font-medium text-primary">
          Based on your ~{priorCredits} credits
        </p>
      ) : null}

      {bestRow ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Your {goalWord} path
          </p>
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {schoolName(bestRow.school)} — about {formatMoney(bestRow.cost)} and{' '}
            {monthsFromWeeks(bestRow.weeks)} months
            {personalized ? ' with your credits' : ''}.
          </h1>
          <p className="text-base text-muted-foreground">{headline.text}</p>
        </div>
      ) : (
        <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
          {headline.text}
        </h1>
      )}
    </div>
  );
}
