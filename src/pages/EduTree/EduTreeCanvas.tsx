import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  BackgroundVariant,
  MarkerType 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { layoutWithElk, layoutAsGrid } from '@/lib/layout/elkLayout';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge,
  BlockWithCourses,
  isBlockComplete 
} from '@/lib/types/eduTree';
import { BlockGroup } from './components/BlockGroup';
import { SeedDataButton } from './components/SeedDataButton';

// Node types for React Flow
const nodeTypes = {
  blockGroup: BlockGroup,
};

type ViewMode = 'flow' | 'board';

export function EduTreeCanvas() {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [completedCourseIds] = useState<Set<string>>(new Set()); // Mock completed courses
  
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

    // Calculate which blocks are unlocked
    const unlockedBlocks = new Set<string>();
    
    // Find blocks with no prerequisites (starting blocks)
    const blocksWithPrereqs = new Set(gateEdges.map(edge => edge.target_block_id));
    blocks.forEach(block => {
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
        
        const sourceBlock = blocksWithCourses.find(b => b.gate?.id === edge.source_gate_id);
        if (sourceBlock && isBlockComplete(sourceBlock, sourceBlock.courses, completedCourseIds)) {
          unlockedBlocks.add(edge.target_block_id);
          changed = true;
        }
      });
    }

    const nodes: Node[] = blocksWithCourses.map((block, index) => {
      const progress = {
        completed: block.courses.filter(c => completedCourseIds.has(c.id)).length,
        required: block.rule_type === 'ALL' ? block.courses.length : 
                 block.rule_type === 'K_OF_N' ? (block.k || 0) :
                 Math.ceil((block.credits_needed || 0) / 3) // Estimate courses needed for credits
      };

      return {
        id: block.id,
        type: 'blockGroup', // This must match nodeTypes key
        position: { x: block.level_year * 320, y: index * 200 }, // Initial grid position
        data: {
          block,
          completedCourseIds,
          isUnlocked: unlockedBlocks.has(block.id),
          progress,
          level_year: block.level_year,
          area: block.area
        }
      };
    });

    console.log('Generated nodes:', { 
      nodeCount: nodes.length, 
      firstNode: nodes[0],
      nodeTypes: Object.keys(nodeTypes)
    });

    // Create React Flow edges (only between blocks)
    const edges: Edge[] = viewMode === 'flow' ? gateEdges.map(gateEdge => {
      const sourceBlock = blocksWithCourses.find(b => b.gate?.id === gateEdge.source_gate_id);
      const targetBlockId = gateEdge.target_block_id;
      
      return {
        id: gateEdge.id,
        source: sourceBlock?.id || '',
        target: targetBlockId,
        type: 'smoothstep',
        style: {
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'hsl(var(--primary))',
        },
      };
    }).filter(edge => edge.source && edge.target) : [];

    return { nodes, edges };
  }, [blocks, courses, blockMembers, gates, gateEdges, completedCourseIds, viewMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Apply layout when data changes
  useEffect(() => {
    if (flowNodes.length === 0) return;

    console.log('Applying layout:', { mode: viewMode, nodeCount: flowNodes.length });

    if (viewMode === 'flow') {
      layoutWithElk(flowNodes, flowEdges).then(layoutedNodes => {
        console.log('ELK layout complete:', layoutedNodes.length);
        setNodes(layoutedNodes);
        setEdges(flowEdges);
      }).catch(error => {
        console.error('Layout failed, using fallback:', error);
        // Fallback to simple grid if ELK fails
        const fallbackNodes = flowNodes.map((node, index) => ({
          ...node,
          position: { x: (index % 3) * 320, y: Math.floor(index / 3) * 200 }
        }));
        setNodes(fallbackNodes);
        setEdges(flowEdges);
      });
    } else {
      const gridNodes = layoutAsGrid(flowNodes, 'board');
      console.log('Grid layout complete:', gridNodes.length);
      setNodes(gridNodes);
      setEdges([]); // No edges in board mode
    }
  }, [flowNodes, flowEdges, viewMode, setNodes, setEdges]);

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
          fitView
          fitViewOptions={{ padding: 0.1, duration: 300 }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Controls />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="hsl(var(--muted-foreground))"
          />
        </ReactFlow>
      </div>

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