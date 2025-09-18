/**
 * EduTree Canvas V2 - Clean slate implementation
 * Bypasses all legacy layout systems when flags are active
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ReactFlow, useNodesState, useEdgesState, useReactFlow, Background, Controls, MiniMap, MarkerType, Handle, Position } from '@xyflow/react';
import { useEduTreeV2Data } from './hooks/useEduTreeV2Data';
import { applyManualLayout, validateNoOverlaps, type V2NodeData } from './utils/manualLayoutRenderer';
import { exposeGridValidation } from './utils/deterministicGrid';
import { useFeatureFlags } from '@/lib/featureFlags';
import { type FilterMode } from './data/seedDataV2';
import { LaneHeaders } from './components/LaneHeaders';

type DevOverrides = {
  filterMode?: FilterMode;
  eduTreeLayoutMode?: 'legacy' | 'manual_v1' | 'grid_v2';
  eduTreeV2Grid?: boolean;
};

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
  const singleRailStraight = data.singleRailStraight;
  
  return (
    <div className="rounded-xl border border-dashed border-primary/60 bg-background/70 backdrop-blur px-4 py-3 shadow-sm min-w-[220px] text-sm relative">
      <div className="text-xs uppercase tracking-wide opacity-70">Year {data.levelYear}</div>
      <div className="font-semibold">{gateTitle}</div>
      <div className="mt-1 text-xs opacity-70">{subtitle}</div>

      {/* Handles - only show vertical handles when NOT in single-rail straight mode */}
      {!singleRailStraight && (
        <>
          <Handle id="out-up" type="source" position={Position.Top} />
          <Handle id="out-down" type="source" position={Position.Bottom} />
        </>
      )}
      {singleRailStraight && (
        <Handle id="out" type="source" position={Position.Right} />
      )}
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
  overrideFilterMode?: FilterMode;
  overrideFlags?: Partial<{ 
    eduTreeV2Grid: boolean; 
    eduTreeLayoutMode: "legacy"|"manual_v1"|"grid_v2"; 
  }>;
}

