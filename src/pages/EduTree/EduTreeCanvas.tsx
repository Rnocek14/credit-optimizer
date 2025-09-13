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
  
  // TEMP: force overlay on if ?debugOverlay=1 or if comparison is in URL
  const debugOverlay = new URLSearchParams(window.location.search).get('debugOverlay') === '1';
  
  // URL & overlay state (keep this together) - FIX 1: Validate track IDs
  const isSafeMode = searchParams.get('safe') === '1';
  
  const VALID = new Set(getAllTrackIds());
  const getValid = (v: string | null, fallback: TrackId) =>
    (v && VALID.has(v as TrackId) ? (v as TrackId) : fallback);

  const [overlayEnabled, setOverlayEnabled] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eduTreeMultiPathOverlay') === 'true' || 
           !!params.get('comparison') || 
           debugOverlay;
  });
  const [primaryTrackId, setPrimaryTrackId] = useState<TrackId>(() =>
    getValid(new URLSearchParams(window.location.search).get('primary'), 'software-engineering')
  );
  const [comparisonTrackId, setComparisonTrackId] = useState<TrackId | undefined>(() => {
    const raw = new URLSearchParams(window.location.search).get('comparison');
    console.log('[DEBUG] Raw comparison from URL:', raw, 'VALID tracks:', [...VALID]);
    return raw && VALID.has(raw as TrackId) ? (raw as TrackId) : undefined;
  });

  // FIX 1: Single URL sync effect to prevent loops
  const lastUrlRef = useRef<string>('');
  
  // FIX 6: Node types mapping for ReactFlow - DEFENSIVE CHECK
  const nodeTypes = useMemo(() => {
    const types = {
      blockGroup: BlockGroup,
      terminalNode: TerminalNode,
      terminal: TerminalNode, // Alias for consistency
      placeholder: PlaceholderGroup,
    };
    
    // FIX 6: Validation in dev mode to guard against React #310
    if (import.meta.env.DEV) {
      Object.entries(types).forEach(([k, v]) => {
        if (typeof v !== 'function') console.warn('[INVALID NODETYPE]', k, v);
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

  // Build map: slug -> nodeId
  const nodeIdBySlug = useMemo(() => {
    const m = new Map<string,string>();
    for (const n of safeNodes) {
      const d: any = n.data;
      const slug = d?.block?.slug || d?.slug;
      if (slug) m.set(slug, String(n.id));
    }
    console.log('[DEBUG] nodeIdBySlug map:', Object.fromEntries(m));
    return m;
  }, [safeNodes]);

  // Track node sets
  const overlayActive = debugOverlay ? true : (overlayEnabled && !isSafeMode);
  const { primaryNodeIds, comparisonNodeIds, sharedNodeIds } = useMemo(() => {
    const primaryNodeIds = new Set<string>();
    const comparisonNodeIds = new Set<string>();
    const sharedNodeIds = new Set<string>();

    if (overlayActive) {
      // From track definitions (blockIds are slugs)
      TRACK_MAP.get(primaryTrackId)?.blockIds.forEach(slug => {
        const id = nodeIdBySlug.get(slug);
        if (id) primaryNodeIds.add(id);
      });

      if (comparisonTrackId) {
        TRACK_MAP.get(comparisonTrackId)?.blockIds.forEach(slug => {
          const id = nodeIdBySlug.get(slug);
          if (id) comparisonNodeIds.add(id);
        });

        // Find shared nodes
        primaryNodeIds.forEach(id => {
          if (comparisonNodeIds.has(id)) {
            sharedNodeIds.add(id);
          }
        });
      }
    }

    console.log('[HL] nodes', {
      total: safeNodes.length,
      primary: [...primaryNodeIds].length,
      comparison: [...comparisonNodeIds].length,
      shared: [...sharedNodeIds].length
    });

    return { primaryNodeIds, comparisonNodeIds, sharedNodeIds };
  }, [overlayActive, primaryTrackId, comparisonTrackId, nodeIdBySlug, safeNodes]);

  // Track edge sets
  const { primaryEdgeIds, comparisonEdgeIds, sharedEdgeIds } = useMemo(() => {
    const primaryEdgeIds = new Set<string>();
    const comparisonEdgeIds = new Set<string>();
    const sharedEdgeIds = new Set<string>();

    if (overlayActive) {
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
    }

    console.log('[HL] edges', {
      total: baseEdges.length,
      primary: [...primaryEdgeIds].length,
      comparison: [...comparisonEdgeIds].length,
      shared: [...sharedEdgeIds].length
    });

    return { primaryEdgeIds, comparisonEdgeIds, sharedEdgeIds };
  }, [overlayActive, baseEdges, primaryNodeIds, comparisonNodeIds]);

  // FIX 3: Clean class application - strip previous overlay classes first

  const cleanNode = (n: Node) => {
    const keep = (n.className || '').split(' ')
      .filter(t => t && !['node','node--primary','node--comparison','node--both','node--dim'].includes(t))
      .join(' ');
    return { ...n, className: keep };
  };

  const cleanEdge = (e: Edge) => {
    const keep = (e.className || '').split(' ')
      .filter(t => t && !['edge','edge--primary','edge--comparison','edge--both','edge--dim'].includes(t))
      .join(' ');
    return { ...e, className: keep };
  };

  const baseNodes = useMemo(() => safeNodes.map(cleanNode), [safeNodes]);
  const safeEdges = useMemo(() => baseEdges.map(cleanEdge), [baseEdges]);

  const viewNodes = useMemo(() => {
    if (!overlayActive) return baseNodes;
    return baseNodes.map(n => {
      const cls = ['node'];
      if (sharedNodeIds.has(n.id)) cls.push('node--both');
      else if (primaryNodeIds.has(n.id)) cls.push('node--primary');
      else if (comparisonNodeIds.has(n.id)) cls.push('node--comparison');
      else cls.push('node--dim');
      return { ...n, className: [n.className, ...cls].filter(Boolean).join(' ') };
    });
  }, [overlayActive, baseNodes, primaryNodeIds, comparisonNodeIds, sharedNodeIds]);

  const viewEdges = useMemo(() => {
    if (!overlayActive) return safeEdges;
    return safeEdges.map(e => {
      const id = e.id || `e-${e.source}-${e.target}`;
      const cls = ['edge'];
      if (sharedEdgeIds.has(id)) cls.push('edge--both');
      else if (primaryEdgeIds.has(id)) cls.push('edge--primary');
      else if (comparisonEdgeIds.has(id)) cls.push('edge--comparison');
      else cls.push('edge--dim');
      return { ...e, id, className: [e.className, ...cls].filter(Boolean).join(' ') };
    });
  }, [overlayActive, safeEdges, primaryEdgeIds, comparisonEdgeIds, sharedEdgeIds]);

  // Debug info
  const debugInfo = useMemo(() => ({
    overlayReady: overlayEnabled && !!primaryTrackId,
    resolvedBlocks: nodeIdBySlug.size,
    anyMatches: primaryNodeIds.size > 0,
    primaryCount: primaryNodeIds.size,
    comparisonCount: comparisonNodeIds.size,
    sharedCount: sharedNodeIds.size
  }), [overlayEnabled, primaryTrackId, nodeIdBySlug.size, primaryNodeIds, comparisonNodeIds, sharedNodeIds]);

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

  // FIX 2: Stabilize layout (safe columns; no ELK during triage)
  const layoutYearColumns = useCallback((list: Node[]): Node[] => {
    const pad = 40, colW = 360, rowH = 220;
    const byYear = new Map<number, Node[]>();
    // Sort nodes by stable key to prevent shuffle, use stable fallback year
    list.slice().sort((a,b) => String(a.id).localeCompare(String(b.id))).forEach(n => {
      const y = Number((n.data as any)?.level_year) || 1; // NOT (index % 4) + 1
      const arr = byYear.get(y) || [];
      arr.push(n);
      byYear.set(y, arr);
    });
    const out: Node[] = [];
    for (const [y, col] of byYear) {
      col.forEach((n, i) => {
        out.push({ ...n, position: { x: pad + (y - 1) * colW, y: pad + i * rowH } });
      });
    }
    return out;
  }, []);

  const handleOverlayToggle = useCallback((enabled: boolean) => {
    setOverlayEnabled(enabled);
  }, []);

  const handlePrimaryTrackChange = useCallback((id: TrackId) => {
    setPrimaryTrackId(id);
    // ensure overlay turns on when a primary is chosen
    setOverlayEnabled(true);
  }, []);

  const handleComparisonTrackChange = useCallback((id?: TrackId) => {
    setComparisonTrackId(id);
  }, []);

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

  // FIX 1: Single URL sync effect to prevent loops
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set('primary', primaryTrackId);
    if (comparisonTrackId) p.set('comparison', comparisonTrackId); else p.delete('comparison');
    p.set('eduTreeMultiPathOverlay', String(overlayEnabled));

    const next = p.toString();
    if (next !== lastUrlRef.current) {
      lastUrlRef.current = next;
      window.history.replaceState({}, '', `?${next}`);
    }
  }, [primaryTrackId, comparisonTrackId, overlayEnabled]);

  // FIX 5: Overlay debugging with slug validation
  useEffect(() => {
    if (!overlayActive) return;
    const primary = TRACK_MAP.get(primaryTrackId);
    const comparison = comparisonTrackId ? TRACK_MAP.get(comparisonTrackId) : undefined;

    const want = primary?.blockIds ?? [];
    const have = [...nodeIdBySlug.keys()];
    const missing = want.filter(s => !nodeIdBySlug.has(s));

    console.log('[Overlay]', {
      primaryTrackId, comparisonTrackId,
      desired: want, available: have, missing,
      matchedPrimary: primaryNodeIds.size,
      matchedComparison: comparisonNodeIds.size
    });
  }, [overlayActive, primaryTrackId, comparisonTrackId, nodeIdBySlug, primaryNodeIds, comparisonNodeIds]);

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

  // FIX 2: Unified layout effect - single layout path
  useEffect(() => {
    if (!finalNodes.length) return;
    const laidOut = layoutYearColumns(finalNodes);
    setNodes(laidOut);
    setEdges(finalEdges);
    setAllEdges(finalEdges);
    // single fitView
    if (reactFlowInstance && !didFitRef.current) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
        didFitRef.current = true;
      }, 120);
    }
  }, [finalNodes, finalEdges, layoutYearColumns, reactFlowInstance]);

  // ===== CONDITIONAL RENDERING LOGIC - NO EARLY RETURNS BELOW =====
  
  // Render path logging for debugging
  console.log('[EduTree]', {
    overlayEnabled, primaryTrackId, comparisonTrackId,
    nodes: safeNodes.length, edges: baseEdges.length
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
      {/* FIX 4: Track comparison overlay controls - force visible for debug */}
      <div data-testid="track-comparison-controls" className="track-comparison">
        <TrackComparisonControls
          overlayEnabled={overlayActive}
          onOverlayToggle={setOverlayEnabled}
          primaryTrackId={primaryTrackId}
          comparisonTrackId={comparisonTrackId}
          onPrimaryTrackChange={handlePrimaryTrackChange}
          onComparisonTrackChange={handleComparisonTrackChange}
          debugInfo={{
            overlayReady: overlayActive && !!primaryTrackId,
            resolvedBlocks: nodeIdBySlug.size,
            anyMatches: primaryNodeIds.size > 0,
            primaryCount: primaryNodeIds.size,
            comparisonCount: comparisonNodeIds.size,
            sharedCount: sharedNodeIds.size
          }}
        />
      </div>

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