/**
 * CompareHeadline — the top-of-page emotional hook.
 * Renders the savings sentence with the recommended school name highlighted.
 */
import { TrendingDown } from 'lucide-react';
import type { CompareHeadline as Headline } from '../compareInsights';

interface CompareHeadlineProps {
  headline: Headline;
}

export function CompareHeadline({ headline }: CompareHeadlineProps) {
  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <TrendingDown className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            What this means for you
          </div>
          <p className="text-sm font-medium text-foreground sm:text-base leading-snug">
            {headline.text}
          </p>
        </div>
      </div>
    </div>
  );
}
