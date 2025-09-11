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
import '../../styles/multipath.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { layoutWithElk, layoutAsGrid } from '@/lib/layout/elkLayout';
// Layout lifecycle removed - using simplified system
import { snapToLanes, LayoutMemory, DEFAULT_LANE_SCAFFOLD } from '@/lib/layout/laneScaffold';
import { findOptimalPath, findComparisonPath } from '@/lib/layout/pathScoring';
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
import { SeedDataButton } from './components/SeedDataButton';
import { BlockGroup } from './components/BlockGroup';
import { TerminalNode } from './components/TerminalNode';
import { PlaceholderGroup } from './components/PlaceholderGroup';
import { CourseNode } from './components/CourseNode';
import { sortBlocksForLayout } from '@/lib/layout/topologicalSort';
import { DegreeOutcomeBanner } from './components/DegreeOutcomeBanner';
import { DegreeOutcomePanel } from './components/DegreeOutcomePanel';
import { LensSelector } from './components/LensSelector';
import { EduLaneBackground, EDU_YEAR_LANES } from './components/EduLaneBackground';
import { EduCourseDetailModal } from '@/components/EduCourseDetailModal';
import { MultipathDebugPanel } from './components/MultipathDebugPanel';
import { TRACKS, TrackId } from './tracks';
import { CompareTracksBar } from './components/CompareTracksBar';

const DEV = process.env.NODE_ENV !== 'production';
const onceKeys = new Set<string>();
function devOnce(key: string, msg: string, data?: any) {
  if (!DEV) return;
  if (onceKeys.has(key)) return;
  onceKeys.add(key);
  // eslint-disable-next-line no-console
  console.log(msg, data ?? '');
}

// Local fallback seed for track-based testing
const LOCAL_FALLBACK_SEED = {
  blocks: [
    // Year 1
    { id: 'b101', title: 'Gen Ed: Composition',        area: 'general-education', level_year: 1 },
    { id: 'b102', title: 'Gen Ed: Quant Reasoning',    area: 'general-education', level_year: 1 },
    { id: 'b201', title: 'Core: Programming I',        area: 'core',               level_year: 1 },
    { id: 'b401', title: 'Mathematics for CS',         area: 'mathematics',        level_year: 1 },

    // Year 2
    { id: 'b202', title: 'Core: Programming II',       area: 'core',               level_year: 2 },
    { id: 'b301', title: 'Web Frontend Foundations',   area: 'specialization',     level_year: 2 },
    { id: 'b302', title: 'Data Analytics Intro',       area: 'specialization',     level_year: 2 },

    // Year 3
    { id: 'b311', title: 'Web Frontend II',            area: 'specialization',     level_year: 3 },
    { id: 'b321', title: 'Data Analytics II',          area: 'specialization',     level_year: 3 },
    { id: 'b331', title: 'Systems & DevOps',           area: 'specialization',     level_year: 3 },

    // Terminal (one degree – both tracks converge here)
    { id: 'degree-completion', title: 'Degree',        area: 'terminal',           level_year: 4 }
  ],
  gateEdges: [
    { id: 'e1',  source_block_id: 'b101', target_block_id: 'b201' },
    { id: 'e2',  source_block_id: 'b102', target_block_id: 'b201' },
    { id: 'e3',  source_block_id: 'b201', target_block_id: 'b202' },
    { id: 'e4',  source_block_id: 'b401', target_block_id: 'b202' },

    { id: 'e5',  source_block_id: 'b202', target_block_id: 'b301' }, // → web
    { id: 'e6',  source_block_id: 'b202', target_block_id: 'b302' }, // → data
    { id: 'e7',  source_block_id: 'b202', target_block_id: 'b331' }, // → systems

    { id: 'e8',  source_block_id: 'b301', target_block_id: 'b311' }, // web year3
    { id: 'e9',  source_block_id: 'b302', target_block_id: 'b321' }, // data year3

    { id: 'e10', source_block_id: 'b311', target_block_id: 'degree-completion' },
    { id: 'e11', source_block_id: 'b321', target_block_id: 'degree-completion' },
    { id: 'e12', source_block_id: 'b331', target_block_id: 'degree-completion' },
  ],
};

// Node types for React Flow
const nodeTypes = {
  blockGroup: BlockGroup,
  terminal: TerminalNode,
  terminalNode: TerminalNode,
  placeholder: PlaceholderGroup,
  placeholderGroup: PlaceholderGroup,
};



type ViewMode = 'flow' | 'board';

