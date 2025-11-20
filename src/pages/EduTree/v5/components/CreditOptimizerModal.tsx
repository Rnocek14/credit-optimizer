/**
 * Credit Optimizer Modal
 * Detailed view of optimization suggestions with apply action
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OptimizationSummary, OptimizationSwap } from '../types/optimizer';

interface CreditOptimizerModalProps {
  open: boolean;
  summary: OptimizationSummary;
  swaps: OptimizationSwap[];
  onClose: () => void;
  onApply: () => Promise<void>;
}

export function CreditOptimizerModal({
  open,
  summary,
  swaps,
  onClose,
  onApply,
}: CreditOptimizerModalProps) {
  const [applying, setApplying] = useState(false);

  if (!open) return null;

  const {
    currentCost,
    optimizedCost,
    currentMonths,
    optimizedMonths,
    costSaved,
    monthsSaved,
    anchorLabel,
    isPolicyCompliant,
  } = summary;

  const topSwaps = swaps.slice(0, 5);

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-background shadow-lg border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 p-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              We found a faster, cheaper way to finish
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              By using approved alternative credits, you can still graduate from {anchorLabel}
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 pb-4">
          <div className="rounded-lg bg-muted p-3 text-sm flex flex-col gap-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Current plan</span>
              <span className="font-medium">
                ${currentCost.toLocaleString()} • {currentMonths} months
              </span>
            </div>
            <div className="flex justify-between text-foreground font-medium">
              <span>Optimized plan</span>
              <span>
                ${optimizedCost.toLocaleString()} • {optimizedMonths} months
              </span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium mt-1 pt-1 border-t border-border">
              <span>Savings</span>
              <span>
                {costSaved > 0 && `-$${costSaved.toLocaleString()}`}
                {costSaved > 0 && monthsSaved > 0 && " • "}
                {monthsSaved > 0 && `-${monthsSaved} months`}
              </span>
            </div>
            {isPolicyCompliant ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span>✅</span>
                <span>This stays within {anchorLabel.split("•")[0]}'s published transfer rules</span>
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                <span>⚠</span>
                <span>Some options may need manual approval from your college</span>
              </p>
            )}
          </div>
        </div>

        {/* Swaps list */}
        <div className="flex flex-col gap-2 px-6 pb-4 overflow-y-auto">
          <div className="text-sm font-medium text-foreground">Here's what would change:</div>
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {topSwaps.map((swap) => (
              <li
                key={swap.id}
                className="border border-border rounded-md p-2 text-xs flex flex-col gap-1 bg-card"
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  {swap.requirementLabel}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="line-through text-muted-foreground">
                    {swap.fromTitle} • {swap.fromProvider} • ${swap.fromCost.toLocaleString()}
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                    {swap.toTitle} • {swap.toProvider} • ${swap.toCost.toLocaleString()} 
                    <span className="ml-1 text-emerald-600 dark:text-emerald-500">
                      (save ${swap.costSaved.toLocaleString()})
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {swaps.length > topSwaps.length && (
            <p className="text-[11px] text-muted-foreground">
              + {swaps.length - topSwaps.length} more change{swaps.length - topSwaps.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 p-6 pt-4 border-t border-border bg-muted/30">
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={applying}
            >
              Keep my plan
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {applying ? 'Applying...' : 'Apply these changes'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            Final credit decisions are always made by your college registrar
          </p>
        </div>
      </div>
    </div>
  );
}
