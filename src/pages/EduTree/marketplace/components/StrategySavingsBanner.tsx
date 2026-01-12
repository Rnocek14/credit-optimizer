import { Badge } from '@/components/ui/badge';
import { TrendingDown, Clock, Info, Sparkles, ShieldCheck, HelpCircle, AlertTriangle } from 'lucide-react';
import type { TemplateStrategySavings } from '@/lib/templateSavingsCalculator';
import { formatSavingsAmount, formatTimeSaved, MIN_WEEKS_TO_SHOW_TIME_SAVED } from '@/lib/templateSavingsCalculator';
import type { TieredSavings } from '@/types/evidenceTiers';
import { formatTieredSavings, shouldShowVerifiedLabel, TIERED_SAVINGS_THRESHOLDS } from '@/lib/tieredSavingsCalculator';
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
  const showVerifiedLabel = tieredSavings ? shouldShowVerifiedLabel(tieredSavings) : false;
  const formattedTiered = tieredSavings ? formatTieredSavings(tieredSavings) : null;
  
  // Determine if we should show "verification pending" warning
  const showPendingWarning = hasTieredData && !tieredSavings.policyVerified;
  const hasMinimalTierA = hasTieredData && tieredSavings.breakdown.tierA.count === 0;
  
  if (variant === 'card') {
    // Compact version for TemplateCard
    return (
      <div className={`rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {showPendingWarning ? 'Estimated Savings' : 'Multi-School Savings'}
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
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Full {savings.anchorSchool}:</span>
            <span className="line-through text-muted-foreground">
              {formatSavingsAmount(savings.baselineCost)}
            </span>
          </div>
          
          {/* Tiered savings display */}
          {hasTieredData && formattedTiered ? (
            <>
              {/* Verified savings (Tier A) */}
              {tieredSavings.guaranteedSavings > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified:
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formattedTiered.verified} ({tieredSavings.guaranteedPercent}%)
                  </span>
                </div>
              )}
              
              {/* Additional possible savings (Tier B) */}
              {tieredSavings.possibleSavings > tieredSavings.guaranteedSavings && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    Additional possible:
                  </span>
                  <span>
                    +{formatSavingsAmount(tieredSavings.possibleSavings - tieredSavings.guaranteedSavings)}
                  </span>
                </div>
              )}
              
              {/* Warning if no verified savings */}
              {hasMinimalTierA && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Verification pending</span>
                </div>
              )}
            </>
          ) : (
            /* Legacy display (no tiered data) */
            <div className="flex justify-between items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                You save:
              </span>
              <span>
                {formatSavingsAmount(savings.dollarSavings)} ({savings.percentSavings}%)
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
  return (
    <div className={`rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-200 dark:border-emerald-800 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
              {hasTieredData && showVerifiedLabel 
                ? `Verified Savings: ${formattedTiered?.verified}`
                : showPendingWarning
                ? 'Estimated Savings (Verification Pending)'
                : `Multi-School Strategy Saves ${formatSavingsAmount(savings.dollarSavings)}`
              }
            </h3>
            {hasTieredData && tieredSavings.policyVerified && (
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                Policy Verified
              </Badge>
            )}
            {showPendingWarning && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
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
          
          {/* Tiered breakdown in full variant */}
          {hasTieredData && formattedTiered && (
            <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Verified
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formattedTiered.verified}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tieredSavings.breakdown.tierA.count} courses
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                  <HelpCircle className="h-4 w-4" />
                  Likely
                </div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  +{formatSavingsAmount(tieredSavings.possibleSavings - tieredSavings.guaranteedSavings)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tieredSavings.breakdown.tierB.count} courses
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
                  <p className="text-xs font-medium mb-1">Savings tiers:</p>
                  <p className="text-xs">
                    <strong>Verified:</strong> Rules with evidence + policy verified<br/>
                    <strong>Likely:</strong> Rules exist but need verification<br/>
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
