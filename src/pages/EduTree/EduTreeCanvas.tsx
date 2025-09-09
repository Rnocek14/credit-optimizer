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
import './styles/locked-blocks.css';
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
  RequirementPlaceholder,
  PlaceholderMember,
  PlaceholderWithCourses,
  BlockMember, 
  BlockGate, 
  GateEdge,
  BlockWithCourses,
  isBlockComplete,
  isPlaceholderComplete,
  PlanningLens 
} from '@/lib/types/eduTree';
import { toast } from '@/hooks/use-toast';
import { SeedDataButton } from './components/SeedDataButton';
import { BlockGroup } from './components/BlockGroup';
import { CourseNode } from './components/CourseNode';
import { sortBlocksForLayout } from '@/lib/layout/topologicalSort';
import { DegreeOutcomeBanner } from './components/DegreeOutcomeBanner';
import { SkeletonNode } from './components/SkeletonNode';
import { PlaceholderGroup } from './components/PlaceholderGroup';
import { DegreeOutcomePanel } from './components/DegreeOutcomePanel';
import { LensSelector } from './components/LensSelector';

import { LaneRails } from './components/LaneRails';
import { useStaggeredEdges } from './hooks/useStaggeredEdges';
import { useStaggeredEdgesV2 } from './hooks/useStaggeredEdgesV2';

import { TerminalNode } from './components/TerminalNode';

