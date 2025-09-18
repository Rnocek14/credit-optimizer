import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';

interface LayoutStatusPanelProps {
  nodes: any[];
  edges: any[];
  isLayouting: boolean;
  layoutPassCount: number;
}

export function LayoutStatusPanel({ nodes, edges, isLayouting, layoutPassCount }: LayoutStatusPanelProps) {
  const [layoutLocked, setLayoutLocked] = useState(false);
  const isPhaseA = resolveEduTreePhaseAFlag();
  
  useEffect(() => {
    setLayoutLocked(document.body.classList.contains('phaseA-layout-locked'));
  }, [layoutPassCount]);

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="fixed top-20 right-4 p-4 z-50 bg-background/90 backdrop-blur-sm text-sm">
      <div className="space-y-2">
        <h3 className="font-semibold text-primary">Layout Status</h3>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Mode:</span>
          <span className={isPhaseA ? 'text-green-600 font-medium' : 'text-blue-600'}>
            {isPhaseA ? 'PhaseA' : 'Standard'}
          </span>
          
          <span className="text-muted-foreground">Nodes:</span>
          <span className="font-mono">{nodes.length}</span>
          
          <span className="text-muted-foreground">Edges:</span>
          <span className="font-mono">{edges.length}</span>
          
          <span className="text-muted-foreground">Layouting:</span>
          <span className={isLayouting ? 'text-orange-600' : 'text-green-600'}>
            {isLayouting ? 'YES' : 'NO'}
          </span>
          
          <span className="text-muted-foreground">Layout Passes:</span>
          <span className={`font-mono ${layoutPassCount > 1 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
            {layoutPassCount}
          </span>
          
          <span className="text-muted-foreground">Position Lock:</span>
          <span className={`font-medium ${layoutLocked ? 'text-green-600' : 'text-gray-600'}`}>
            {layoutLocked ? 'LOCKED' : 'FREE'}
          </span>
        </div>
        
        {layoutPassCount > 1 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            ⚠️ Multiple layout passes detected! This causes scrambling.
          </div>
        )}
        
        {layoutLocked && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            ✅ Layout frozen - no more repositioning allowed
          </div>
        )}
      </div>
    </Card>
  );
}