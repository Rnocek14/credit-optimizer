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
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            What this means for you
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-snug tracking-tight">
            {headline.text}
          </h1>
        </div>
      </div>
    </div>
  );
}
