import { useNavigate } from 'react-router-dom';
import { useOptimizedTemplatesForProgram } from '@/hooks/useOptimizedTemplates';
import { formatCost } from '@/pages/EduTree/v5/utils/formatters';
import { PolicyStatusPill } from './PolicyStatusPill';
import { TemplateComparisonPopover } from './TemplateComparisonPopover';
import type { InstitutionCode } from '@/types/degreeTemplates';

interface BsbaMarketplaceProps {
  institutionCode: InstitutionCode;
  institutionName: string;
}

export function BsbaMarketplace({ institutionCode, institutionName }: BsbaMarketplaceProps) {
  const navigate = useNavigate();
  const { optimizedTemplates, isLoading } = useOptimizedTemplatesForProgram(
    institutionCode,
    'BSBA'
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{institutionName} BSBA Templates</h2>
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      </div>
    );
  }

  if (!optimizedTemplates.length) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{institutionName} BSBA Templates</h2>
        <p className="text-sm text-muted-foreground">No templates available yet.</p>
      </div>
    );
  }

  // Get both templates for comparison popover
  const standardTemplate = optimizedTemplates.find(t => t.template.track_type === 'standard');
  const altMaxTemplate = optimizedTemplates.find(t => t.template.track_type === 'alt_max');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{institutionName} BSBA Templates</h2>
          <p className="text-sm text-muted-foreground">
            Compare standard vs alt-credit-maximized paths.
          </p>
        </div>
        {standardTemplate && altMaxTemplate && (
          <TemplateComparisonPopover
            standard={standardTemplate.optimized}
            altMax={altMaxTemplate.optimized}
            institutionName={institutionName}
          />
        )}
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

          // Check if we have both templates for this card's comparison button
          const otherTemplate = template.track_type === 'standard' ? altMaxTemplate : standardTemplate;
          const hasComparison = standardTemplate && altMaxTemplate;

          return (
            <div 
              key={template.id}
              className="group relative flex flex-col items-stretch rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() =>
                  navigate('/edu-tree-v5', {
                    state: {
                      optimizedPlan: optimized,
                    },
                  })
                }
                className="flex flex-col items-stretch flex-1 text-left"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{trackLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {institutionName} • BSBA • {metrics.totalCredits} credits
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
                    <div className="text-xs text-muted-foreground">{institutionName} Residency</div>
                    <div className="font-semibold text-foreground">
                      {metrics.totalInstitutionalCredits} cr
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 py-2">
                  <PolicyStatusPill warnings={warnings} />
                </div>
              </button>

              {/* Compare button overlay */}
              {hasComparison && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TemplateComparisonPopover
                    standard={standardTemplate.optimized}
                    altMax={altMaxTemplate.optimized}
                    institutionName={institutionName}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
