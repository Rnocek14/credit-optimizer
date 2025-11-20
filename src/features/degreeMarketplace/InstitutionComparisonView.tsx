import { useOptimizedTemplatesForProgram } from '@/hooks/useOptimizedTemplates';
import { formatCost, formatCredits } from '@/pages/EduTree/v5/utils/formatters';
import { PolicyStatusPill } from './PolicyStatusPill';
import type { InstitutionCode } from '@/types/degreeTemplates';
import type { OptimizedPlanResult } from '@/types/optimizer';

interface InstitutionData {
  code: InstitutionCode;
  name: string;
}

const INSTITUTIONS: InstitutionData[] = [
  { code: 'TESU', name: 'TESU' },
  { code: 'COSC', name: 'COSC' },
];

export function InstitutionComparisonView() {
  const tesuData = useOptimizedTemplatesForProgram('TESU', 'BSBA');
  const coscData = useOptimizedTemplatesForProgram('COSC', 'BSBA');

  const isLoading = tesuData.isLoading || coscData.isLoading;

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Institution Comparison</h2>
        <p className="text-sm text-muted-foreground">Loading comparison data…</p>
      </div>
    );
  }

  // Get best templates for each institution (prefer alt_max for comparison)
  const tesuBest = tesuData.optimizedTemplates.find(t => t.template.track_type === 'alt_max') 
    || tesuData.optimizedTemplates[0];
  const coscBest = coscData.optimizedTemplates.find(t => t.template.track_type === 'alt_max')
    || coscData.optimizedTemplates[0];

  if (!tesuBest && !coscBest) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Institution Comparison</h2>
        <p className="text-sm text-muted-foreground">
          No templates available for comparison yet.
        </p>
      </div>
    );
  }

  const institutions = [
    tesuBest ? { institution: INSTITUTIONS[0], data: tesuBest.optimized } : null,
    coscBest ? { institution: INSTITUTIONS[1], data: coscBest.optimized } : null,
  ].filter(Boolean) as { institution: InstitutionData; data: OptimizedPlanResult }[];

  // Calculate winner for each metric
  const costs = institutions.map(i => i.data.metrics.estTotalCostUsd);
  const lowestCostIdx = costs.indexOf(Math.min(...costs));
  
  const altCredits = institutions.map(i => i.data.metrics.totalAltCredits);
  const highestAltIdx = altCredits.indexOf(Math.max(...altCredits));

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">TESU vs COSC — BSBA Comparison</h2>
        <p className="text-sm text-muted-foreground">
          Comparing alt-credit-maximized paths across anchor schools. All estimates are
          provisional and should be verified with official sources.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Metric
              </th>
              {institutions.map(({ institution }) => (
                <th
                  key={institution.code}
                  className="text-left py-3 px-4 text-sm font-semibold text-foreground"
                >
                  {institution.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Track Type */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">Track Type</td>
              {institutions.map(({ institution, data }) => (
                <td key={institution.code} className="py-3 px-4 text-sm">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {data.trackType === 'alt_max' ? 'Alt-Credit Max' : data.trackType}
                  </span>
                </td>
              ))}
            </tr>

            {/* Estimated Cost */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">Estimated Cost</td>
              {institutions.map(({ institution, data }, idx) => {
                const isWinner = idx === lowestCostIdx && institutions.length > 1;
                return (
                  <td key={institution.code} className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isWinner ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                        }`}
                      >
                        {formatCost(data.metrics.estTotalCostUsd)}
                      </span>
                      {isWinner && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ Lowest
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Total Credits */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">Total Credits</td>
              {institutions.map(({ institution, data }) => (
                <td key={institution.code} className="py-3 px-4 text-sm font-medium">
                  {formatCredits(data.metrics.totalCredits)}
                </td>
              ))}
            </tr>

            {/* Alt Credits */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">Alt Credits</td>
              {institutions.map(({ institution, data }, idx) => {
                const altPct = data.metrics.totalCredits > 0
                  ? Math.round((data.metrics.totalAltCredits / data.metrics.totalCredits) * 100)
                  : 0;
                const isWinner = idx === highestAltIdx && institutions.length > 1;
                return (
                  <td key={institution.code} className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          isWinner ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                        }`}
                      >
                        {formatCredits(data.metrics.totalAltCredits)}{' '}
                        <span className="text-xs text-muted-foreground">({altPct}%)</span>
                      </span>
                      {isWinner && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          ✓ Most
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Institutional Residency */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">
                Institutional Residency
              </td>
              {institutions.map(({ institution, data }) => (
                <td key={institution.code} className="py-3 px-4 text-sm font-medium">
                  {formatCredits(data.metrics.totalInstitutionalCredits)}
                </td>
              ))}
            </tr>

            {/* Alt Credit Cap */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">Alt Credit Cap</td>
              {institutions.map(({ institution, data }) => (
                <td key={institution.code} className="py-3 px-4 text-sm">
                  {data.metrics.altCreditCap != null
                    ? `${data.metrics.altCreditCap} cr`
                    : 'N/A'}
                </td>
              ))}
            </tr>

            {/* Min Residency Required */}
            <tr className="border-b border-border/50">
              <td className="py-3 px-4 text-sm text-muted-foreground">
                Min Residency Required
              </td>
              {institutions.map(({ institution, data }) => (
                <td key={institution.code} className="py-3 px-4 text-sm">
                  {data.metrics.minResidencyRequired != null
                    ? `${data.metrics.minResidencyRequired} cr`
                    : 'N/A'}
                </td>
              ))}
            </tr>

            {/* Policy Status */}
            <tr>
              <td className="py-3 px-4 text-sm text-muted-foreground">Policy Status</td>
              {institutions.map(({ institution, data }) => (
                <td key={institution.code} className="py-3 px-4">
                  <PolicyStatusPill warnings={data.warnings} size="sm" showLabel />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg bg-muted/50 p-4">
        <h3 className="text-sm font-semibold mb-2">Key Takeaways</h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            • Both institutions offer similar degree structures with ~120 total credits
          </li>
          <li>
            • Alt-credit maximization can significantly reduce total cost at both schools
          </li>
          <li>
            • Policy compliance varies by institution—always verify current requirements
          </li>
          <li>
            • Green checkmarks (✓) indicate the best value for that specific metric
          </li>
        </ul>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        All cost and credit estimates are based on placeholder data. Consult each institution's
        official catalog and transfer evaluation policies before making enrollment decisions.
      </p>
    </div>
  );
}
