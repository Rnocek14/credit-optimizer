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


const DEV = import.meta.env.DEV;

// Node types mapping for ReactFlow  
const nodeTypes = useMemo(() => ({
  blockGroup: BlockGroup,
  terminalNode: TerminalNode,
  terminal: TerminalNode, // Alias for consistency
  placeholder: PlaceholderGroup,
}), []);

// Dev-time sanity check for node types
if (DEV) {
  console.log('[NODETYPES]', nodeTypes);
  Object.entries(nodeTypes).forEach(([k, v]) => {
    if (typeof v !== 'function') {
      console.warn('[INVALID NODETYPE]', k, v);
    }
  });
}

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
  
  // Feature flag source with querystring fallback
  const qsOverlay = searchParams.get('eduTreeMultiPathOverlay') === 'true';
  const overlayFlag = Boolean(flags.eduTreeMultiPathOverlay) || qsOverlay;
  const isSafeMode = searchParams.get('safe') === '1';
  
  
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

  // Add error handling
  if (dataLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-sm opacity-70">Loading curriculum…</div>
      </div>
    );
  }

  if (dataError && !isSafeMode) {
    return <EduTreeError error={dataError} />;
  }

  // Empty state (not an error):
  if (!hasData && !isSafeMode) {
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
  const { nodes: flowNodes, edges: flowEdges, blocksWithCourses } = useMemo(() => {
    try {
      // Use defensive transformer
      const result = transformEducationData(
        { blocks, courses, blockMembers, gates, gateEdges },
        completedCourseIds,
        flags
      );
      
      console.log('[EduTree][Transform][Result]', { 
        nodes: result.nodes.length, 
        edges: result.edges.length, 
        flowNodes: result.nodes.length,
        sampleEdgeId: result.edges[0]?.id 
      });
      
      // Dev-time assertion for edge normalization
      if (DEV) {
        const bad = result.edges.filter(e => !/^e-.+-.+$/.test(String(e.id)));
        if (bad.length) {
          console.warn('[ASSERT] bad edge ids:', bad.map(b => b.id));
        }
      }
      
      return result;
    } catch (error) {
      console.warn('[Transform Error]', error);
      // IMPORTANT: no setState here - just return safe fallback
      return {
        nodes: [],
        edges: [],
        blocksWithCourses: []
      };
    }
  }, [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, flags]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  // Staggered edges V2 system
  const { visibleEdges, isRevealing, forceRevealAll } = useStaggeredEdgesV2(
    allEdges,
    nodes,
    {
      enabled: flags.eduTreeStaggeredEdgesV2 && viewMode === 'flow',
      batchDelayMs: 140,
      emergencyTimeoutMs: 5000,
    }
  );

  // Track resolution and overlay
  const [primaryTrack, setPrimaryTrack] = useState<any>(null);

  useEffect(() => {
    if (!currentTrackKey || !overlayFlag || !blocks.length) return;
    
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

  // 2) Track comparison highlighting - Phase B & C: Feed baseEdges into highlight memo
  const highlightedElements = useMemo(() => {
    if (isSafeMode) {
      return { nodes: flowNodes, edges: baseEdges };
    }

    const overlayReady = 
      overlayFlag &&
      primaryTrack &&
      Array.isArray(primaryTrack.blockIds) &&
      primaryTrack.blockIds.length > 0 &&
      (baseEdges?.length ?? 0) > 0 &&
      (flowNodes?.length ?? 0) > 0;
    
    // Safe guards - ensure we have valid arrays
    const safeNodes = Array.isArray(flowNodes) ? flowNodes : [];
    const safeEdges = baseEdges; // <-- unified source
    
    if (!overlayReady) {
      return { nodes: safeNodes, edges: safeEdges };
    }

    // For now, just highlight primary track (comparison coming later)
    const primaryNodes = new Set(primaryTrack.blockIds);
    const primaryEdges = new Set();
    
    // Generate edge IDs from block sequence
    for (let i = 0; i < primaryTrack.blockIds.length - 1; i++) {
      const edgeId = `e-${primaryTrack.blockIds[i]}-${primaryTrack.blockIds[i + 1]}`;
      primaryEdges.add(edgeId);
    }
    
    // Phase C: Apply CSS classes based on track membership (merge with existing classes)
    const highlightedNodes = safeNodes.map(node => {
      const blockId = String(node.data?.blockId ?? node.id);
      const merged = [node.className, 'node'].filter(Boolean);
      
      if (primaryNodes.has(blockId)) {
        merged.push('node--primary');
      } else {
        merged.push('node--dim');
      }
      
      return { ...node, className: merged.join(' ') };
    });

    const highlightedEdges = safeEdges.map(edge => {
      // Defensive edge id normalization (GPT hotfix C)
      const id = /^e-.+-.+$/.test(String(edge.id)) ? String(edge.id)
                                                   : `e-${String(edge.source)}-${String(edge.target)}`;
      const merged = [edge.className, 'edge'].filter(Boolean);
      
      if (primaryEdges.has(id)) {
        merged.push('edge--primary');
      } else {
        merged.push('edge--dim');
      }
      
      return { ...edge, id, className: merged.join(' ') };
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Edges] base=', safeEdges.length, 'highlighted=', highlightedEdges.length);
      
      // 1) Assert: Visible edges must always carry one highlight class
      const ok = highlightedEdges.every(e =>
        /\bedge(--primary|--comparison|--both|--dim)\b/.test(e.className || '')
      );
      if (!ok) console.warn('[Assert] Some visible edges lack highlight classes');
      
      // 2) Edge endpoint sanity during reveal
      highlightedEdges.forEach(e => {
        if (!e.source || !e.target) console.warn('[Edge missing endpoints]', e.id, e);
      });
    }

    return { nodes: highlightedNodes, edges: highlightedEdges };
  }, [overlayFlag, primaryTrack, flowNodes, baseEdges, isSafeMode]);

  // 4) FitView exactly once per activation with highlighted node/edge count guard
  const didFitRef = useRef(false);
  useEffect(() => {
    const overlayOn = overlayFlag && primaryTrack;
    if (!reactFlowInstance || !overlayOn || isSafeMode) { 
      didFitRef.current = false; 
      return; 
    }
    if (!highlightedElements.nodes?.length || !highlightedElements.edges?.length) return;
    if (didFitRef.current) return;
    
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      didFitRef.current = true;
      console.log('[TrackComparison] fitView executed');
    }, 80);

    return () => clearTimeout(timer);
  }, [reactFlowInstance, overlayFlag, primaryTrack, 
      highlightedElements.nodes?.length, highlightedElements.edges?.length, isSafeMode]);

  // Development audit logging with safety guards
  useEffect(() => {
    if (!overlayFlag || !primaryTrack || isSafeMode) return;
    if (!highlightedElements.nodes?.length) return;
    
    // Simple audit logging
    console.log('[Track Audit]', {
      totalNodes: highlightedElements.nodes.length,
      totalEdges: highlightedElements.edges?.length || 0,
      trackKey: currentTrackKey,
      overlayFlag: overlayFlag
    });
  }, [overlayFlag, primaryTrack, highlightedElements.nodes?.length, highlightedElements.edges?.length, currentTrackKey, isSafeMode]);

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

  // DEV logging for data debugging
  useEffect(() => {
    if (DEV) {
      console.log('[EduTree] data-counts', {
        blocks: blocks.length,
        courses: courses.length,
        blockMembers: blockMembers.length,
        gates: gates.length,
        gateEdges: gateEdges.length,
      });
    }
  }, [blocks, courses, blockMembers, gates, gateEdges]);

  // Simplified layout management 
  const applyLayout = useCallback(async (mode: 'flow' | 'board', layoutNodes: Node[], layoutEdges: Edge[]) => {
    if (mode === 'board') {
      return layoutAsGrid(layoutNodes, mode);
    }

    try {
      return await layoutWithElk(layoutNodes, layoutEdges);
    } catch (error) {
      console.error('Layout failed, using fallback:', error);
      return layoutAsGrid(layoutNodes, 'board');
    }
  }, []);

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
      const hasTerminal = highlightedElements.nodes.some(node => 
        node.type === 'terminal' || node.type === 'terminalNode' || 
        node.id === 'degree-completion'
      );
      
      const padding = hasTerminal ? 0.4 : 0.2;
      reactFlowInstance.fitView({ padding, duration: 300 });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EduTree] ReactFlow initialized - terminal detected: ${hasTerminal}, padding: ${padding}`);
      }
    }, 150);
  }, [highlightedElements.nodes]);

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

  // Update ReactFlow nodes and edges when data changes
  useEffect(() => {
    if (highlightedElements.nodes && highlightedElements.edges) {
      setNodes(highlightedElements.nodes);
      setEdges(highlightedElements.edges);
      setAllEdges(highlightedElements.edges);
    }
  }, [highlightedElements, setNodes, setEdges]);

  // Handle course click
  const handleCourseClick = useCallback((courseId: string) => {
    console.log('Course clicked:', courseId);
    toast({
      title: "Course Information",
      description: `Viewing details for course ${courseId}`,
    });
  }, []);

  // Loading state check - render skeleton until data arrives
  if (!highlightedElements.nodes || !highlightedElements.edges) {
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
            nodes={highlightedElements.nodes}
            edges={highlightedElements.edges}
            primaryTrack={primaryTrack}
            isVisible={true}
          />
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Guard ReactFlow render until everything is valid */}
        {!Array.isArray(highlightedElements.nodes) || !Array.isArray(highlightedElements.edges) ? (
          <div className="p-4 text-center text-muted-foreground">Loading curriculum…</div>
        ) : !nodeTypes.blockGroup || typeof nodeTypes.blockGroup !== 'function' ? (
          <div className="p-4 text-center text-muted-foreground">Preparing canvas…</div>
        ) : !nodeTypes.terminalNode || typeof nodeTypes.terminalNode !== 'function' ? (
          <div className="p-4 text-center text-muted-foreground">Preparing canvas…</div>
        ) : (
          <DebugBoundary>
            <ReactFlow
              nodes={highlightedElements.nodes}
              edges={highlightedElements.edges}
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