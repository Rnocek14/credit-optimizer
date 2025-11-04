import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { CapMeter } from '@/components/lifePathGraph/CapMeter';
import type { YearNodeVM } from '@/lib/degree/yearNodes';

interface YearNodeComponentProps {
  data: YearNodeVM;
  onToggle?: (yearId: string) => void;
}

/**
 * Year node component for ReactFlow canvas
 * Displays aggregated year totals, policy state, and CapMeter
 */
export function YearNodeComponent({ data, onToggle }: YearNodeComponentProps) {
  const y = data;

  return (
    <Card
      className="w-[340px] rounded-2xl shadow-lg border-2 hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onToggle?.(y.id)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {y.collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="text-lg font-semibold">Year {y.year}</div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" size="sm">
              {y.totals.creditsEarned}/{y.totals.creditsRequired} cr
            </Badge>
            {!y.policy.transferCapOk && (
              <Badge variant="destructive" size="sm">
                <AlertCircle className="h-3 w-3 mr-1" />
                Transfer Cap
              </Badge>
            )}
          </div>
        </div>

        {/* CapMeter */}
        <CapMeter
          transferUsed={y.totals.transferUsed}
          transferCap={90}
          examUsed={y.totals.examCredits}
          examCap={30}
          residencyRequired={30}
          residencyMet={y.totals.residencyCredits}
        />

        {/* Collapsed: Summary */}
        {y.collapsed && (
          <div className="text-sm text-muted-foreground">
            Cost est: ${y.totals.costEstimated.toFixed(0)} · Longest{' '}
            {y.totals.weeksEstimated}w
          </div>
        )}

        {/* Expanded: Details */}
        {!y.collapsed && (
          <div className="space-y-3">
            {/* Category breakdown */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Requirements</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(y.totals.byCategory).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <div className="text-muted-foreground capitalize">{k}</div>
                    <div className="font-medium">
                      {v.credits} cr {v.satisfied ? '✓' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Policy warnings */}
            {y.policy.warnings.length > 0 && (
              <div className="text-xs text-warning space-y-1">
                {y.policy.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Policy blocks */}
            {y.policy.blocks.length > 0 && (
              <div className="text-xs text-destructive space-y-1">
                {y.policy.blocks.map((b, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Module count */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              {y.modules.length} modules
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
