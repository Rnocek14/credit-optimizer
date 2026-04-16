/**
 * CompareCards — mobile stacked comparison of the 5 verified schools.
 * One card per school, sorted by composite score. Top card gets a "Best fit" tag.
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CompareRow } from '../buildCompareRows';
import { formatCost, formatYears } from '../buildCompareRows';
import { isPickerActive } from '../hooks/useCompareUrlState';
import type { CreditPickerState } from '../types';

interface CompareCardsProps {
  rows: CompareRow[];
  picker: CreditPickerState;
}

export function CompareCards({ rows, picker }: CompareCardsProps) {
  const navigate = useNavigate();
  const personalized = isPickerActive(picker);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card
          key={row.template.id}
          className={cn(
            'transition-colors',
            row.isBest ? 'border-primary/50 shadow-sm shadow-primary/5' : 'border-border/50'
          )}
        >
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                {row.isBest && (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 px-1.5 py-0.5 border-primary/40 text-primary bg-primary/10"
                  >
                    <Trophy className="h-2.5 w-2.5" />
                    Best fit
                  </Badge>
                )}
                <h3 className="text-base font-semibold leading-tight">{row.school}</h3>
                <p className="text-xs text-muted-foreground">{row.programCode}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold tabular-nums">{formatCost(row.cost)}</div>
                <div className="text-[11px] text-muted-foreground">{formatYears(row.weeks)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Stat
                label={personalized ? 'You can transfer in' : 'Transfer ceiling'}
                value={
                  personalized
                    ? `${row.matchedCredits} credits`
                    : `up to ${row.acceptedCeiling} cr`
                }
              />
              <Stat label="Personalized fit" value={`${row.transferPercent}%`} progress={row.transferPercent} />
            </div>

            <Button
              size="sm"
              variant={row.isBest ? 'default' : 'outline'}
              onClick={() => navigate(`/edu-tree-v6/${row.template.id}`)}
              className="w-full gap-1.5"
            >
              View plan
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
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
