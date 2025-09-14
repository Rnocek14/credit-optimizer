import React, { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback, 
  useRef 
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
import { useStableOverlay } from './hooks/useStableOverlay';
import { TRACK_DEFINITIONS, TRACK_MAP, getAllTrackIds, type TrackId } from './data/trackDefinitions';
import { useEduTreeData } from './hooks/useEduTreeData';
import { transformEducationData } from './utils/transformEducationData';
import { EduTreeError } from '../../components/EduTreeError';
import { safe } from './safe';
import { computeHighlights } from './overlay';
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
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();
  const layoutInProgressRef = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [primaryTrack, setPrimaryTrack] = useState<any>(null);
  const didFitRef = useRef(false);
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // single sync (prevents loops)
  useEffect(() => {
    write(p => {
      p.set('primary', primaryTrackId);
      if (comparisonTrackId) p.set('comparison', comparisonTrackId); else p.delete('comparison');
      p.set('eduTreeMultiPathOverlay', String(overlayEnabled));
    });
  }, [primaryTrackId, comparisonTrackId, overlayEnabled, write]);
  
  // FIX 6: Node types mapping for ReactFlow - DEFENSIVE CHECK
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

  // Feature flag source with querystring fallback
  const qsOverlay = searchParams.get('eduTreeMultiPathOverlay') === 'true';
  const overlayFlag = Boolean(flags.eduTreeMultiPathOverlay) || qsOverlay;
  const debug = false; // Temporarily disabled

  // Data from Supabase
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

  // Simplified edges (removed staggered system)
  const visibleEdges = allEdges;
  const isRevealing = false;
  const forceRevealAll = () => {};

  // Base edges for overlay (unified source)
  const baseEdges = useMemo(() => {
    return flags.eduTreeStaggeredEdgesV2 ? visibleEdges : flowEdges;
  }, [flags.eduTreeStaggeredEdgesV2, visibleEdges, flowEdges]);

  // Build map: slug -> nodeId
  const nodeIdBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of safeNodes) {
      const d: any = n.data;
      const slug = d?.block?.slug || d?.slug;
      if (slug) m.set(slug, String(n.id));
    }
    return m;
  }, [safeNodes]);

  // Track node sets
  const overlayActive = overlayEnabled && !isSafeMode;

  // Enhanced slug mapping with diagnostics
  useEffect(() => {
    if (!overlayActive) return;
    
    console.log('[overlay:debug] Available node slugs:', Array.from(nodeIdBySlug.keys()));
    console.log('[overlay:debug] Node mapping:', Object.fromEntries(nodeIdBySlug));
    
    const primary = TRACK_MAP.get(primaryTrackId);
    const comparison = comparisonTrackId ? TRACK_MAP.get(comparisonTrackId) : null;
    
    if (primary) {
      const missing = primary.blockIds.filter(s => !nodeIdBySlug.has(s));
      console.log(`[overlay:debug] Primary track '${primary.name}' blockIds:`, primary.blockIds);
      if (missing.length) console.warn('[overlay] Primary missing slugs:', missing);
    }
    
    if (comparison) {
      const missing = comparison.blockIds.filter(s => !nodeIdBySlug.has(s));
      console.log(`[overlay:debug] Comparison track '${comparison.name}' blockIds:`, comparison.blockIds);
      if (missing.length) console.warn('[overlay] Comparison missing slugs:', missing);
    }
  }, [overlayActive, primaryTrackId, comparisonTrackId, nodeIdBySlug]);

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

    return { primaryNodeIds, comparisonNodeIds, sharedNodeIds };
  }, [overlayActive, primaryTrackId, comparisonTrackId, nodeIdBySlug]);

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

    return { primaryEdgeIds, comparisonEdgeIds, sharedEdgeIds };
  }, [overlayActive, baseEdges, primaryNodeIds, comparisonNodeIds]);

  // Enhanced diagnostic logs
  useEffect(() => {
    if (!overlayActive) return;
    
    console.log('[overlay:match]', {
      nodes: safeNodes.length,
      edges: baseEdges.length,
      primaryMatched: primaryNodeIds.size,
      comparisonMatched: comparisonNodeIds.size,
      shared: sharedNodeIds.size,
      primaryEdges: primaryEdgeIds.size,
      comparisonEdges: comparisonEdgeIds.size,
      sharedEdges: sharedEdgeIds.size
    });
    
    // Log specific matches for debugging
    if (primaryNodeIds.size > 0) {
      console.log('[overlay:primary-nodes]', Array.from(primaryNodeIds));
    }
    if (comparisonNodeIds.size > 0) {
      console.log('[overlay:comparison-nodes]', Array.from(comparisonNodeIds));
    }
    if (sharedNodeIds.size > 0) {
      console.log('[overlay:shared-nodes]', Array.from(sharedNodeIds));
    }
  }, [overlayActive, safeNodes.length, baseEdges.length, primaryNodeIds, comparisonNodeIds, sharedNodeIds, primaryEdgeIds, comparisonEdgeIds, sharedEdgeIds]);

  // Clean class application (remove collisions)
  const scrub = (klass?: string) =>
    (klass || '').split(' ')
      .filter(t => t && !['hl','hl--primary','hl--comparison','hl--both','hl--dim'].includes(t))
      .join(' ');

  const baseNodes = useMemo(() => safeNodes.map(n => ({ ...n, className: scrub(n.className) })), [safeNodes]);
  const baseEdgesC = useMemo(() => baseEdges.map(e => ({ ...e, className: scrub(e.className) })), [baseEdges]);

  const viewNodes = useMemo(() => {
    if (!overlayActive) return baseNodes;
    return baseNodes.map(n => {
      const cls = ['hl'];
      if (sharedNodeIds.has(n.id)) cls.push('hl--both');
      else if (primaryNodeIds.has(n.id)) cls.push('hl--primary');
      else if (comparisonNodeIds.has(n.id)) cls.push('hl--comparison');
      else cls.push('hl--dim');
      return { ...n, className: [n.className, ...cls].filter(Boolean).join(' ') };
    });
  }, [overlayActive, baseNodes, primaryNodeIds, comparisonNodeIds, sharedNodeIds]);

  const viewEdges = useMemo(() => {
    if (!overlayActive) return baseEdgesC;
    return baseEdgesC.map(e => {
      const id = e.id || `e-${e.source}-${e.target}`;
      const cls = ['hl'];
      if (sharedEdgeIds.has(id)) cls.push('hl--both');
      else if (primaryEdgeIds.has(id)) cls.push('hl--primary');
      else if (comparisonEdgeIds.has(id)) cls.push('hl--comparison');
      else cls.push('hl--dim');
      return { ...e, id, className: [e.className, ...cls].filter(Boolean).join(' ') };
    });
  }, [overlayActive, baseEdgesC, primaryEdgeIds, comparisonEdgeIds, sharedEdgeIds]);

  // Debug info
  const debugInfo = useMemo(() => ({
    overlayReady: overlayEnabled && !!primaryTrackId,
    resolvedBlocks: nodeIdBySlug.size,
    anyMatches: primaryNodeIds.size > 0,
    primaryCount: primaryNodeIds.size,
    comparisonCount: comparisonNodeIds.size,
    sharedCount: sharedNodeIds.size
  }), [overlayEnabled, primaryTrackId, nodeIdBySlug, primaryNodeIds, comparisonNodeIds, sharedNodeIds]);

  // Final nodes/edges with safety checks
  const finalNodes = useMemo(() => {
    const list = viewNodes;
    if (!list?.length) return [];
    
    return list.map(node => {
      if (!node || typeof node !== 'object') {
        if (import.meta.env.DEV) console.warn('[FALLBACK NODE]', node);
        return { 
          ...node, 
          id: node?.id || `fallback-${Math.random()}`,
          type: 'blockGroup',
          position: node?.position || { x: 0, y: 0 },
          data: node?.data || {}
        };
      }
      
      return node;
    }).filter(Boolean);
  }, [viewNodes]);

  const finalEdges = useMemo(() => {
    const list = viewEdges;
    if (!list?.length) return [];
    
    return list.map(edge => {
      return {
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        animated: false
      };
    }).filter(Boolean);
  }, [viewEdges]);

  // Outcome calculation
  const outcomeSummary = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = Array.from(completedCourseIds).length;
    const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
    const completedCredits = courses
      .filter(c => completedCourseIds.has(c.id))
      .reduce((sum, c) => sum + (c.credits || 0), 0);
    
    const estimatedMonths = Math.ceil((totalCourses - completedCourses) * 1.5);
    const estimatedCost = (totalCourses - completedCourses) * 500;
    
    const issues: any[] = []; // TODO: Implement validation
    
    return {
      totalCourses,
      completedCourses,
      totalCredits,
      completedCredits,
      estimatedMonths,
      estimatedCost,
      planValid: issues.length === 0,
      issues
    };
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
    const ue = (e: any) => console.error('[UNHANDLED ERROR]', e.error || e);
    const uhr = (e: any) => console.error('[UNHANDLED REJECTION]', e.reason);
    window.addEventListener('error', ue);
    window.addEventListener('unhandledrejection', uhr);
    return () => {
      window.removeEventListener('unhandledrejection', uhr);
      window.removeEventListener('error', ue);
    };
  }, []);

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


  // Reset fitView flag when overlay state changes
  useEffect(() => {
    if (!overlayEnabled) {
      didFitRef.current = false;
    }
  }, [overlayEnabled]);

  // Hotkeys for developer tools
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't') setShowTrackValidator(v => !v); 
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // One layout path (stop jitter)
  useEffect(() => {
    if (!finalNodes.length) return;
    const pad = 40, colW = 360, rowH = 220;
    const byYear = new Map<number, any[]>();
    [...finalNodes].sort((a,b) => String(a.id).localeCompare(String(b.id))).forEach(n => {
      const y = Number((n.data as any)?.level_year) || 1;
      (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(n);
    });

    const laidOut = ([] as typeof finalNodes).concat(
      ...[...byYear.entries()].map(([y, col]) =>
        col.map((n, i) => ({ ...n, position: { x: pad + (y - 1) * colW, y: pad + i * rowH } }))
      )
    );

    setNodes(laidOut);
    setEdges(finalEdges);
    setAllEdges(finalEdges);

    if (reactFlowInstance && !didFitRef.current) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
        didFitRef.current = true;
      }, 100);
    }
  }, [finalNodes, finalEdges, reactFlowInstance]);

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
      guardsOk
    });
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
      {/* Always render comparison controls */}
      <div data-testid="track-comparison-controls" className="track-comparison">
        <TrackComparisonControls
          overlayEnabled={overlayEnabled}
          primaryTrackId={primaryTrackId}
          comparisonTrackId={comparisonTrackId}
          onOverlayToggle={setOverlayEnabled}
          onPrimaryTrackChange={(id) => { setPrimaryTrackId(id); setOverlayEnabled(true); }}
          onComparisonTrackChange={setComparisonTrackId}
          debugInfo={{
            overlayReady: overlayEnabled && !!primaryTrackId,
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
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Loading Canvas...</h3>
            <p className="text-muted-foreground">
              Preparing education tree visualization.
            </p>
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      ) : (
        <>
          {/* Main Canvas */}
          <div className="h-full">
            <ReactFlow
              nodes={finalNodes}
              edges={finalEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={onInit}
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
        </>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-4">
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
              <span>{outcomeSummary.completedCourses}/{outcomeSummary.totalCourses} courses</span>
              <span>•</span>
              <span>{outcomeSummary.completedCredits}/{outcomeSummary.totalCredits} credits</span>
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
    <ReactFlowProvider>
      <EduTreeCanvasInner />
    </ReactFlowProvider>
  );
}