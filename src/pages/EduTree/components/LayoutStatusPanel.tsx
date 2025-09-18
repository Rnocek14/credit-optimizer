import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';

interface LayoutStatusPanelProps {
  nodes: any[];
  edges: any[];
  isLayouting: boolean;
  layoutPassCount: number;
  isLayoutLocked?: boolean;
}

export function LayoutStatusPanel({ nodes, edges, isLayouting, layoutPassCount, isLayoutLocked }: LayoutStatusPanelProps) {
  const [cssLocked, setCssLocked] = useState(false);
  const isPhaseA = resolveEduTreePhaseAFlag();
  
  useEffect(() => {
    setCssLocked(document.body.classList.contains('phaseA-layout-locked'));
  }, [layoutPassCount]);

  if (!import.meta.env.DEV) return null;

  const actuallyLocked = isLayoutLocked || cssLocked;

  return (
    <Card className="fixed top-20 right-4 p-4 z-50 bg-background/90 backdrop-blur-sm text-sm">
      <div className="space-y-2">
        <h3 className="font-semibold text-primary">Layout Status</h3>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Mode:</span>
          <span className={isPhaseA ? 'text-green-600 font-medium' : 'text-blue-600'}>
            {isPhaseA ? `PhaseA${actuallyLocked ? ' (LOCKED)' : ' (Stable)'}` : 'Standard'}
          </span>
          
          <span className="text-muted-foreground">Nodes:</span>
          <span className="font-mono">{nodes.length}</span>
          
          <span className="text-muted-foreground">Edges:</span>
          <span className="font-mono">{edges.length}</span>
          
          <span className="text-muted-foreground">Layouting:</span>
          <span className={isLayouting ? 'text-orange-600' : 'text-green-600'}>
            {isLayouting ? 'YES' : 'NO'}
          </span>
          
          <span className="text-muted-foreground">Layout Attempts:</span>
          <span className={`font-mono ${layoutPassCount > 1 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
            {layoutPassCount}
            {actuallyLocked && <span className="text-yellow-600 ml-1">🔒</span>}
          </span>
          
          <span className="text-muted-foreground">Position Lock:</span>
          <span className={`font-medium ${actuallyLocked ? 'text-green-600' : 'text-gray-600'}`}>
            {actuallyLocked ? 'CIRCUIT BREAKER ACTIVE' : 'FREE'}
          </span>
        </div>
        
        {/* Layout Status Messages */}
        {layoutPassCount > 1 && !actuallyLocked && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
            ⚠️ Multiple layout attempts detected! Locking layout...
          </div>
        )}

        {actuallyLocked && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-700 dark:text-green-300">
            🔒 Circuit breaker active - positions frozen to prevent scrambling
          </div>
        )}
      </div>
    </Card>
  );
}