import { Badge } from '@/components/ui/badge';
import { TrendingDown, Clock, Info, Sparkles, ShieldCheck, HelpCircle, AlertTriangle } from 'lucide-react';
import type { TemplateStrategySavings } from '@/lib/templateSavingsCalculator';
import { formatSavingsAmount, formatTimeSaved, MIN_WEEKS_TO_SHOW_TIME_SAVED } from '@/lib/templateSavingsCalculator';
import type { TieredSavings } from '@/types/evidenceTiers';
import { formatTieredSavings, shouldShowVerifiedLabel } from '@/lib/tieredSavingsCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StrategySavingsBannerProps {
  savings: TemplateStrategySavings;
  tieredSavings?: TieredSavings | null;
  variant?: 'card' | 'full';
  className?: string;
}

/**
 * Displays the savings from using a multi-school strategy vs single-school
 * Now with evidence-tiered savings display
 */
export function StrategySavingsBanner({ 
  savings, 
  tieredSavings,
  variant = 'card', 
  className = '' 
}: StrategySavingsBannerProps) {
  const timeSavedText = formatTimeSaved(savings.weeksSaved);
  const hasTieredData = !!tieredSavings;
  const formattedTiered = tieredSavings ? formatTieredSavings(tieredSavings) : null;
  
  // Calculate verification percentage (confidence layer, not blocker)
  const verificationPercent = hasTieredData && tieredSavings.totalCourses > 0
    ? Math.round(((tieredSavings.breakdown.tierA.count + tieredSavings.breakdown.tierB.count) / tieredSavings.totalCourses) * 100)
    : 0;
  
  const verifiedCount = hasTieredData ? tieredSavings.breakdown.tierA.count : 0;
  const totalCourses = hasTieredData ? tieredSavings.totalCourses : 0;
  
  if (variant === 'card') {
    // Compact version for TemplateCard
    return (
      <div className={`rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Plan Savings
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-emerald-600/70 dark:text-emerald-400/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  {savings.baselineSource}
                  {savings.baselineNotes && <span className="block mt-1 opacity-80">{savings.baselineNotes}</span>}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="space-y-1">
          {/* ALWAYS show plan savings (cost math) - this is the primary number */}
          <div className="flex justify-between items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              You save:
            </span>
            <span>
              {formatSavingsAmount(savings.dollarSavings)} ({savings.percentSavings}%)
            </span>
          </div>
          
          {/* Cost comparison */}
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Full {savings.anchorSchool}:</span>
            <span className="line-through">
              {formatSavingsAmount(savings.baselineCost)}
            </span>
          </div>
          
          {/* Verification status as confidence layer (not blocker) */}
          {hasTieredData && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
              <ShieldCheck className="h-3 w-3" />
              <span>
                {verifiedCount > 0 
                  ? `${verifiedCount} of ${totalCourses} courses verified`
                  : `${totalCourses} courses with transfer rules`
                }
              </span>
            </div>
          )}
          
          {savings.weeksSaved > MIN_WEEKS_TO_SHOW_TIME_SAVED && timeSavedText && (
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time saved:
              </span>
              <span>{timeSavedText} faster</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Full-width banner version
  const showVerifiedLabel = tieredSavings ? shouldShowVerifiedLabel(tieredSavings) : false;
  
  return (
    <div className={`rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-200 dark:border-emerald-800 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* ALWAYS show plan savings as the headline */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
              Plan Savings: {formatSavingsAmount(savings.dollarSavings)} ({savings.percentSavings}%)
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-0.5">Full {savings.anchorSchool} Direct:</div>
              <div className="line-through text-lg text-muted-foreground">
                {formatSavingsAmount(savings.baselineCost)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">This Multi-School Path:</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatSavingsAmount(savings.optimizedCost)}
              </div>
            </div>
          </div>
          
          {/* Verification status as confidence layer */}
          {hasTieredData && formattedTiered && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {verifiedCount > 0 
                    ? `${verifiedCount} of ${totalCourses} courses verified`
                    : `${totalCourses} courses with transfer rules`
                  }
                </span>
                {showVerifiedLabel && (
                  <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    Policy Verified
                  </Badge>
                )}
              </div>
              
              {/* Tier breakdown */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Verified
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {tieredSavings.breakdown.tierA.count} courses
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formattedTiered.verified} savings
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                    <HelpCircle className="h-4 w-4" />
                    Likely
                  </div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {tieredSavings.breakdown.tierB.count} courses
                  </div>
                  <div className="text-xs text-muted-foreground">
                    +{formatSavingsAmount(tieredSavings.possibleSavings - tieredSavings.guaranteedSavings)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Unverified
                  </div>
                  <div className="text-lg font-bold text-muted-foreground">
                    {tieredSavings.breakdown.tierC.count} courses
                  </div>
                  <div className="text-xs text-muted-foreground">
                    needs verification
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              ✓ Same {savings.anchorSchool} degree
            </span>
            {savings.weeksSaved > MIN_WEEKS_TO_SHOW_TIME_SAVED && timeSavedText && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeSavedText} faster
              </span>
            )}
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p className="text-xs font-medium mb-1">Baseline source:</p>
              <p className="text-xs">{savings.baselineSource}</p>
              {savings.baselineNotes && (
                <p className="text-xs mt-1 opacity-80">{savings.baselineNotes}</p>
              )}
              {hasTieredData && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium mb-1">Verification tiers:</p>
                  <p className="text-xs">
                    <strong>Verified:</strong> Rules with evidence URL + high confidence<br/>
                    <strong>Likely:</strong> Rules exist with reasonable confidence<br/>
                    <strong>Unverified:</strong> No transfer rules found
                  </p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
