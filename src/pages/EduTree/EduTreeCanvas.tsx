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
import { EduTreeError } from '../../components/EduTreeError';
import { safe } from './safe';
import './styles/trackOverlay.css';

const DEV = import.meta.env.DEV;

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
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  
  const didFitRef = useRef(false);
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  const { nodes: flowNodes, edges: flowEdges, blocksWithCourses } = useMemo(() => safe(
    () => transformEducationData(
      { blocks, courses, blockMembers, gates, gateEdges },
      completedCourseIds,
      flags
    ),
    { nodes: [], edges: [], blocksWithCourses: [] },
    'Transform'
  ), [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, flags]);

  // Absolute guardrails before ReactFlow
  const guardsOk = useMemo(() => 
    Array.isArray(flowNodes) &&
    Array.isArray(flowEdges) &&
    typeof nodeTypes.blockGroup === 'function' &&
    typeof nodeTypes.terminalNode === 'function'
  , [flowNodes, flowEdges, nodeTypes]);

  // Apply track comparison highlighting when overlay is enabled
  const { 
    highlightedNodes, 
    highlightedEdges, 
    highlights, 
    debugInfo 
  } = useTrackComparison({
    nodes: flowNodes,
    edges: flowEdges,
    primaryTrackId,
    comparisonTrackId,
    overlayEnabled
  });

  // Use highlighted elements if overlay is on, otherwise use original elements
  const finalNodes = overlayEnabled ? highlightedNodes : flowNodes;
  const finalEdges = overlayEnabled ? highlightedEdges : flowEdges;

  // Debug current component state
  console.log('[EduTreeCanvas] Component State:', {
    dataLoading,
    dataError: !!dataError,
    hasData,
    flowNodesLength: flowNodes.length,
    flowEdgesLength: flowEdges.length,
    guardsOk,
    isLayouting,
    individual: { coursesLoading, blocksLoading, blockMembersLoading, gatesLoading, gateEdgesLoading }
  });

  // Track resize events to trigger re-layout
  useEffect(() => {
    let rafId: number | null = null;

    const scheduleLayout = () => {
      if (layoutInProgressRef.current) {
        return;
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        setLayoutVersion(v => v + 1);
      });
    };

    window.addEventListener('node:resized', scheduleLayout);

    return () => {
      window.removeEventListener('node:resized', scheduleLayout);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Clear loading state when there's no data to prevent infinite loading
  useEffect(() => {
    if (!hasData && !dataLoading) {
      setIsLayouting(false);
      layoutInProgressRef.current = false;
    }
  }, [hasData, dataLoading]);

  // Perform layout when data or node sizes change
  useLayoutEffect(() => {
    if (!reactFlowInstance) {
      console.log('[EduTree Layout] ReactFlow instance not ready');
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
        const pad = 40, colW = 400, defaultH = 180;
        const byYear = new Map<number, any[]>();
        const heightMap = new Map<string, number>();

        // Check if ReactFlow is properly initialized
        if (!reactFlowInstance.getNodes) {
          console.warn('[EduTree Layout] ReactFlow instance not fully initialized');
          return;
        }

        flowNodes.forEach(n => {
          const selector = `.react-flow__node[data-id="${n.id}"]`;
          const el = document.querySelector(selector) as HTMLElement | null;
          const domHeight = el?.getBoundingClientRect().height;
          let h = domHeight && !Number.isNaN(domHeight) ? domHeight : undefined;

          if (h === undefined) {
            const rfNode = reactFlowInstance.getNodes().find(rn => rn.id === n.id);
            h = rfNode?.height;
          }

          const bounded = Math.min(Math.max(h || defaultH, 120), 400);
          heightMap.set(String(n.id), bounded);

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
          didFitRef.current = false;
          console.log('[EduTree Layout] Column count increased to', maxYear);
        }

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
            yOffset += h + pad;
          });
        }

        console.log('[EduTree Layout] Layout calculated, updating nodes and edges');
        setNodes(laidOut);
        setEdges(finalEdges);
        setAllEdges(finalEdges);

        if (reactFlowInstance && !didFitRef.current) {
          setTimeout(() => {
            try {
              reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
              didFitRef.current = true;
              console.log('[EduTree Layout] Fit view applied');
            } catch (error) {
              console.error('[EduTree Layout] Error fitting view:', error);
            }
          }, 100);
        }

        console.log('[EduTree Layout] Layout completed successfully');
      } catch (error) {
        console.error('[EduTree Layout] Layout failed:', error);
      } finally {
        clearLayoutState();
      }
    };

    // Set up timeout fallback (5 seconds)
    timeoutId = setTimeout(() => {
      console.warn('[EduTree Layout] Layout timed out, clearing state');
      clearLayoutState();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    }, 5000);

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          clearTimeout(timeoutId);
          runLayout();
        } finally {
          clearLayoutState();
        }
      });
    });

    return () => {
      console.log('[EduTree Layout] Cleaning up layout effect');
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearLayoutState();
    };
  }, [reactFlowInstance, flowNodes.length, flowEdges.length, layoutVersion]);

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
      
      {/* Main Canvas */}
      <div className="w-full h-full">
        <ReactFlow
          nodes={finalNodes}
          edges={finalEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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