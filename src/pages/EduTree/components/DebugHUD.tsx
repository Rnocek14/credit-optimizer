/**
 * Debug HUD for Compare-Any view development
 * Shows node state, counts, and provides validation tools
 */

import React, { useState, useCallback } from 'react';
import { Bug, Target, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrackHighlights } from '../hooks/useTrackComparison';

interface DebugHUDProps {
  highlights: TrackHighlights;
  onSwapTracks?: () => void;
  onRunValidation?: () => void;
  className?: string;
}

interface NodeDebugInfo {
  nodeId: string;
  inPrimary: boolean;
  inComparison: boolean;
  isShared: boolean;
  isDim: boolean;
}

export function DebugHUD({ 
  highlights, 
  onSwapTracks, 
  onRunValidation,
  className = '' 
}: DebugHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<NodeDebugInfo | null>(null);

  // Calculate totals
  const totals = {
    primary: highlights.primaryNodes.size,
    comparison: highlights.comparisonNodes.size,
    shared: highlights.sharedNodes.size,
    dimmed: 0 // Will be calculated from total nodes - highlighted nodes
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      onSwapTracks?.();
    }
  }, [onSwapTracks]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Log state changes for debugging
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.table({
        'Primary Nodes': totals.primary,
        'Comparison Nodes': totals.comparison, 
        'Shared Nodes': totals.shared,
        'Primary Edges': highlights.primaryEdges.size,
        'Comparison Edges': highlights.comparisonEdges.size,
        'Shared Edges': highlights.sharedEdges.size
      });
    }
  }, [highlights, totals]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={`debug-hud bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg ${className}`}>
        <div className="flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Debug HUD</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <Target className="w-3 h-3" />
          </Button>
        </div>

        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Live Counts */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">Live Counts</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-blue-400">Primary:</span>
                  <span className="font-mono">{totals.primary}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pink-400">Comparison:</span>
                  <span className="font-mono">{totals.comparison}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Shared:</span>
                  <span className="font-mono">{totals.shared}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Edges:</span>
                  <span className="font-mono">{highlights.primaryEdges.size + highlights.comparisonEdges.size}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-foreground">Quick Actions</div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSwapTracks}
                      className="h-7 text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Swap (S)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Swap A/B selections (Hotkey: S)</p>
                  </TooltipContent>
                </Tooltip>

                {onRunValidation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRunValidation}
                    className="h-7 text-xs"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Validate
                  </Button>
                )}
              </div>
            </div>

            {/* Hover Info */}
            {hoveredNodeInfo && (
              <div className="space-y-1 p-2 bg-accent/50 rounded text-xs">
                <div className="font-medium">Node: {hoveredNodeInfo.nodeId}</div>
                <div className="space-y-0.5 font-mono">
                  <div>inA: {hoveredNodeInfo.inPrimary ? 'true' : 'false'}</div>
                  <div>inB: {hoveredNodeInfo.inComparison ? 'true' : 'false'}</div>
                  <div>shared: {hoveredNodeInfo.isShared ? 'true' : 'false'}</div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-xs text-muted-foreground border-t border-border pt-2">
              <div>• Hover nodes to see debug info</div>
              <div>• Press 'S' to swap A/B tracks</div>
              <div>• Check console for detailed logs</div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}