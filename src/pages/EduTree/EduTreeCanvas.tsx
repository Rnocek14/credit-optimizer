import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DebugBoundary } from '@/components/DebugBoundary';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles/drag-animations.css';
import './styles/track-highlights.css';
import './styles/trackOverlay.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { layoutWithElk, layoutAsGrid } from '@/lib/layout/elkLayout';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useStaggeredEdgesV2 } from '@/hooks/useStaggeredEdgesV2';
import { useDragGuard } from '@/components/ui/drag-guard';
import { OutcomePanel, PlanValidationSummary } from './components/OutcomePanel';
import { EduTreeMiniMap } from '@/components/ui/minimap';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge,
  BlockWithCourses,
  isBlockComplete,
  PlanningLens 
} from '@/lib/types/eduTree';
import { toast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { SeedDataButton } from './components/SeedDataButton';
import { BlockGroup } from './components/BlockGroup';
import { TerminalNode } from './components/TerminalNode';
import { PlaceholderGroup } from './components/PlaceholderGroup';
import { CourseNode } from './components/CourseNode';
import { DegreeOutcomeBanner } from './components/DegreeOutcomeBanner';
import { TrackValidator } from './components/TrackValidator';
import { SimpleTrackPicker } from './components/SimpleTrackPicker';
import { TrackComparisonControls } from './components/TrackComparisonControls';
import { resolveTrackBlockIds } from './data/resolveTrackBlocks';
import { useStableOverlay } from './hooks/useStableOverlay';
import { TRACK_DEFINITIONS, getAllTrackIds, type TrackId } from './data/trackDefinitions';
import { useEduTreeData } from './hooks/useEduTreeData';
import { transformEducationData } from './utils/transformEducationData';
import { EduTreeError } from '../../components/EduTreeError';
import { safe } from './safe';
import { computeHighlights } from './overlay';


const DEV = import.meta.env.DEV;

// Type definitions
type ViewMode = 'flow' | 'board';
type TrackKey = TrackId;

interface HighlightedPath {
  nodes: Set<string>;
  edges: Set<string>;
}

function EduTreeCanvasInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const flags = useFeatureFlags();
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showTrackValidator, setShowTrackValidator] = useState(false);
  
  // Node types mapping for ReactFlow - MOVED INSIDE COMPONENT
  const nodeTypes = useMemo(() => ({
    blockGroup: BlockGroup,
    terminalNode: TerminalNode,
    terminal: TerminalNode, // Alias for consistency
    placeholder: PlaceholderGroup,
  }), []);

  // Feature flag source with querystring fallback
  const qsOverlay = searchParams.get('eduTreeMultiPathOverlay') === 'true';
  const overlayFlag = Boolean(flags.eduTreeMultiPathOverlay) || qsOverlay;
  const isSafeMode = searchParams.get('safe') === '1';
  const forceGrid = searchParams.get('elk') === '0';
  const debug = searchParams.get('debug') === '1';
  
  // Dev-time validation for node types
  if (DEV) {
    Object.entries(nodeTypes).forEach(([k, v]) => {
      if (typeof v !== 'function') {
        console.error('[INVALID NODETYPE]', k, v, 'Check component exports');
      }
    });
  }
  
  // Render path logging for debugging
  console.log('[EduTree] render', {
    hasNodeTypes: !!nodeTypes.blockGroup && !!nodeTypes.terminalNode,
    overlayFlag, isSafeMode
  });
  
  
  // Global error listeners for debugging
  useEffect(() => {
    const uhr = (e: PromiseRejectionEvent) => {
      console.error('[unhandledrejection]', e.reason);
    };
    const ue = (e: ErrorEvent) => {
      console.error('[error]', e.message, e.error);
    };
    window.addEventListener('unhandledrejection', uhr);
    window.addEventListener('error', ue);
    return () => {
      window.removeEventListener('unhandledrejection', uhr);
      window.removeEventListener('error', ue);
    };
  }, []);
  
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [completedCourseIds] = useState<Set<string>>(new Set()); // Mock completed courses
  const [selectedLens, setSelectedLens] = useState<PlanningLens>('fastest');
  const [showOutcomePanel, setShowOutcomePanel] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();
  const layoutInProgressRef = useRef(false);
  
  // Track comparison state - dynamic resolution from block titles
  const [currentTrackKey, setCurrentTrackKey] = useState<TrackId>(() => {
    const raw = searchParams.get('primary') as TrackId;
    return raw && getAllTrackIds().includes(raw) 
      ? raw 
      : 'software-engineering';
  });
  
  // Track handler
  const handleTrackChange = useCallback((newTrackKey: TrackId) => {
    setCurrentTrackKey(newTrackKey);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('primary', newTrackKey);
    newParams.set('eduTreeMultiPathOverlay', 'true');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Use the new defensive data hook
  const { 
    data: { courses, blocks, blockMembers, gates, gateEdges },
    loading: dataLoading,
    error: dataError,
    hasData 
  } = useEduTreeData();

  // Add error handling with logging
  if (dataLoading) {
    console.log('[GUARD] dataLoading return');
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-sm opacity-70">Loading curriculum…</div>
      </div>
    );
  }

  if (dataError && !isSafeMode) {
    console.log('[GUARD] dataError return', dataError);
    return <EduTreeError error={dataError} />;
  }

  // Empty state (not an error):
  if (!hasData && !isSafeMode) {
    console.log('[GUARD] no data return', { blocks: blocks.length, courses: courses.length });
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No curriculum data found for this track yet.
        {import.meta.env.DEV && (
          <div className="mt-2 text-xs">
            DEV: blocks={blocks.length}, courses={courses.length},
            gates={gates.length}, gateEdges={gateEdges.length}
          </div>
        )}
      </div>
    );
  }

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

  if (debug) {
    console.log('[EduTree Debug]', {
      blocks: blocks.length, 
      courses: courses.length,
      nodes: flowNodes?.length, 
      edges: flowEdges?.length,
      overlayFlag, 
      trackBlocks: 'Loading...'
    });
  }

  // Absolute guardrails before ReactFlow
  const guardsOk = useMemo(() => 
    Array.isArray(flowNodes) &&
    Array.isArray(flowEdges) &&
    typeof nodeTypes.blockGroup === 'function' &&
    typeof nodeTypes.terminalNode === 'function'
  , [flowNodes, flowEdges, nodeTypes]);

  if (!guardsOk) {
    return <div className="p-6 text-sm text-muted-foreground">Preparing canvas…</div>;
  }

  // Coerce unknown node types to prevent ReactFlow crashes
  const KNOWN = new Set(Object.keys(nodeTypes));
  const safeNodes = useMemo(() => {
    let touched = false;
    const list = (flowNodes ?? []).map(n => {
      if (!n?.type || !KNOWN.has(n.type)) { 
        touched = true; 
        return {...n, type: 'blockGroup'}; 
      }
      return n;
    });
    if (touched && import.meta.env.DEV) console.warn('[COERCE] unknown node types → blockGroup');
    return list;
  }, [flowNodes, nodeTypes]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  // Staggered edges V2 system
  const { visibleEdges, isRevealing, forceRevealAll } = useStaggeredEdgesV2(
    allEdges,
    safeNodes,
    {
      enabled: flags.eduTreeStaggeredEdgesV2 && viewMode === 'flow' && !isSafeMode,
      batchDelayMs: 140,
      emergencyTimeoutMs: 5000,
    }
  );

  // Track resolution and overlay
  const [primaryTrack, setPrimaryTrack] = useState<any>(null);

  useEffect(() => {
    if (!currentTrackKey || !overlayFlag || !blocks.length || isSafeMode) return;
    
    resolveTrackBlockIds(currentTrackKey)
      .then(track => {
        console.log('[Track Resolution]', { trackKey: currentTrackKey, track });
        setPrimaryTrack(track);
      })
      .catch(err => {
        console.error('[Track Resolution Error]', err);
        setPrimaryTrack(null);
      });
  }, [currentTrackKey, overlayFlag, blocks.length]);

  // Base edges for overlay (unified source)
  const baseEdges = useMemo(() => {
    return flags.eduTreeStaggeredEdgesV2 ? visibleEdges : flowEdges;
  }, [flags.eduTreeStaggeredEdgesV2, visibleEdges, flowEdges]);

  // Overlay computation using actual graph structure
  const highlighted = useMemo(() => {
    if (isSafeMode || !overlayFlag || !primaryTrack?.blockIds?.length) return null;
    return computeHighlights(safeNodes, baseEdges, new Set(primaryTrack.blockIds));
  }, [overlayFlag, primaryTrack, safeNodes, baseEdges, isSafeMode]);

  const viewNodes = useMemo(() => {
    if (!highlighted) return safeNodes;
    if (highlighted.nodeIds.size === 0) return safeNodes; // no-op, avoid dim-only UI
    return safeNodes.map(n => {
      const cls = [n.className, 'node'];
      cls.push(highlighted.nodeIds.has(String(n.id)) ? 'node--primary' : 'node--dim');
      return {...n, className: cls.filter(Boolean).join(' ')};
    });
  }, [safeNodes, highlighted]);

  const viewEdges = useMemo(() => {
    if (!highlighted) return baseEdges;
    if (highlighted.edgeIds.size === 0) return baseEdges;
    return baseEdges.map(e => {
      const id = /^e-.+-.+$/.test(String(e.id)) ? String(e.id) : `e-${e.source}-${e.target}`;
      const cls = [e.className, 'edge'];
      cls.push(highlighted.edgeIds.has(id) ? 'edge--primary' : 'edge--dim');
      return {...e, id, className: cls.filter(Boolean).join(' ')};
    });
  }, [baseEdges, highlighted]);

  // Development audit logging with safety guards
  useEffect(() => {
    if (!overlayFlag || !primaryTrack || isSafeMode) return;
    if (!highlighted?.nodeIds?.size) return;
    
    // Simple audit logging
    console.log('[Track Audit]', {
      totalNodes: viewNodes.length,
      totalEdges: viewEdges.length,
      nodesInTrack: highlighted.nodeIds.size,
      edgesInTrack: highlighted.edgeIds.size,
      trackKey: currentTrackKey,
      overlayFlag: overlayFlag
    });
  }, [overlayFlag, primaryTrack, highlighted, viewNodes.length, viewEdges.length, currentTrackKey, isSafeMode]);

  // 4) FitView exactly once per activation with highlighted node/edge count guard
  const didFitRef = useRef(false);
  useEffect(() => {
    const overlayOn = overlayFlag && primaryTrack;
    if (!reactFlowInstance || !overlayOn || isSafeMode) { 
      didFitRef.current = false; 
      return; 
    }
    if (!viewNodes?.length || !viewEdges?.length) return;
    if (didFitRef.current) return;
    
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      didFitRef.current = true;
      console.log('[TrackComparison] fitView executed');
    }, 80);

    return () => clearTimeout(timer);
  }, [reactFlowInstance, overlayFlag, primaryTrack, viewNodes?.length, viewEdges?.length, isSafeMode]);

  // Dev hotkey: press 'T' to toggle Track Validator
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const onKey = (e: KeyboardEvent) => { 
      if (e.key.toLowerCase() === 't') setShowTrackValidator(v => !v); 
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Handle node changes with simple forwarding
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Simplified layout management 
  const applyLayout = useCallback(async (mode: 'flow' | 'board', layoutNodes: Node[], layoutEdges: Edge[]) => {
    if (mode === 'board' || forceGrid) {
      return layoutAsGrid(layoutNodes, 'board');
    }

    try {
      return await layoutWithElk(layoutNodes, layoutEdges);
    } catch (error) {
      console.error('Layout failed, using fallback:', error);
      return layoutAsGrid(layoutNodes, 'board');
    }
  }, [forceGrid]);

  // Calculate outcome panel summary
  const outcomeSummary: PlanValidationSummary = useMemo(() => {
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    const completedCredits = courses
      .filter(c => completedCourseIds.has(c.id))
      .reduce((sum, c) => sum + c.credits, 0);
    
    // Simple estimates - in real app these would be more sophisticated
    const estimatedMonths = Math.max(24, Math.ceil((totalCredits - completedCredits) / 15 * 4));
    const estimatedCost = (totalCredits - completedCredits) * 500; // $500 per credit estimate
    
    const issues: string[] = [];
    if (completedCredits < totalCredits * 0.25) {
      issues.push('No foundation courses completed');
    }
    
    return {
      totalCredits,
      completedCredits,
      estimatedMonths,
      estimatedCost,
      planValid: issues.length === 0,
      issues
    };
  }, [courses, completedCourseIds]);

  // Enhanced onInit with terminal focus
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const onInit = useCallback((reactFlowInstance: any) => {
    console.log('[BOOT] RF onInit');
    setReactFlowInstance(reactFlowInstance);
    
    // Clear any pending fitView to debounce
    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current);
    }
    
    // Single debounced fitView after initialization
    fitViewTimeoutRef.current = setTimeout(() => {
      const hasTerminal = finalNodes.some(node => 
        node.type === 'terminal' || node.type === 'terminalNode' || 
        node.id === 'degree-completion'
      );
      
      const padding = hasTerminal ? 0.4 : 0.2;
      reactFlowInstance.fitView({ padding, duration: 300 });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EduTree] ReactFlow initialized - terminal detected: ${hasTerminal}, padding: ${padding}`);
      }
    }, 150);
  }, [viewNodes]);

  const handleModeToggle = useCallback(() => {
    setViewMode(prev => prev === 'flow' ? 'board' : 'flow');
  }, []);

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = Array.from(completedCourseIds).length;
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    const completedCredits = courses
      .filter(c => completedCourseIds.has(c.id))
      .reduce((sum, c) => sum + c.credits, 0);

    return { totalCourses, completedCourses, totalCredits, completedCredits };
  }, [courses, completedCourseIds]);

  // Safe node coercion moved up earlier - now use viewNodes for final render
  const finalNodes = useMemo(() => {
    return (viewNodes || []).map(node => {
      // Ensure all required properties exist
      if (!node?.id) {
        console.warn('[Safe Node] Missing ID:', node);
        return { ...node, id: `fallback-${Math.random()}` };
      }
      return node;
    });
  }, [finalNodes]);

  const finalEdges = useMemo(() => {
    return (viewEdges || []).map(edge => {
      // Ensure all required properties exist
      if (!edge?.source || !edge?.target) {
        console.warn('[Safe Edge] Missing endpoints:', edge);
        return null;
      }
      return edge;
    }).filter(Boolean);
  }, [viewEdges]);

  // Initial node/edge setup with layout
  useEffect(() => {
    if (!finalNodes.length) return;
    
    applyLayout(viewMode, finalNodes, finalEdges)
      .then((layoutResult) => {
        setNodes(layoutResult.nodes);
        setEdges(layoutResult.edges);
        setAllEdges(layoutResult.edges);
      })
      .catch(error => {
        console.error('Layout application failed:', error);
        // Fallback to original nodes/edges
        setNodes(finalNodes);
        setEdges(finalEdges);
        setAllEdges(finalEdges);
      });
  }, [finalNodes, finalEdges, viewMode, applyLayout]);

  // Handle course click
  const handleCourseClick = useCallback((courseId: string) => {
    console.log('Course clicked:', courseId);
    toast({
      title: "Course Information",
      description: `Viewing details for course ${courseId}`,
    });
  }, []);

  // Mode change handler with safe fallback
  useEffect(() => {
    if (!finalNodes.length || !finalEdges.length) return;
    
    setIsLayouting(true);
    
    // Clear any existing timeout
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
    }
    
    if (layoutInProgressRef.current) return;
    
    layoutInProgressRef.current = true;
    
    applyLayout(viewMode, finalNodes, finalEdges)
      .then((layoutResult) => {
        setNodes(layoutResult.nodes);
        setEdges(layoutResult.edges);
        setAllEdges(layoutResult.edges);
        setIsLayouting(false);
        layoutInProgressRef.current = false;
      })
      .catch(error => {
        console.error('Layout change failed:', error);
        setIsLayouting(false);
        layoutInProgressRef.current = false;
      });
  }, [viewMode, finalNodes, finalEdges, applyLayout]);

  // Loading state check - render skeleton until data arrives
  if (!finalNodes?.length || !finalEdges?.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-sm opacity-70">Loading curriculum…</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Degree Outcome Banner */}
      {flags.eduTreeOutcomes && (
        <DegreeOutcomeBanner
          targetCredits={120}
          completedCredits={stats.completedCredits}
          totalCourses={stats.totalCourses}
          completedCourses={stats.completedCourses}
          estimatedMonths={outcomeSummary.estimatedMonths}
          estimatedCost={outcomeSummary.estimatedCost}
          planIssues={outcomeSummary.issues}
          selectedLens={selectedLens}
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Education Tree</h1>
            {isSafeMode && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Safe Mode: Overlay disabled
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <SeedDataButton />
            <Button
              variant="outline"
              size="sm"
              onClick={handleModeToggle}
            >
              {viewMode === 'flow' ? 'Board View' : 'Flow View'}
            </Button>
          </div>
        </div>
        
        {/* Track Controls */}
        {overlayFlag && !isSafeMode && (
          <div className="flex items-center gap-4">
            <SimpleTrackPicker
              value={currentTrackKey}
              onChange={handleTrackChange}
            />
            {DEV && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrackValidator(!showTrackValidator)}
              >
                {showTrackValidator ? 'Hide' : 'Show'} Validator
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Track Validator Panel */}
      {showTrackValidator && DEV && (
        <div className="p-4 border-b border-border bg-muted/50">
          <TrackValidator
            nodes={finalNodes}
            edges={finalEdges}
            primaryTrack={primaryTrack}
            isVisible={true}
          />
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Temporary debug override */}
        {window.location.search.includes('debug=basic') ? (
          <div style={{padding: 20, background: 'lightgreen'}}>
            DEBUG MODE: EduTree render path reached!
            <div>Data: {hasData ? 'YES' : 'NO'}</div>
            <div>Nodes: {flowNodes?.length ?? 0}</div>
            <div>Loading: {dataLoading ? 'YES' : 'NO'}</div>
            <div>NodeTypes Valid: {typeof nodeTypes.blockGroup === 'function' ? 'YES' : 'NO'}</div>
          </div>
        ) : !Array.isArray(flowNodes) || flowNodes.length === 0 ? (
          <div className="p-6">Loading curriculum nodes…</div>
        ) : !Array.isArray(flowEdges) ? (
          <div className="p-6">Loading curriculum connections…</div>
        ) : !nodeTypes.blockGroup || typeof nodeTypes.blockGroup !== 'function' ? (
          <div className="p-6">Preparing components…</div>
        ) : (
          <DebugBoundary>
            <ReactFlow
              nodes={flags.eduTreeStaggeredEdgesV2 && !isSafeMode ? nodes : finalNodes}
              edges={flags.eduTreeStaggeredEdgesV2 && !isSafeMode ? visibleEdges : finalEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={onInit}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.1}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={24} 
                size={1} 
              />
              <Controls showInteractive={false} />
              <EduTreeMiniMap />
            </ReactFlow>
          </DebugBoundary>
        )}
      </div>
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