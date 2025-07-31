import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, Zap, Settings } from 'lucide-react';

export type LayoutMode = 'hierarchy' | 'force' | 'circular' | 'tree' | 'focus';

export interface LayoutControlsProps {
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onRecalculateLayout: () => void;
  onResetView: () => void;
  forceStrength?: number;
  onForceStrengthChange?: (strength: number) => void;
  animationSpeed?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  isCalculating?: boolean;
  nodeCount?: number;
  edgeCount?: number;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({
  layoutMode,
  onLayoutModeChange,
  onRecalculateLayout,
  onResetView,
  forceStrength = 0.5,
  onForceStrengthChange,
  animationSpeed = 1,
  onAnimationSpeedChange,
  isCalculating = false,
  nodeCount = 0,
  edgeCount = 0,
}) => {
  const layoutModeLabels = {
    hierarchy: 'Hierarchical',
    force: 'Force-Directed',
    circular: 'Circular',
    tree: 'Tree',
    focus: 'Focus'
  };

  const layoutModeDescriptions = {
    hierarchy: 'Structured layer-based layout',
    force: 'Physics-based relationship layout',
    circular: 'Concentric circles by type',
    tree: 'Tree structure from root nodes',
    focus: 'Center on specific node'
  };

  return (
    <Card className="p-4 space-y-4 w-80">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4" />
        <h3 className="font-semibold">Layout Controls</h3>
      </div>
      
      <Separator />
      
      {/* Layout Mode Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Layout Mode</label>
        <Select value={layoutMode} onValueChange={onLayoutModeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(layoutModeLabels).map(([mode, label]) => (
              <SelectItem key={mode} value={mode}>
                <div className="flex flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {layoutModeDescriptions[mode as LayoutMode]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Force Settings (only for force-directed modes) */}
      {layoutMode === 'force' && onForceStrengthChange && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Force Strength: {forceStrength.toFixed(2)}
          </label>
          <Slider
            value={[forceStrength]}
            onValueChange={(value) => onForceStrengthChange(value[0])}
            min={0.1}
            max={2.0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Weak</span>
            <span>Strong</span>
          </div>
        </div>
      )}

      {/* Animation Speed */}
      {onAnimationSpeedChange && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Animation Speed: {animationSpeed.toFixed(1)}x
          </label>
          <Slider
            value={[animationSpeed]}
            onValueChange={(value) => onAnimationSpeedChange(value[0])}
            min={0.1}
            max={3.0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={onRecalculateLayout}
          disabled={isCalculating}
          className="w-full"
          variant="default"
        >
          {isCalculating ? (
            <>
              <Zap className="w-4 h-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Recalculate Layout
            </>
          )}
        </Button>
        
        <Button
          onClick={onResetView}
          variant="outline"
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset View
        </Button>
      </div>

      <Separator />

      {/* Stats */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Graph Statistics</label>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">
            {nodeCount} Nodes
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {edgeCount} Edges
          </Badge>
        </div>
      </div>

      {/* Layout Mode Info */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>{layoutModeLabels[layoutMode]}:</strong>{' '}
          {layoutModeDescriptions[layoutMode]}
        </p>
      </div>
    </Card>
  );
};