// Node types for React Flow
const nodeTypes = {
  blockGroup: BlockGroup,
  skeleton: SkeletonNode,
  placeholderGroup: PlaceholderGroup,
  terminal: TerminalNode,
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
  const [isFirstLayout, setIsFirstLayout] = useState(true);
  const [edgesVisible, setEdgesVisible] = useState(false);
  const [layoutTransitioning, setLayoutTransitioning] = useState(false);
  
  // Staggered edge reveal hooks
  const legacyEdgeReveal = useStaggeredEdges();
  const v2EdgeReveal = useStaggeredEdgesV2();
  
  // Choose which edge reveal system to use
  const edgeReveal = flags.eduTreeStaggeredEdgesV2 ? v2EdgeReveal : legacyEdgeReveal;
  
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

  // Fetch placeholder data
  const { data: placeholders = [] } = useQuery({
    queryKey: ['requirement-placeholders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_placeholders')
        .select('*')
        .order('level_year', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as RequirementPlaceholder[];
    },
    enabled: flags.eduTreePlaceholders,
  });

  const { data: placeholderMembers = [] } = useQuery({
    queryKey: ['placeholder-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('placeholder_members')
        .select('*');
      
      if (error) throw error;
      return data as PlaceholderMember[];
    },
    enabled: flags.eduTreePlaceholders,
  });

  // Transform data for React Flow with placeholders support
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    console.log('Data check:', { 
      blocksLength: blocks.length, 
      coursesLength: courses.length, 
      blockMembersLength: blockMembers.length,
      gatesLength: gates.length,
      gateEdgesLength: gateEdges.length,
      placeholdersLength: placeholders.length,
      placeholderMembersLength: placeholderMembers.length
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

    // Group courses by placeholder (if placeholders enabled)
    const coursesByPlaceholder = new Map<string, EduCourse[]>();
    if (flags.eduTreePlaceholders) {
      placeholderMembers.forEach(member => {
        const course = courses.find(c => c.id === member.course_id);
        if (course) {
          if (!coursesByPlaceholder.has(member.placeholder_id)) {
            coursesByPlaceholder.set(member.placeholder_id, []);
          }
          coursesByPlaceholder.get(member.placeholder_id)!.push(course);
        }
      });
    }

    // Create blocks with courses
    const blocksWithCourses: BlockWithCourses[] = blocks.map(block => ({
      ...block,
      courses: coursesByBlock.get(block.id) || [],
      gate: gates.find(g => g.block_id === block.id)
    }));

    // Create placeholders with courses (if enabled)
    const placeholdersWithCourses: PlaceholderWithCourses[] = [];
    if (flags.eduTreePlaceholders) {
      // Group placeholders by parent
      const parentPlaceholders = placeholders.filter(p => !p.parent_block_id);
      const childrenByParent = new Map<string, RequirementPlaceholder[]>();
      
      placeholders.forEach(p => {
        if (p.parent_block_id) {
          if (!childrenByParent.has(p.parent_block_id)) {
            childrenByParent.set(p.parent_block_id, []);
          }
          childrenByParent.get(p.parent_block_id)!.push(p);
        }
      });

      // Build hierarchy
      parentPlaceholders.forEach(placeholder => {
        const children: PlaceholderWithCourses[] = (childrenByParent.get(placeholder.id) || [])
          .map(child => ({
            ...child,
            courses: coursesByPlaceholder.get(child.id) || [],
            children: []
          }));

        placeholdersWithCourses.push({
          ...placeholder,
          courses: coursesByPlaceholder.get(placeholder.id) || [],
          children
        });
      });
    }

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

    // Calculate graduation eligibility
    const totalCredits = 120; // Standard BS degree
    const completedCredits = Array.from(completedCourseIds).length * 3; // Estimate
    const coreComplete = sortedBlocks.filter(b => b.area === 'core').every(b => 
      isBlockComplete(b, b.courses, completedCourseIds)
    );
    const mathComplete = sortedBlocks.filter(b => b.area === 'mathematics').every(b => 
      isBlockComplete(b, b.courses, completedCourseIds)
    );
    const genedComplete = sortedBlocks.filter(b => b.area === 'general_education').every(b => 
      isBlockComplete(b, b.courses, completedCourseIds)
    );
    const capstoneComplete = sortedBlocks.filter(b => b.area === 'capstone').every(b => 
      isBlockComplete(b, b.courses, completedCourseIds)
    );
    
    const graduationEligible = completedCredits >= totalCredits && 
                              coreComplete && mathComplete && genedComplete && capstoneComplete;

    const nodes: Node[] = [
      // Block nodes
      ...sortedBlocks.map((block, index) => {
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
            planningLens: isHighlighted ? selectedLens : null,
            // Add estimated height for better first-paint layout
            measuredHeight: 180 + (block.courses.length * 18) // Rough estimate
          }
        };
      }),
      
      // Placeholder nodes (if enabled)
      ...(flags.eduTreePlaceholders ? placeholdersWithCourses.map((placeholder, index) => {
        const progress = {
          completed: placeholder.courses.filter(c => completedCourseIds.has(c.id)).length,
          required: placeholder.rule_type === 'ALL' ? placeholder.courses.length : 
                    placeholder.rule_type === 'K_OF_N' ? (placeholder.k || 0) :
                    Math.ceil((placeholder.credits_needed || 0) / 3)
        };

        const isHighlighted = highlightedPath?.nodes.has(`placeholder-${placeholder.id}`) || false;

        return {
          id: `placeholder-${placeholder.id}`,
          type: 'placeholderGroup',
          position: { 
            x: (placeholder.level_year || 1) * 320, 
            y: (sortedBlocks.length + index) * 220 
          },
          data: {
            placeholder,
            completedCourseIds,
            isUnlocked: true, // Placeholders are always unlocked
            progress,
            level_year: placeholder.level_year || 1,
            area: placeholder.area,
            isHighlighted,
            planningLens: isHighlighted ? selectedLens : null,
            measuredHeight: 220 // Estimated height for placeholders
          }
        };
      }) : []),
      
      // Terminal graduation node
      {
        id: 'graduation-terminal',
        type: 'terminal',
        position: { x: 5 * 320, y: 100 }, // Rightmost position
        data: {
          title: 'B.S. Software Engineering',
          isEligible: graduationEligible,
          requirements: [
            {
              label: 'Total Credits ≥ 120',
              met: completedCredits >= totalCredits,
              details: `${completedCredits}/${totalCredits} credits completed`
            },
            {
              label: 'Core Requirements Complete',
              met: coreComplete,
              details: 'All core computer science courses'
            },
            {
              label: 'Mathematics Requirements',
              met: mathComplete,
              details: 'Calculus, Statistics, Discrete Math'
            },
            {
              label: 'General Education Complete',
              met: genedComplete,
              details: 'Liberal arts and sciences courses'
            },
            {
              label: 'Capstone Project',
              met: capstoneComplete,
              details: 'Senior capstone or project course'
            }
          ],
          totalCredits,
          completedCredits,
          isHighlighted: highlightedPath?.nodes.has('graduation-terminal') || false,
          planningLens: highlightedPath?.nodes.has('graduation-terminal') ? selectedLens : null
        }
      }
    ];

    if (DEV) {
      console.log('[EduTree] Generated nodes:', { 
        nodeCount: nodes.length, 
        firstNode: nodes[0],
        nodeTypes: Object.keys(nodeTypes)
      });
    }

    // Create React Flow edges (blocks + terminal connections)
    const blockEdges = gateEdges.map(gateEdge => {
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
          stroke: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          strokeWidth: isHighlighted ? 4 : 2,
          opacity: isHighlighted ? 1 : 0.15 // Stronger dimming for better lens contrast
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        },
        ...(flags.eduTreeLayoutV2 && {
          pathOptions: { offset: 12 }
        }),
      } : null;
    }).filter(Boolean) as Edge[];
    
    // Terminal edges (connect completion requirements to graduation)
    const terminalEdges: Edge[] = [];
    if (viewMode === 'flow') {
      // Connect capstone to graduation
      const capstoneBlocks = sortedBlocks.filter(b => b.area === 'capstone');
      capstoneBlocks.forEach(block => {
        terminalEdges.push({
          id: `terminal-${block.id}`,
          source: String(block.id),
          target: 'graduation-terminal',
          type: 'step',
          style: {
            stroke: 'hsl(var(--accent))',
            strokeWidth: 2,
            strokeDasharray: '5,5',
            opacity: 0.7
          },
          markerEnd: {
            type: MarkerType.Arrow,
            color: 'hsl(var(--accent))',
          }
        });
      });
    }
    
    const edges: Edge[] = viewMode === 'flow' && edgesVisible ? [...blockEdges, ...terminalEdges] : [];

    // Add diagnostic logging for development
    if (DEV && edges.length > 0) {
      const nodeIds = new Set(nodes.map(n => n.id));
      const dangling = edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
      if (dangling.length) {
        console.warn('[EduTree] Dangling edges detected:', dangling.map(e => e.id));
      }
    }

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
          setEdgesVisible(false); // Hide edges during layout
        setLayoutTransitioning(true);
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
        
        const isFirstLayout = nodesToLayout.every(n => n.position.x === 0 && n.position.y === 0);
        const layoutedNodes = await layoutWithElk(nodesToLayout, flowEdges, isFirstLayout);
        if (DEV) console.log('[EduTree] ELK done', layoutedNodes.length);
        
        // Apply enhanced post-layout collision resolution if layoutV2 enabled
        const finalNodes = flags.eduTreeLayoutV2 ? 
          resolveColumnCollisions(layoutedNodes, flowEdges) : layoutedNodes;
          
        setNodes(finalNodes);
        
        // Step 3: Staggered edge reveal for better visual experience
        if (flags.eduTreeLayoutV2) {
          setTimeout(() => {
            try {
              edgeReveal.reset();
              
              // Handle different API signatures between v1 and v2
              if (flags.eduTreeStaggeredEdgesV2) {
                console.log('[EduTree] Using V2 staggered edges with', flowEdges.length, 'edges and', finalNodes.length, 'nodes');
                // V2 API: needs nodes parameter
                (edgeReveal as any).revealEdgesInBatches(flowEdges, finalNodes, () => {
                  setEdges(flowEdges);
                  setEdgesVisible(true);
                  setIsLayouting(false);
                  setLayoutTransitioning(false);
                });
              } else {
                console.log('[EduTree] Using legacy staggered edges with', flowEdges.length, 'edges');
                // Legacy API: no nodes parameter
                (edgeReveal as any).revealEdgesInBatches(flowEdges, () => {
                  setEdges(flowEdges);
                  setEdgesVisible(true);
                  setIsLayouting(false);
                  setLayoutTransitioning(false);
                });
              }
            } catch (error) {
              console.error('[EduTree] Edge reveal error, showing all edges immediately:', error);
              setEdges(flowEdges);
              setEdgesVisible(true);
              setIsLayouting(false);
              setLayoutTransitioning(false);
            }
          }, isFirstLayout ? 500 : 300);
        } else {
          setEdges(flowEdges);
          setEdgesVisible(true);
          setLayoutTransitioning(false);
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
        setLayoutTransitioning(false);
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

  // Cleanup edge reveal on unmount
  useEffect(() => {
    return () => {
      edgeReveal.reset();
      setLayoutTransitioning(false);
    };
  }, [edgeReveal]);
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
        reactFlowInstance.fitView({ padding: 0.3, duration: 300 }); // Increased padding for terminal visibility
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
            
            {/* V2 Staggered Edges Toggle */}
            {DEV && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id="staggered-edges-v2" 
                  checked={flags.eduTreeStaggeredEdgesV2}
                  onCheckedChange={(checked) => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('eduTreeStaggeredEdgesV2', String(checked));
                    window.location.href = url.toString();
                  }}
                />
                <Label htmlFor="staggered-edges-v2" className="text-sm">
                  Staggered Edges V2
                </Label>
              </div>
            )}
            
            <Badge variant="outline" className="text-xs">
              {viewMode === 'flow' ? 'Flow View' : 'Board View'}
            </Badge>
            
            {/* Edge reveal status indicator */}
            {DEV && flags.eduTreeStaggeredEdgesV2 && (
              <Badge variant="secondary" className="text-xs">
                V2 Edges
              </Badge>
            )}
            
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
      <div 
        className="flex-1 relative" 
        style={{ 
          height: 'calc(100vh - 140px)', 
          minHeight: '400px',
          pointerEvents: layoutTransitioning ? 'none' : 'auto' // Prevent interactions during layout
        }}
      >
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
          {/* Lane rails for visual guidance */}
          <LaneRails visible={flags.eduTreeLanes && viewMode === 'flow'} />
          <Controls />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="hsl(var(--muted-foreground))"
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

      {/* Year labels for flow mode */}
      {viewMode === 'flow' && (
        <div className="absolute bottom-4 left-4 flex gap-8 pointer-events-none">
          {[1, 2, 3, 4].map(year => (
            <Badge key={year} variant="outline" className="text-xs">
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