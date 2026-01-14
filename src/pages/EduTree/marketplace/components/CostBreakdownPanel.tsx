import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import type { MarketplaceDegreeTemplate, ProviderPricingInfo } from '@/pages/EduTree/v5/types/templates';
import { normalizeProviderCode } from '@/lib/providerNormalization';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CostBreakdownPanelProps {
  template: MarketplaceDegreeTemplate;
  className?: string;
}

interface CostLineItem {
  label: string;
  amount: number;
  detail?: string;
  isSubtotal?: boolean;
  isWarning?: boolean;
  providerCode?: string; // For linking to provenance info
}

/**
 * Format provenance date as relative time with fallback to absolute date
 */
function formatProvenanceDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
  }
}

/**
 * Shows side-by-side line-item cost breakdown for multi-school vs single-school paths.
 * Makes the savings math transparent and defensible.
 */
export function CostBreakdownPanel({ template, className }: CostBreakdownPanelProps) {
  const baseline = template.singleSchoolBaseline;
  const credits = template.totals?.credits ?? 120;
  
  // Calculate optimized path cost breakdown by provider
  const optimizedBreakdown = useMemo(() => {
    const providerCosts = new Map<string, { credits: number; cost: number }>();
    let institutionalCredits = 0;
    let institutionalCost = 0;
    
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        const option = module.options?.find(o => o.courseId === module.recommendedCourseId) 
          || module.options?.[0];
        
        if (!option) return;
        
        const credits = option.credits || 3;
        const cost = option.cost_usd || 0;
        
        if (option.providerCode) {
          const normalizedProvider = normalizeProviderCode(option.providerCode);
          const existing = providerCosts.get(normalizedProvider) || { credits: 0, cost: 0 };
          providerCosts.set(normalizedProvider, {
            credits: existing.credits + credits,
            cost: existing.cost + cost,
          });
        } else {
          // Institutional course
          institutionalCredits += credits;
          institutionalCost += cost;
        }
      });
    });
    
    return {
      byProvider: Array.from(providerCosts.entries())
        .map(([provider, data]) => ({
          provider,
          credits: data.credits,
          cost: data.cost,
        }))
        .sort((a, b) => b.cost - a.cost),
      institutional: { credits: institutionalCredits, cost: institutionalCost },
      total: template.totals.costUsd,
    };
  }, [template.yearTemplates, template.totals.costUsd]);

  // Build line items for optimized path
  // Build line items for optimized path
  const optimizedItems: CostLineItem[] = useMemo(() => {
    const items: CostLineItem[] = [];
    
    // Alt-credit providers
    optimizedBreakdown.byProvider.forEach(({ provider, credits, cost }) => {
      items.push({
        label: `${provider}`,
        amount: cost,
        detail: `${credits} credits`,
        providerCode: provider, // For provenance lookup
      });
    });
    
    // Institutional courses (if any)
    if (optimizedBreakdown.institutional.credits > 0) {
      items.push({
        label: `${template.anchorSchool} (in-residence)`,
        amount: optimizedBreakdown.institutional.cost,
        detail: `${optimizedBreakdown.institutional.credits} credits`,
      });
    }
    
    // Total
    items.push({
      label: 'Total',
      amount: optimizedBreakdown.total,
      isSubtotal: true,
    });
    
    return items;
  }, [optimizedBreakdown, template.anchorSchool]);
  
  // Get provider pricing info for a given provider code
  const getProviderProvenance = (providerCode: string | undefined): ProviderPricingInfo | null => {
    if (!providerCode || !template.providerPricing) return null;
    return template.providerPricing[providerCode] || null;
  };

  // Build line items for baseline path
  const baselineItems: CostLineItem[] = useMemo(() => {
    if (!baseline) return [];
    
    const items: CostLineItem[] = [];
    
    // Label as "total (tuition + fees)" since we can't split them
    // Use baseline.source and baseline.notes for provenance info
    items.push({
      label: `${template.anchorSchool} total`,
      amount: baseline.costUsd,
      detail: baseline.notes || `${credits} credits (tuition + fees)`,
    });
    
    items.push({
      label: 'Total',
      amount: baseline.costUsd,
      isSubtotal: true,
    });
    
    return items;
  }, [baseline, template.anchorSchool, credits]);

  // Check for in-state-only pricing warning (data-driven only, no school-name fallback)
  const isInStateOnly = template.pricingMetadata?.inStateOnly === true;
  
  if (!baseline) {
    return null;
  }

  const savings = baseline.costUsd - template.totals.costUsd;
  const savingsPercent = Math.round((savings / baseline.costUsd) * 100);

  return (
    <Collapsible className={cn("rounded-lg border bg-card", className)}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Cost Breakdown</span>
            <Badge variant="secondary" className="text-xs">
              See the math
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        {/* Baseline assumption warning */}
        <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Baseline Assumption (Worst-Case)</p>
              <p>
                "{template.anchorSchool} baseline" represents completing all {credits} credits 
                directly at {template.anchorSchool} without any transfer credits. Most students transfer some credits, 
                which would reduce this baseline.
              </p>
              {baseline.source && (
                <p className="mt-1 text-muted-foreground">Source: {baseline.source}</p>
              )}
            </div>
          </div>
        </div>

        {/* In-state only pricing warning */}
        {isInStateOnly && (
          <div className="mb-4 p-3 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-orange-800 dark:text-orange-200">
                <p className="font-medium mb-1">Residency Pricing</p>
                <p>
                  {template.pricingMetadata?.residencyNote || 
                    `${template.anchorSchool} pricing shown may be for in-state residents only. Out-of-state students may pay higher rates.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Optimized Path */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Multi-School Path
            </h4>
            <div className="space-y-2">
              {optimizedItems.map((item, idx) => {
                const provenance = getProviderProvenance(item.providerCode);
                const verifiedDate = formatProvenanceDate(provenance?.provenanceVerifiedAt);
                const updatedDate = formatProvenanceDate(provenance?.updatedAt);
                
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "flex justify-between text-xs",
                      item.isSubtotal && "border-t pt-1.5 mt-1.5 font-semibold"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span>{item.label}</span>
                        {provenance?.isEstimated && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-600 border-amber-300">
                            Estimated
                          </Badge>
                        )}
                      </div>
                      {item.detail && (
                        <span className="text-[10px] text-muted-foreground">{item.detail}</span>
                      )}
                      {/* Provider provenance info */}
                      {provenance && !item.isSubtotal && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {provenance.sourceUrl ? (
                            <a 
                              href={provenance.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[9px] text-primary/70 hover:text-primary flex items-center gap-0.5"
                            >
                              Source <ExternalLink className="h-2 w-2" />
                            </a>
                          ) : null}
                          {verifiedDate && (
                            <span className="text-[9px] text-muted-foreground">
                              • Verified {verifiedDate}
                            </span>
                          )}
                          {!verifiedDate && updatedDate && (
                            <span className="text-[9px] text-muted-foreground">
                              • Updated {updatedDate} (unverified)
                            </span>
                          )}
                          {!verifiedDate && !updatedDate && !provenance.isEstimated && (
                            <span className="text-[9px] text-muted-foreground">
                              • Date unknown
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={cn(item.isSubtotal && "text-emerald-600 dark:text-emerald-400")}>
                      ${item.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Baseline Path */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-muted-foreground">
                All Credits at {template.anchorSchool}
              </h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Worst-case baseline: completing {credits} credits entirely at {template.anchorSchool} 
                      at the standard rate. No transfer credits applied.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-1.5">
              {baselineItems.map((item, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex justify-between text-xs",
                    item.isSubtotal && "border-t pt-1.5 mt-1.5 font-semibold"
                  )}
                >
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.detail && (
                      <span className="text-[10px] text-muted-foreground">{item.detail}</span>
                    )}
                  </div>
                  <span className={cn(
                    item.isSubtotal && "line-through text-muted-foreground"
                  )}>
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Savings summary */}
        <div className="mt-4 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Potential Savings (vs. worst-case)
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${savings.toLocaleString()} ({savingsPercent}%)
            </span>
          </div>
        </div>
        
        {/* Rates disclaimer */}
        <p className="mt-3 text-[10px] text-muted-foreground text-center">
          Rates can change — verify with providers before purchasing.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
