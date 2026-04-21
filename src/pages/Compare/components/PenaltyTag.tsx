/**
 * PenaltyTag — surfaces the cost of choosing a non-#1 school.
 * Renders nothing for the best row and nothing when both deltas are negligible.
 *
 * Output examples:
 *   "Costs +$8.2k and +9 months vs TESU"
 *   "Costs +$3.1k vs TESU"
 *   "Costs +6 months vs TESU"
 */
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompareRow } from '../buildCompareRows';
import { formatCost } from '../buildCompareRows';

interface PenaltyTagProps {
  row: CompareRow;
  className?: string;
}

/** Convert weeks delta into the most readable unit. */
function formatWeeksDelta(weeks: number): string | null {
  if (!Number.isFinite(weeks) || weeks < 4) return null;
  if (weeks < 52) {
    const months = Math.round(weeks / 4.345);
    return `+${months} ${months === 1 ? 'month' : 'months'}`;
  }
  const yrs = Math.round((weeks / 52) * 10) / 10;
  return `+${yrs} ${yrs === 1 ? 'year' : 'years'}`;
}

export function PenaltyTag({ row, className }: PenaltyTagProps) {
  if (row.isBest) return null;

  const parts: string[] = [];
  if (row.costPenaltyVsBest >= 1000) {
    parts.push(`+${formatCost(row.costPenaltyVsBest)}`);
  }
  const weeksLabel = formatWeeksDelta(row.weeksPenaltyVsBest);
  if (weeksLabel) parts.push(weeksLabel);

  if (parts.length === 0 || !row.bestSchoolLabel) return null;

  const consequence = `Costs ${parts.join(' and ')}`;

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning tabular-nums',
        className
      )}
      title={`Choosing ${row.school} over ${row.bestSchoolLabel} ${consequence.toLowerCase()}`}
    >
      <TrendingUp className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">
        {consequence} <span className="text-warning/70 font-normal">vs {row.bestSchoolLabel}</span>
      </span>
    </span>
  );
}
