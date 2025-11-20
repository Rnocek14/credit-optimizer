/**
 * Credit Optimizer Suggestion Banner
 * Non-intrusive banner showing potential savings
 */

import { Button } from '@/components/ui/button';
import type { OptimizationSummary } from '../types/optimizer';

interface CreditOptimizerSuggestionBannerProps {
  summary: OptimizationSummary;
  onShow: () => void;
  onDismiss: () => void;
}

export function CreditOptimizerSuggestionBanner({
  summary,
  onShow,
  onDismiss,
}: CreditOptimizerSuggestionBannerProps) {
  const { costSaved, monthsSaved } = summary;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg">💡</span>
        <div>
          <div className="font-medium text-foreground">
            We found a way to save{" "}
            {costSaved > 0 && (
              <span>
                <strong className="text-amber-900 dark:text-amber-100">${costSaved.toLocaleString()}</strong>
                {monthsSaved > 0 && " and "}
              </span>
            )}
            {monthsSaved > 0 && (
              <span>
                <strong className="text-amber-900 dark:text-amber-100">{monthsSaved} months</strong>
              </span>
            )}{" "}
            on your plan
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            By swapping a few courses for approved alternatives, you can still graduate from {summary.anchorLabel}
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-2 md:mt-0 md:flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="text-sm"
        >
          Dismiss
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onShow}
          className="text-sm bg-amber-600 hover:bg-amber-700 text-white font-medium"
        >
          Show me
        </Button>
      </div>
    </div>
  );
}
