/**
 * CompareHeadline — the top-of-page emotional hook.
 * Renders the savings sentence as the page anchor, not a card.
 */
import type { CompareHeadline as Headline } from '../compareInsights';

interface CompareHeadlineProps {
  headline: Headline;
}

export function CompareHeadline({ headline }: CompareHeadlineProps) {
  return (
    <h1 className="max-w-5xl text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
      {headline.text}
    </h1>
  );
}