export default function EduTreeCanvasV2({ 
  filterMode = null, 
  overrideFilterMode,
  overrideFlags 
}: EduTreeCanvasV2Props) {
  const flags = useFeatureFlags();
  
  // Dev panel state (always available in dev)
  const [showDev, setShowDev] = useState(true);
  const [dev, setDev] = useState<DevOverrides>({});
  
  // Use dev overrides first, then props overrides, then feature flags
  const effectiveFlags = {
    eduTreeV2Grid: dev.eduTreeV2Grid ?? overrideFlags?.eduTreeV2Grid ?? flags.eduTreeV2Grid,
    eduTreeLayoutMode: dev.eduTreeLayoutMode ?? overrideFlags?.eduTreeLayoutMode ?? flags.eduTreeLayoutMode,
  };
  
  // Use dev override filter mode when provided, then props, then default
  const effectiveFilterMode = dev.filterMode ?? overrideFilterMode ?? filterMode;
  
  const { blocks, edges, isLoading, isV2Mode, filterMode: currentFilterMode } = useEduTreeV2Data(effectiveFilterMode);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  
  // Calculate single-rail mode flags - handles both program and track level
  const presentTracks = new Set(blocks.map(b => b.track_id).filter(Boolean));
  const presentPrograms = new Set(blocks.map(b => b.program_id).filter(Boolean));
  const singleTrack = presentTracks.size === 1;
  const singleProgram = presentPrograms.size === 1;
  const singleRailStraight = effectiveFlags.eduTreeV2Grid && effectiveFlags.eduTreeLayoutMode === 'grid_v2' && (singleTrack || singleProgram);
  const usePlan = effectiveFlags.eduTreeV2Grid && effectiveFlags.eduTreeLayoutMode === 'grid_v2' && (singleTrack || singleProgram);
  
  // Apply manual layout when data changes
  useEffect(() => {
    if (!isV2Mode || blocks.length === 0) {
      console.log('[EduTreeV2] Not in V2 mode or no blocks, skipping layout');
      return;
    }
    
    console.log('[EduTreeV2] Applying manual layout for', blocks.length, 'blocks');
    
    // Expose grid validation tools for development
    exposeGridValidation();
      
    console.log('[EduTreeV2] Layout mode:', { 
      presentTracks: [...presentTracks],
      presentPrograms: [...presentPrograms], 
      singleTrack,
      singleProgram, 
      singleRailStraight,
      usePlan,
      layoutMode: effectiveFlags.eduTreeLayoutMode 
    });
    
    applyManualLayout(
      blocks,
      edges,
      (newNodes, newEdges) => {
        console.log('[EduTreeV2] Setting nodes and edges:', { 
          nodes: newNodes.length, 
          edges: newEdges.length 
        });
        
        // Apply grid layout if conditions met
        const finalNodes = usePlan ? newNodes.map(n => {
          if (n.data?.isVirtual) {
            // Add singleRailStraight flag to gate nodes
            return { 
              ...n, 
              data: { ...n.data, singleRailStraight } 
            };
          }
          const p = n.data?.phaseAPlan;
          if (!p) { 
            console.warn('[V2] Missing phaseAPlan for', n.id); 
            return n; 
          }
          return { 
            ...n, 
            position: { x: p.x, y: p.y }, 
            data: { ...n.data, hasGridLayout: true, singleRailStraight } 
          };
        }) : newNodes.map(n => ({ ...n, data: { ...n.data, singleRailStraight } }));
        
        setNodes(finalNodes);
        setEdges(newEdges);
        
        // Validate no overlaps (acceptance criteria)
        const validation = validateNoOverlaps(finalNodes);
        if (validation.hasOverlaps) {
          console.warn('[EduTreeV2] Node overlaps detected:', validation.overlaps);
        } else {
          console.log('[EduTreeV2] ✓ No node overlaps - acceptance criteria met');
        }
      },
      fitView,
      usePlan, // Use deterministic grid anchors when in single-rail grid mode
      singleRailStraight // Pass single-rail straight flag
    );
  }, [blocks, edges, isV2Mode, setNodes, setEdges, fitView, effectiveFlags.eduTreeV2Grid, effectiveFlags.eduTreeLayoutMode]);
  
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
    <>
      {/* Dev Controls Toggle */}
      <button
        onClick={() => setShowDev(v => !v)}
        className="fixed top-3 right-3 z-[10000] rounded-full px-3 py-2 bg-black/70 text-white hover:bg-black/80 transition-colors"
        title="Toggle Dev Controls"
      >
        ⚙️
      </button>

      {/* Dev Controls Panel */}
      {showDev && (
        <div className="fixed top-3 left-3 z-[9999] pointer-events-auto bg-gray-900 text-white border border-gray-700 px-3 py-2 rounded-lg flex items-center gap-3 text-sm shadow-lg">
          <label className="flex items-center gap-2">
            <span className="text-white">Filter</span>
            <select
              value={effectiveFilterMode ?? 'compare-tracks'}
              onChange={e => setDev(d => ({ ...d, filterMode: e.target.value as FilterMode }))}
              className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ color: 'white' }}
            >
              <option value="compare-tracks" style={{ background: '#1f2937', color: 'white' }}>compare-tracks</option>
              <option value="se" style={{ background: '#1f2937', color: 'white' }}>se</option>
              <option value="ds" style={{ background: '#1f2937', color: 'white' }}>ds</option>
              <option value="compare-programs" style={{ background: '#1f2937', color: 'white' }}>compare-programs</option>
              <option value="bs_cs" style={{ background: '#1f2937', color: 'white' }}>bs_cs</option>
              <option value="bs_it" style={{ background: '#1f2937', color: 'white' }}>bs_it</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-white">Layout</span>
            <select
              value={effectiveFlags.eduTreeLayoutMode}
              onChange={e => setDev(d => ({ ...d, eduTreeLayoutMode: e.target.value as any }))}
              className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ color: 'white' }}
            >
              <option value="legacy" style={{ background: '#1f2937', color: 'white' }}>legacy</option>
              <option value="manual_v1" style={{ background: '#1f2937', color: 'white' }}>manual_v1</option>
              <option value="grid_v2" style={{ background: '#1f2937', color: 'white' }}>grid_v2</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!effectiveFlags.eduTreeV2Grid}
              onChange={e => setDev(d => ({ ...d, eduTreeV2Grid: e.target.checked }))}
              className="rounded border-gray-600"
            />
            <span className="text-white">Grid V2</span>
          </label>

          <button
            onClick={() => setDev({})}
            className="px-2 py-1 rounded bg-gray-700 border border-gray-600 hover:bg-gray-600 transition-colors text-white"
          >
            Reset
          </button>
        </div>
      )}

      <div className="h-full w-full">
        {/* Lane Headers - hide in single-rail straight mode */}
        {!singleRailStraight && (
          <>
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
          </>
        )}

      {/* Midline spine at gate row */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ 
          top: 360, 
          height: 2, 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' 
        }}
      />

      {/* Faint horizontal lane dividers - hide in single-rail straight mode */}
      {!singleRailStraight && (
        <>
          <div className="absolute top-0 left-[1250px] w-[500px] h-[200px] bg-primary/5 rounded-lg pointer-events-none" />
          <div className="absolute top-[400px] left-[1250px] w-[500px] h-[300px] bg-secondary/5 rounded-lg pointer-events-none" />
        </>
      )}

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
          <div>Flags: V2Grid={String(effectiveFlags.eduTreeV2Grid)}, Mode={effectiveFlags.eduTreeLayoutMode}</div>
        </div>

        {/* Mode badge */}
        <div className="fixed bottom-3 right-3 z-[1000] text-xs opacity-80 bg-black/40 px-2 py-1 rounded">
          Mode: {effectiveFlags.eduTreeLayoutMode} • Tracks: {([...new Set(blocks.map(b => b.track_id).filter(Boolean))]).join(',') || 'shared'} • Programs: {([...new Set(blocks.map(b => b.program_id).filter(Boolean))]).join(',') || 'shared'}
        </div>
      </div>
    </>
  );
}