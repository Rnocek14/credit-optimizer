/**
 * CompareCards — mobile stacked comparison of the 5 verified schools.
 * One card per school, sorted by composite score. Top card gets a "Best fit" tag.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import type { CompareRow } from '../buildCompareRows';
import { formatCost, formatYears } from '../buildCompareRows';
import { isPickerActive } from '../hooks/useCompareUrlState';
import type { CreditPickerState } from '../types';
import { WinnerBadges } from './WinnerBadges';
import { CreditLossBreakdown } from './CreditLossBreakdown';
import { PenaltyTag } from './PenaltyTag';

interface CompareCardsProps {
  rows: CompareRow[];
  picker: CreditPickerState;
  onViewPlan: (programId: string) => void;
}

export function CompareCards({ rows, picker, onViewPlan }: CompareCardsProps) {
  const personalized = isPickerActive(picker);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <Card
          key={row.template.id}
          role="button"
          tabIndex={0}
          onClick={() => onViewPlan(row.template.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onViewPlan(row.template.id);
            }
          }}
          className={cn(
            'cursor-pointer transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            row.isBest
              ? 'border-primary/50 bg-primary/5 shadow-sm shadow-primary/5 ring-1 ring-primary/20'
              : 'border-border/50'
          )}
        >
          <CardContent className={cn(row.isBest ? 'p-5 space-y-4' : 'p-3 space-y-2')}>
            {index === 0 ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <WinnerBadges row={row} layout="stack" />
                    <h3 className="text-xl font-semibold leading-tight">{row.school}</h3>
                    <p className="text-xs text-muted-foreground">{row.programCode}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold tabular-nums">{formatCost(row.cost)}</div>
                    <div className="text-xs text-muted-foreground">{formatYears(row.weeks)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md bg-background/60 p-2.5 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {personalized ? 'Credits transferred in' : 'Credits accepted'}
                    </div>
                    <CreditLossBreakdown row={row} personalized={personalized} />
                  </div>
                  <Stat label="Personalized fit" value={`${row.transferPercent}%`} progress={row.transferPercent} />
                </div>

                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPlan(row.template.id);
                  }}
                  className="w-full gap-1.5"
                >
                  See my full plan
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{row.school}</h3>
                    <WinnerBadges row={row} layout="inline" />
                  </div>
                  <PenaltyTag row={row} />
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <div className="text-sm font-semibold tabular-nums">{formatCost(row.cost)}</div>
                    <div className="text-[11px] text-muted-foreground">{formatYears(row.weeks)}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <div className="rounded-md bg-muted/30 p-2.5 space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-foreground">{value}</div>
      {typeof progress === 'number' && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
