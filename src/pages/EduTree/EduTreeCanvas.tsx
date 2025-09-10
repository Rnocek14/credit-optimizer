import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import { layoutWithElk, layoutAsGrid } from '@/lib/layout/elkLayout';
import { resolveColumnCollisions, LayoutManager } from '@/lib/layout/layoutLifecycle';
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
import { sortBlocksForLayout } from '@/lib/layout/topologicalSort';
import { DegreeOutcomeBanner } from './components/DegreeOutcomeBanner';
import { SkeletonNode } from './components/SkeletonNode';
import { DegreeOutcomePanel } from './components/DegreeOutcomePanel';
import { LensSelector } from './components/LensSelector';
import { EduLaneBackground, EDU_YEAR_LANES } from './components/EduLaneBackground';

// Node types for React Flow
const nodeTypes = {
  blockGroup: BlockGroup,
  skeleton: SkeletonNode,
};

const DEV = import.meta.env.DEV;

type ViewMode = 'flow' | 'board';

function EduTreeCanvasInner() {
  const flags = useFeatureFlags();
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [completedCourseIds] = useState<Set<string>>(new Set()); // Mock completed courses
  const [selectedLens, setSelectedLens] = useState<PlanningLens>('fastest');
  const [showOutcomePanel, setShowOutcomePanel] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  
  // Layout manager for debounced re-layouts
  const layoutManagerRef = useRef<LayoutManager | null>(null);
  const layoutMemoryRef = useRef<LayoutMemory>(new LayoutMemory());
  const { isDragging, setIsDragging, validateDrop, handleInvalidDrop } = useDragGuard();
  
  // State for path highlighting
  const [highlightedPath, setHighlightedPath] = useState<{ nodes: Set<string>, edges: Set<string> } | null>(null);
  
  // Fetch data from Supabase
  const { data: courses = [] } = useQuery({
    queryKey: ['edu-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .order('level_year', { ascending: true })
        .order('code', { ascending: true });
      
      if (error) throw error;
      return data as EduCourse[];
    },
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['requirement-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_blocks')
        .select('*')
        .order('level_year', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as RequirementBlock[];
    },
  });

  const { data: blockMembers = [] } = useQuery({
    queryKey: ['block-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_members')
        .select('*');
      
      if (error) throw error;
      return data as BlockMember[];
    },
  });

  const { data: gates = [] } = useQuery({
    queryKey: ['block-gates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_gates')
        .select('*');
      
      if (error) throw error;
      return data as BlockGate[];
    },
  });

  const { data: gateEdges = [] } = useQuery({
    queryKey: ['prereq-to-block'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prereq_to_block')
        .select('*');
      
      if (error) throw error;
      return data as GateEdge[];
    },
  });

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

    // Create block nodes with courses
    const blocksWithCourses: BlockWithCourses[] = blocks.map(block => ({
      ...block,
      courses: coursesByBlock.get(block.id) || [],
      gate: gates.find(g => g.block_id === block.id)
    }));

    // Apply topological sorting for stable Year-3 ordering
    const sortedBlocks = flags.eduTreeLayoutV2 ? 
      sortBlocksForLayout(blocksWithCourses, gateEdges) : 
      blocksWithCourses;

    // Calculate which blocks are unlocked
    const unlockedBlocks = new Set<string>();
    
    // Find blocks with no prerequisites (starting blocks)
    const blocksWithPrereqs = new Set(gateEdges.map(edge => edge.target_block_id));
    sortedBlocks.forEach(block => {
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
        
        const sourceBlock = sortedBlocks.find(b => b.gate?.id === edge.source_gate_id);
        if (sourceBlock && isBlockComplete(sourceBlock, sourceBlock.courses, completedCourseIds)) {
          unlockedBlocks.add(edge.target_block_id);
          changed = true;
        }
      });
    }

    const nodes: Node[] = sortedBlocks.map((block, index) => {
      const progress = {
        completed: block.courses.filter(c => completedCourseIds.has(c.id)).length,
        required: block.rule_type === 'ALL' ? block.courses.length : 
                 block.rule_type === 'K_OF_N' ? (block.k || 0) :
                 Math.ceil((block.credits_needed || 0) / 3) // Estimate courses needed for credits
      };

      const isHighlighted = highlightedPath?.nodes.has(String(block.id)) || false;

      return {
        id: String(block.id), // Ensure string ID
        type: 'blockGroup', // This must match nodeTypes key
        position: { x: block.level_year * 320, y: index * 200 }, // Initial grid position
        data: {
          block,
          completedCourseIds,
          isUnlocked: unlockedBlocks.has(block.id),
          progress,
          level_year: block.level_year,
          area: block.area,
          isHighlighted,
          planningLens: isHighlighted ? selectedLens : null
        }
      };
    });

    if (DEV) {
      console.log('[EduTree] Generated nodes:', { 
        nodeCount: nodes.length, 
        firstNode: nodes[0],
        nodeTypes: Object.keys(nodeTypes)
      });
    }

    // Create React Flow edges (only between blocks)
    const edges: Edge[] = viewMode === 'flow' ? gateEdges.map(gateEdge => {
      const sourceBlock = sortedBlocks.find(b => b.gate?.id === gateEdge.source_gate_id);
      const source = sourceBlock?.id ? String(sourceBlock.id) : null;
      const target = String(gateEdge.target_block_id);
      
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

    return { nodes, edges };
  }, [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, viewMode, flags.eduTreeLayoutV2, highlightedPath]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

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

  // Apply layout when data changes with skeleton → measure → layout → delayed edges pipeline
  useEffect(() => {
    if (flowNodes.length === 0) return;

    if (DEV) console.log('[EduTree] applying layout', { mode: viewMode, nodeCount: flowNodes.length });

    if (viewMode === 'flow') {
      // Step 1: Show skeletons first if layoutV2 enabled
      if (flags.eduTreeLayoutV2 && !isLayouting) {
        setIsLayouting(true);
        setShowSkeletons(true);
        
        // Short delay to render skeletons, then proceed with layout
        setTimeout(() => {
          setShowSkeletons(false);
          performFlowLayout();
        }, 100);
      } else {
        performFlowLayout();
      }
    } else {
      performBoardLayout();
    }

    async function performFlowLayout() {
      try {
        // Try to restore previous positions first
        let nodesToLayout = flowNodes;
        if (flags.eduTreeLanes) {
          nodesToLayout = layoutMemoryRef.current.restorePositions(flowNodes, 'flow');
          if (nodesToLayout.every(n => n.position.x === 0 && n.position.y === 0)) {
            // No saved positions, use scaffolding
            nodesToLayout = snapToLanes(flowNodes, DEFAULT_LANE_SCAFFOLD);
          }
        }
        
        const layoutedNodes = await layoutWithElk(nodesToLayout, flowEdges);
        if (DEV) console.log('[EduTree] ELK done', layoutedNodes.length);
        
        // Apply post-layout collision resolution if layoutV2 enabled
        const finalNodes = flags.eduTreeLayoutV2 ? 
          resolveColumnCollisions(layoutedNodes) : layoutedNodes;
          
        setNodes(finalNodes);
        
        // Step 3: Delayed edge fade-in for layoutV2
        if (flags.eduTreeLayoutV2) {
          setTimeout(() => {
            setEdges(flowEdges);
            setIsLayouting(false);
          }, 250);
        } else {
          setEdges(flowEdges);
        }
        
        // Save positions for mode switching
        if (flags.eduTreeLanes) {
          layoutMemoryRef.current.savePositions(finalNodes, 'flow');
        }
      } catch (error) {
        console.error('[EduTree] ELK failed, fallback', error);
        // Fallback to simple grid if ELK fails
        const fallbackNodes = flowNodes.map((node, index) => ({
          ...node,
          position: { x: (index % 3) * 320, y: Math.floor(index / 3) * 220 }
        }));
        setNodes(fallbackNodes);
        setEdges(flowEdges);
        setIsLayouting(false);
      }
    }

    function performBoardLayout() {
      const gridNodes = layoutAsGrid(flowNodes, 'board');
      if (DEV) console.log('[EduTree] grid done', gridNodes.length);
      setNodes(gridNodes);
      setEdges([]); // No edges in board mode
      
      // Save board positions
      if (flags.eduTreeLanes) {
        layoutMemoryRef.current.savePositions(gridNodes, 'board');
      }
    }
  }, [flowNodes, flowEdges, viewMode, setNodes, setEdges, flags.eduTreeLayoutV2, flags.eduTreeLanes, isLayouting]);

  // Update path highlighting when lens changes
  useEffect(() => {
    if (flags.eduTreeOutcomes && flowNodes.length > 0 && flowEdges.length > 0) {
      const optimalPath = findOptimalPath(flowNodes, flowEdges, selectedLens, completedCourseIds);
      setHighlightedPath({
        nodes: new Set(optimalPath.nodes),
        edges: new Set(optimalPath.edges)
      });
    }
  }, [selectedLens, flowNodes, flowEdges, completedCourseIds, flags.eduTreeOutcomes]);

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

  // Listen for node resize events and trigger debounced re-layout
  useEffect(() => {
    if (!flags.eduTreeLayoutV2) return;
    
    const handleNodeResize = () => {
      if (!layoutManagerRef.current) {
        layoutManagerRef.current = new LayoutManager(() => {
          if (viewMode === 'flow' && flowNodes.length > 0) {
            layoutWithElk(flowNodes, flowEdges).then(layoutedNodes => {
              const finalNodes = resolveColumnCollisions(layoutedNodes);
              setNodes(finalNodes);
            });
          }
        });
      }
      layoutManagerRef.current.triggerLayout();
    };

    window.addEventListener('node:resized', handleNodeResize);
    
    return () => {
      window.removeEventListener('node:resized', handleNodeResize);
      layoutManagerRef.current?.cleanup();
    };
  }, [flags.eduTreeLayoutV2, viewMode, flowNodes, flowEdges, setNodes]);

  // Handle fitView through ReactFlow's onInit callback
  const onInit = useCallback((reactFlowInstance: any) => {
    if (nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 0);
    }
  }, [nodes]);

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

      {/* React Flow Canvas */}
      <div className="flex-1" style={{ height: 'calc(100vh - 140px)', minHeight: '400px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.2, duration: 300 }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          {/* Lane Background for educational context */}
          {flags.eduTreeLanes && viewMode === 'flow' && (
            <EduLaneBackground 
              lanes={EDU_YEAR_LANES} 
              height={2000} 
            />
          )}
          
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
      </div>

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

export function EduTreeCanvas() {
  return (
    <ReactFlowProvider>
      <EduTreeCanvasInner />
    </ReactFlowProvider>
  );
}