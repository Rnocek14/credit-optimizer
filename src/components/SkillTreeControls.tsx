import React from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Map, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SkillTreeControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  onReset: () => void;
  onToggleMinimap: () => void;
  showMinimap: boolean;
  onToggleFilters?: () => void;
  showFilters?: boolean;
  className?: string;
  disabled?: boolean;
}

export const SkillTreeControls: React.FC<SkillTreeControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onReset,
  onToggleMinimap,
  showMinimap,
  onToggleFilters,
  showFilters = false,
  className,
  disabled = false
}) => {
  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <div className={cn(
      "fixed bottom-4 left-4 z-40 flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border/50 rounded-lg shadow-lg p-2",
      className
    )}>
      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={disabled || zoomLevel <= 0.1}
          className="h-8 w-8 p-0"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground min-w-12 text-center">
          {zoomPercentage}%
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={disabled || zoomLevel >= 3}
          className="h-8 w-8 p-0"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* View Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToView}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Fit to View"
        >
          <Maximize className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Feature Toggles */}
      <div className="flex items-center gap-1">
        <Button
          variant={showMinimap ? "default" : "ghost"}
          size="sm"
          onClick={onToggleMinimap}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title={showMinimap ? "Hide Minimap" : "Show Minimap"}
        >
          <Map className="h-4 w-4" />
        </Button>
        
        {onToggleFilters && (
          <Button
            variant={showFilters ? "default" : "ghost"}
            size="sm"
            onClick={onToggleFilters}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title={showFilters ? "Hide Filters" : "Show Filters"}
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground pl-2">
        <span>Scroll to zoom • Drag to pan</span>
      </div>
    </div>
  );
};