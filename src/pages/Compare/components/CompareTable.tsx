/**
 * CompareTable — desktop side-by-side comparison of the 5 verified schools.
 * Rows = metrics, columns = schools. Top-scoring column is highlighted.
 */
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowRight, Trophy } from 'lucide-react';
import type { CompareRow } from '../buildCompareRows';
import { formatCost, formatYears } from '../buildCompareRows';
import { isPickerActive } from '../hooks/useCompareUrlState';
import type { CreditPickerState } from '../types';

interface CompareTableProps {
  rows: CompareRow[];
  picker: CreditPickerState;
  onViewPlan: (programId: string) => void;
}

export function CompareTable({ rows, picker, onViewPlan }: CompareTableProps) {
  const personalized = isPickerActive(picker);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[180px] sticky left-0 bg-muted/30">
              Metric
            </TableHead>
            {rows.map((row) => (
              <TableHead
                key={row.template.id}
                className={cn(
                  'text-center align-bottom',
                  row.isBest && 'bg-primary/10 text-primary'
                )}
              >
                <div className="flex flex-col items-center gap-1.5 py-2">
                  {row.isBest && (
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 px-1.5 py-0.5 border-primary/40 text-primary bg-primary/10"
                    >
                      <Trophy className="h-2.5 w-2.5" />
                      Best fit
                    </Badge>
                  )}
                  <div className="font-semibold text-sm text-foreground">
                    {row.school}
                  </div>
                  <div className="text-[11px] font-normal text-muted-foreground">
                    {row.programCode}
                  </div>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <MetricRow label="Total cost" rows={rows} render={(r) => formatCost(r.cost)} bold />
          <MetricRow label="Time to degree" rows={rows} render={(r) => formatYears(r.weeks)} />
          <MetricRow
            label={personalized ? 'You can transfer in' : 'Transfer ceiling'}
            sublabel={personalized ? 'based on your credits' : 'max alt credits accepted'}
            rows={rows}
            render={(r) =>
              personalized
                ? `${r.matchedCredits} cr`
                : `up to ${r.acceptedCeiling} cr`
            }
            bold
          />
          <MetricRow
            label="Personalized fit"
            rows={rows}
            render={(r) => `${r.transferPercent}%`}
            renderCell={(r) => (
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-sm font-semibold tabular-nums">
                  {r.transferPercent}%
                </div>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${r.transferPercent}%` }}
                  />
                </div>
              </div>
            )}
          />
          <TableRow>
            <TableCell className="sticky left-0 bg-card text-xs font-medium text-muted-foreground">
              Plan
            </TableCell>
            {rows.map((r) => (
              <TableCell
                key={r.template.id}
                className={cn('text-center', r.isBest && 'bg-primary/5')}
              >
                <Button
                  size="sm"
                  variant={r.isBest ? 'default' : 'outline'}
                  onClick={() => onViewPlan(r.template.id)}
                  className="gap-1.5"
                >
                  View plan
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  sublabel?: string;
  rows: CompareRow[];
  render: (row: CompareRow) => string;
  renderCell?: (row: CompareRow) => React.ReactNode;
  bold?: boolean;
}

function MetricRow({ label, sublabel, rows, render, renderCell, bold }: MetricRowProps) {
  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-card">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {sublabel && (
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sublabel}</div>
        )}
      </TableCell>
      {rows.map((r) => (
        <TableCell
          key={r.template.id}
          className={cn('text-center tabular-nums', r.isBest && 'bg-primary/5')}
        >
          {renderCell ? (
            renderCell(r)
          ) : (
            <span className={cn(bold ? 'font-semibold text-foreground' : 'text-foreground/90')}>
              {render(r)}
            </span>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}
