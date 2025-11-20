import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';
import { formatCost, formatCredits } from '@/pages/EduTree/v5/utils/formatters';
import { PolicyStatusPill } from './PolicyStatusPill';
import type { OptimizedPlanResult } from '@/types/optimizer';

interface TemplateComparisonPopoverProps {
  standard: OptimizedPlanResult | undefined;
  altMax: OptimizedPlanResult | undefined;
  institutionName: string;
}

export function TemplateComparisonPopover({
  standard,
  altMax,
  institutionName,
}: TemplateComparisonPopoverProps) {
  // Don't show if we don't have both templates
  if (!standard || !altMax) {
    return null;
  }

  const s = standard.metrics;
  const a = altMax.metrics;

  const costDelta = s.estTotalCostUsd - a.estTotalCostUsd;
  const altPctStandard = s.totalCredits > 0 
    ? Math.round((s.totalAltCredits / s.totalCredits) * 100) 
    : 0;
  const altPctAlt = a.totalCredits > 0 
    ? Math.round((a.totalAltCredits / a.totalCredits) * 100) 
    : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Compare Paths
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[500px] p-4" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">
              {institutionName} BSBA Path Comparison
            </h3>
            <p className="text-xs text-muted-foreground">
              Standard vs Alt-Credit Max paths side-by-side
            </p>
          </div>

          {costDelta > 0 && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                💡 Save ~{formatCost(costDelta)} with Alt-Credit Max
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Standard Column */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <div className="text-xs font-semibold text-foreground mb-1">Standard</div>
                <p className="text-[10px] text-muted-foreground">
                  {institutionName} courses first
                </p>
              </div>

              <div className="space-y-2">
                <MetricRow 
                  label="Cost" 
                  value={formatCost(s.estTotalCostUsd)} 
                  highlight={costDelta > 0}
                />
                <MetricRow 
                  label="Total Credits" 
                  value={formatCredits(s.totalCredits)} 
                />
                <MetricRow 
                  label="Alt Credits" 
                  value={`${formatCredits(s.totalAltCredits)} (${altPctStandard}%)`} 
                />
                <MetricRow 
                  label="Residency" 
                  value={formatCredits(s.totalInstitutionalCredits)} 
                />
              </div>

              <div className="pt-2 border-t border-border">
                <PolicyStatusPill warnings={standard.warnings} size="sm" showLabel={false} />
              </div>
            </div>

            {/* Alt-Credit Max Column */}
            <div className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
              <div>
                <div className="text-xs font-semibold text-foreground mb-1">Alt-Credit Max</div>
                <p className="text-[10px] text-muted-foreground">
                  CLEP/Sophia/Study.com first
                </p>
              </div>

              <div className="space-y-2">
                <MetricRow 
                  label="Cost" 
                  value={formatCost(a.estTotalCostUsd)} 
                  highlight={costDelta > 0}
                  isWinner={costDelta > 0}
                />
                <MetricRow 
                  label="Total Credits" 
                  value={formatCredits(a.totalCredits)} 
                />
                <MetricRow 
                  label="Alt Credits" 
                  value={`${formatCredits(a.totalAltCredits)} (${altPctAlt}%)`} 
                  isWinner
                />
                <MetricRow 
                  label="Residency" 
                  value={formatCredits(a.totalInstitutionalCredits)} 
                />
              </div>

              <div className="pt-2 border-t border-border">
                <PolicyStatusPill warnings={altMax.warnings} size="sm" showLabel={false} />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Cost estimates are provisional. Always verify with {institutionName}'s official sources.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  isWinner?: boolean;
}

function MetricRow({ label, value, highlight, isWinner }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span 
        className={`font-medium ${
          isWinner 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-foreground'
        }`}
      >
        {value}
        {isWinner && <span className="ml-1">✓</span>}
      </span>
    </div>
  );
}
