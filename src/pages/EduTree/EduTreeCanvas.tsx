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
  TrackComparisonControls,
  PositionAnalysisPanel
} from './components';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { LayoutStatusPanel } from './components/LayoutStatusPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { resolveTrackBlockIds } from './data/resolveTrackBlocks';
import { TRACK_DEFINITIONS, TRACK_MAP, getAllTrackIds, type TrackId } from './data/trackDefinitions';
import { useEduTreeData } from './hooks/useEduTreeData';
import { useTrackComparison } from './hooks/useTrackComparison';
import { transformEducationData } from './utils/transformEducationData';
import './utils/positionCapture'; // Initialize position capture utilities
import { resolveEduTreeFlag, canBypassEduTreeFlag, resolveEduTreePhaseAFlag, resolveEduTreeQAModeFlag } from '@/lib/eduTreeFlags';
import { useMasterLayoutController, setReactFlowInstance, resetMasterLayoutController } from './utils/masterLayoutController';
import { computeGraphQAMetrics } from './qa/multipathQA';
import { safe } from './safe';
import './styles/trackOverlay.css';
import './styles/pathIdentity.css';
import './styles/masterLayout.css';

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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
  const nodeTypes = useMemo(() => ({
    blockGroup: BlockGroup,
    terminalNode: TerminalNode,
    placeholder: PlaceholderGroup
  }), []);

  // Data from Supabase
  const {
    data: { courses, blocks, blockMembers, gates, gateEdges },
    loading: dataLoading,
    error: dataError,
    hasData
  } = useEduTreeData();

  // Transform data for React Flow
  const { nodes: flowNodes, edges: flowEdges, blocksWithCourses } = useMemo(() => {
    console.log('[EduTreeCanvas] Starting transform with:', {
      blocks: blocks.length,
      courses: courses.length,
      overlayEnabled,
      primaryTrackId
    });
    
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
    
    console.log('[EduTreeCanvas] Transform result:', {
      nodesCount: result.nodes.length,
      edgesCount: result.edges.length
    });
    
    return result;
  }, [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, flags, overlayEnabled, primaryTrackId]);

  // QA Mode: Compute and export metrics when enabled
  const qaMode = resolveEduTreeQAModeFlag();
  
  useEffect(() => {
    if (!qaMode || flowNodes.length === 0 || flowEdges.length === 0 || blocks.length === 0) {
      return;
    }
    
    try {
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

  const isPhaseA = resolveEduTreePhaseAFlag();
  
  // Get track comparison highlights first
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
    overlayEnabled: overlayEnabled && !isPhaseA // Bypass overlay in PhaseA
  });

  // MASTER LAYOUT CONTROLLER - Single source of truth, eliminates all competition
  const { 
    nodes: masterNodes, 
    edges: masterEdges, 
    isLocked: layoutIsLocked,
    lockLayout,
    unlockLayout
  } = useMasterLayoutController(highlightedNodes, highlightedEdges, overlayEnabled);

  // EMERGENCY: Only reset on mount, never on prop changes to prevent loops
  useEffect(() => {
    return () => {
      // Only reset on unmount
      resetMasterLayoutController();
    };
  }, []); // No dependencies to prevent loops

  // Set primary track for global dimming effect
  useEffect(() => {
    if (!overlayEnabled) return;
    document.body.setAttribute('data-primary-track', primaryTrackId || '');
    return () => document.body.removeAttribute('data-primary-track');
  }, [overlayEnabled, primaryTrackId]);

  // Absolute guardrails before ReactFlow
  const guardsOk = useMemo(() => 
    Array.isArray(flowNodes) &&
    Array.isArray(flowEdges) &&
    typeof nodeTypes.blockGroup === 'function' &&
    typeof nodeTypes.terminalNode === 'function'
  , [flowNodes, flowEdges, nodeTypes]);

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
    isPhaseA,
    masterLayoutInfo: {
      nodesCount: masterNodes.length,
      edgesCount: masterEdges.length,
      layoutIsLocked
    }
  });

  // EMERGENCY STABILIZED LAYOUT - Reduced to minimal operations
  useLayoutEffect(() => {
    if (!reactFlowInstance || masterNodes.length === 0) return;
    
    // ONE-TIME registration only
    setReactFlowInstance(reactFlowInstance);
    
    // Apply nodes/edges only if they're actually different
    setNodes(prev => {
      if (prev.length !== masterNodes.length) {
        console.log('[EduTree Layout] Applying new nodes:', masterNodes.length);
        return masterNodes;
      }
      return prev;
    });
    
    setEdges(prev => {
      if (prev.length !== masterEdges.length) {
        console.log('[EduTree Layout] Applying new edges:', masterEdges.length);
        return masterEdges;
      }
      return prev;
    });
    
    setIsLayouting(false);
    layoutInProgressRef.current = false;
  }, [masterNodes.length, masterEdges.length, reactFlowInstance]); // Only depend on counts, not objects

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
          </div>
        </Card>
      </div>
    );
  }

  // Show error state if data failed to load
  if (dataError) {
    console.log('[EduTreeCanvas] Rendering error state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold text-destructive">Failed to Load Data</h3>
            <p className="text-muted-foreground">
              There was an error loading the education data. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Refresh Page
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
            <SeedDataButton />
          </div>
        </Card>
      </div>
    );
  }

  // Show empty state if no nodes were generated
  if (!guardsOk || masterNodes.length === 0) {
    console.log('[EduTreeCanvas] Rendering empty canvas state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">Canvas Generation Failed</h3>
            <p className="text-muted-foreground">
              The education tree could not be generated from the available data.
            </p>
            <div className="text-xs text-muted-foreground">
              Guards OK: {guardsOk ? 'Yes' : 'No'} | 
              Nodes: {masterNodes.length} | 
              Edges: {masterEdges.length}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  console.log('[EduTreeCanvas] Rendering main ReactFlow canvas');

  return (
    <div className="relative w-full h-full min-h-screen bg-background">
      {/* Main Canvas */}
      <div className="w-full h-full">
        <ReactFlow
          nodes={masterNodes}
          edges={masterEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          className="bg-background"
          proOptions={{ hideAttribution: true }}
          fitView={!layoutIsLocked}
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
            duration: 200
          }}
          nodesDraggable={!layoutIsLocked}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={!layoutIsLocked}
          selectNodesOnDrag={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="opacity-30"
          />
          <Controls />
          <MiniMap 
            nodeColor="#8b5cf6"
            maskColor="rgb(240, 242, 247, 0.8)"
            pannable
            zoomable
            position="top-left"
            style={{ backgroundColor: 'hsl(var(--background))' }}
          />
        </ReactFlow>
      </div>

      {/* Development Panels */}
      {DEV && (
        <>
          <LayoutStatusPanel 
            nodes={masterNodes}
            edges={masterEdges}
            isLayouting={isLayouting}
            layoutPassCount={0}
            isLayoutLocked={layoutIsLocked}
          />
          <DiagnosticPanel />
        </>
      )}

      {/* Track Comparison Controls */}
      {overlayEnabled && (
        <div className="fixed top-4 left-4 z-50">
          <TrackComparisonControls
            primaryTrackId={primaryTrackId}
            comparisonTrackId={comparisonTrackId}
            overlayEnabled={overlayEnabled}
            onPrimaryTrackChange={setPrimaryTrackId}
            onComparisonTrackChange={setComparisonTrackId}
            onOverlayToggle={setOverlayEnabled}
          />
        </div>
      )}

      {/* Seed Data Button */}
      <div className="fixed bottom-4 right-4">
        <SeedDataButton />
      </div>
    </div>
  );
}

// Wrap in ReactFlowProvider with ErrorBoundary and export
export default function EduTreeCanvas() {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <EduTreeCanvasInner />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}