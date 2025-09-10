import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { layoutWithElk, layoutAsGrid } from '@/lib/layout/elkLayout';
// Layout lifecycle removed - using simplified system
import { snapToLanes, LayoutMemory, DEFAULT_LANE_SCAFFOLD } from '@/lib/layout/laneScaffold';
import { findOptimalPath } from '@/lib/layout/pathScoring';
import { useFeatureFlags } from '@/lib/featureFlags';
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
import { SeedDataButton } from './components/SeedDataButton';
import { BlockGroup } from './components/BlockGroup';
import { CourseNode } from './components/CourseNode';
import { TransitionBlock } from './components/TransitionBlock';
import { sortBlocksForLayout } from '@/lib/layout/topologicalSort';
import { DegreeOutcomeBanner } from './components/DegreeOutcomeBanner';
import { DegreeOutcomePanel } from './components/DegreeOutcomePanel';
import { LensSelector } from './components/LensSelector';
import { EduLaneBackground, EDU_YEAR_LANES } from './components/EduLaneBackground';
import { EduBackground } from './components/EduBackground';
import { FocusProvider, useFocus } from './contexts/FocusContext';
import { SpecializationTrack } from './components/SpecializationTrack';
import { FocusToolbar } from './components/FocusToolbar';
import { FocusTransitions } from './components/FocusTransitions';
import { LayoutDebugger } from './components/LayoutDebugger';
import { EduTreeLoadingProvider } from './providers/EduTreeLoadingProvider';
import { EduTreeLoadingFallback } from './components/EduTreeLoadingFallback';
import { EduTreeErrorBoundary } from './components/EduTreeErrorBoundary';
import { useEduTreeQueries } from './hooks/useEduTreeQueries';

// Node types for React Flow
const nodeTypes = {
  blockGroup: BlockGroup,
  specializationTrack: SpecializationTrack,
  transitionBlock: TransitionBlock,
};

const DEV = import.meta.env.DEV;

type ViewMode = 'flow' | 'board';

