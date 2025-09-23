/**
 * Mode banner for Compare-Any view
 * Shows active comparison state and instructions
 */

import React from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompareModeHeaderProps {
  primaryLabel?: string;
  comparisonLabel?: string;
  onSwap?: () => void;
  onClose?: () => void;
  className?: string;
}

export function CompareModeHeader({
  primaryLabel = 'Selection A',
  comparisonLabel = 'Selection B',
  onSwap,
  onClose,
  className = ''
}: CompareModeHeaderProps) {
  return (
    <div className={`compare-mode-header bg-primary/10 border border-primary/20 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-primary">Compare:</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-700 rounded text-xs font-medium">
              A = {primaryLabel}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="px-2 py-1 bg-pink-500/20 text-pink-700 rounded text-xs font-medium">
              B = {comparisonLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Shift+Click adds to B • S swaps A/B
          </span>
          
          {onSwap && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwap}
              className="h-7 text-xs"
            >
              <ArrowLeftRight className="w-3 h-3 mr-1" />
              Swap
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}