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
import { ChevronDown, Info, AlertTriangle } from 'lucide-react';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { normalizeProviderCode } from '@/lib/providerNormalization';
import { cn } from '@/lib/utils';

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
}

/**
 * Shows side-by-side line-item cost breakdown for multi-school vs single-school paths.
 * Makes the savings math transparent and defensible.
 */
export function CostBreakdownPanel({ template, className }: CostBreakdownPanelProps) {
  const baseline = template.singleSchoolBaseline;
  
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
  const optimizedItems: CostLineItem[] = useMemo(() => {
    const items: CostLineItem[] = [];
    
    // Alt-credit providers
    optimizedBreakdown.byProvider.forEach(({ provider, credits, cost }) => {
      items.push({
        label: `${provider}`,
        amount: cost,
        detail: `${credits} credits`,
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

  // Build line items for baseline path
  const baselineItems: CostLineItem[] = useMemo(() => {
    if (!baseline) return [];
    
    const items: CostLineItem[] = [];
    const credits = template.totals.credits || 120;
    
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
  }, [baseline, template.anchorSchool, template.totals.credits]);

  // Check for in-state-only pricing warning (data-driven, not hardcoded)
  // Fall back to EMPIRE check if pricingMetadata not available
  const isInStateOnly = template.pricingMetadata?.inStateOnly ?? (template.anchorSchool === 'EMPIRE');
  
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
                "{template.anchorSchool} baseline" represents completing all {template.totals.credits} credits 
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
            <div className="space-y-1.5">
              {optimizedItems.map((item, idx) => (
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
                  <span className={cn(item.isSubtotal && "text-emerald-600 dark:text-emerald-400")}>
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
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
                      Worst-case baseline: completing {template.totals.credits} credits entirely at {template.anchorSchool} 
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
      </CollapsibleContent>
    </Collapsible>
  );
}
