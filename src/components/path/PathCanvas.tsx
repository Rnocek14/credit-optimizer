import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PathNode } from './PathNode';
import { PathRightRail } from './PathRightRail';
import { usePathStore } from '@/stores/usePathStore';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Palette, Download, Upload, RotateCcw } from 'lucide-react';

interface PathCanvasProps {
  userId: string;
}

const nodeTypes = {
  track: PathNode,
  course: PathNode,
  project: PathNode,
  milestone: PathNode,
};

export function PathCanvas({ userId }: PathCanvasProps) {
  const { 
    nodes: storeNodes, 
    edges: storeEdges, 
    activeNodeId,
    addNode,
    connect,
    moveNode,
    setActiveNode,
    clearCanvas,
  } = usePathStore();
  
  const { activeTrackId } = useActiveTrackStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        connect(params.source, params.target);
        setEdges((eds) => addEdge({
          ...params,
          markerEnd: { type: MarkerType.ArrowClosed },
        }, eds));
      }
    },
    [connect, setEdges]
  );

  const onNodeClick = useCallback((_: any, node: any) => {
    setActiveNode(node.id);
  }, [setActiveNode]);

  const onNodeDragStop = useCallback((event: any, node: any) => {
    moveNode(node.id, node.position);
  }, [moveNode]);

  const handleAddNode = useCallback((type: 'track' | 'course' | 'project' | 'milestone') => {
    addNode({
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: {
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: `A new ${type} node`,
        trackId: activeTrackId || undefined,
      },
    });
  }, [addNode, activeTrackId]);

  // Demo nodes for first-time users
  const initializeDemoNodes = useCallback(() => {
    const demoNodes = [
      {
        type: 'track' as const,
        position: { x: 100, y: 100 },
        data: {
          title: 'Full Stack Development',
          description: 'Complete web development track',
          progress: 65,
          xp: 1250,
          cri: 4.2,
        },
      },
      {
        type: 'course' as const,
        position: { x: 400, y: 100 },
        data: {
          title: 'React Fundamentals',
          description: 'Learn React from scratch',
          institutionId: 'demo-institution',
          teacherId: 'demo-teacher',
          verification: 'institution_verified' as const,
          progress: 80,
          estimatedHours: 40,
          cost: 99,
          skillTags: ['React', 'JavaScript', 'Frontend'],
          difficulty: 'intermediate' as const,
          cri: 4.5,
        },
      },
      {
        type: 'project' as const,
        position: { x: 700, y: 100 },
        data: {
          title: 'Portfolio Website',
          description: 'Build your personal portfolio',
          verification: 'mentor_verified' as const,
          progress: 45,
          estimatedHours: 20,
          skillTags: ['React', 'Design', 'Portfolio'],
          difficulty: 'beginner' as const,
        },
      },
    ];

    demoNodes.forEach(addNode);
  }, [addNode]);

  const activeNode = useMemo(() => 
    nodes.find(n => n.id === activeNodeId),
    [nodes, activeNodeId]
  );

  return (
    <div className="flex h-full bg-background">
      {/* Left Palette */}
      <div className="w-64 border-r border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Track Palette</h3>
        </div>
        
        {activeTrackId && (
          <Badge variant="secondary" className="text-xs">
            Active Track: {activeTrackId.slice(0, 8)}...
          </Badge>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Add Nodes</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode('track')}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Track
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode('course')}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Course
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode('project')}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddNode('milestone')}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Milestone
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Canvas Actions</h4>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={initializeDemoNodes}
              disabled={nodes.length > 0}
              className="w-full text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Load Demo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="w-full text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear Canvas
            </Button>
          </div>
        </div>

        {nodes.length === 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <strong>Getting Started:</strong>
            <br />
            1. Click "Load Demo" to see sample nodes
            <br />
            2. Or add your own nodes using the buttons above
            <br />
            3. Drag to connect nodes and build your path
          </div>
        )}
      </div>

      {/* Center Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background />
          <Controls />
          
          <Panel position="top-center">
            <Badge variant="outline" className="bg-background">
              Path Canvas - Click nodes to edit in right panel
            </Badge>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Rail */}
      <PathRightRail
        activeNode={activeNode}
        userId={userId}
      />
    </div>
  );
}