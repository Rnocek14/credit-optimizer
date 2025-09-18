/**
 * EduTree Canvas V2 - Clean slate implementation
 * Bypasses all legacy layout systems when flags are active
 */

import React, { useCallback, useEffect } from 'react';
import { ReactFlow, useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, MarkerType, Handle, Position } from '@xyflow/react';
import { useEduTreeV2Data } from './hooks/useEduTreeV2Data';
import { applyManualLayout, validateNoOverlaps, type V2NodeData } from './utils/manualLayoutRenderer';
import { useFeatureFlags } from '@/lib/featureFlags';
import { type FilterMode } from './data/seedDataV2';
import { LaneHeaders } from './components/LaneHeaders';

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

const GateNode = ({ data }: { data: V2NodeData }) => {
  const gateType = data.junctionType || (data.title?.includes('Program') ? 'program' : 'track');
  const gateTitle = gateType === 'program' ? 'Program Gate' : 'Track Gate';
  const subtitle = gateType === 'program' ? 'Choose Program' : 'Choose Track';
  
  return (
    <div className="rounded-xl border border-dashed border-primary/60 bg-background/70 backdrop-blur px-4 py-3 shadow-sm min-w-[220px] text-sm relative">
      <div className="text-xs uppercase tracking-wide opacity-70">Year {data.levelYear}</div>
      <div className="font-semibold">{gateTitle}</div>
      <div className="mt-1 text-xs opacity-70">{subtitle}</div>

      {/* source handles */}
      <Handle id="out-se" type="source" position={Position.Top} />
      <Handle id="out-ds" type="source" position={Position.Bottom} />
      {/* target handle */}
      <Handle id="in" type="target" position={Position.Left} />
    </div>
  );
};

const nodeTypes = {
  requirement: RequirementNode,
  gate: GateNode
};

interface EduTreeCanvasV2Props {
  filterMode?: FilterMode;
}

export default function EduTreeCanvasV2({ filterMode = null }: EduTreeCanvasV2Props) {
  const flags = useFeatureFlags();
  const { blocks, edges, isLoading, isV2Mode, filterMode: currentFilterMode } = useEduTreeV2Data(filterMode);
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
      <div className="absolute bottom-4 left-[1300px] text-xs opacity-70 z-10 pointer-events-none">
        <div className="bg-background/80 px-2 py-1 rounded border">
          ▼ Data Science Lane
        </div>
      </div>

      {/* Midline spine at gate row */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ 
          top: 360, 
          height: 2, 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' 
        }}
      />

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
        <div>V2 Multi-Gate Mode • nodes {nodes.length} • edges {flowEdges.length}</div>
        <div>Filter: {currentFilterMode || 'compare-tracks'}</div>
        <div>Flags: V2Grid={String(flags.eduTreeV2Grid)}, Mode={flags.eduTreeLayoutMode}</div>
      </div>
    </div>
  );
}