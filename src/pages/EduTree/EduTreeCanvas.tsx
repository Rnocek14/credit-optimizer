import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  BackgroundVariant,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { OutcomePanel } from './components/OutcomePanel';
import { useFeatureFlags } from '@/lib/featureFlags';
import {
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge,
  BlockWithCourses,
  PlanningLens,
  isBlockComplete
} from '@/lib/types/eduTree';
import { toast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { SeedDataButton } from './components/SeedDataButton';
import { 
  BlockGroup, 
  TerminalNode, 
  PlaceholderGroup, 
  CourseNode,
  DegreeOutcomeBanner,
  TrackValidator,
  SimpleTrackPicker,
  TrackComparisonControls
} from './components';
import { resolveTrackBlockIds } from './data/resolveTrackBlocks';
import { TRACK_DEFINITIONS, TRACK_MAP, getAllTrackIds, type TrackId } from './data/trackDefinitions';
import { useEduTreeData } from './hooks/useEduTreeData';
import { useTrackComparison } from './hooks/useTrackComparison';
import { transformEducationData } from './utils/transformEducationData';
import { resolveEduTreeFlag, canBypassEduTreeFlag, resolveEduTreePhaseAFlag, resolveEduTreeQAModeFlag } from '@/lib/eduTreeFlags';
import { computeGraphQAMetrics } from './qa/multipathQA';
import { safe } from './safe';
import './styles/trackOverlay.css';
import './styles/pathIdentity.css';

const DEV = import.meta.env.DEV;
const RESIZE_DEBOUNCE_MS = 120;

// Type definitions
type ViewMode = 'flow' | 'board';
type TrackKey = TrackId;

interface HighlightedPath {
  nodes: Set<string>;
  edges: Set<string>;
}

function EduTreeCanvasInner() {
  // ===== ALL HOOKS FIRST - ABSOLUTELY NO EARLY RETURNS AFTER HOOKS =====
  
  // A) One source of truth for URL params (and no loops)
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const flags = useFeatureFlags();
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showTrackValidator, setShowTrackValidator] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [completedCourseIds] = useState<Set<string>>(new Set()); // Mock completed courses
  const [selectedLens, setSelectedLens] = useState<PlanningLens>('fastest');
  const [showOutcomePanel, setShowOutcomePanel] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const layoutInProgressRef = useRef(false);
  const pendingResizeRef = useRef(false);
  const resizeDebounceRef = useRef<number | null>(null);
  const prevIsLayoutingRef = useRef(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const columnCountRef = useRef(0);
  
  const VALID = useMemo(() => new Set(getAllTrackIds()), []);

  // helpers
  const read = useCallback((k: string) => searchParams.get(k), [searchParams]);
  const write = useCallback((mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams);
    mut(p);
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  // init (single source of truth)
  const isSafeMode = read('safe') === '1';

  const [overlayEnabled, setOverlayEnabled] = useState(
    () => read('eduTreeMultiPathOverlay') === 'true' || !!read('comparison')
  );

  const [primaryTrackId, setPrimaryTrackId] = useState<TrackId>(() => {
    const raw = read('primary') as TrackId | null;
    return raw && VALID.has(raw) ? raw : 'software-engineering';
  });

  const [comparisonTrackId, setComparisonTrackId] = useState<TrackId | undefined>(() => {
    const raw = read('comparison') as TrackId | null;
    return raw && VALID.has(raw) ? raw : undefined;
  });

  // Remove ReactFlow remounting - just change classes instead

  // Node types mapping for ReactFlow
  const nodeTypes = useMemo(() => {
    const types = {
      blockGroup: BlockGroup,
      terminalNode: TerminalNode,
      placeholder: PlaceholderGroup
    };
    
    // Dev validation
    if (import.meta.env.DEV) {
      Object.entries(types).forEach(([k,v]) => {
        if (typeof v !== 'function') console.warn('[INVALID NODETYPE]', k, v);
      });
    }
    
    return types;
  }, []);

  // Data from Supabase
  const {
    data: { courses, blocks, blockMembers, gates, gateEdges },
    loading: dataLoading,
    error: dataError,
    hasData,
    coursesLoading,
    blocksLoading,
    blockMembersLoading,
    gatesLoading,
    gateEdgesLoading
  } = useEduTreeData();

  // Transform data for React Flow (defensive)
  const { nodes: flowNodes, edges: flowEdges, blocksWithCourses } = useMemo(() => {
    const result = safe(
      () => transformEducationData(
        { blocks, courses, blockMembers, gates, gateEdges },
        completedCourseIds,
        { ...flags, overlayEnabled, eduTreePhaseA: resolveEduTreePhaseAFlag() },
        undefined,
        primaryTrackId
      ),
      { nodes: [], edges: [], blocksWithCourses: [] },
      'Transform'
    );
    
    // Expose for debugging
    (window as any).__flowNodes__ = result.nodes;
    (window as any).__flowEdges__ = result.edges;
    
    return result;
  }, [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, flags, overlayEnabled, primaryTrackId]);

  // QA Mode: Compute and export metrics when enabled
  const qaMode = resolveEduTreeQAModeFlag();
  
  // Debug QA mode state
  console.log('[MP QA][DEBUG]', { 
    qaMode, 
    hasNodes: flowNodes.length > 0, 
    hasEdges: flowEdges.length > 0, 
    hasBlocks: blocks.length > 0,
    url: window.location.search
  });
  
  useEffect(() => {
    console.log('[MP QA][EFFECT]', { qaMode, nodeCount: flowNodes.length, edgeCount: flowEdges.length, blockCount: blocks.length });
    
    if (!qaMode) {
      console.log('[MP QA][SKIP] QA mode disabled');
      return;
    }
    
    if (flowNodes.length === 0 || flowEdges.length === 0 || blocks.length === 0) {
      console.log('[MP QA][SKIP] Insufficient data for QA');
      return;
    }
    
    try {
      console.log('[MP QA][COMPUTE] Starting metrics computation...');
      const getLevelYear = (id: string) => blocks.find(b => String(b.id) === String(id))?.level_year;
      const getTrackId = (id: string) => blocks.find(b => String(b.id) === String(id))?.track_id as any;
      const metrics = computeGraphQAMetrics(flowNodes, flowEdges, {
        getLevelYear, 
        getTrackId,
        flags: { 
          eduTreePhaseA: resolveEduTreePhaseAFlag(), 
          qaMode 
        }
      });
      
      (window as any).__EDUTREE_QA__ = metrics;
      console.log('[MP QA][METRICS]', metrics);
    } catch (e) {
      console.warn('[MP QA][ERROR]', e);
    }
  }, [qaMode, flowNodes, flowEdges, blocks]);

  // Parse comparePrimary parameter for balanced mode
  const comparePrimary = read('comparePrimary');
  
  // Set primary track for global dimming effect (skip if balanced mode)
  useEffect(() => {
    if (!overlayEnabled || comparePrimary === 'both') return;
    document.body.setAttribute('data-primary-track', primaryTrackId || '');
    return () => document.body.removeAttribute('data-primary-track');
  }, [overlayEnabled, primaryTrackId, comparePrimary]);

  // Absolute guardrails before ReactFlow
  const guardsOk = useMemo(() => 
    Array.isArray(flowNodes) &&
    Array.isArray(flowEdges) &&
    typeof nodeTypes.blockGroup === 'function' &&
    typeof nodeTypes.terminalNode === 'function'
  , [flowNodes, flowEdges, nodeTypes]);

  // Get track comparison highlights and processed edges
  const { 
    highlights, 
    highlightedEdges,
    debugInfo 
  } = useTrackComparison({
    nodes: flowNodes,
    edges: flowEdges,
    primaryTrackId,
    comparisonTrackId,
    overlayEnabled
  });

  // Remove finalNodes/finalEdges - apply highlighting directly in layout effect

  // Debug edge flow
  console.log('[EduTreeCanvas] Edge Flow:', {
    overlayEnabled,
    flowEdgesCount: flowEdges.length,
    sampleFlowEdge: flowEdges[0]?.id,
    primaryTrackId,
    comparisonTrackId
  });

  // Debug current component state
  console.log('[EduTreeCanvas] Component State:', {
    dataLoading,
    dataError: !!dataError,
    hasData,
    flowNodesLength: flowNodes.length,
    flowEdgesLength: flowEdges.length,
    guardsOk,
    isLayouting,
    overlayEnabled,
    primaryTrackId,
    comparisonTrackId,
    individual: { coursesLoading, blocksLoading, blockMembersLoading, gatesLoading, gateEdgesLoading }
  });

  const scheduleLayout = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (layoutInProgressRef.current) {
      console.log('[EduTree Layout] Resize received during layout, queueing rerun');
      pendingResizeRef.current = true;
      return;
    }

    pendingResizeRef.current = false;

    if (resizeDebounceRef.current !== null) {
      window.clearTimeout(resizeDebounceRef.current);
    }

    resizeDebounceRef.current = window.setTimeout(() => {
      resizeDebounceRef.current = null;

      if (layoutInProgressRef.current) {
        console.log('[EduTree Layout] Debounced resize fired during layout, queueing rerun');
        pendingResizeRef.current = true;
        return;
      }

      console.log('[EduTree Layout] Incrementing layout version after quiet period');
      setLayoutVersion(v => v + 1);
    }, RESIZE_DEBOUNCE_MS);
  }, [setLayoutVersion]);

  // Track resize events to trigger re-layout
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleNodeResized = () => {
      console.log('[EduTree Layout] node:resized event received');
      
      // Prevent infinite loop: ignore resize events during active layout
      if (layoutInProgressRef.current) {
        console.log('[EduTree Layout] Ignoring resize event during active layout');
        return;
      }
      
      // Only schedule layout if we actually have nodes to layout
      if (flowNodes.length === 0) {
        console.log('[EduTree Layout] Ignoring resize event - no nodes to layout');
        return;
      }
      
      scheduleLayout();
    };

    window.addEventListener('node:resized', handleNodeResized);

    return () => {
      window.removeEventListener('node:resized', handleNodeResized);

      if (resizeDebounceRef.current !== null) {
        window.clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = null;
      }

      pendingResizeRef.current = false;
    };
  }, [scheduleLayout, flowNodes.length]);

  useEffect(() => {
    const wasLayouting = prevIsLayoutingRef.current;

    if (wasLayouting && !isLayouting) {
      console.log('[EduTree Layout] Layout complete, overlay hidden');

      // Add delay to prevent immediate re-layout and only if nodes exist
      if (pendingResizeRef.current && flowNodes.length > 0) {
        console.log('[EduTree Layout] Running queued resize after layout completion');
        // Use timeout to break potential recursion
        setTimeout(() => {
          if (pendingResizeRef.current && !layoutInProgressRef.current) {
            scheduleLayout();
          }
        }, 100);
      }
    }

    prevIsLayoutingRef.current = isLayouting;
  }, [isLayouting, scheduleLayout, flowNodes.length]);

  // Clear loading state when there's no data to prevent infinite loading
  useEffect(() => {
    if (!hasData && !dataLoading) {
      setIsLayouting(false);
      layoutInProgressRef.current = false;
    }
  }, [hasData, dataLoading]);

  // Perform layout when data or node sizes change
  useLayoutEffect(() => {
    const isPhaseA = flags?.eduTreePhaseA === true;
    
    if (!reactFlowInstance) {
      console.log('[EduTree Layout] ReactFlow instance not ready');
      return;
    }
    
    if (isPhaseA) {
      // PhaseA: Only apply pre-computed positions, never run legacy layout
      console.log('[EduTree Layout] PhaseA mode - applying deterministic grid positions');
      setNodes(flowNodes);
      setEdges(highlightedEdges);
      setIsLayouting(false);
      layoutInProgressRef.current = false;
      
      // Fit view after positions are applied
      requestAnimationFrame(() => {
        reactFlowInstance.fitView?.({ padding: 0.2, duration: 300 });
      });
      return;
    }
    
    if (layoutInProgressRef.current) {
      console.log('[EduTree Layout] Layout already in progress, skipping');
      return;
    }

    // Clear loading state immediately if there are no nodes to layout
    if (!flowNodes.length) {
      console.log('[EduTree Layout] No nodes to layout, clearing loading state');
      setIsLayouting(false);
      layoutInProgressRef.current = false;
      return;
    }

    console.log('[EduTree Layout] Starting layout for', flowNodes.length, 'nodes');
    layoutInProgressRef.current = true;
    setIsLayouting(true);

    let raf1 = 0;
    let raf2 = 0;
    let timeoutId: NodeJS.Timeout;

    const clearLayoutState = () => {
      layoutInProgressRef.current = false;
      setIsLayouting(false);
      console.log('[EduTree Layout] Layout state cleared');
    };

    const runLayout = () => {
      try {
        console.log('[EduTree Layout] Running layout calculations');
        const pad = 80; // Increased for better vertical separation
        const colW = 480; // Increased to accommodate wider nodes
        const defaultH = 180;
        const byYear = new Map<number, any[]>();
        const heightMap = new Map<string, number>();

        // Check if ReactFlow is properly initialized
        if (!reactFlowInstance.getNodes) {
          console.warn('[EduTree Layout] ReactFlow instance not fully initialized');
          return;
        }

        // Improved height estimation based on node type
        const getEstimatedHeight = (node: any): number => {
          const nodeData = node.data as any;
          
          // BlockGroup nodes (larger, more content)
          if (nodeData?.block) {
            const courseCount = nodeData.block.courses?.length || 0;
            const subBlockCount = nodeData.sub_blocks?.length || 0;
            return Math.max(180 + (courseCount * 15) + (subBlockCount * 20), 200);
          }
          
          // Course nodes (medium size) 
          if (nodeData?.course || nodeData?.code) {
            return 160;
          }
          
          // Terminal nodes (smaller)
          if (nodeData?.isEligible !== undefined) {
            return 120;
          }
          
          // Default fallback
          return 180;
        };

        flowNodes.forEach(n => {
          const selector = `.react-flow__node[data-id="${n.id}"]`;
          const el = document.querySelector(selector) as HTMLElement | null;
          const domHeight = el?.getBoundingClientRect().height;
          let h = domHeight && !Number.isNaN(domHeight) ? domHeight : undefined;

          if (h === undefined) {
            const rfNode = reactFlowInstance.getNodes().find(rn => rn.id === n.id);
            h = rfNode?.height;
          }

          // Use improved estimation with safety margin
          const estimated = getEstimatedHeight(n);
          const finalHeight = h || estimated;
          const safeHeight = Math.min(Math.max(finalHeight * 1.2, 120), 500);
          heightMap.set(String(n.id), safeHeight);

          const nodeData = n.data as any;
          let year = 1;
          if (nodeData?.level_year) year = Number(nodeData.level_year);
          else if (nodeData?.block?.level_year) year = Number(nodeData.block.level_year);
          else if (nodeData?.courses?.length > 0) year = Number(nodeData.courses[0].level_year) || 1;
          if (year < 1) year = 1;
          if (!byYear.has(year)) byYear.set(year, []);
          byYear.get(year)!.push(n);
        });

        const maxYear = Math.max(5, ...Array.from(byYear.keys()));

        if (maxYear > columnCountRef.current) {
          columnCountRef.current = maxYear;
          console.log('[EduTree Layout] Column count increased to', maxYear);
        }

        // Initial layout with improved spacing
        const laidOut: any[] = [];
        for (let year = 1; year <= maxYear; year++) {
          const yearNodes = byYear.get(year) || [];
          let yOffset = pad;
          yearNodes.forEach(node => {
            const h = heightMap.get(String(node.id)) || defaultH;
            laidOut.push({
              ...node,
              position: {
                x: pad + (year - 1) * colW,
                y: yOffset
              }
            });
            yOffset += h + pad; // Better spacing between nodes
          });
        }

        // Collision detection and resolution
        const resolveCollisions = (nodes: any[]): any[] => {
          const resolved = [...nodes];
          const minSpacing = 20; // Minimum space between nodes
          
          // Group by column (x position)
          const columnGroups = new Map<number, any[]>();
          resolved.forEach(node => {
            const x = node.position.x;
            if (!columnGroups.has(x)) columnGroups.set(x, []);
            columnGroups.get(x)!.push(node);
          });

          // Check and resolve overlaps within each column
          columnGroups.forEach(columnNodes => {
            columnNodes.sort((a, b) => a.position.y - b.position.y);
            
            for (let i = 1; i < columnNodes.length; i++) {
              const current = columnNodes[i];
              const previous = columnNodes[i - 1];
              const currentHeight = heightMap.get(String(current.id)) || defaultH;
              const previousHeight = heightMap.get(String(previous.id)) || defaultH;
              
              const expectedY = previous.position.y + previousHeight + minSpacing;
              if (current.position.y < expectedY) {
                console.log(`[EduTree Layout] Resolving collision for node ${current.id}`);
                current.position.y = expectedY;
              }
            }
          });

          return resolved;
        };

        const finalLayout = resolveCollisions(laidOut);

        console.log('[EduTree Layout] Layout calculated, updating nodes and edges');
        setNodes(finalLayout);
        setEdges(highlightedEdges);

        console.log('[EduTree Layout] Layout completed successfully');
      } catch (error) {
        console.error('[EduTree Layout] Layout failed:', error);
      } finally {
        clearLayoutState();
      }
    };

    // Set up timeout fallback (3 seconds - reduced)
    timeoutId = setTimeout(() => {
      console.warn('[EduTree Layout] Layout timed out, clearing state');
      clearLayoutState();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    }, 3000);

    // Single RAF call to prevent double state clearing
    raf1 = requestAnimationFrame(() => {
      clearTimeout(timeoutId);
      runLayout();
    });

    return () => {
      console.log('[EduTree Layout] Cleaning up layout effect');
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearLayoutState();
    };
  }, [reactFlowInstance, flowNodes, highlightedEdges, flags?.eduTreePhaseA, layoutVersion, overlayEnabled, primaryTrackId, comparisonTrackId]);

  // Debug logging effect for PhaseA (separate from render cycle)
  useEffect(() => {
    if (flags?.eduTreePhaseA && flowNodes.length > 0) {
      console.log('[EduTree] Final render state:', {
        nodeCount: flowNodes.length,
        edgeCount: highlightedEdges.length,
        hasGridNodes: flowNodes.filter(n => n.data?.hasGridLayout).length,
        positionedNodes: flowNodes.filter(n => n.position && (n.position.x !== 0 || n.position.y !== 0)).length,
        samplePositions: flowNodes.slice(0, 3).map(n => ({ id: n.id, pos: n.position }))
      });
    }
  }, [flags?.eduTreePhaseA, flowNodes.length, highlightedEdges.length]);

  // Show loading state while data is being fetched
  if (dataLoading) {
    console.log('[EduTreeCanvas] Rendering loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-lg font-semibold">Loading Education Data</h3>
            <p className="text-muted-foreground">
              Fetching course and requirement information...
            </p>
            {(coursesLoading || blocksLoading || blockMembersLoading || gatesLoading || gateEdgesLoading) && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Loading: {[
                  coursesLoading && 'courses',
                  blocksLoading && 'blocks', 
                  blockMembersLoading && 'members',
                  gatesLoading && 'gates',
                  gateEdgesLoading && 'edges'
                ].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Show error state if there's a data error
  if (dataError) {
    console.log('[EduTreeCanvas] Rendering error state:', dataError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">Data Loading Error</h3>
            <p className="text-muted-foreground">
              Failed to load education data.
            </p>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{String(dataError)}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Show no data state if no education data is available
  if (!hasData) {
    console.log('[EduTreeCanvas] Rendering no data state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">No Education Data Available</h3>
            <p className="text-muted-foreground">
              No course or requirement data found in the database.
            </p>
            <p className="text-sm text-muted-foreground">
              The education database tables appear to be empty. You can seed sample data to get started.
            </p>
            <SeedDataButton />
          </div>
        </Card>
      </div>
    );
  }

  if (!guardsOk) {
    console.log('[EduTreeCanvas] Rendering guards failed state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">Component Error</h3>
            <p className="text-muted-foreground">
              The education tree components failed validation. Check the console for details.
            </p>
            <div className="text-xs text-muted-foreground">
              <p>Nodes: {Array.isArray(flowNodes) ? 'OK' : 'FAIL'} ({flowNodes?.length || 0})</p>
              <p>Edges: {Array.isArray(flowEdges) ? 'OK' : 'FAIL'} ({flowEdges?.length || 0})</p>
              <p>NodeTypes: {typeof nodeTypes.blockGroup === 'function' ? 'OK' : 'FAIL'}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  console.log('[EduTreeCanvas] Rendering main ReactFlow canvas');
  return (
    <div className="relative h-screen bg-background">
      {/* Track Comparison Overlay Controls */}
      {flags.eduTreeMultiPathOverlay && (
        <div className="absolute top-4 left-4 z-40">
          <TrackComparisonControls
            overlayEnabled={overlayEnabled}
            overlayAllowed={true}
            onOverlayToggle={setOverlayEnabled}
            primaryTrackId={primaryTrackId}
            onPrimaryTrackChange={setPrimaryTrackId}
            comparisonTrackId={comparisonTrackId}
            onComparisonTrackChange={setComparisonTrackId}
            debugInfo={debugInfo}
          />
        </div>
      )}

      {/* Legend and Lane Headers for Overlay Mode */}
      {overlayEnabled && (
        <>
          <div className="legend">
            <span className="chip chip--shared">Shared</span>
            <span className="chip chip--se">SE</span>
            <span className="chip chip--ds">DS</span>
          </div>
          
          {[1,2,3,4].map(y => (
            <div key={y} className="lane-header" style={{ top: 24 + (y-1)*220 }}>{`Y${y}`}</div>
          ))}
        </>
      )}
      
      {/* Main Canvas */}
      <div className="w-full h-full">
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          className="edu-tree-canvas bg-background"
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
          />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Loading overlay for layout operations */}
      {isLayouting && flowNodes.length > 0 && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Applying layout...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function EduTreeCanvas() {
  return (
    <ReactFlowProvider>
      <EduTreeCanvasInner />
    </ReactFlowProvider>
  );
}