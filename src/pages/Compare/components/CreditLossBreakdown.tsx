/**
 * CreditLossBreakdown — compact "X of Y credits accepted" visualization.
 * Used in the comparison surface to make credit retention emotionally legible.
 */
import { cn } from '@/lib/utils';
import type { CompareRow } from '../buildCompareRows';

interface CreditLossBreakdownProps {
  row: CompareRow;
  personalized: boolean;
  className?: string;
}

export function CreditLossBreakdown({ row, personalized, className }: CreditLossBreakdownProps) {
  const accepted = personalized ? row.matchedCredits : row.acceptedCeiling;
  const total = row.totalCredits;
  const remaining = Math.max(0, total - accepted);
  const pct = total > 0 ? Math.min(100, Math.round((accepted / total) * 100)) : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-center gap-1 tabular-nums">
        <span className="text-sm font-semibold text-foreground">{accepted}</span>
        <span className="text-xs text-muted-foreground">/ {total} cr</span>
      </div>

      {/* Stacked bar: accepted (primary) + remaining (muted) */}
      <div className="flex h-1.5 w-20 mx-auto overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      <div className="text-[10px] text-muted-foreground">
        {remaining > 0 ? (
          <>
            <span className="text-foreground/70 font-medium tabular-nums">{remaining}</span> to take
          </>
        ) : (
          <span className="text-success font-medium">No gap</span>
        )}
      </div>
    </div>
  );
}
