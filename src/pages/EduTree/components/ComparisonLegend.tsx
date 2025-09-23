/**
 * Enhanced Comparison Legend with accessibility features and clear visual hierarchy
 * Replaces the basic DualSelectionLegend with better UX
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComparisonLegendProps {
  primaryTrack?: {
    id: string;
    name: string;
    color: string;
  };
  comparisonTrack?: {
    id: string;
    name: string;
    color: string;
  };
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  showCounts?: {
    primary: number;
    comparison: number;
    shared: number;
  };
}

export function ComparisonLegend({
  primaryTrack,
  comparisonTrack,
  isVisible = true,
  onToggleVisibility,
  showCounts
}: ComparisonLegendProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem('comparison-legend-expanded') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    try {
      localStorage.setItem('comparison-legend-expanded', String(newExpanded));
    } catch {
      // ignore localStorage errors
    }
  };

  if (!primaryTrack && !comparisonTrack) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="fixed top-20 left-4 z-50 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">Track Comparison</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Visual comparison of educational pathways</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            {onToggleVisibility && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleVisibility(!isVisible)}
                className="h-6 w-6 p-0"
              >
                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Legend Content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Primary Track */}
            {primaryTrack && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border-2 rounded-sm flex-shrink-0"
                    style={{ 
                      backgroundColor: `var(--lp-primary-light)`,
                      borderColor: `var(--lp-primary)`
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {primaryTrack.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Primary Track</span>
                  </div>
                </div>
                {showCounts?.primary && (
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {showCounts.primary}
                  </span>
                )}
              </div>
            )}

            {/* Comparison Track */}
            {comparisonTrack && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border-2 border-dashed rounded-sm flex-shrink-0"
                    style={{ 
                      backgroundColor: `var(--lp-compare-light)`,
                      borderColor: `var(--lp-compare)`
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {comparisonTrack.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Comparison Track</span>
                  </div>
                </div>
                {showCounts?.comparison && (
                  <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-600 rounded-full">
                    {showCounts.comparison}
                  </span>
                )}
              </div>
            )}

            {/* Shared Requirements */}
            {primaryTrack && comparisonTrack && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border-4 rounded-sm flex-shrink-0"
                    style={{ 
                      backgroundColor: `var(--lp-shared-light)`,
                      borderColor: `var(--lp-shared)`
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      Shared Requirements
                    </span>
                    <span className="text-xs text-muted-foreground">Common to both</span>
                  </div>
                </div>
                {showCounts?.shared && (
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded-full">
                    {showCounts.shared}
                  </span>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-muted rounded opacity-50" />
                <span>Courses not in selected tracks are dimmed</span>
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                Hover over courses for detailed information
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}