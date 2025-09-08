import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GhostInfo } from '@/lib/pathfinding/ghosting';

export interface GhostNodeProps {
  id: string;
  title: string;
  ghostInfo: GhostInfo;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GhostNode({ 
  id, 
  title, 
  ghostInfo, 
  children, 
  className, 
  onClick 
}: GhostNodeProps) {
  const isGhost = ghostInfo.isGhost;
  
  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all duration-200",
        isGhost 
          ? "opacity-50 border-dashed border-muted-foreground/30 bg-muted/20" 
          : "border-border bg-card hover:shadow-md",
        "motion-safe:hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className={cn(
          "font-medium text-sm",
          isGhost ? "text-muted-foreground" : "text-foreground"
        )}>
          {title}
        </h4>
        
        {isGhost && ghostInfo.reason && (
          <Badge 
            variant="outline" 
            className="text-xs opacity-75 border-dashed"
          >
            Unavailable
          </Badge>
        )}
      </div>
      
      {children}
      
      {isGhost && ghostInfo.reason && (
        <div className="mt-2 p-2 bg-muted/30 rounded border-dashed border border-muted-foreground/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Reason:</span> {ghostInfo.reason}
          </p>
          {ghostInfo.details && Object.entries(ghostInfo.details).map(([key, value]) => (
            <p key={key} className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">{key}:</span> {value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export interface GhostEdgeProps {
  isGhost: boolean;
  ghostInfo?: GhostInfo;
  className?: string;
}

export function GhostEdge({ isGhost, ghostInfo, className }: GhostEdgeProps) {
  if (!isGhost) return null;
  
  return (
    <div 
      className={cn(
        "border-l-2 border-dashed border-muted-foreground/30 ml-4 pl-4 opacity-50",
        className
      )}
    >
      {ghostInfo?.reason && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border-dashed border border-muted-foreground/30">
          Transfer blocked: {ghostInfo.reason}
        </div>
      )}
    </div>
  );
}

// Ghost path legend component
export function GhostPathLegend() {
  return (
    <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-dashed">
      <h4 className="font-medium text-sm text-foreground">Ghost Paths Legend</h4>
      
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-dashed border-muted-foreground/30 bg-muted/20 opacity-50 rounded-sm" />
          <span className="text-muted-foreground">Unavailable options (constraints not met)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-solid border-border bg-card rounded-sm" />
          <span className="text-muted-foreground">Available options</span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-dashed border-muted-foreground/30">
        <p className="text-xs text-muted-foreground">
          Ghost paths show what would be possible with different constraints or prerequisites
        </p>
      </div>
    </div>
  );
}

// Utility to get ghost styling for React Flow nodes/edges
export function getGhostNodeStyle(isGhost: boolean) {
  return {
    opacity: isGhost ? 0.5 : 1,
    filter: isGhost ? 'grayscale(0.3)' : 'none',
    borderStyle: isGhost ? 'dashed' : 'solid',
    borderWidth: isGhost ? '2px' : '1px',
    borderColor: isGhost ? 'hsl(var(--muted-foreground) / 0.3)' : 'hsl(var(--border))',
    backgroundColor: isGhost 
      ? 'hsl(var(--muted) / 0.2)' 
      : 'hsl(var(--card))',
    transition: 'all 0.2s ease-in-out'
  };
}

export function getGhostEdgeStyle(isGhost: boolean) {
  return {
    opacity: isGhost ? 0.4 : 1,
    strokeDasharray: isGhost ? '8,4' : 'none',
    stroke: isGhost 
      ? 'hsl(var(--muted-foreground) / 0.4)' 
      : 'hsl(var(--border))',
    strokeWidth: isGhost ? 1 : 2,
    filter: isGhost ? 'grayscale(0.5)' : 'none',
    transition: 'all 0.2s ease-in-out'
  };
}

// Toggle component for ghost path visibility
export function GhostPathToggle({ 
  showGhosts, 
  onToggle 
}: { 
  showGhosts: boolean; 
  onToggle: (show: boolean) => void; 
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card rounded-lg border">
      <input
        type="checkbox"
        id="ghost-paths-toggle"
        checked={showGhosts}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
      />
      <label 
        htmlFor="ghost-paths-toggle" 
        className="text-sm font-medium text-foreground cursor-pointer"
      >
        Show Alternative Paths
      </label>
      <div className="w-3 h-3 border border-dashed border-muted-foreground/30 bg-muted/20 opacity-50 rounded-sm ml-2" />
    </div>
  );
}