function EduTreeCanvasInner() {
  const flags = useFeatureFlags();
  const { focusState } = useFocus();
  const [viewMode, setViewMode] = useState<ViewMode>('flow'); 
  const [completedCourseIds] = useState<Set<string>>(new Set()); // Mock completed courses
  const [selectedLens, setSelectedLens] = useState<PlanningLens>('fastest');
  const [showOutcomePanel, setShowOutcomePanel] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();
  const layoutInProgressRef = useRef(false);
  
  // Removed layout manager - using simplified system
  const layoutMemoryRef = useRef<LayoutMemory>(new LayoutMemory());
  const { isDragging, setIsDragging, validateDrop, handleInvalidDrop } = useDragGuard();
  
  // State for path highlighting
  const [highlightedPath, setHighlightedPath] = useState<{ nodes: Set<string>, edges: Set<string> } | null>(null);
  
  // Use enhanced queries with loading management
  const { 
    courses, 
    blocks, 
    blockMembers, 
    gates, 
    gateEdges,
    isCriticalDataReady 
  } = useEduTreeQueries();

  // Enhanced positioning system for focus modes
  const getNodePosition = useCallback((basePosition: { x: number; y: number }, nodeId: string, nodeType: string) => {
    // Apply focus mode transformations
    if (focusState.mode === 'web-track' && nodeType === 'specializationTrack' && nodeId === 'mobile-track') {
      return { x: basePosition.x, y: basePosition.y + 600 }; // Move mobile track down when focusing on web
    }
    if (focusState.mode === 'mobile-track' && nodeType === 'specializationTrack' && nodeId === 'web-track') {
      return { x: basePosition.x, y: basePosition.y - 600 }; // Move web track up when focusing on mobile
    }
    
    // Apply responsive spacing based on viewport
    return basePosition;
  }, [focusState.mode]);

  // Transform data for React Flow
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    console.log('Data check:', { 
      blocksLength: blocks.length, 
      coursesLength: courses.length, 
      blockMembersLength: blockMembers.length,
      gatesLength: gates.length,
      gateEdgesLength: gateEdges.length 
    });

    if (!blocks.length || !courses.length) {
      return { nodes: [], edges: [] };
    }

    // Group courses by block
    const coursesByBlock = new Map<string, EduCourse[]>();
    blockMembers.forEach(member => {
      const course = courses.find(c => c.id === member.course_id);
      if (course) {
        if (!coursesByBlock.has(member.block_id)) {
          coursesByBlock.set(member.block_id, []);
        }
        coursesByBlock.get(member.block_id)!.push(course);
      }
    });

    // Create block nodes with courses and filter out duplicates
    const blocksWithCourses: BlockWithCourses[] = blocks.map(block => ({
      ...block,
      courses: coursesByBlock.get(block.id) || [],
      gate: gates.find(g => g.block_id === block.id)
    }));

    // Separate specialization tracks instead of filtering them out
    console.log('🔍 Processing blocks for track separation:', blocksWithCourses.map(b => ({ id: b.id, title: b.title, courses: b.courses?.length || 0 })));
    
    // Separate Web and Mobile specialization blocks
    const webBlocks = blocksWithCourses.filter(block => block.title === 'Web Development');
    const mobileBlocks = blocksWithCourses.filter(block => block.title === 'Mobile Development');
    
    // Keep core blocks and remove the old "Specializations" parent block
    const coreBlocks = blocksWithCourses.filter(block => 
      block.title !== 'Web Development' && 
      block.title !== 'Mobile Development' && 
      block.title !== 'Specializations'
    );
    
    console.log('✅ Track separation:', {
      core: coreBlocks.length,
      web: webBlocks.length, 
      mobile: mobileBlocks.length
    });

    // Apply topological sorting for stable Year-3 ordering on core blocks
    const sortedCoreBlocks = flags.eduTreeLayoutV2 ? 
      sortBlocksForLayout(coreBlocks, gateEdges) : 
      coreBlocks;

    // Calculate which blocks are unlocked
    const unlockedBlocks = new Set<string>();
    
    // Find blocks with no prerequisites (starting blocks) 
    const blocksWithPrereqs = new Set(gateEdges.map(edge => edge.target_block_id));
    [...sortedCoreBlocks, ...webBlocks, ...mobileBlocks].forEach(block => {
      if (!blocksWithPrereqs.has(block.id)) {
        unlockedBlocks.add(block.id);
      }
    });

    // Unlock blocks whose prerequisites are complete
    let changed = true;
    while (changed) {
      changed = false;
      gateEdges.forEach(edge => {
        if (unlockedBlocks.has(edge.target_block_id)) return;
        
        const allBlocks = [...sortedCoreBlocks, ...webBlocks, ...mobileBlocks];
        const sourceBlock = allBlocks.find(b => b.gate?.id === edge.source_gate_id);
        if (sourceBlock && isBlockComplete(sourceBlock, sourceBlock.courses, completedCourseIds)) {
          unlockedBlocks.add(edge.target_block_id);
          changed = true;
        }
      });
    }

    // Create nodes with natural horizontal layout positioning
    const coreNodes: Node[] = sortedCoreBlocks
      .map((block, index) => {
        if (!block || !block.id) {
          console.warn('[EduTree] Invalid block data:', block);
          return null;
        }

        const progress = {
          completed: block.courses.filter(c => completedCourseIds.has(c.id)).length,
          required: block.rule_type === 'ALL' ? block.courses.length : 
                   block.rule_type === 'K_OF_N' ? (block.k || 0) :
                   Math.ceil((block.credits_needed || 0) / 3)
        };

        const isHighlighted = highlightedPath?.nodes.has(String(block.id)) || false;

        return {
          id: String(block.id),
          type: 'blockGroup',
          // Natural horizontal layout: wider year-based columns with better vertical spread
          position: getNodePosition({ 
            x: (block.level_year || 0) * 450, 
            y: index * 220 
          }, String(block.id), 'blockGroup'),
          data: {
            block,
            completedCourseIds,
            isUnlocked: unlockedBlocks.has(block.id),
            progress,
            level_year: block.level_year || 0,
            area: block.area || 'unknown',
            isHighlighted,
            planningLens: isHighlighted ? selectedLens : null
          }
        };
      })
      .filter(Boolean) as Node[];

    // Calculate Year 3 block positions for natural flow
    const year3Blocks = sortedCoreBlocks.filter(block => block.level_year === 3);
    const year3YPositions = year3Blocks.map((_, index) => index * 220);
    const year3CenterY = year3YPositions.length > 0 ? 
      (Math.min(...year3YPositions) + Math.max(...year3YPositions)) / 2 : 350;
    
    // Position transition block as natural continuation from Year 3
    const transitionX = 3 * 450 + 200; // Natural spacing from Year 3
    const transitionY = year3CenterY;
    
    // Add transition block - bridge between core and specialization
    const transitionNode: Node = {
      id: 'transition-block',
      type: 'transitionBlock',
      position: getNodePosition({ 
        x: transitionX,
        y: transitionY
      }, 'transition-block', 'transitionBlock'),
      data: {
        title: 'Choose Your Specialization',
        description: 'Select a track to focus your final year',
        availableTracks: [
          {
            id: 'web',
            title: 'Web Development',
            color: 'hsl(var(--primary))',
            isUnlocked: webBlocks.some(b => unlockedBlocks.has(b.id))
          },
          {
            id: 'mobile',
            title: 'Mobile Development', 
            color: 'hsl(var(--accent))',
            isUnlocked: mobileBlocks.some(b => unlockedBlocks.has(b.id))
          }
        ]
      }
    };

    // Create specialized track nodes with dynamic positioning
    const trackNodes: Node[] = [];
    
    // Position tracks as natural continuation from transition block
    const trackX = transitionX + 300; // Natural spacing from transition
    const trackSpacing = 280; // Consistent with core block spacing
    
    // Always show tracks in natural layout (focus enhances, doesn't hide)
    if (webBlocks.length > 0 || mobileBlocks.length > 0) {
      let trackIndex = 0;
      
      // Web track node - flows naturally from transition
      if (webBlocks.length > 0) {
        const isVisible = focusState.mode === 'overview' || 
                         focusState.mode === 'compare-tracks' ||
                         focusState.mode === 'web-track';
        
        if (isVisible) {
          trackNodes.push({
            id: 'web-track',
            type: 'specializationTrack',
            position: getNodePosition({ 
              x: trackX,
              y: transitionY - (trackSpacing / 2) // Above transition center
            }, 'web-track', 'specializationTrack'),
            data: {
              track: 'web',
              blocks: webBlocks,
              completedCourseIds,
              isUnlocked: webBlocks.some(b => unlockedBlocks.has(b.id))
            }
          });
          trackIndex++;
        }
      }

      // Mobile track node - flows naturally from transition  
      if (mobileBlocks.length > 0) {
        const isVisible = focusState.mode === 'overview' || 
                         focusState.mode === 'compare-tracks' ||
                         focusState.mode === 'mobile-track';
        
        if (isVisible) {
          trackNodes.push({
            id: 'mobile-track', 
            type: 'specializationTrack',
            position: getNodePosition({ 
              x: trackX,
              y: transitionY + (trackSpacing / 2) // Below transition center
            }, 'mobile-track', 'specializationTrack'),
            data: {
              track: 'mobile',
              blocks: mobileBlocks,
              completedCourseIds,
              isUnlocked: mobileBlocks.some(b => unlockedBlocks.has(b.id))
            }
          });
        }
      }
    }

    const nodes = [...coreNodes, transitionNode, ...trackNodes];

    if (DEV) {
      console.log('[EduTree] Generated nodes:', { 
        nodeCount: nodes.length, 
        firstNode: nodes[0],
        nodeTypes: Object.keys(nodeTypes)
      });
    }

    // Create React Flow edges between core blocks and to tracks
    const edges: Edge[] = viewMode === 'flow' ? gateEdges
      .filter(gateEdge => {
        const allBlocks = [...sortedCoreBlocks, ...webBlocks, ...mobileBlocks];
        const targetBlock = allBlocks.find(b => b.id === gateEdge.target_block_id);
        const sourceBlock = allBlocks.find(b => b.gate?.id === gateEdge.source_gate_id);
        return targetBlock && sourceBlock;
      })
      .map(gateEdge => {
        const allBlocks = [...sortedCoreBlocks, ...webBlocks, ...mobileBlocks];
        const sourceBlock = allBlocks.find(b => b.gate?.id === gateEdge.source_gate_id);
        const targetBlock = allBlocks.find(b => b.id === gateEdge.target_block_id);
        
        let source = sourceBlock?.id ? String(sourceBlock.id) : null;
        let target = String(gateEdge.target_block_id);
        
        // Route edges to track nodes if target is a specialization block
        if (targetBlock && (webBlocks.includes(targetBlock) || mobileBlocks.includes(targetBlock))) {
          target = webBlocks.includes(targetBlock) ? 'web-track' : 'mobile-track';
        }
        
        const isHighlighted = highlightedPath?.edges.has(String(gateEdge.id)) || false;
        
        return source ? {
          id: String(gateEdge.id),
          source,
          target,
          type: flags.eduTreeLayoutV2 ? 'step' : 'smoothstep',
          style: {
            stroke: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
            strokeWidth: isHighlighted ? 3 : 2,
            opacity: isHighlighted ? 1 : 0.65
          },
          markerEnd: {
            type: MarkerType.Arrow,
            color: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--primary))',
          },
          ...(flags.eduTreeLayoutV2 && {
            pathOptions: { offset: 12 }
          }),
        } : null;
      }).filter(Boolean) as Edge[] : [];

    // Add edges to transition block from Year 3 blocks
    const transitionEdges: Edge[] = [];
    year3Blocks.forEach(block => {
      transitionEdges.push({
        id: `${block.id}-to-transition`,
        source: String(block.id),
        target: 'transition-block',
        type: 'smoothstep',
        style: {
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
          opacity: 0.6
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'hsl(var(--primary))',
        }
      });
    });

    // Add edges from transition block to specialization tracks
    if (webBlocks.length > 0) {
      transitionEdges.push({
        id: 'transition-to-web',
        source: 'transition-block', 
        target: 'web-track',
        type: 'smoothstep',
        style: {
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
          opacity: 0.7
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'hsl(var(--primary))',
        }
      });
    }

    if (mobileBlocks.length > 0) {
      transitionEdges.push({
        id: 'transition-to-mobile',
        source: 'transition-block',
        target: 'mobile-track', 
        type: 'smoothstep',
        style: {
          stroke: 'hsl(var(--accent))',
          strokeWidth: 2,
          opacity: 0.7
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'hsl(var(--accent))',
        }
      });
    }

    const allEdges = [...edges, ...transitionEdges];

    return { nodes, edges: allEdges };
  }, [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, viewMode, flags.eduTreeLayoutV2, focusState.mode, selectedLens]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Apply natural positioning from computed flow data
  useEffect(() => {
    if (flowNodes.length > 0) {
      console.log('[EduTree] Applying natural educational flow layout to', flowNodes.length, 'nodes');
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [flowNodes, flowEdges, setNodes, setEdges]);

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

  // Restore path highlighting with proper dependency management
  useEffect(() => {
    if (flags.eduTreeOutcomes && flowNodes.length > 0 && flowEdges.length > 0) {
      const optimalPath = findOptimalPath(flowNodes, flowEdges, selectedLens, completedCourseIds);
      setHighlightedPath({
        nodes: new Set(optimalPath.nodes),
        edges: new Set(optimalPath.edges)
      });
    }
  }, [selectedLens, completedCourseIds, flags.eduTreeOutcomes, flowNodes.length, flowEdges.length]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
      layoutInProgressRef.current = false;
    };
  }, []);

  // Simplified layout system - no complex resize handling needed

  // EMERGENCY FIX: Simple React Flow initialization
  const onInit = useCallback((reactFlowInstance: any) => {
    // Simple fit view only, no complex layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 100);
  }, []);

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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Focus Toolbar */}
      <FocusToolbar className="mx-4 mt-4" />
      
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
            <h1 className="text-2xl font-bold">Education-First Skill Tree</h1>
            <p className="text-muted-foreground">Software Engineering Degree Path (B.S.)</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Card className="p-3">
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold">{stats.completedCourses}/{stats.totalCourses}</div>
                  <div className="text-muted-foreground">Courses</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{stats.completedCredits}/{stats.totalCredits}</div>
                  <div className="text-muted-foreground">Credits</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch 
                id="view-mode" 
                checked={viewMode === 'board'}
                onCheckedChange={handleModeToggle}
              />
              <Label htmlFor="view-mode" className="text-sm">
                Board Mode
              </Label>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {viewMode === 'flow' ? 'Flow View' : 'Board View'}
            </Badge>
            
            {/* Lens Selector */}
            {flags.eduTreeOutcomes && (
              <LensSelector 
                selectedLens={selectedLens}
                onLensChange={setSelectedLens}
              />
            )}
          </div>

          <div className="flex gap-2">
            <SeedDataButton />
            <Button variant="outline" size="sm">Export Plan</Button>
            <Button variant="outline" size="sm">Share</Button>
          </div>
        </div>
      </div>

      {/* React Flow Canvas with Focus Transitions */}
      <div className="flex-1" style={{ height: 'calc(100vh - 140px)', minHeight: '400px' }}>
        <FocusTransitions nodes={nodes}>
          <ReactFlow
            key={`reactflow-${viewMode}-${nodes.length}`} // Force re-init on mode/data changes
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={onInit}
            fitView
            fitViewOptions={{ padding: 0.2, duration: 300 }}
            minZoom={0.3}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            {/* Enhanced Educational Background */}
            <EduBackground width={2400} height={1200} nodes={nodes} />
            
            <Controls />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={24} 
              size={1}
              color="hsl(var(--muted-foreground)/0.3)"
            />
            {/* Mini-map for large tree navigation */}
            {flags.eduTreeOutcomes && viewMode === 'flow' && <EduTreeMiniMap />}
          </ReactFlow>
        </FocusTransitions>
      </div>

      {/* Layout Debugger (DEV only) */}
      {DEV && (
        <LayoutDebugger 
          nodes={nodes} 
          edges={edges} 
          enabled={true}
        />
      )}

      {/* Outcome Panel */}
      {flags.eduTreeOutcomes && (
        <OutcomePanel
          summary={outcomeSummary}
          selectedLens={selectedLens}
          isVisible={showOutcomePanel}
        />
      )}

      {/* Year labels aligned with lanes */}
      {viewMode === 'flow' && flags.eduTreeLanes && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex gap-12">
            {[1, 2, 3, 4].map((year, index) => (
              <Badge 
                key={year} 
                variant="outline" 
                className="text-xs bg-background/80 backdrop-blur-sm"
                style={{ 
                  marginLeft: index === 0 ? '200px' : '400px',
                  position: index === 0 ? 'relative' : 'static'
                }}
              >
                Year {year}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Fallback year labels for non-lane mode */}
      {viewMode === 'flow' && !flags.eduTreeLanes && (
        <div className="absolute bottom-4 left-4 flex gap-8 pointer-events-none">
          {[1, 2, 3, 4].map(year => (
            <Badge key={year} variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
              Year {year}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EduTreeCanvas() {
  return (
    <EduTreeErrorBoundary>
      <EduTreeLoadingProvider>
        <ReactFlowProvider>
          <FocusProvider>
            <EduTreeLoadingFallback>
              <EduTreeCanvasInner />
            </EduTreeLoadingFallback>
          </FocusProvider>
        </ReactFlowProvider>
      </EduTreeLoadingProvider>
    </EduTreeErrorBoundary>
  );
}