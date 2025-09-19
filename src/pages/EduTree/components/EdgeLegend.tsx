import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface EdgeLegendProps {
  show?: boolean;
}

export function EdgeLegend({ show = true }: EdgeLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('edutree-legend-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    try {
      localStorage.setItem('edutree-legend-collapsed', String(newCollapsed));
    } catch {
      // ignore localStorage errors
    }
  };

  if (!show) return null;

  return (
    <div className="absolute top-4 right-4 z-50 bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
      <button
        onClick={toggleCollapsed}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-foreground hover:bg-accent/50 rounded-t-lg"
        aria-expanded={!isCollapsed}
        aria-label="Toggle edge legend"
      >
        <span>Edge Types</span>
        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
      
      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-0.5 rounded"
              style={{ 
                background: 'rgba(255,255,255,0.92)',
                height: '5px'
              }}
            />
            <span className="text-muted-foreground">Gate (thick)</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-0.5 bg-border rounded"
              style={{ height: '2px' }}
            />
            <span className="text-muted-foreground">Prerequisite</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-0.5 bg-border rounded"
              style={{ 
                height: '2px',
                background: 'repeating-linear-gradient(90deg, hsl(var(--border)), hsl(var(--border)) 2px, transparent 2px, transparent 4px)'
              }}
            />
            <span className="text-muted-foreground">Advisory</span>
          </div>
        </div>
      )}
    </div>
  );
}