function EduTreeCanvasInner() {
  const flags = useFeatureFlags();
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [completedCourseIds] = useState<Set<string>>(new Set()); // Mock completed courses
  const [showOutcomePanel, setShowOutcomePanel] = useState(true);
  const [isLayouting, setIsLayouting] = useState(false);
  const layoutTimeoutRef = useRef<NodeJS.Timeout>();
  const layoutInProgressRef = useRef(false);
  
  // Modal state for course details
  const [selectedCourse, setSelectedCourse] = useState<EduCourse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Removed layout manager - using simplified system
  const layoutMemoryRef = useRef<LayoutMemory>(new LayoutMemory());
  const { isDragging, setIsDragging, validateDrop, handleInvalidDrop } = useDragGuard();
  
  // State for path highlighting (legacy for single-path mode)
  const [highlightedPath, setHighlightedPath] = useState<{ nodes: Set<string>, edges: Set<string> } | null>(null);
  
  // Track-based multipath state  
  const [primaryTrack, setPrimaryTrack] = useState<TrackId | null>('web');
  const [comparisonTrack, setComparisonTrack] = useState<TrackId | null>('data');
  const [highlightedPrimary, setHighlightedPrimary] = useState<{ nodes: Set<string>, edges: Set<string> } | null>(null);
  const [highlightedComparison, setHighlightedComparison] = useState<{ nodes: Set<string>, edges: Set<string> } | null>(null);

  // No URL management needed for tracks - they're controlled via UI only

  // Handler for course click
  const handleCourseClick = useCallback((course: EduCourse) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  }, []);

  // Handler for modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCourse(null);
  }, []);
  
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

  // Extract effectiveGateEdges as a separate hook to avoid nesting
  const effectiveGateEdges = useMemo(() => {
    let merged = gateEdges;

    if (flags.eduTreeMultiPathOverlay && (blocks.length < 6 || gateEdges.length < 6)) {
      devOnce('fallback-seed', '[Multipath] Using fallback seed data');
      merged = [
        ...gateEdges,
        ...LOCAL_FALLBACK_SEED.gateEdges.map(e => ({
          ...e,
          source_gate_id: `gate-${e.source_block_id}`
        }))
      ];
    }

    // Normalize all edges to ensure they have source_gate_id
    return merged.map(e => ({
      ...e,
      source_gate_id: e.source_gate_id ?? `gate-${(e as any).source_block_id ?? e.target_block_id}`
    }));
  }, [blocks.length, gateEdges, flags.eduTreeMultiPathOverlay]);

  // Transform data for React Flow
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    console.log('Data check:', { 
      blocksLength: blocks.length, 
      coursesLength: courses.length, 
      blockMembersLength: blockMembers.length,
      gatesLength: gates.length,
      gateEdgesLength: gateEdges.length 
    });

    // Use fallback seed if live data is insufficient (for multipath demo)
    let effectiveBlocks = blocks;

    if (flags.eduTreeMultiPathOverlay && (blocks.length < 6 || gateEdges.length < 6)) {
      effectiveBlocks = [...blocks, ...LOCAL_FALLBACK_SEED.blocks.map(b => ({
        ...b,
        parent_block_id: null,
        rule_type: 'ALL' as const,
        credits_needed: null,
        k: null
      }))];
    }

    if (!effectiveBlocks.length) {
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
    const blocksWithCourses: BlockWithCourses[] = effectiveBlocks.map(block => ({
      ...block,
      courses: coursesByBlock.get(block.id) || [],
      gate: gates.find(g => g.block_id === block.id) || { id: `gate-${block.id}`, block_id: block.id }
    }));

    // Separate parent blocks from child blocks
    const parentBlocks = blocksWithCourses.filter(block => !block.parent_block_id);
    const childBlocks = blocksWithCourses.filter(block => block.parent_block_id);
    
    // Group child blocks by parent
    const childBlocksByParent = new Map<string, BlockWithCourses[]>();
    childBlocks.forEach(child => {
      if (!childBlocksByParent.has(child.parent_block_id!)) {
        childBlocksByParent.set(child.parent_block_id!, []);
      }
      childBlocksByParent.get(child.parent_block_id!)!.push(child);
    });

    // Apply topological sorting for stable Year-3 ordering (only to parent blocks)
    const sortedBlocks = flags.eduTreeLayoutV2 ? 
      sortBlocksForLayout(parentBlocks, gateEdges) : 
      parentBlocks;

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

    const regularNodes: Node[] = sortedBlocks
      .map((block, index) => {
        // Validate block data
        if (!block || !block.id) {
          console.warn('[EduTree] Invalid block data:', block);
          return null;
        }

        // Get sub-blocks for this parent block
        const subBlocks = childBlocksByParent.get(block.id) || [];
        
        // Calculate progress including sub-blocks
        const allCourses = [...block.courses, ...subBlocks.flatMap(sb => sb.courses)];
        const progress = {
          completed: allCourses.filter(c => completedCourseIds.has(c.id)).length,
          required: block.rule_type === 'ALL' ? allCourses.length : 
                   block.rule_type === 'K_OF_N' ? (block.k || 0) :
                   Math.ceil((block.credits_needed || 0) / 3) // Estimate courses needed for credits
        };

        const isHighlighted = highlightedPath?.nodes.has(String(block.id)) || 
                          highlightedPrimary?.nodes.has(String(block.id)) || false;
        const isComparisonHighlighted = flags.eduTreeMultiPathOverlay && 
                                      highlightedComparison?.nodes.has(String(block.id)) || false;

        // CSS class for multipath node styling
        const isInBothPaths = isHighlighted && isComparisonHighlighted;
        let nodeClassName = '';
        if (isInBothPaths) nodeClassName = 'node--both-paths';
        else if (isHighlighted) nodeClassName = 'node--primary';
        else if (isComparisonHighlighted) nodeClassName = 'node--comparison';

        return {
          id: String(block.id), // Ensure string ID
          type: 'blockGroup', // This must match nodeTypes key
          position: { x: (block.level_year || 0) * 320, y: index * 200 }, // Initial grid position, with fallback
          className: nodeClassName,
          data: {
            block,
            completedCourseIds,
            isUnlocked: unlockedBlocks.has(block.id),
            progress,
            subBlocks, // Include sub-blocks in the node data
            level_year: block.level_year || 0,
            area: block.area || 'unknown',
            isHighlighted,
            isComparisonHighlighted,
            planningLens: isHighlighted ? primaryTrack : isComparisonHighlighted ? comparisonTrack : null,
            onCourseClick: handleCourseClick,
            // Pass highlight sets for multipath styling
            highlightedPrimaryNodes: highlightedPrimary?.nodes ?? null,
            highlightedComparisonNodes: highlightedComparison?.nodes ?? null,
          }
        };
      })
      .filter(Boolean) as Node[]; // Remove any null nodes

    // Add degree completion node
    const capstoneBlock = sortedBlocks.find(b => b.title.toLowerCase().includes('capstone'));
    const architectureBlock = sortedBlocks.find(b => b.title.toLowerCase().includes('architecture'));
    
    // Check if both capstone and architecture are complete for degree unlock
    const isDegreeUnlocked = capstoneBlock && architectureBlock && 
      isBlockComplete(capstoneBlock, capstoneBlock.courses, completedCourseIds) &&
      isBlockComplete(architectureBlock, architectureBlock.courses, completedCourseIds);

    // Check if degree is complete (all courses completed)
    const totalCourses = courses.length;
    const completedCourses = Array.from(completedCourseIds).length;
    const isDegreeComplete = completedCourses === totalCourses;

    const degreeNode: Node = {
      id: 'degree-completion',
      type: 'terminal',
      position: { x: 5 * 320, y: 0 }, // Position at Year 5
      data: {
        label: 'B.S. Software Engineering',
        isEligible: isDegreeUnlocked || false,
        degreeType: 'Bachelor of Science',
        credits: totalCourses * 3, // Approximate total credits
        block: {
          id: 'degree-completion',
          title: 'B.S. Software Engineering',
          rule_type: 'ALL' as const,
          level_year: 5,
          area: 'degree',
          courses: [],
          gate: { id: 'degree-gate', block_id: 'degree-completion' }
        },
        completedCourseIds,
        isUnlocked: isDegreeUnlocked || false,
        progress: {
          completed: completedCourses,
          required: totalCourses
        },
        subBlocks: [],
        level_year: 5,
        area: 'degree',
        isHighlighted: false,
        planningLens: null,
        isDegreeNode: true,
        isDegreeComplete
      }
    };

    const nodes: Node[] = [...regularNodes, degreeNode];

    // Create React Flow edges (only between blocks)
    const regularEdges: Edge[] = viewMode === 'flow' ? effectiveGateEdges.map(gateEdge => {
      const sourceBlock = sortedBlocks.find(b => b.gate?.id === gateEdge.source_gate_id);
      const source = sourceBlock?.id ? String(sourceBlock.id) : null;
      const target = String(gateEdge.target_block_id);
      
      const isHighlighted = highlightedPath?.edges.has(String(gateEdge.id)) || 
                        highlightedPrimary?.edges.has(String(gateEdge.id)) || false;
      const isComparisonHighlighted = flags.eduTreeMultiPathOverlay && 
                                    highlightedComparison?.edges.has(String(gateEdge.id)) || false;
      
      // Edge style precedence: primary > comparison > default
      const isInBothPaths = isHighlighted && isComparisonHighlighted;
      const finalHighlighted = isHighlighted || isComparisonHighlighted;
      
      // CSS class for multipath styling (let CSS handle the visuals)
      let edgeClassName = '';
      if (isHighlighted) edgeClassName = 'edge--primary';
      else if (isComparisonHighlighted) edgeClassName = 'edge--comparison';
      else if (!finalHighlighted) edgeClassName = 'edge--dim';

      return source ? {
        id: String(gateEdge.id),
        source,
        target,
        type: flags.eduTreeLayoutV2 ? 'step' : 'smoothstep',
        className: edgeClassName,
        data: {
          // Pass highlight sets for multipath styling
          highlightedPrimaryEdges: highlightedPrimary?.edges ?? null,
          highlightedComparisonEdges: highlightedComparison?.edges ?? null,
        },
        style: {
          // Let CSS classes handle most styling, minimal inline overrides
          opacity: !finalHighlighted ? 0.3 : undefined,
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: isHighlighted ? 'var(--primary)' : 
                 isComparisonHighlighted ? 'oklch(var(--amber-500))' : 'var(--primary)',
        },
        ...(flags.eduTreeLayoutV2 && {
          pathOptions: { offset: 12 }
        }),
      } : null;
    }).filter(Boolean) as Edge[] : [];

    // Add edges to degree completion node
    const degreeEdges: Edge[] = [];
    if (viewMode === 'flow' && capstoneBlock && architectureBlock) {
      // Edge from Capstone to Degree
      degreeEdges.push({
        id: 'capstone-to-degree',
        source: String(capstoneBlock.id),
        target: 'degree-completion',
        type: flags.eduTreeLayoutV2 ? 'step' : 'smoothstep',
        style: {
          stroke: 'var(--accent-gold)',
          strokeWidth: 3,
          opacity: 0.8
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'var(--accent-gold)',
        },
        ...(flags.eduTreeLayoutV2 && {
          pathOptions: { offset: 12 }
        }),
      });

      // Edge from Architecture to Degree  
      degreeEdges.push({
        id: 'architecture-to-degree',
        source: String(architectureBlock.id),
        target: 'degree-completion',
        type: flags.eduTreeLayoutV2 ? 'step' : 'smoothstep',
        style: {
          stroke: 'var(--accent-gold)',
          strokeWidth: 3,
          opacity: 0.8
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'var(--accent-gold)',
        },
        ...(flags.eduTreeLayoutV2 && {
          pathOptions: { offset: 12 }
        }),
      });
    }

    const edges: Edge[] = [...regularEdges, ...degreeEdges];

    if (DEV) {
      console.log('[EduTree] Generated elements:', { 
        nodeCount: nodes.length, 
        edgeCount: edges.length,
        firstNode: nodes[0],
        firstEdge: edges[0],
        regularEdges: regularEdges.length,
        degreeEdges: degreeEdges.length,
        nodeTypes: Object.keys(nodeTypes)
      });
    }

  // Build track highlights using block ID to RF node ID mapping
  const blockIdToNodeId = useMemo(() => {
    const map = new Map<string, string>();
    flowNodes.forEach(n => {
      const blockId = (n.data?.block as any)?.id ?? n.id;
      map.set(String(blockId), String(n.id));
    });
    return map;
  }, [flowNodes]);

  function setsForTrack(trackId: TrackId | null): { nodes: Set<string>, edges: Set<string> } {
    if (!trackId) return { nodes: new Set<string>(), edges: new Set<string>() };

    const blockIds = TRACKS[trackId].nodes;
    const rfNodes = blockIds
      .map(id => blockIdToNodeId.get(id))
      .filter(Boolean) as string[];

    const rfNodeSet = new Set(rfNodes);
    const rfEdges = flowEdges
      .filter(e => rfNodeSet.has(String(e.source)) && rfNodeSet.has(String(e.target)))
      .map(e => String(e.id));

    return { nodes: new Set(rfNodes), edges: new Set(rfEdges) };
  }

  // Generate highlight sets from selected tracks
  const trackHighlightedPrimary = useMemo(() => setsForTrack(primaryTrack), [primaryTrack, flowNodes, flowEdges]);
  const trackHighlightedComparison = useMemo(() => setsForTrack(comparisonTrack), [comparisonTrack, flowNodes, flowEdges]);

  // Update highlight state when tracks change
  useEffect(() => {
    setHighlightedPrimary(trackHighlightedPrimary.nodes.size > 0 ? trackHighlightedPrimary : null);
  }, [trackHighlightedPrimary]);

  useEffect(() => {
    setHighlightedComparison(trackHighlightedComparison.nodes.size > 0 ? trackHighlightedComparison : null);
  }, [trackHighlightedComparison]);

  return { nodes, edges };
  }, [blocks, courses, blockMembers, gates, effectiveGateEdges, completedCourseIds, viewMode, flags.eduTreeLayoutV2, highlightedPath, highlightedPrimary, highlightedComparison]);
  // Include highlight dependencies for multipath styling

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  
  // Staggered edges V2 system
  const { visibleEdges, isRevealing, forceRevealAll } = useStaggeredEdgesV2(
    allEdges,
    nodes,
    {
      enabled: flags.eduTreeStaggeredEdgesV2,
      batchDelayMs: process.env.NODE_ENV === 'production' ? 650 : 800,
      emergencyTimeoutMs: 2000,
    }
  );
  
  // Update React Flow edges when visibleEdges change
  useEffect(() => {
    if (flags.eduTreeStaggeredEdgesV2) {
      setEdges(visibleEdges);
    } else {
      // fall back to allEdges to avoid empty graph when flag is off
      setEdges(allEdges);
    }
  }, [visibleEdges, allEdges, flags.eduTreeStaggeredEdgesV2, setEdges]);


  // Remove old path computation - replaced with track-based highlights above

  // Remove old path highlighting effects - using track-based highlights now

  // Remove multipath snapshot - simplified debug
  useEffect(() => {
    if (!DEV || !flags.eduTreeMultiPathOverlay) return;
    
    const multipathActive = !!comparisonTrack;
    if (!multipathActive) return;
    if (!highlightedPrimary || !highlightedComparison) return;

    devOnce(
      `track-snap-${primaryTrack}-${comparisonTrack}`,
      '[Track Snapshot]',
      {
        url: typeof window !== 'undefined' ? window.location.href : '',
        tracks: { primary: primaryTrack, comparison: comparisonTrack },
        counts: {
          primaryNodes: highlightedPrimary.nodes.size,
          primaryEdges: highlightedPrimary.edges.size,
          comparisonNodes: highlightedComparison.nodes.size,
          comparisonEdges: highlightedComparison.edges.size,
          overlapNodes: [...highlightedPrimary.nodes].filter(x => highlightedComparison.nodes.has(x)).length,
        }
      }
    );
  }, [flags.eduTreeMultiPathOverlay, primaryTrack, comparisonTrack, highlightedPrimary, highlightedComparison]);

  // Expose debug global for external testing
  useEffect(() => {
    if (!DEV) return;
    (window as any).__EDUTREE__ = (window as any).__EDUTREE__ || {};
    (window as any).__EDUTREE__.getSnapshot = () => {
      return {
        tracks: { primary: primaryTrack, comparison: comparisonTrack },
        primary: highlightedPrimary ? { 
          nodes: Array.from(highlightedPrimary.nodes), 
          edges: Array.from(highlightedPrimary.edges) 
        } : null,
        comparison: highlightedComparison ? { 
          nodes: Array.from(highlightedComparison.nodes), 
          edges: Array.from(highlightedComparison.edges) 
        } : null,
      };
    };
  }, [primaryTrack, comparisonTrack, highlightedPrimary, highlightedComparison]);
  
  useEffect(() => {
    if (flowNodes.length > 0) {
      const applyEmergencyLayout = async () => {
        try {
          console.log('[EduTree] EMERGENCY: Applying fail-safe layout to', flowNodes.length, 'nodes');
          
          // EMERGENCY: Use the collision-resistant layout system
          const { layoutNodes } = await import('@/lib/layout/simpleLayout');
          const result = await layoutNodes(flowNodes, flowEdges);
          
          if (result.hasOverlaps) {
            console.error('⚠️ EMERGENCY: Layout STILL has overlaps! Using ultra-safe fallback');
            // Ultra-safe fallback - guarantee no overlaps with multi-column grid
            const safeNodes = flowNodes.map((node, index) => ({
              ...node,
              position: { 
                x: (index % 2) * 600, // 2 columns, 600px apart
                y: Math.floor(index / 2) * 500 // 500px vertical spacing
              }
            }));
            setNodes(safeNodes);
          } else {
            console.log('✅ EMERGENCY: Layout validated - no overlaps');
            setNodes(result.nodes);
          }
          
          if (flags.eduTreeStaggeredEdgesV2) {
            setAllEdges(viewMode === 'flow' ? flowEdges : []);
          } else {
            setEdges(viewMode === 'flow' ? flowEdges : []);
          }
          
        } catch (error) {
          console.error('[EduTree] EMERGENCY: All layouts failed, using absolute fallback:', error);
          // ABSOLUTE LAST RESORT: Simple grid with massive spacing
          const fallbackNodes = flowNodes.map((node, index) => ({
            ...node,
            position: { x: (index % 2) * 700, y: Math.floor(index / 2) * 600 }
          }));
          setNodes(fallbackNodes);
          if (flags.eduTreeStaggeredEdgesV2) {
            setAllEdges([]);
          } else {
            setEdges([]);
          }
        }
      };
      
      applyEmergencyLayout();
    }
  }, [flowNodes.length]); // CRITICAL: Only trigger on node COUNT change, not content change

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
  const applyLayout = useCallback(async (mode: 'flow' | 'board', nodes: Node[], edges: Edge[]) => {
    if (mode === 'board') {
      return layoutAsGrid(nodes, mode);
    }

    try {
      // Use the new simplified layout system
      const { layoutNodes } = await import('@/lib/layout/simpleLayout');
      const result = await layoutNodes(nodes, edges);
      
      if (result.hasOverlaps) {
        console.warn('⚠️ Layout has overlaps, but proceeding');
      }
      
      return result.nodes;
    } catch (error) {
      console.error('Layout failed, using fallback:', error);
      // Fallback to ELK without post-processing
      try {
        return await layoutWithElk(nodes, edges);
      } catch (elkError) {
        console.error('ELK fallback failed:', elkError);
        return layoutAsGrid(nodes, 'board');
      }
    }
  }, []);

  // EMERGENCY FIX: Remove all complex layout logic that was causing infinite loops
  // Use simple positioning only to get preview working

  // EMERGENCY FIX: Removed complex layout - using inline logic above

  // EMERGENCY FIX: Temporarily disabled path highlighting to prevent infinite loop
  // This was causing flowNodes/flowEdges to update → highlightedPath → useMemo → flowNodes/flowEdges → infinite loop
  /*
  useEffect(() => {
    if (flags.eduTreeOutcomes && flowNodes.length > 0 && flowEdges.length > 0) {
      const optimalPath = findOptimalPath(flowNodes, flowEdges, selectedLens, completedCourseIds);
      setHighlightedPath({
        nodes: new Set(optimalPath.nodeIds),
        edges: new Set(optimalPath.edgeIds)
      });
    }
  }, [selectedLens, flowNodes, flowEdges, completedCourseIds, flags.eduTreeOutcomes]);
  */

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

  // FitView: only run when (a) elements exist and (b) at least one highlight set exists
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const onInit = useCallback((reactFlowInstance: any) => {
    
    // Clear any pending fitView to debounce
    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current);
    }
    
    fitViewTimeoutRef.current = setTimeout(() => {
      const ready =
        flowNodes.length > 0 &&
        flowEdges.length > 0 &&
        (highlightedPrimary?.nodes.size ?? 0) > 0;

      if (!ready) {
        if (DEV) console.debug('[fitView] Waiting for track highlights...', { 
          nodes: flowNodes.length, 
          edges: flowEdges.length,
          primaryHighlights: highlightedPrimary?.nodes.size ?? 0,
          comparisonHighlights: highlightedComparison?.nodes.size ?? 0
        });
        return;
      }
      
      const hasTerminal = nodes.some(node => 
        node.type === 'terminal' || node.type === 'terminalNode' || 
        node.id === 'degree-completion'
      );
      
      const padding = hasTerminal ? 0.4 : 0.2;
      
      // Wrap in requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        try {
          reactFlowInstance?.fitView?.({ padding, duration: 400, includeHiddenNodes: true });
          if (DEV) devOnce('fitview-applied', '[fitView] Applied with padding:', padding);
        } catch (error) {
          if (DEV) console.warn('[fitView] Error:', error);
        }
      });
    }, 220);
    
    // Expose dev global for QA
    if (DEV) {
      (window as any).__EDUTREE__ = {
        getSnapshot: () => ({
          tracks: { primary: primaryTrack, comparison: comparisonTrack },
          primary: highlightedPrimary ? {
            nodes: Array.from(highlightedPrimary.nodes),
            edges: Array.from(highlightedPrimary.edges),
          } : null,
          comparison: highlightedComparison ? {
            nodes: Array.from(highlightedComparison.nodes),
            edges: Array.from(highlightedComparison.edges),
          } : null,
        }),
      };
    }
  }, [nodes, flowNodes.length, flowEdges.length, flags.eduTreeOutcomes, flags.eduTreeMultiPathOverlay, highlightedPrimary, highlightedPath, highlightedComparison]);

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
          selectedLens={primaryTrack}
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
        <div className="flex items-center justify-between relative z-20">
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
            
            {/* Track Selector for multipath */}
            {flags.eduTreeMultiPathOverlay && (
              <CompareTracksBar
                primary={primaryTrack}
                comparison={comparisonTrack}
                onPrimary={setPrimaryTrack}
                onComparison={setComparisonTrack}
              />
            )}

            {/* Empty state for multipath */}
            {flags.eduTreeMultiPathOverlay && comparisonTrack && !highlightedComparison && (
              <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
                No comparison path available for '{comparisonTrack}'. Add branched data or enable fallback seed.
              </div>
            )}
            
            {/* Dev Snapshot Button */}
            {DEV && flags.eduTreeMultiPathOverlay && (
              <button
                onClick={() => {
                  const snapshot = (window as any).__EDUTREE__?.getSnapshot?.();
                  console.log('[Multipath Snapshot]', snapshot);
                }}
                className="px-2 py-1 text-xs bg-muted rounded border"
                title="Log multipath snapshot to console"
              >
                📊 Snapshot
              </button>
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
        className={`flex-1 ${flags.eduTreeMultiPathOverlay && comparisonTrack ? 'multipath-active' : ''}`}
        style={{ height: 'calc(100vh - 140px)', minHeight: '400px' }}
      >
        <ReactFlow
          key={`reactflow-${viewMode}-${nodes.length}`} // Force re-init on mode/data changes
          nodes={nodes}
          edges={visibleEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.2, duration: 300 }}
          className={cn(
            'react-flow-canvas',
            flags.eduTreeMultiPathOverlay && !!comparisonTrack ? 'multipath-active' : undefined
          )}
          minZoom={0.3}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          {/* Debug panel for multipath (visible in non-prod) */}
          {process.env.NODE_ENV !== 'production' && flags.eduTreeMultiPathOverlay && (
            <div style={{
              position: 'absolute', 
              right: 12, 
              top: 12, 
              zIndex: 1000,
              background: 'hsl(var(--background))', 
              border: '1px solid hsl(var(--border))',
              padding: '8px 10px', 
              borderRadius: 8, 
              fontSize: 12, 
              maxWidth: 320,
              color: 'hsl(var(--foreground))'
            }}>
              <strong>Track Debug</strong>
              <div style={{ marginTop: 6 }}>
                <div>Primary track: {primaryTrack}</div>
                <div>Comparison track: {comparisonTrack ?? '—'}</div>
                <div>Primary: {highlightedPrimary?.nodes.size ?? 0} nodes / {highlightedPrimary?.edges.size ?? 0} edges</div>
                <div>Compare: {highlightedComparison?.nodes.size ?? 0} nodes / {highlightedComparison?.edges.size ?? 0} edges</div>
                <div>Overlap: {
                  (highlightedPrimary && highlightedComparison)
                    ? [...highlightedPrimary.nodes].filter(x => highlightedComparison.nodes.has(x)).length
                    : 0
                } nodes</div>
              </div>
              <button
                onClick={() => {
                  const snap = {
                    tracks: { primary: primaryTrack, comparison: comparisonTrack },
                    primary: highlightedPrimary ? {
                      nodes: Array.from(highlightedPrimary.nodes),
                      edges: Array.from(highlightedPrimary.edges)
                    } : null,
                    comparison: highlightedComparison ? {
                      nodes: Array.from(highlightedComparison.nodes),
                      edges: Array.from(highlightedComparison.edges)
                    } : null
                  };
                  (window as any).__EDUTREE__ = (window as any).__EDUTREE__ || {};
                  (window as any).__EDUTREE__.getSnapshot = () => snap;
                  const pre = document.getElementById('mp-snap-pre');
                  if (pre) pre.textContent = JSON.stringify(snap, null, 2);
                  console.log('[Track Snapshot]', snap);
                }}
                style={{ 
                  marginTop: 8, 
                  padding: '4px 8px', 
                  background: 'hsl(var(--primary))', 
                  color: 'hsl(var(--primary-foreground))', 
                  border: 'none', 
                  borderRadius: 4, 
                  cursor: 'pointer' 
                }}
              >
                📊 Snapshot
              </button>
              <pre 
                id="mp-snap-pre" 
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  marginTop: 6, 
                  maxHeight: 180, 
                  overflow: 'auto', 
                  fontSize: 10,
                  background: 'hsl(var(--muted))',
                  padding: 4,
                  borderRadius: 4
                }}
              />
            </div>
          )}

          {/* Empty state for comparison */}
          {flags.eduTreeMultiPathOverlay && comparisonTrack && (!highlightedComparison || highlightedComparison.nodes.size === 0) && (
            <div style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              background: 'hsl(var(--muted))',
              color: 'hsl(var(--muted-foreground))',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12,
              maxWidth: 400,
              zIndex: 999
            }}>
              No comparison path available for '{comparisonTrack}'. If you're using live data, add a branched seed or enable the fallback seed to see a demo.
            </div>
          )}
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
          
          {/* Multipath Debug Panel */}
          {flags.eduTreeMultiPathOverlay && (
            <div className="absolute top-4 right-4 bg-background/90 border rounded-lg p-3 space-y-2 z-50 max-w-80">
              <strong className="text-sm">Track Debug</strong>
              <div className="text-xs space-y-1">
                <div>Primary track: {primaryTrack}</div>
                <div>Comparison track: {comparisonTrack ?? '—'}</div>
                <div>Primary: {highlightedPrimary?.nodes.size ?? 0} nodes / {highlightedPrimary?.edges.size ?? 0} edges</div>
                <div>Compare: {highlightedComparison?.nodes.size ?? 0} nodes / {highlightedComparison?.edges.size ?? 0} edges</div>
                <div>Overlap: {
                  (highlightedPrimary && highlightedComparison)
                    ? [...highlightedPrimary.nodes].filter(x => highlightedComparison.nodes.has(x)).length
                    : 0
                } nodes</div>
              </div>
              <button
                onClick={() => {
                  const snap = {
                    tracks: { primary: primaryTrack, comparison: comparisonTrack },
                    primary: highlightedPrimary ? {
                      nodes: Array.from(highlightedPrimary.nodes),
                      edges: Array.from(highlightedPrimary.edges)
                    } : null,
                    comparison: highlightedComparison ? {
                      nodes: Array.from(highlightedComparison.nodes),
                      edges: Array.from(highlightedComparison.edges)
                    } : null
                  };
                  (window as any).__EDUTREE__ = (window as any).__EDUTREE__ || {};
                  (window as any).__EDUTREE__.getSnapshot = () => snap;
                  // Render inline for no-console environments
                  const pre = document.getElementById('mp-snap-pre');
                  if (pre) pre.textContent = JSON.stringify(snap, null, 2);
                  console.log('[Track Snapshot]', snap);
                }}
                className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80 w-full"
              >
                📊 Snapshot
              </button>
              <pre 
                id="mp-snap-pre" 
                className="text-xs whitespace-pre-wrap max-h-48 overflow-auto bg-muted/50 p-2 rounded"
              ></pre>
            </div>
          )}

          {/* Empty state message */}
          {flags.eduTreeMultiPathOverlay && comparisonTrack && (!highlightedComparison || highlightedComparison.nodes.size === 0) && (
            <div className="absolute left-4 bottom-4 bg-muted/90 border border-border p-3 rounded-lg max-w-96 z-50">
              <div className="text-xs text-muted-foreground">
                No comparison path available for '{comparisonTrack}'. If you're using live data, add a branched seed or enable the fallback seed to see a demo.
              </div>
            </div>
          )}

          {/* Development controls */}
          {process.env.NODE_ENV === 'development' && !flags.eduTreeMultiPathOverlay && (
            <div className="absolute top-4 right-4 bg-background/90 border rounded-lg p-3 space-y-2 z-50">
              <div className="text-xs text-muted-foreground">
                Edges: {visibleEdges.length}/{allEdges.length}
                {isRevealing && <span className="ml-2 text-primary">Revealing...</span>}
              </div>
              <button
                onClick={forceRevealAll}
                className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80"
              >
                Show All Edges
              </button>
              <button
                onClick={() => {
                  const hasTerminal = nodes.some(node => 
                    node.type === 'terminal' || node.id === 'degree-completion'
                  );
                  const padding = hasTerminal ? 0.4 : 0.2;
                  onInit?.({ fitView: (opts: any) => console.log('Manual fitView triggered', opts) } as any);
                }}
                className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80"
              >
                Focus Terminal
              </button>
              <button
                onClick={() => {
                  console.log('[Track Snapshot]', (window as any).__EDUTREE__?.getSnapshot?.());
                }}
                className="text-xs px-2 py-1 bg-primary rounded hover:bg-primary/80 text-primary-foreground"
              >
                Log Track Snapshot
              </button>
              
              {/* Track Debug Panel */}
              <div className="text-xs space-y-1">
                <div className="font-medium">Track: {primaryTrack}</div>
                <div>Compare: {comparisonTrack ?? '—'}</div>
                <div>Primary: {highlightedPrimary?.nodes.size ?? 0} nodes / {highlightedPrimary?.edges.size ?? 0} edges</div>
                <div>Compare: {highlightedComparison?.nodes.size ?? 0} nodes / {highlightedComparison?.edges.size ?? 0} edges</div>
              </div>
            </div>
          )}
        </ReactFlow>
      </div>

      {/* Outcome Panel */}
      {flags.eduTreeOutcomes && !flags.eduTreeMultiPathOverlay && (
        <OutcomePanel
          summary={outcomeSummary}
          selectedLens={primaryTrack as any}
          isVisible={showOutcomePanel}
        />
      )}

      {/* Year labels aligned with lanes */}
      {viewMode === 'flow' && flags.eduTreeLanes && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="flex gap-12">
            {[1, 2, 3, 4, 5].map((year, index) => (
              <Badge 
                key={year} 
                variant="outline" 
                className={`text-xs bg-background/80 backdrop-blur-sm ${year === 5 ? 'border-accent-gold text-accent-gold' : ''}`}
                style={{ 
                  marginLeft: index === 0 ? '200px' : '400px',
                  position: index === 0 ? 'relative' : 'static'
                }}
              >
                {year === 5 ? '🎓 Degree' : `Year ${year}`}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Fallback year labels for non-lane mode */}
      {viewMode === 'flow' && !flags.eduTreeLanes && (
        <div className="absolute bottom-4 left-4 flex gap-8 pointer-events-none">
          {[1, 2, 3, 4, 5].map(year => (
            <Badge 
              key={year} 
              variant="outline" 
              className={`text-xs bg-background/80 backdrop-blur-sm ${year === 5 ? 'border-accent-gold text-accent-gold' : ''}`}
            >
              {year === 5 ? '🎓 Degree' : `Year ${year}`}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Course Detail Modal */}
      <EduCourseDetailModal
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        isCompleted={selectedCourse ? completedCourseIds.has(selectedCourse.id) : false}
        onMarkComplete={(courseId) => {
          // TODO: Implement course completion tracking
          console.log('Mark course complete:', courseId);
          toast({
            title: "Course Marked Complete",
            description: "Progress has been updated.",
          });
        }}
        onSelectAlternative={(option) => {
          // TODO: Implement alternative selection
          console.log('Selected alternative:', option);
          toast({
            title: "Alternative Selected",
            description: `${option.provider} course option selected.`,
          });
        }}
      />
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