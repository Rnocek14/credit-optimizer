import { Badge } from '@/components/ui/badge';
import { ProviderBadge } from './ProviderBadge';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { ArrowRight, TrendingDown, Clock, DollarSign, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YearComparisonTableProps {
  template: MarketplaceDegreeTemplate;
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

  // Calculate totals
  const baselineTotalCost = baseline.costUsd;
  const baselineTotalWeeks = baseline.weeks;
  const multiSchoolTotalCost = template.totals.costUsd;
  const multiSchoolTotalWeeks = template.totals.weeks;
  
  const totalSavings = baselineTotalCost - multiSchoolTotalCost;
  const savingsPercent = Math.round((totalSavings / baselineTotalCost) * 100);
  const weeksSaved = baselineTotalWeeks - multiSchoolTotalWeeks;
  const monthsSaved = Math.round(weeksSaved / 4.33);

  return (
    <div className="space-y-4">
      {/* Year by Year Comparison */}
      {baseline.yearBreakdown.map((baselineYear, idx) => {
        const multiSchoolYear = template.yearTemplates?.[idx];
        const multiSchoolOption = multiSchoolYear?.moduleTemplates?.[0]?.options?.[0];
        
        // Calculate year savings
        const multiSchoolCost = multiSchoolOption?.cost_usd || 0;
        const multiSchoolWeeks = multiSchoolOption?.duration_weeks || 0;
        const yearSavings = baselineYear.costUsd - multiSchoolCost;
        const yearWeeksSaved = baselineYear.weeks - multiSchoolWeeks;
        
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
                  {template.anchorSchool} Direct
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
                {multiSchoolOption ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {multiSchoolOption.title}
                      </span>
                      {multiSchoolOption.providerCode && (
                        <ProviderBadge 
                          providerCode={multiSchoolOption.providerCode as any}
                          className="text-[10px]"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {multiSchoolOption.credits}cr
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <DollarSign className="h-3 w-3" />
                        ${multiSchoolCost.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {multiSchoolWeeks}wk
                      </span>
                    </div>
                    
                    {/* Year Savings */}
                    {yearSavings > 0 && (
                      <div className="flex items-center gap-2 mt-2">
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
              <div className="text-muted-foreground">{template.anchorSchool} Direct</div>
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
