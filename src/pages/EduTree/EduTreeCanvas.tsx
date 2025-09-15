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
  useNodesInitialized,
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
import './styles/track-highlights.css';

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
  const pendingLayoutRef = useRef(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const triggerLayout = useCallback(() => {
    setLayoutVersion(v => v + 1);
  }, []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const nodesInitialized = useNodesInitialized();
  
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
  const finalNodesKey = useMemo(
    () => finalNodes.map(node => `${node.id}:${(node.data as any)?.level_year ?? ''}`).join('|'),
    [finalNodes]
  );
  const finalEdgesKey = useMemo(
    () => finalEdges.map(edge => edge.id ?? `${edge.source}-${edge.target}`).join('|'),
    [finalEdges]
  );

  // Debug current component state
  if (DEV) {
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
  }

  // Track resize events to trigger re-layout
  useEffect(() => {
    let rafId: number | null = null;

    const scheduleLayout = () => {
      if (layoutInProgressRef.current) {
        pendingLayoutRef.current = true;
        return;
      }

      pendingLayoutRef.current = false;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        triggerLayout();
      });
    };

    window.addEventListener('node:resized', scheduleLayout);

    return () => {
      window.removeEventListener('node:resized', scheduleLayout);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [triggerLayout]);

  // Clear loading state when there's no data to prevent infinite loading
  useEffect(() => {
    if (!hasData && !dataLoading) {
      setIsLayouting(false);
      layoutInProgressRef.current = false;
    }
  }, [hasData, dataLoading]);

  // Phase 1: Set nodes immediately (basic positioning)
  useLayoutEffect(() => {
    if (!reactFlowInstance) {
      if (DEV) {
        console.log('[EduTree Layout] ReactFlow instance not ready');
      }
      return;
    }

    // Clear loading state immediately if there are no nodes to layout
    if (!finalNodes.length) {
      if (DEV) {
        console.log('[EduTree Layout] No nodes to layout, clearing loading state');
      }
      setIsLayouting(false);
      layoutInProgressRef.current = false;
      setNodes([]);
      setEdges([]);
      return;
    }

    // Always set nodes immediately with basic positioning (Phase 1)
    if (DEV) {
      console.log('[EduTree Layout] Phase 1: Setting', finalNodes.length, 'nodes with basic positioning');
    }
    setNodes(finalNodes);
    setEdges(finalEdges);
    setAllEdges(finalEdges);

  }, [
    reactFlowInstance,
    finalNodes.length,
    finalEdges.length,
    finalNodesKey,
    finalEdgesKey,
    overlayEnabled
  ]);

  // Phase 2: Apply enhanced layout after measurements
  useLayoutEffect(() => {
    if (!reactFlowInstance || !finalNodes.length) {
      return;
    }

    if (layoutInProgressRef.current) {
      if (DEV) {
        console.log('[EduTree Layout] Layout already in progress, skipping enhanced layout');
      }
      return;
    }

    // Wait for React Flow to initialize and measure nodes before applying enhanced layout
    if (!nodesInitialized) {
      if (DEV) {
        console.log('[EduTree Layout] Phase 2: Waiting for React Flow nodes to be initialized and measured');
      }
      return;
    }

    // Check if nodes have real measurements
    const currentNodes = reactFlowInstance.getNodes();
    const measuredNodes = currentNodes.filter(node => node.measured?.width && node.measured?.height);
    const measurementRatio = currentNodes.length > 0 ? measuredNodes.length / currentNodes.length : 0;
    
    if (DEV) {
      console.log('[EduTree Layout] Phase 2: Node measurement status:', {
        totalNodes: currentNodes.length,
        measuredNodes: measuredNodes.length,
        measurementRatio: Math.round(measurementRatio * 100) + '%'
      });
    }

    // Track retry attempts to prevent infinite loops
    const retryCountKey = `layout-retry-${layoutVersion}`;
    const currentRetries = parseInt(sessionStorage.getItem(retryCountKey) || '0');
    const maxRetries = 5;

    // Proceed with layout if we have good measurements (50%+) OR we've hit max retries
    const shouldProceed = measurementRatio >= 0.5 || currentRetries >= maxRetries;
    
    if (!shouldProceed && currentNodes.length > 0) {
      if (DEV) {
        console.log(`[EduTree Layout] Phase 2: Insufficient measurements (${Math.round(measurementRatio * 100)}%), retry ${currentRetries + 1}/${maxRetries}`);
      }
      
      // Increment retry counter
      sessionStorage.setItem(retryCountKey, String(currentRetries + 1));
      
      // Set a timeout to retry enhanced layout after nodes have had time to measure
      const retryTimeout = setTimeout(() => {
        triggerLayout();
      }, 150);
      return () => clearTimeout(retryTimeout);
    }

    // Clear retry counter when we proceed
    sessionStorage.removeItem(retryCountKey);

    if (DEV) {
      const reason = measurementRatio >= 0.5 ? 'sufficient measurements' : 'max retries reached';
      console.log(`[EduTree Layout] Phase 2: Starting enhanced layout for ${finalNodes.length} nodes (${Math.round(measurementRatio * 100)}% measured, ${reason})`);
    }
    layoutInProgressRef.current = true;
    setIsLayouting(true);

    let timeoutId: NodeJS.Timeout;
    let cancelled = false;

    const flushPendingLayout = () => {
      if (pendingLayoutRef.current && !cancelled) {
        pendingLayoutRef.current = false;
        requestAnimationFrame(() => {
          if (!cancelled) {
            triggerLayout();
          }
        });
      }
    };

    const clearLayoutState = (flushPending = true) => {
      layoutInProgressRef.current = false;
      setIsLayouting(false);
      if (DEV) {
        console.log('[EduTree Layout] Layout state cleared');
      }

      if (flushPending) {
        flushPendingLayout();
      }
    };

    const runEnhancedLayout = async () => {
      try {
        if (DEV) {
          console.log('[EduTree Layout] Running enhanced layout system');
        }
        
        // Import and use the enhanced layout system
        const { layoutNodes } = await import('@/lib/layout/simpleLayout');
        
        // Apply enhanced layout to final nodes (which includes highlighting)
        const layoutResult = await layoutNodes(finalNodes, finalEdges);
        
        if (DEV) {
          console.log('[EduTree Layout] Enhanced layout completed:', {
            nodes: layoutResult.nodes.length,
            hasOverlaps: layoutResult.hasOverlaps,
            layoutTime: layoutResult.layoutTime
          });
        }

        // Update React Flow with the enhanced layout
        setNodes(layoutResult.nodes);
        setEdges(finalEdges);
        setAllEdges(finalEdges);

        if (layoutResult.hasOverlaps) {
          console.warn('[EduTree Layout] Layout still has overlaps after resolution');
        }

      } catch (error) {
        console.error('[EduTree Layout] Enhanced layout failed:', error);
        // Fallback: set nodes without layout
        setNodes(finalNodes);
        setEdges(finalEdges);
        setAllEdges(finalEdges);
      } finally {
        clearLayoutState(true);
      }
    };

    // Set up timeout fallback (5 seconds for enhanced layout to prevent stuck states)
    timeoutId = setTimeout(() => {
      console.warn('[EduTree Layout] Enhanced layout timed out, clearing state');
      clearLayoutState(true);
    }, 5000);

    // Start the enhanced layout process
    runEnhancedLayout().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      cancelled = true;
      if (DEV) {
        console.log('[EduTree Layout] Cleaning up enhanced layout effect');
      }
      clearTimeout(timeoutId);
      clearLayoutState(false);
    };
  }, [
    reactFlowInstance,
    nodesInitialized,
    layoutVersion,
    triggerLayout
  ]);

  // Show loading state while data is being fetched
  if (dataLoading) {
    if (DEV) {
      console.log('[EduTreeCanvas] Rendering loading state');
    }
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
    if (DEV) {
      console.log('[EduTreeCanvas] Rendering error state:', dataError);
    }
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
    if (DEV) {
      console.log('[EduTreeCanvas] Rendering no data state');
    }
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
    if (DEV) {
      console.log('[EduTreeCanvas] Rendering guards failed state');
    }
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

  if (DEV) {
    console.log('[EduTreeCanvas] Rendering main ReactFlow canvas');
  }
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
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          className="bg-background"
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
      {isLayouting && finalNodes.length > 0 && (
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