/**
 * CompareHeadline — the top-of-page emotional hook.
 * Renders the savings sentence as the page anchor, not a card.
 *
 * Optional `priorCredits` preface acknowledges the user when they came in
 * from /get-started with credits but no alt-credit chips (so the picker is
 * empty). Without this, the headline feels generic — "I told you I had
 * credits, why isn't this personal?" — and we lose the trust we just earned.
 */
import type { CompareHeadline as Headline } from '../compareInsights';

interface CompareHeadlineProps {
  headline: Headline;
  /** Total credits user reported in /get-started, even if not yet picker-mapped. */
  priorCredits?: number;
}

export function CompareHeadline({ headline, priorCredits }: CompareHeadlineProps) {
  return (
    <div className="max-w-5xl space-y-2">
      {priorCredits && priorCredits > 0 ? (
        <p className="text-sm font-medium text-primary">
          Based on your ~{priorCredits} credits
        </p>
      ) : null}
      <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
        {headline.text}
      </h1>
    </div>
  );
}
