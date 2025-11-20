import { useOptimizedTemplatesForProgram } from '@/hooks/useOptimizedTemplates';
import { formatCost } from '@/pages/EduTree/v5/utils/formatters';

export function TesuBsbaMarketplace() {
  const { optimizedTemplates, isLoading } = useOptimizedTemplatesForProgram('TESU', 'BSBA');

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">TESU BSBA Templates</h2>
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      </div>
    );
  }

  if (!optimizedTemplates.length) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">TESU BSBA Templates</h2>
        <p className="text-sm text-muted-foreground">No templates available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">TESU BSBA Templates</h2>
          <p className="text-sm text-muted-foreground">
            Compare standard vs alt-credit-maximized paths.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {optimizedTemplates.map(({ template, optimized }) => {
          const { metrics, warnings } = optimized;
          const altPct =
            metrics.totalCredits > 0
              ? Math.round((metrics.totalAltCredits / metrics.totalCredits) * 100)
              : 0;

          const trackLabel =
            template.track_type === 'alt_max'
              ? 'Alt-Credit Max'
              : template.track_type === 'standard'
              ? 'Standard'
              : template.track_type;

          const hasWarnings = Object.keys(warnings).length > 0;

          return (
            <button
              key={template.id}
              type="button"
              className="flex flex-col items-stretch rounded-xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{trackLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    TESU • BSBA • {metrics.totalCredits} credits
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {optimized.mode}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 px-4 py-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Estimated Cost</div>
                  <div className="font-semibold text-foreground">
                    {formatCost(metrics.estTotalCostUsd)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alt Credits</div>
                  <div className="font-semibold text-foreground">
                    {metrics.totalAltCredits} cr
                    <span className="ml-1 text-xs text-muted-foreground">({altPct}%)</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">TESU Residency</div>
                  <div className="font-semibold text-foreground">
                    {metrics.totalInstitutionalCredits} cr
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-4 py-2">
                {hasWarnings ? (
                  <p className="text-xs text-amber-600">
                    ⚠️ This plan may exceed TESU policy caps. Review before enrolling.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600">
                    ✅ Meets TESU alt-credit and residency rules based on current data.
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
