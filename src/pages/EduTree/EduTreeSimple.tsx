import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import '../../styles/simple-edutree.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/lib/featureFlags';
import { EduTreeMiniMap } from '@/components/ui/minimap';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge,
  BlockWithCourses,
} from '@/lib/types/eduTree';
import { toast } from '@/hooks/use-toast';
import { SeedDataButton } from './components/SeedDataButton';
import { BlockGroup } from './components/BlockGroup';
import { TerminalNode } from './components/TerminalNode';
import { PlaceholderGroup } from './components/PlaceholderGroup';
import { EduCourseDetailModal } from '@/components/EduCourseDetailModal';
import { EduLaneBackground, EDU_YEAR_LANES } from './components/EduLaneBackground';

// Simple version without multipath complexity
const nodeTypes = {
  blockGroup: BlockGroup,
  terminalNode: TerminalNode,
  placeholder: PlaceholderGroup,
};

// Create simple flow elements without multipath logic
function createSimpleFlowElements(
  blocks: BlockWithCourses[],
  gateEdges: GateEdge[],
): { nodes: Node[]; edges: Edge[] } {
  
  const nodes: Node[] = blocks.map((block, index) => {
    const isTerminal = (block.area === 'terminal') || (String(block.id) === 'degree-completion');

    return {
      id: String(block.id),
      type: isTerminal ? 'terminalNode' : 'blockGroup',
      position: { x: (block.level_year || 0) * 320, y: index * 200 },
      data: {
        block,
        displayTitle: block.title ?? 'Degree',
        completedCourseIds: new Set(),
        isUnlocked: true,
        progress: { completed: 0, required: block.courses?.length || 0 },
        level_year: block.level_year || 0,
        area: block.area || 'unknown',
        // No multipath highlighting in simple mode
        isHighlighted: false,
        isComparisonHighlighted: false,
      }
    };
  });

  const edges: Edge[] = gateEdges.map(ge => {
    const sourceGateId = ge.source_gate_id ?? `gate-${(ge as any).source_block_id ?? ge.target_block_id}`;
    const source = String(sourceGateId).replace('gate-', '');
    const target = String(ge.target_block_id);

    return {
      id: String(ge.id ?? `${source}->${target}`),
      source,
      target,
      type: 'smoothstep',
      className: 'edge', // Simple edge class, no multipath styling
      markerEnd: {
        type: MarkerType.Arrow,
      },
    };
  });

  return { nodes, edges };
}

function EduTreeSimpleInner() {
  const flags = useFeatureFlags();
  const [completedCourseIds] = useState<Set<string>>(new Set());
  const [selectedCourse, setSelectedCourse] = useState<EduCourse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  
  // Fetch data from Supabase (same queries as complex version)
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

  // Create simple flow elements
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!blocks.length) {
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
      gate: gates.find(g => g.block_id === block.id) || { id: `gate-${block.id}`, block_id: block.id }
    }));

    return createSimpleFlowElements(blocksWithCourses, gateEdges);
  }, [blocks, courses, blockMembers, gates, gateEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes when data changes
  React.useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const nodeCount = nodes.length;
  const dataStatus = nodeCount > 0 ? 'loaded' : 'loading';

  return (
    <div className="w-full h-screen bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="edu-tree-canvas"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <EduLaneBackground lanes={EDU_YEAR_LANES} height={800} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-30" />
        <Controls position="top-left" />
        <EduTreeMiniMap />
      </ReactFlow>

      {/* Simple toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <Card className="px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{nodeCount} Blocks</Badge>
            <Badge variant={dataStatus === 'loaded' ? 'default' : 'secondary'}>
              {dataStatus}
            </Badge>
          </div>
        </Card>
        
        <SeedDataButton />
      </div>

      {/* Course detail modal */}
      {selectedCourse && (
        <EduCourseDetailModal
          course={selectedCourse}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export function EduTreeSimple() {
  return (
    <ReactFlowProvider>
      <EduTreeSimpleInner />
    </ReactFlowProvider>
  );
}