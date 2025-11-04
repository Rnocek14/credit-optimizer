import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { YearNodeVM } from '@/lib/degree/yearNodes';

interface YearDetailsPanelProps {
  selected: YearNodeVM | null;
}

/**
 * Docked details panel for year-level information
 * Shows modules, costs, and policy validation
 */
export function YearDetailsPanel({ selected }: YearDetailsPanelProps) {
  if (!selected) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Select a year to view details</p>
      </div>
    );
  }

  const y = selected;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="text-2xl font-semibold mb-2">Year {y.year} Details</div>
        <div className="text-sm text-muted-foreground">
          Cost est: ${y.totals.costEstimated.toFixed(0)} · Longest{' '}
          {y.totals.weeksEstimated} weeks
        </div>
      </div>

      {/* Totals */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Credits</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Planned</div>
            <div className="text-xl font-semibold">
              {y.totals.creditsPlanned}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Earned</div>
            <div className="text-xl font-semibold">
              {y.totals.creditsEarned}
            </div>
          </div>
        </div>
      </div>

      {/* Modules list */}
      <div className="space-y-2">
        <div className="text-sm font-medium">
          Modules ({y.modules.length})
        </div>
        <ul className="space-y-2">
          {y.modules.map(m => (
            <li
              key={m.id}
              className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2"
            >
              <span className="truncate">{m.label}</span>
              <Badge variant="outline" size="sm">
                {m.creditsRequired} cr
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* Policy state */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Policy Status</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            {y.policy.transferCapOk ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span>Transfer Cap</span>
            <span className="ml-auto text-muted-foreground">
              {y.totals.transferUsed}/90 cr
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {y.policy.prerequisitesMet ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span>Prerequisites</span>
          </div>
        </div>

        {/* Warnings */}
        {y.policy.warnings.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="text-xs font-medium text-warning">Warnings</div>
            {y.policy.warnings.map((w, i) => (
              <div key={i} className="text-xs text-warning flex items-start gap-2">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Blocks */}
        {y.policy.blocks.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="text-xs font-medium text-destructive">
              Blocking Issues
            </div>
            {y.policy.blocks.map((b, i) => (
              <div key={i} className="text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}

        {y.policy.warnings.length === 0 && y.policy.blocks.length === 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            No policy issues detected
          </div>
        )}
      </div>
    </div>
  );
}
