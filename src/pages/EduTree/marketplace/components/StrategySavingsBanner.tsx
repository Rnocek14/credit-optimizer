import { Badge } from '@/components/ui/badge';
import { TrendingDown, Clock, Info, Sparkles } from 'lucide-react';
import type { TemplateStrategySavings } from '@/lib/templateSavingsCalculator';
import { formatSavingsAmount, formatTimeSaved } from '@/lib/templateSavingsCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StrategySavingsBannerProps {
  savings: TemplateStrategySavings;
  variant?: 'card' | 'full';
  className?: string;
}

/**
 * Displays the savings from using a multi-school strategy vs single-school
 */
export function StrategySavingsBanner({ savings, variant = 'card', className = '' }: StrategySavingsBannerProps) {
  const timeSavedText = formatTimeSaved(savings.weeksSaved);
  
  if (variant === 'card') {
    // Compact version for TemplateCard
    return (
      <div className={`rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Multi-School Savings
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
          <div className="flex justify-between items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              You save:
            </span>
            <span>
              {formatSavingsAmount(savings.dollarSavings)} ({savings.percentSavings}%)
            </span>
          </div>
          {savings.weeksSaved > 8 && timeSavedText && (
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
              Multi-School Strategy Saves {formatSavingsAmount(savings.dollarSavings)}
            </h3>
            <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
              {savings.percentSavings}% off
            </Badge>
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
          
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              ✓ Same {savings.anchorSchool} degree
            </span>
            {savings.weeksSaved > 8 && timeSavedText && (
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
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
