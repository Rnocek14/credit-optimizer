import { Badge } from '@/components/ui/badge';
import { ProviderBadge } from './ProviderBadge';
import type { MarketplaceDegreeTemplate, YearTemplate } from '@/pages/EduTree/v5/types/templates';
import { ArrowRight, TrendingDown, Clock, DollarSign, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface YearComparisonTableProps {
  template: MarketplaceDegreeTemplate;
}

interface YearTotals {
  cost: number;
  weeks: number;
  credits: number;
  providers: string[];
  courseLabels: string[];
}

/**
 * Computes aggregated totals for a year by summing all modules.
 * Uses recommendedCourseId to select the option, falls back to first option.
 * Uses ADDITIVE weeks model to match template.totals semantics.
 */
function computeYearTotals(yearTemplate: YearTemplate | undefined): YearTotals {
  if (!yearTemplate?.moduleTemplates) {
    return { cost: 0, weeks: 0, credits: 0, providers: [], courseLabels: [] };
  }

  let totalCost = 0;
  let totalWeeks = 0; // Additive model for consistency with template.totals
  let totalCredits = 0;
  const providers: string[] = [];
  const courseLabels: string[] = [];

  for (const module of yearTemplate.moduleTemplates) {
    // Select option via recommendedCourseId, fallback to first
    const option = module.options?.find(
      o => o.courseId === module.recommendedCourseId
    ) || module.options?.[0];

    if (!option) continue;

    totalCost += option.cost_usd || 0;
    totalWeeks += option.duration_weeks || 0; // Additive weeks
    totalCredits += option.credits || 0;

    if (option.providerCode && !providers.includes(option.providerCode)) {
      providers.push(option.providerCode);
    }
    if (option.title) {
      courseLabels.push(option.title);
    }
  }

  return { cost: totalCost, weeks: totalWeeks, credits: totalCredits, providers, courseLabels };
}

/**
 * Extracts a clean baseline source label from the source string.
 * Falls back to "{anchorSchool} Direct" if no source provided.
 */
function getBaselineLabel(source: string | undefined, anchorSchool: string): string {
  if (!source) return `${anchorSchool} Direct`;
  
  // Extract the main part before parentheses if present
  const mainPart = source.split('(')[0]?.trim();
  return mainPart || `${anchorSchool} Direct`;
}

export function YearComparisonTable({ template }: YearComparisonTableProps) {
  const baseline = template.singleSchoolBaseline;
  
  if (!baseline?.yearBreakdown) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No comparison data available for this template.
      </div>
    );
  }

  // Precompute all year totals once (not inside render loop)
  const multiSchoolYearTotals = useMemo(() => {
    return baseline.yearBreakdown!.map((_, idx) => 
      computeYearTotals(template.yearTemplates?.[idx])
    );
  }, [template.yearTemplates, baseline.yearBreakdown]);

  // Calculate overall totals
  const baselineTotalCost = baseline.costUsd;
  const baselineTotalWeeks = baseline.weeks;
  const multiSchoolTotalCost = template.totals.costUsd;
  const multiSchoolTotalWeeks = template.totals.weeks;
  
  const totalSavings = baselineTotalCost - multiSchoolTotalCost;
  const savingsPercent = baselineTotalCost > 0 
    ? Math.round((totalSavings / baselineTotalCost) * 100) 
    : 0;
  const weeksSaved = baselineTotalWeeks - multiSchoolTotalWeeks;
  const monthsSaved = Math.round(weeksSaved / 4.33);

  // Get the baseline label from source (trust fix)
  const baselineLabel = getBaselineLabel(baseline.source, template.anchorSchool);

  return (
    <div className="space-y-4">
      {/* Year by Year Comparison */}
      {baseline.yearBreakdown.map((baselineYear, idx) => {
        const yearTotals = multiSchoolYearTotals[idx];
        
        // Calculate year savings using aggregated totals
        const yearSavings = baselineYear.costUsd - yearTotals.cost;
        const yearWeeksSaved = baselineYear.weeks - yearTotals.weeks;
        
        return (
          <div key={idx} className="rounded-lg border bg-card overflow-hidden">
            {/* Year Header */}
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h4 className="font-semibold text-sm">Year {baselineYear.year} Comparison</h4>
            </div>
            
            <div className="grid grid-cols-[1fr,auto,1fr] gap-0">
              {/* Single School Column */}
              <div className="p-4 bg-muted/20">
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  {baselineLabel}
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm">
                    {baselineYear.courseLabel || baselineYear.label}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {baselineYear.credits}cr
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${baselineYear.costUsd.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {baselineYear.weeks}wk
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Arrow Divider */}
              <div className="flex items-center justify-center px-2 bg-muted/10">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              
              {/* Multi-School Column */}
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  Multi-School Strategy
                </div>
                {yearTotals.cost > 0 || yearTotals.credits > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {yearTotals.courseLabels.length === 1 
                          ? yearTotals.courseLabels[0]
                          : `${yearTotals.courseLabels.length} courses combined`
                        }
                      </span>
                      {/* Show all providers involved in this year */}
                      {yearTotals.providers.map(code => (
                        <ProviderBadge 
                          key={code}
                          providerCode={code as any}
                          className="text-[10px]"
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {yearTotals.credits}cr
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <DollarSign className="h-3 w-3" />
                        ${yearTotals.cost.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {yearTotals.weeks}wk
                      </span>
                    </div>
                    
                    {/* Year Savings */}
                    {yearSavings > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Save ${yearSavings.toLocaleString()}
                        </Badge>
                        {yearWeeksSaved > 4 && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {yearWeeksSaved}wk faster
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Total Savings Summary */}
      <div className={cn(
        "rounded-lg border-2 p-4",
        "bg-gradient-to-r from-emerald-50 to-blue-50",
        "dark:from-emerald-950/30 dark:to-blue-950/30",
        "border-emerald-200 dark:border-emerald-800"
      )}>
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">Total Comparison</div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">{baselineLabel}</div>
              <div className="font-semibold text-lg">${baselineTotalCost.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{Math.round(baselineTotalWeeks / 4.33)} months</div>
            </div>
            <div>
              <div className="text-muted-foreground">Multi-School</div>
              <div className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">
                ${multiSchoolTotalCost.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">{Math.round(multiSchoolTotalWeeks / 4.33)} months</div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              🎉 Save ${totalSavings.toLocaleString()} ({savingsPercent}%)
              {monthsSaved > 0 && ` + ${monthsSaved} months faster`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
