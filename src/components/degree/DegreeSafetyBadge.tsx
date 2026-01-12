/**
 * Degree Safety Badge
 * 
 * Displays the Degree Safety Score with visual risk band indicator.
 * Conservative, explainable, never exceeds weakest link.
 */

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  DegreeSafetyScore,
  getRiskBandConfig,
} from '@/lib/degree/degreeSafetyScore';

interface DegreeSafetyBadgeProps {
  safetyScore: DegreeSafetyScore;
  compact?: boolean;
  showScore?: boolean;
  className?: string;
}

const RISK_ICONS = {
  'shield-check': ShieldCheck,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
};

export function DegreeSafetyBadge({
  safetyScore,
  compact = false,
  showScore = true,
  className,
}: DegreeSafetyBadgeProps) {
  const config = getRiskBandConfig(safetyScore.riskBand);
  const Icon = RISK_ICONS[config.icon];
  
  const tooltipContent = (
    <div className="space-y-2 max-w-[280px]">
      <div className="flex items-center justify-between">
        <span className="font-medium">Safety Score</span>
        <span className={cn('font-bold', config.color)}>{safetyScore.score}/100</span>
      </div>
      
      <p className="text-sm text-muted-foreground">{safetyScore.recommendation}</p>
      
      {safetyScore.weakestLink && (
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          ⚠️ {safetyScore.weakestLink}
        </div>
      )}
      
      <div className="text-xs space-y-1 pt-1 border-t">
        <div className="font-medium text-muted-foreground">Score breakdown:</div>
        {safetyScore.components.accreditedAnchor > 0 && (
          <div className="flex justify-between">
            <span>Associate anchor</span>
            <span className="text-green-600">+{safetyScore.components.accreditedAnchor}</span>
          </div>
        )}
        {safetyScore.components.policyVerified > 0 && (
          <div className="flex justify-between">
            <span>Policy verified</span>
            <span className="text-green-600">+{safetyScore.components.policyVerified}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Transfer rules</span>
          <span className={safetyScore.components.transferRulesFound > 0 ? 'text-green-600' : 'text-muted-foreground'}>
            +{safetyScore.components.transferRulesFound}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Evidence linked</span>
          <span className={safetyScore.components.evidenceLinked > 0 ? 'text-green-600' : 'text-muted-foreground'}>
            +{safetyScore.components.evidenceLinked}
          </span>
        </div>
        {safetyScore.components.knownProviderBonus > 0 && (
          <div className="flex justify-between">
            <span>Known providers</span>
            <span className="text-green-600">+{safetyScore.components.knownProviderBonus}</span>
          </div>
        )}
      </div>
    </div>
  );
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-full',
                config.bgColor,
                config.borderColor,
                'border',
                className
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', config.color)} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
              config.bgColor,
              config.borderColor,
              'border',
              className
            )}
          >
            <Icon className={cn('w-4 h-4', config.color)} />
            <span className={cn('text-sm font-medium', config.color)}>
              {config.label}
            </span>
            {showScore && (
              <span className={cn('text-sm font-bold', config.color)}>
                {safetyScore.score}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple text-based safety indicator for inline use
 */
export function DegreeSafetyIndicator({
  safetyScore,
  className,
}: {
  safetyScore: DegreeSafetyScore;
  className?: string;
}) {
  const config = getRiskBandConfig(safetyScore.riskBand);
  const Icon = RISK_ICONS[config.icon];
  
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', config.color, className)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{safetyScore.score}/100</span>
    </span>
  );
}
