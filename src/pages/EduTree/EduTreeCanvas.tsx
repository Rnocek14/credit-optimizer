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
import { layoutWithElk, layoutAsGrid, ViewMode as LayoutViewMode } from '@/lib/layout/elkLayout';
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
import { useStableOverlay } from './hooks/useStableOverlay';
import { TRACK_DEFINITIONS, TRACK_MAP, getAllTrackIds, type TrackId } from './data/trackDefinitions';
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
  console.log('[EduTreeCanvasInner] Component mounting...');
  // ===== ALL HOOKS FIRST - ABSOLUTELY NO EARLY RETURNS AFTER HOOKS =====
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
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();
  const layoutInProgressRef = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [primaryTrack, setPrimaryTrack] = useState<any>(null);
  const didFitRef = useRef(false);
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // URL-based state management for tracks
  const isSafeMode = searchParams.get('safe') === '1';
  const [overlayEnabled, setOverlayEnabled] = useState(() => 
    searchParams.get('eduTreeMultiPathOverlay') === 'true'
  );
  
  const [primaryTrackId, setPrimaryTrackId] = useState<TrackId>(() => {
    const raw = searchParams.get('primary') as TrackId | null;
    return raw ?? 'software-engineering';
  });
  
  const [comparisonTrackId, setComparisonTrackId] = useState<TrackId | undefined>(() => {
    return (searchParams.get('comparison') as TrackId | null) ?? undefined;
  });

  // Keep URL in sync
  const syncParam = useCallback((k: string, v?: string) => {
    const p = new URLSearchParams(searchParams);
    v ? p.set(k, v) : p.delete(k);
    const s = p.toString();
    window.history.replaceState({}, '', s ? `?${s}` : location.pathname);
  }, [searchParams]);
  
  // Node types mapping for ReactFlow - DEFENSIVE CHECK
  const nodeTypes = useMemo(() => {
    const types = {
      blockGroup: BlockGroup,
      terminalNode: TerminalNode,
      terminal: TerminalNode, // Alias for consistency
      placeholder: PlaceholderGroup,
    };
    
    // Validation in dev mode
    if (DEV) {
      Object.entries(types).forEach(([key, component]) => {
        if (typeof component !== 'function') {
          console.error(`[CRITICAL] NodeType ${key} is not a function:`, component);
          throw new Error(`Invalid node type: ${key}`);
        }
      });
    }
    
    return types;
  }, []);

  // Feature flag source with querystring fallback
  const qsOverlay = searchParams.get('eduTreeMultiPathOverlay') === 'true';
  const overlayFlag = Boolean(flags.eduTreeMultiPathOverlay) || qsOverlay;
  const forceGrid = searchParams.get('elk') === '0';
  const debug = searchParams.get('debug') === '1';
  
  // Use the new defensive data hook
  const { 
    data: { courses, blocks, blockMembers, gates, gateEdges },
    loading: dataLoading,
    error: dataError,
    hasData 
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

  // Coerce unknown node types to prevent ReactFlow crashes
  const KNOWN = new Set(Object.keys(nodeTypes));
  const safeNodes = useMemo(() => {
    let touched = false;
    const list = (flowNodes ?? []).map(n => {
      if (!n?.type || !KNOWN.has(n.type)) { 
        touched = true; 
        return {...n, type: 'blockGroup', id: n?.id || `fallback-${Math.random()}`}; 
      }
      if (!n?.id) {
        touched = true;
        return {...n, id: `fallback-${Math.random()}`};
      }
      return n;
    });
    if (touched && import.meta.env.DEV) console.warn('[COERCE] Fixed node issues');
    return list;
  }, [flowNodes, nodeTypes]);

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

  // Base edges for overlay (unified source)
  const baseEdges = useMemo(() => {
    return flags.eduTreeStaggeredEdgesV2 ? visibleEdges : flowEdges;
  }, [flags.eduTreeStaggeredEdgesV2, visibleEdges, flowEdges]);

  // Track comparison with proper highlighting
  const { highlightedNodes: viewNodes, highlightedEdges: viewEdges, debugInfo } = useMemo(() => {
    if (!overlayEnabled || isSafeMode) {
      return { 
        highlightedNodes: safeNodes, 
        highlightedEdges: baseEdges,
        debugInfo: { overlayReady: false, resolvedBlocks: 0, anyMatches: false, primaryCount: 0, comparisonCount: 0, sharedCount: 0 }
      };
    }

    const primaryTrack = TRACK_MAP.get(primaryTrackId);
    const comparisonTrack = comparisonTrackId ? TRACK_MAP.get(comparisonTrackId) : undefined;

    if (!primaryTrack) {
      return { 
        highlightedNodes: safeNodes, 
        highlightedEdges: baseEdges,
        debugInfo: { overlayReady: false, resolvedBlocks: 0, anyMatches: false, primaryCount: 0, comparisonCount: 0, sharedCount: 0 }
      };
    }

    // Build node lookup by block slug
    const nodeByBlockSlug = new Map<string, Node>();
    safeNodes.forEach(node => {
      const blockData = node.data as any;
      const slug = blockData?.block?.slug || blockData?.slug;
      if (slug) {
        nodeByBlockSlug.set(slug, node);
      }
    });

    // Find nodes for tracks
    const primaryNodeIds = new Set<string>();
    const comparisonNodeIds = new Set<string>();
    
    primaryTrack.blockIds.forEach(slug => {
      const node = nodeByBlockSlug.get(slug);
      if (node) primaryNodeIds.add(node.id);
    });

    if (comparisonTrack) {
      comparisonTrack.blockIds.forEach(slug => {
        const node = nodeByBlockSlug.get(slug);
        if (node) comparisonNodeIds.add(node.id);
      });
    }

    // Find shared nodes
    const sharedNodeIds = new Set<string>();
    if (comparisonTrack) {
      primaryNodeIds.forEach(id => {
        if (comparisonNodeIds.has(id)) {
          sharedNodeIds.add(id);
        }
      });
    }

    // Find edges for tracks
    const primaryEdgeIds = new Set<string>();
    const comparisonEdgeIds = new Set<string>();
    const sharedEdgeIds = new Set<string>();

    baseEdges.forEach(edge => {
      const sInP = primaryNodeIds.has(String(edge.source));
      const tInP = primaryNodeIds.has(String(edge.target));
      const sInC = comparisonNodeIds.has(String(edge.source));
      const tInC = comparisonNodeIds.has(String(edge.target));
      const id = edge.id || `e-${edge.source}-${edge.target}`;

      if (sInP && tInP) primaryEdgeIds.add(id);
      if (sInC && tInC) comparisonEdgeIds.add(id);
      if (primaryEdgeIds.has(id) && comparisonEdgeIds.has(id)) sharedEdgeIds.add(id);
    });

    // Apply highlight classes
    const known = new Set(['node--primary','node--comparison','node--both','node--dim']);
    const highlightedNodes = safeNodes.map(n => {
      const c = ['node', n.className].filter(Boolean);
      const filtered = c.filter(token => !known.has(token));

      if (sharedNodeIds.has(n.id)) filtered.push('node--both');
      else if (primaryNodeIds.has(n.id)) filtered.push('node--primary');
      else if (comparisonNodeIds.has(n.id)) filtered.push('node--comparison');
      else filtered.push('node--dim');

      return { ...n, className: filtered.join(' ') };
    });

    const edgeKnown = new Set(['edge--primary','edge--comparison','edge--both','edge--dim']);
    const highlightedEdges = baseEdges.map(e => {
      const id = e.id || `e-${e.source}-${e.target}`;
      const c = ['edge', e.className].filter(Boolean);
      const filtered = c.filter(token => !edgeKnown.has(token));

      if (sharedEdgeIds.has(id)) filtered.push('edge--both');
      else if (primaryEdgeIds.has(id)) filtered.push('edge--primary');
      else if (comparisonEdgeIds.has(id)) filtered.push('edge--comparison');
      else filtered.push('edge--dim');

      return { ...e, id, className: filtered.join(' ') };
    });

    return {
      highlightedNodes,
      highlightedEdges,
      debugInfo: {
        overlayReady: true,
        resolvedBlocks: nodeByBlockSlug.size,
        anyMatches: primaryNodeIds.size > 0,
        primaryCount: primaryNodeIds.size,
        comparisonCount: comparisonNodeIds.size,
        sharedCount: sharedNodeIds.size
      }
    };
  }, [safeNodes, baseEdges, overlayEnabled, isSafeMode, primaryTrackId, comparisonTrackId]);

  // Final safe nodes/edges with complete validation
  const finalNodes = useMemo(() => {
    return (viewNodes || []).map(node => {
      if (!node?.id || !node?.type) {
        console.warn('[Safe Node] Missing required props:', node);
        return { 
          ...node, 
          id: node?.id || `fallback-${Math.random()}`,
          type: 'blockGroup',
          position: node?.position || { x: 0, y: 0 },
          data: node?.data || {}
        };
      }
      return node;
    });
  }, [viewNodes]);

  const finalEdges = useMemo(() => {
    return (viewEdges || []).map(edge => {
      if (!edge?.source || !edge?.target) {
        console.warn('[Safe Edge] Missing endpoints:', edge);
        return null;
      }
      return {
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}`,
      };
    }).filter(Boolean);
  }, [viewEdges]);

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

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = Array.from(completedCourseIds).length;
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    const completedCredits = courses
      .filter(c => completedCourseIds.has(c.id))
      .reduce((sum, c) => sum + c.credits, 0);

    return { totalCourses, completedCourses, totalCredits, completedCredits };
  }, [courses, completedCourseIds]);

  // Temporary safe column layout (bypassing ELK issues)
  const layoutYearColumns = useCallback((list: Node[]): Node[] => {
    const pad = 40, colW = 360, rowH = 220;
    const byYear = new Map<number, Node[]>();
    list.forEach(n => {
      const y = (n.data as any)?.level_year ?? 1;
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(n);
    });
    const out: Node[] = [];
    [...byYear.entries()].forEach(([year, arr]) => {
      arr.forEach((n, i) => {
        out.push({ ...n, position: { x: pad + (year - 1) * colW, y: pad + i * rowH } });
      });
    });
    return out;
  }, []);

  // Simplified layout function with better error handling
  const applyLayout = useCallback(async (mode: ViewMode, layoutNodes: Node[], layoutEdges: Edge[]): Promise<Node[]> => {
    if (layoutInProgressRef.current) {
      console.log('[Layout] Already in progress, skipping');
      return layoutNodes;
    }

    layoutInProgressRef.current = true;
    setIsLayouting(true);

    try {
      // Use safe column layout for now
      const result = layoutYearColumns(layoutNodes);
      return result;
    } catch (error) {
      console.error('Layout failed:', error);
      return layoutAsGrid(layoutNodes, 'board');
    } finally {
      layoutInProgressRef.current = false;
      setIsLayouting(false);
    }
  }, [layoutYearColumns]);

  // Track handlers with URL sync
  const handlePrimaryTrackChange = useCallback((newTrackId: TrackId) => {
    setPrimaryTrackId(newTrackId);
    syncParam('primary', newTrackId);
  }, [syncParam]);

  const handleComparisonTrackChange = useCallback((newTrackId: TrackId | undefined) => {
    setComparisonTrackId(newTrackId);
    syncParam('comparison', newTrackId);
  }, [syncParam]);

  const handleOverlayToggle = useCallback((enabled: boolean) => {
    setOverlayEnabled(enabled);
    syncParam('eduTreeMultiPathOverlay', String(enabled));
  }, [syncParam]);

  // Handle node changes with simple forwarding
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Simplified onInit without conflicting fitView
  const onInit = useCallback((reactFlowInstance: any) => {
    console.log('[BOOT] RF onInit');
    setReactFlowInstance(reactFlowInstance);
  }, []);

  const handleModeToggle = useCallback(() => {
    setViewMode(prev => prev === 'flow' ? 'board' : 'flow');
  }, []);

  // Handle course click
  const handleCourseClick = useCallback((courseId: string) => {
    console.log('Course clicked:', courseId);
    toast({
      title: "Course Information",
      description: `Viewing details for course ${courseId}`,
    });
  }, []);

  // ===== ALL EFFECTS =====
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

  // URL sync effects
  useEffect(() => { syncParam('primary', primaryTrackId); }, [primaryTrackId, syncParam]);
  useEffect(() => { syncParam('comparison', comparisonTrackId); }, [comparisonTrackId, syncParam]);
  useEffect(() => { syncParam('eduTreeMultiPathOverlay', String(overlayEnabled)); }, [overlayEnabled, syncParam]);

  // Development audit logging with safety guards
  useEffect(() => {
    if (!overlayEnabled || isSafeMode) return;
    
    console.log('[Track Audit]', {
      totalNodes: viewNodes.length,
      totalEdges: viewEdges.length,
      nodesInTrack: debugInfo.primaryCount,
      edgesInTrack: 0,
      trackKey: primaryTrackId,
      overlayFlag: overlayEnabled
    });
  }, [overlayEnabled, debugInfo, viewNodes.length, viewEdges.length, primaryTrackId, isSafeMode]);

  // Reset fitView flag when overlay state changes
  useEffect(() => {
    if (!overlayEnabled) {
      didFitRef.current = false;
    }
  }, [overlayEnabled]);

  // Dev hotkey: press 'T' to toggle Track Validator
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const onKey = (e: KeyboardEvent) => { 
      if (e.key.toLowerCase() === 't') setShowTrackValidator(v => !v); 
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Unified layout effect with proper debouncing
  useEffect(() => {
    if (!finalNodes.length) return;
    
    // Clear existing layout timeout
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current);
    }
    
    // Debounce layout changes
    layoutTimeoutRef.current = setTimeout(() => {
      applyLayout(viewMode, finalNodes, finalEdges)
        .then((layoutedNodes) => {
          setNodes(layoutedNodes);
          setEdges(finalEdges);
          setAllEdges(finalEdges);
          
          // Single fitView after layout is complete
          if (reactFlowInstance && !didFitRef.current) {
            setTimeout(() => {
              reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
              didFitRef.current = true;
            }, 100);
          }
        })
        .catch(error => {
          console.error('Layout failed:', error);
          // Fallback without layout
          setNodes(finalNodes);
          setEdges(finalEdges);
          setAllEdges(finalEdges);
        });
    }, 200);
    
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
    };
  }, [finalNodes, finalEdges, viewMode, applyLayout, reactFlowInstance]);

  // ===== CONDITIONAL RENDERING LOGIC - NO EARLY RETURNS BELOW =====
  
  // Render path logging for debugging
  console.log('[EduTree] render', {
    hasNodeTypes: !!nodeTypes.blockGroup && !!nodeTypes.terminalNode,
    overlayFlag, isSafeMode, dataLoading, dataError, hasData, guardsOk
  });

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
  
  // CONDITIONAL JSX RENDERING INSTEAD OF EARLY RETURNS
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading education tree data...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return <EduTreeError error={dataError} />;
  }

  if (!hasData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">No Data Available</h3>
            <p className="text-muted-foreground">
              The education tree data is not yet available. This could be due to:
            </p>
            <ul className="text-sm text-muted-foreground text-left space-y-1">
              <li>• Database not yet seeded</li>
              <li>• Network connectivity issues</li>
              <li>• Authentication required</li>
            </ul>
            <SeedDataButton />
          </div>
        </Card>
      </div>
    );
  }

  if (!guardsOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">Component Error</h3>
            <p className="text-muted-foreground">
              The education tree components failed validation:
            </p>
            <ul className="text-sm text-muted-foreground text-left space-y-1">
              <li>• Nodes: {Array.isArray(flowNodes) ? '✓' : '✗'}</li>
              <li>• Edges: {Array.isArray(flowEdges) ? '✓' : '✗'}</li>
              <li>• BlockGroup: {typeof nodeTypes.blockGroup === 'function' ? '✓' : '✗'}</li>
              <li>• TerminalNode: {typeof nodeTypes.terminalNode === 'function' ? '✓' : '✗'}</li>
            </ul>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // MAIN RENDER - Only reached when all conditions are met
  return (
    <div className="h-screen bg-background relative">
      {/* Track comparison overlay controls */}
      {!isSafeMode && (
        <TrackComparisonControls
          overlayEnabled={overlayEnabled}
          onOverlayToggle={handleOverlayToggle}
          primaryTrackId={primaryTrackId}
          onPrimaryTrackChange={handlePrimaryTrackChange}
          comparisonTrackId={comparisonTrackId}
          onComparisonTrackChange={handleComparisonTrackChange}
          debugInfo={debugInfo}
        />
      )}

      {/* Validity guard for React Flow */}
      {!Array.isArray(finalNodes) || !Array.isArray(finalEdges) ? (
        <div className="min-h-screen flex items-center justify-center">
          <div>Preparing canvas...</div>
        </div>
      ) : typeof nodeTypes.blockGroup !== 'function' || typeof nodeTypes.terminalNode !== 'function' ? (
        <div className="min-h-screen flex items-center justify-center">
          <div>Loading curriculum...</div>
        </div>
      ) : (
        <div className="h-full w-full relative">
          {isLayouting && (
            <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Organizing layout...</span>
              </div>
            </div>
          )}

          {/* Main Canvas */}
          <div className={`w-full h-full ${isLayouting ? 'layout-loading' : ''}`}>
            <ReactFlow
              nodes={finalNodes}
              edges={finalEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={onInit}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              className="bg-background"
              minZoom={0.1}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
              <Controls position="bottom-right" />
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={20} 
                size={1} 
                className="opacity-30"
              />
              <EduTreeMiniMap />
            </ReactFlow>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <Card className="p-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="view-mode"
                checked={viewMode === 'board'}
                onCheckedChange={handleModeToggle}
                disabled={isLayouting}
              />
              <Label htmlFor="view-mode" className="text-sm whitespace-nowrap">
                {viewMode === 'flow' ? 'Flow View' : 'Board View'}
              </Label>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{stats.completedCourses}/{stats.totalCourses} courses</span>
              <span>•</span>
              <span>{stats.completedCredits}/{stats.totalCredits} credits</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Outcome Panel */}
      {showOutcomePanel && (
        <div className="absolute bottom-4 left-4 z-10">
          <OutcomePanel
            summary={outcomeSummary}
            selectedLens={selectedLens}
            isVisible={showOutcomePanel}
          />
        </div>
      )}

      {/* Track Validator (Dev) */}
      {showTrackValidator && (
        <div className="absolute top-16 left-4 z-30">
          <TrackValidator
            nodes={finalNodes}
            edges={finalEdges}
            primaryTrack={TRACK_MAP.get(primaryTrackId)}
            isVisible={showTrackValidator}
          />
        </div>
      )}

      {/* Staggered edges reveal button */}
      {flags.eduTreeStaggeredEdgesV2 && isRevealing && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={forceRevealAll}
            variant="outline"
            size="sm"
            className="shadow-lg"
          >
            Reveal All Connections
          </Button>
        </div>
      )}

      {/* Loading overlay for layout operations */}
      {isLayouting && (
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
    <DebugBoundary>
      <ReactFlowProvider>
        <EduTreeCanvasInner />
      </ReactFlowProvider>
    </DebugBoundary>
  );
}