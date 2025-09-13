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
  
  // Track comparison state - dynamic resolution from block titles
  const [currentTrackKey, setCurrentTrackKey] = useState<TrackId>(() => {
    const raw = searchParams.get('primary') as TrackId;
    return raw && getAllTrackIds().includes(raw) 
      ? raw 
      : 'software-engineering';
  });
  
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
  const isSafeMode = searchParams.get('safe') === '1';
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

  // Simplified layout function with better error handling
  const applyLayout = useCallback(async (mode: ViewMode, layoutNodes: Node[], layoutEdges: Edge[]): Promise<Node[]> => {
    if (layoutInProgressRef.current) {
      console.log('[Layout] Already in progress, skipping');
      return layoutNodes;
    }

    layoutInProgressRef.current = true;
    setIsLayouting(true);

    try {
      const result = await layoutWithElk(layoutNodes, layoutEdges, mode);
      return Array.isArray(result) ? result : layoutNodes;
    } catch (error) {
      console.error('Layout failed:', error);
      return layoutAsGrid(layoutNodes, 'board');
    } finally {
      layoutInProgressRef.current = false;
      setIsLayouting(false);
    }
  }, []);

  // Track handler
  const handleTrackChange = useCallback((newTrackKey: TrackId) => {
    setCurrentTrackKey(newTrackKey);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('primary', newTrackKey);
    newParams.set('eduTreeMultiPathOverlay', 'true');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

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

  // Track resolution and overlay
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
  }, [currentTrackKey, overlayFlag, blocks.length, isSafeMode]);

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

  // Reset fitView flag when overlay state changes
  useEffect(() => {
    if (!overlayFlag || !primaryTrack) {
      didFitRef.current = false;
    }
  }, [overlayFlag, primaryTrack]);

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
      {overlayFlag && !isSafeMode && (
        <div className="absolute top-4 left-4 z-20 space-y-2">
          <Card className="p-3 shadow-lg">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Track Comparison</Label>
              <SimpleTrackPicker
                value={currentTrackKey}
                onChange={handleTrackChange}
                data-testid="primary-track"
              />
              {primaryTrack && (
                <div className="text-xs text-muted-foreground">
                  Highlighting: {primaryTrack.name} ({primaryTrack.blockIds?.length || 0} blocks)
                </div>
              )}
            </div>
          </Card>
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
            primaryTrack={primaryTrack}
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