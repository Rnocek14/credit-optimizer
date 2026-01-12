/**
 * Associate Anchor Badge
 * 
 * Displays whether a target school accepts AA/AS degrees
 * for block transfer, making transfer risk dramatically lower.
 */

import React from 'react';
import { GraduationCap, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  getAssociateAnchorSummary,
  getAssociateArticulation,
} from '@/types/associateDegree';

interface AssociateAnchorBadgeProps {
  targetSchool: string;
  compact?: boolean;
  className?: string;
}

export function AssociateAnchorBadge({
  targetSchool,
  compact = false,
  className,
}: AssociateAnchorBadgeProps) {
  const summary = getAssociateAnchorSummary(targetSchool);
  const articulation = getAssociateArticulation(targetSchool);
  
  if (!summary || !summary.available) {
    return null;  // Don't show badge if no anchor available
  }
  
  const tooltipContent = (
    <div className="space-y-2 max-w-[280px]">
      <div className="font-medium flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-primary" />
        Associate Degree Anchor Available
      </div>
      
      <p className="text-sm text-muted-foreground">
        Completing an AA/AS degree before transferring significantly reduces risk.
      </p>
      
      <div className="text-sm space-y-1 pt-1 border-t">
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-green-600" />
          <span>Up to {summary.maxCredits} credits accepted</span>
        </div>
        {summary.genEdWaived && (
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-green-600" />
            <span>Gen ed requirements waived</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-green-600" />
          <span>Only {summary.residencyRequired} credits residency</span>
        </div>
      </div>
      
      {articulation?.evidenceUrl && (
        <div className="text-xs text-muted-foreground pt-1 border-t">
          <a 
            href={articulation.evidenceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            View official policy →
          </a>
        </div>
      )}
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
                'bg-primary/10 border border-primary/20',
                className
              )}
            >
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
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
              'bg-primary/10 border border-primary/20',
              className
            )}
          >
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              AA/AS Anchor
            </span>
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
 * Inline text indicator for associate anchor
 */
export function AssociateAnchorIndicator({
  targetSchool,
  className,
}: {
  targetSchool: string;
  className?: string;
}) {
  const summary = getAssociateAnchorSummary(targetSchool);
  
  if (!summary?.available) {
    return null;
  }
  
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-primary', className)}>
      <GraduationCap className="w-3 h-3" />
      <span>AA/AS accepted</span>
    </span>
  );
}
