/**
 * CRI Boost Chip Component
 * Shows visual indicator when recommendations are boosted by CRI gaps
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRIBoostChipProps {
  boostPercentage: number;
  explanation: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function CRIBoostChip({ 
  boostPercentage, 
  explanation, 
  className = '',
  size = 'default'
}: CRIBoostChipProps) {
  if (boostPercentage <= 0) return null;

  const getBoostColor = (percentage: number) => {
    if (percentage >= 30) return 'var(--destructive)'; // Red for high boost
    if (percentage >= 15) return 'oklch(0.70 0.15 50)'; // Orange for medium boost
    return 'oklch(0.85 0.15 85)'; // Yellow for low boost
  };

  const boostColor = getBoostColor(boostPercentage);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
           <Badge 
             variant="outline" 
             className={cn(
               "gap-1 border-2 text-xs font-medium",
               size === 'sm' && "px-1.5 py-0.5 text-xs",
               className
             )}
             style={{ 
               borderColor: boostColor,
               color: boostColor,
               backgroundColor: `color-mix(in oklch, ${boostColor} 10%, transparent)`
             }}
             data-testid="cri-boost-chip"
           >
            <Zap className={cn(
              "fill-current",
              size === 'sm' ? "h-2.5 w-2.5" : "h-3 w-3"
            )} />
            CRI +{Math.round(boostPercentage)}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <TrendingUp className="h-3 w-3" />
              CRI Boost Applied
            </div>
            <p className="text-xs text-muted-foreground">
              {explanation}
            </p>
            <p className="text-xs text-muted-foreground">
              This recommendation addresses your skill gaps and boosts your Career Readiness Index.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}