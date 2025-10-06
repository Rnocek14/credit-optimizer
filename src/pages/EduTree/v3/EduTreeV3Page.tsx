import React, { useMemo } from 'react';
import { dummyGraph } from './dev/dummyGraph';
import { buildGraph } from './engine';
import { DevToolbar } from './dev/DevToolbar';

export function EduTreeV3Page() {
  const built = useMemo(() => buildGraph(dummyGraph), []);
  
  return (
    <>
      <DevToolbar nodes={built.nodes} />
      <div className="p-6 space-y-4 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold">EduTree V3 - Engine Demo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week 1: Pure layout engine with collision-free positioning
          </p>
        </div>
        
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium mb-3">Positioned Nodes</h2>
          <ol className="list-decimal pl-5 space-y-2">
            {built.nodes.map(n => (
              <li key={n.id} className="text-sm font-mono">
                <span className="font-semibold">{n.id}</span> 
                {' '}—{' '}
                <span className="text-muted-foreground">
                  x: {n.position.x}, y: {n.position.y}
                </span>
                {' '}
                <span className="text-xs opacity-70">
                  ({n.data.programId}{n.data.trackId ? `/${n.data.trackId}` : ''})
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="text-xs text-muted-foreground">
          Click "Validate Overlaps" in the top-left corner to verify collision-free layout.
        </div>
      </div>
    </>
  );
}
