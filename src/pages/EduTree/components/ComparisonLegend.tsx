/**
 * Enhanced Comparison Legend with accessibility features and clear visual hierarchy
 * Replaces the basic DualSelectionLegend with better UX
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { COPY } from '../constants/copy';

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
    dim: number;
  };
  onPulseNodes?: (type: 'primary' | 'comparison' | 'shared') => void;
}

export function ComparisonLegend({
  primaryTrack,
  comparisonTrack,
  isVisible = true,
  onToggleVisibility,
  showCounts,
  onPulseNodes
}: ComparisonLegendProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('comparison-legend-expanded') !== 'false';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('comparison-legend-expanded', String(isExpanded));
    }
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!primaryTrack && !comparisonTrack) {
    return null;
  }

  return (
    <TooltipProvider>
      <section 
        className="comparison-legend fixed top-20 left-4 z-40 bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg max-w-sm pointer-events-none"
        aria-label={COPY.trackComparison}
        role="region"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{COPY.trackComparison}</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{COPY.trackComparisonTooltip}</p>
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
                aria-label={isVisible ? COPY.hideTrackComparison : COPY.showTrackComparison}
                aria-pressed={isVisible}
              >
                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="h-6 w-6 p-0"
              aria-label={isExpanded ? COPY.collapseComparison : COPY.expandComparison}
              aria-expanded={isExpanded}
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
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded p-1 -m-1"
                onClick={() => onPulseNodes?.('primary')}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border-2 rounded-sm flex-shrink-0"
                    style={{ 
                      background: 'oklch(0.95 0.03 220)',
                      borderColor: 'oklch(0.60 0.15 220)'
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {primaryTrack.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{COPY.primaryTrack}</span>
                  </div>
                </div>
                {showCounts && showCounts.primary != null && (
                  <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full font-mono">
                    {showCounts.primary}
                  </span>
                )}
              </div>
            )}

            {/* Comparison Track */}
            {comparisonTrack && (
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded p-1 -m-1"
                onClick={() => onPulseNodes?.('comparison')}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border-2 border-dashed rounded-sm flex-shrink-0"
                    style={{ 
                      background: 'oklch(0.95 0.03 15)',
                      borderColor: 'oklch(0.70 0.15 15)'
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {comparisonTrack.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{COPY.comparisonTrack}</span>
                  </div>
                </div>
                {showCounts && showCounts.comparison != null && (
                  <span className="text-xs px-2 py-1 bg-pink-500/10 text-pink-600 rounded-full font-mono">
                    {showCounts.comparison}
                  </span>
                )}
              </div>
            )}

            {/* Shared Requirements */}
            {primaryTrack && comparisonTrack && (
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded p-1 -m-1"
                onClick={() => onPulseNodes?.('shared')}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border-2 rounded-sm flex-shrink-0"
                    style={{ 
                      background: `repeating-linear-gradient(
                        45deg,
                        oklch(0.95 0.03 220) 0 4px,
                        oklch(0.95 0.03 15) 4px 8px
                      )`,
                      borderColor: 'oklch(0.70 0.12 142)',
                      borderWidth: '2px'
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {COPY.sharedRequirements}
                    </span>
                    <span className="text-xs text-muted-foreground">{COPY.commonToBoth}</span>
                  </div>
                </div>
                {showCounts && showCounts.shared != null && (
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded-full font-mono">
                    {showCounts.shared}
                  </span>
                )}
              </div>
            )}

            {/* Dimmed Items */}
            {showCounts && showCounts.dim != null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 border rounded-sm flex-shrink-0 opacity-50"
                    style={{ 
                      backgroundColor: 'transparent',
                      borderColor: 'oklch(0.60 0.00 0 / 0.4)'
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-muted-foreground">
                      Other Courses
                    </span>
                    <span className="text-xs text-muted-foreground">Not in selection</span>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-500/10 text-gray-600 rounded-full font-mono">
                  {showCounts.dim}
                </span>
              </div>
            )}

            {/* Additional Info */}
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-muted rounded opacity-50" />
                <span>{COPY.coursesNotInTracks}</span>
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                {COPY.hoverForDetails}
              </div>
            </div>
          </div>
        )}
      </section>
    </TooltipProvider>
  );
}