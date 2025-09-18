/**
 * EduTree Canvas V2 - Clean slate implementation
 * Bypasses all legacy layout systems when flags are active
 */

import React, { useCallback, useEffect } from 'react';
import { ReactFlow, useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import { useEduTreeV2Data } from './hooks/useEduTreeV2Data';
import { applyManualLayout, validateNoOverlaps, type V2NodeData } from './utils/manualLayoutRenderer';
import { useFeatureFlags } from '@/lib/featureFlags';

// Node components for V2
const RequirementNode = ({ data }: { data: V2NodeData }) => (
  <div className="px-4 py-3 bg-background border-2 border-border rounded-lg shadow-sm min-w-[180px]">
    <div className="font-semibold text-sm text-foreground mb-1">{data.title}</div>
    <div className="text-xs text-muted-foreground">
      Year {data.levelYear} • {data.area}
    </div>
    {data.creditsNeeded && (
      <div className="text-xs text-muted-foreground mt-1">
        {data.creditsNeeded} credits
      </div>
    )}
    {data.trackId && (
      <div className="text-xs font-medium text-primary mt-1">
        {data.trackId.toUpperCase()}
      </div>
    )}
  </div>
);

const GateNode = ({ data }: { data: V2NodeData }) => (
  <div className="px-6 py-4 shadow-lg rounded-lg border-2 border-dashed border-primary/50 bg-background/90 text-sm text-muted-foreground min-w-[120px] text-center">
    <strong className="text-foreground">{data.title}</strong>
    <div className="text-xs opacity-70 mt-1">Choose Track</div>
  </div>
);

const nodeTypes = {
  requirement: RequirementNode,
  gate: GateNode
};

interface EduTreeCanvasV2Props {
  trackFilter?: 'se' | 'ds' | 'compare' | null;
}

export function EduTreeCanvasV2({ trackFilter = null }: EduTreeCanvasV2Props) {
  const flags = useFeatureFlags();
  const { blocks, edges, isV2Mode } = useEduTreeV2Data(trackFilter);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  
  // Apply manual layout when data changes
  useEffect(() => {
    if (!isV2Mode || blocks.length === 0) {
      console.log('[EduTreeV2] Not in V2 mode or no blocks, skipping layout');
      return;
    }
    
    console.log('[EduTreeV2] Applying manual layout for', blocks.length, 'blocks');
    
    applyManualLayout(
      blocks,
      edges,
      (newNodes, newEdges) => {
        console.log('[EduTreeV2] Setting nodes and edges:', { 
          nodes: newNodes.length, 
          edges: newEdges.length 
        });
        setNodes(newNodes);
        setEdges(newEdges);
        
        // Validate no overlaps (acceptance criteria)
        const validation = validateNoOverlaps(newNodes);
        if (validation.hasOverlaps) {
          console.warn('[EduTreeV2] Node overlaps detected:', validation.overlaps);
        } else {
          console.log('[EduTreeV2] ✓ No node overlaps - acceptance criteria met');
        }
      },
      fitView
    );
  }, [blocks, edges, isV2Mode, setNodes, setEdges, fitView]);
  
  const onConnect = useCallback(() => {
    // Prevent new connections in manual mode
    console.log('[EduTreeV2] Manual mode - connections disabled');
  }, []);
  
  if (!isV2Mode) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">EduTree V2 Disabled</div>
          <div className="text-sm">
            Add <code>?eduTreeV2Grid=true&eduTreeLayoutMode=manual_v1</code> to enable
          </div>
        </div>
      </div>
    );
  }
  
  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No Layout Data</div>
          <div className="text-sm">Manual layout seed not loaded</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      {/* Lane Headers */}
      <div className="absolute top-4 left-[1300px] text-xs opacity-70 z-10 pointer-events-none">
        <div className="bg-background/80 px-2 py-1 rounded border">
          ▲ Software Engineering Lane
        </div>
      </div>
      <div className="absolute top-4 left-[1300px] translate-y-[300px] text-xs opacity-70 z-10 pointer-events-none">
        <div className="bg-background/80 px-2 py-1 rounded border">
          ▼ Data Science Lane
        </div>
      </div>

      {/* Faint horizontal lane dividers */}
      <div className="absolute top-0 left-[1250px] w-[500px] h-[200px] bg-primary/5 rounded-lg pointer-events-none" />
      <div className="absolute top-[400px] left-[1250px] w-[500px] h-[300px] bg-secondary/5 rounded-lg pointer-events-none" />

      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        defaultEdgeOptions={{
          type: 'step',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        }}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
      
      {/* Debug info in bottom corner */}
      <div className="absolute bottom-4 left-4 bg-background/90 border rounded p-2 text-xs text-muted-foreground">
        <div>V2 Manual Mode • nodes {nodes.length} • edges {flowEdges.length}</div>
        <div>Track: {trackFilter || 'compare'}</div>
        <div>Flags: V2Grid={String(flags.eduTreeV2Grid)}, Mode={flags.eduTreeLayoutMode}</div>
      </div>
    </div>
  );
}