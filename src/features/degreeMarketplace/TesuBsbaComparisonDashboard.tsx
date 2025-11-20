import * as React from 'react';
import { useOptimizedTemplatesForProgram } from '@/hooks/useOptimizedTemplates';
import type { InstitutionCode } from '@/types/degreeTemplates';
import { formatCost, formatCredits } from '@/pages/EduTree/v5/utils/formatters';

const TESU: InstitutionCode = 'TESU';

export function TesuBsbaComparisonDashboard() {
  const { optimizedTemplates, isLoading } = useOptimizedTemplatesForProgram(TESU, 'BSBA');

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">TESU BSBA Comparison</h2>
        <p className="text-sm text-muted-foreground">Loading optimized templates…</p>
      </div>
    );
  }

  if (!optimizedTemplates.length) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">TESU BSBA Comparison</h2>
        <p className="text-sm text-muted-foreground">
          No optimized templates available yet. Seed at least a Standard and Alt-Credit Max template.
        </p>
      </div>
    );
  }

  const standard = optimizedTemplates.find(
    (t) => t.template.track_type === 'standard',
  );
  const altMax = optimizedTemplates.find(
    (t) => t.template.track_type === 'alt_max',
  );

  if (!standard || !altMax) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">TESU BSBA Comparison</h2>
        <p className="text-sm text-muted-foreground">
          Need both a Standard and Alt-Credit Max template to compare.
        </p>
      </div>
    );
  }

  const s = standard.optimized.metrics;
  const a = altMax.optimized.metrics;

  const costDelta = s.estTotalCostUsd - a.estTotalCostUsd;
  const altPctStandard =
    s.totalCredits > 0
      ? Math.round((s.totalAltCredits / s.totalCredits) * 100)
      : 0;
  const altPctAlt =
    a.totalCredits > 0
      ? Math.round((a.totalAltCredits / a.totalCredits) * 100)
      : 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">TESU BSBA – Path Comparison</h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Compare institutional-heavy vs alt-credit-heavy paths by cost, credits, and residency.
          </p>
        </div>

        {costDelta > 0 && (
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Save ~{formatCost(costDelta)} with Alt-Credit Max
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Standard */}
        <ComparisonCard
          label="Standard"
          subtitle="TESU courses first"
          metrics={s}
          altPercent={altPctStandard}
          mode={standard.optimized.mode}
        />

        {/* Alt-Credit Max */}
        <ComparisonCard
          label="Alt-Credit Max"
          subtitle="CLEP/Sophia/Study.com first"
          metrics={a}
          altPercent={altPctAlt}
          mode={altMax.optimized.mode}
          highlight
        />
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground md:text-xs">
        Estimates based on placeholder cost-per-credit values. Always verify with TESU's official
        tuition and partner pages before advising students.
      </p>
    </div>
  );
}

interface ComparisonCardProps {
  label: string;
  subtitle: string;
  metrics: {
    totalCredits: number;
    totalAltCredits: number;
    totalInstitutionalCredits: number;
    estTotalCostUsd: number;
  };
  altPercent: number;
  mode: string;
  highlight?: boolean;
}

function ComparisonCard({
  label,
  subtitle,
  metrics,
  altPercent,
  mode,
  highlight,
}: ComparisonCardProps) {
  return (
    <div
      className={[
        'flex flex-col justify-between rounded-xl border px-4 py-3',
        highlight ? 'border-emerald-500/60 shadow-md' : 'border-border',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold md:text-base">{label}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {mode}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground md:text-xs">{subtitle}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:text-sm">
        <Metric label="Estimated Cost" value={formatCost(metrics.estTotalCostUsd)} />
        <Metric label="Total Credits" value={formatCredits(metrics.totalCredits)} />
        <Metric
          label="Alt Credits"
          value={`${formatCredits(metrics.totalAltCredits)} (${altPercent}%)`}
        />
        <Metric
          label="TESU Residency"
          value={formatCredits(metrics.totalInstitutionalCredits)}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium md:text-sm">{value}</span>
    </div>
  );
}
