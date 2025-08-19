import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Connection,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PathNode } from './PathNode';
import { PathRightRail } from './PathRightRail';
import { PathManager } from './PathManager';
import { TreeLayoutControls } from './TreeLayoutControls';
import PathEdge from './PathEdge';
import { usePathStore } from '@/stores/usePathStore';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Plus, Palette, Download, Upload, RotateCcw, ArrowRight, Lock, Zap, GitBranch, Shuffle } from 'lucide-react';

// Canonical catalog for prerequisite auto-fill
const canonicalCatalog = [
  { title: 'JavaScript Basics', skills: ['javascript', 'programming'], difficulty: 'beginner' as const, estimatedHours: 20 },
  { title: 'HTML & CSS Foundations', skills: ['html', 'css', 'web development'], difficulty: 'beginner' as const, estimatedHours: 15 },
  { title: 'React Fundamentals', skills: ['react', 'javascript', 'frontend'], difficulty: 'intermediate' as const, estimatedHours: 30 },
  { title: 'React Hooks & Advanced State', skills: ['react', 'hooks', 'useReducer', 'useMemo', 'context'], difficulty: 'intermediate' as const, estimatedHours: 16 },
  { title: 'Patterns & Composition in React', skills: ['react', 'composition', 'render props', 'compound components', 'children as a function'], difficulty: 'intermediate' as const, estimatedHours: 14 },
  { title: 'React Performance & Optimization', skills: ['react', 'performance', 'memoization', 'profiling', 'concurrency'], difficulty: 'advanced' as const, estimatedHours: 12 },
  { title: 'Advanced React Patterns', skills: ['react', 'patterns', 'composition', 'performance'], difficulty: 'advanced' as const, estimatedHours: 20 },
  { title: 'Node.js Essentials', skills: ['node.js', 'javascript', 'backend'], difficulty: 'intermediate' as const, estimatedHours: 25 },
  { title: 'Python Programming', skills: ['python', 'programming'], difficulty: 'beginner' as const, estimatedHours: 25 },
  { title: 'Data Structures & Algorithms', skills: ['algorithms', 'data structures', 'programming'], difficulty: 'intermediate' as const, estimatedHours: 40 },
  { title: 'SQL Database Fundamentals', skills: ['sql', 'databases'], difficulty: 'beginner' as const, estimatedHours: 20 },
  { title: 'Git Version Control', skills: ['git', 'version control'], difficulty: 'beginner' as const, estimatedHours: 10 },
  { title: 'TypeScript Fundamentals', skills: ['typescript', 'javascript'], difficulty: 'intermediate' as const, estimatedHours: 15 },
  { title: 'API Development', skills: ['api', 'rest', 'backend'], difficulty: 'intermediate' as const, estimatedHours: 30 },
];

// Expose catalog to global for the store to access
(globalThis as any).canonicalCatalog = canonicalCatalog;

interface PathCanvasProps {
  userId: string;
}

import { SkillNode } from './SkillNode';

const nodeTypes = {
  track: PathNode,
  course: PathNode,
  skill: SkillNode,
  project: PathNode,
  milestone: PathNode,
};

const edgeTypes = {
  prerequisite: PathEdge,
  sequence: PathEdge,
  suggested: PathEdge,
  alternative: PathEdge,
  branch: PathEdge,
};

export function PathCanvas({ userId }: PathCanvasProps) {
  const { 
    nodes, 
    edges, 
    activeNodeId,
    selectedEdgeType,
    addNode,
    connect,
    moveNode,
    setActiveNode,
    setSelectedEdgeType,
    clearCanvas,
    removeNode,
    removeEdge,
    autoLayoutPrereqOrder,
    autoLayoutTree,
    ensurePrerequisiteClosure,
    refreshUserSkills,
    scheduleLayout,
    recomputeDimensionSig,
    dimensionSig,
  } = usePathStore();

  // State for triggering fitView after layout operations
  const [autoFillTrigger, setAutoFillTrigger] = React.useState(0);
  const [treeLayoutTrigger, setTreeLayoutTrigger] = React.useState(0);
  const { activeTrackId } = useActiveTrackStore();

  useEffect(() => {
    if (userId) {
      usePathStore.getState().refreshUserSkills(userId);
    }
  }, [userId]);

  // Add layout change detection - trigger relayout when dimensions settle
  useEffect(() => {
    const tick = setInterval(() => {
      const sig = recomputeDimensionSig();
      if (sig !== dimensionSig) {
        scheduleLayout("measure change");
      }
    }, 150); // lightweight poll to detect dimension changes
    return () => clearInterval(tick);
  }, [scheduleLayout, recomputeDimensionSig, dimensionSig]);


  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        connect(params.source, params.target, selectedEdgeType);
      }
    },
    [connect, selectedEdgeType]
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

  // Demo nodes with prerequisites for first-time users
  const initializeDemoNodes = useCallback(() => {
    const demoNodes = [
      {
        type: 'course' as const,
        position: { x: 100, y: 200 },
        data: {
          title: 'JavaScript Basics',
          description: 'Learn JavaScript fundamentals',
          skillTags: ['JavaScript', 'Programming'],
          difficulty: 'beginner' as const,
          status: 'available' as const,
          estimatedHours: 30,
          cost: 49,
          cri: 4.0,
        },
      },
      {
        type: 'course' as const,
        position: { x: 400, y: 200 },
        data: {
          title: 'React Fundamentals',
          description: 'Learn React from scratch',
          institutionId: 'demo-institution',
          teacherId: 'demo-teacher',
          verification: 'institution_verified' as const,
          progress: 0,
          estimatedHours: 40,
          cost: 99,
          skillTags: ['React', 'JavaScript', 'Frontend'],
          difficulty: 'intermediate' as const,
          status: 'locked' as const,
          cri: 4.5,
        },
      },
      {
        type: 'project' as const,
        position: { x: 700, y: 200 },
        data: {
          title: 'Todo App Project',
          description: 'Build a todo application with React',
          verification: 'mentor_verified' as const,
          progress: 0,
          estimatedHours: 20,
          skillTags: ['React', 'State Management', 'Project'],
          difficulty: 'intermediate' as const,
          status: 'locked' as const,
        },
      },
      {
        type: 'milestone' as const,
        position: { x: 1000, y: 200 },
        data: {
          title: 'Frontend Developer',
          description: 'Ready for junior frontend developer role',
          skillTags: ['React', 'JavaScript', 'Frontend', 'Projects'],
          difficulty: 'intermediate' as const,
          status: 'locked' as const,
        },
      },
    ];

    demoNodes.forEach(addNode);
    
    // Add prerequisite connections after a short delay to ensure nodes exist
    setTimeout(() => {
      const allNodes = usePathStore.getState().nodes;
      const jsNode = allNodes.find(n => n.data.title === 'JavaScript Basics');
      const reactNode = allNodes.find(n => n.data.title === 'React Fundamentals');
      const todoNode = allNodes.find(n => n.data.title === 'Todo App Project');
      const milestoneNode = allNodes.find(n => n.data.title === 'Frontend Developer');
      
      if (jsNode && reactNode) {
        connect(jsNode.id, reactNode.id, 'prerequisite');
      }
      if (reactNode && todoNode) {
        connect(reactNode.id, todoNode.id, 'prerequisite');
      }
      if (todoNode && milestoneNode) {
        connect(todoNode.id, milestoneNode.id, 'prerequisite');
      }
      
      // Add test scenario with missing prerequisites
      const testNode = addNode({
        type: 'course',
        position: { x: 100, y: 400 },
        data: {
          title: 'Advanced React Patterns',
          description: 'Learn advanced React patterns and optimization',
          skillTags: ['React', 'Hooks', 'Performance'],
          difficulty: 'advanced',
          status: 'locked',
          prerequisites: ['TypeScript', 'Node.js', 'Advanced JavaScript'],
        },
      });
      
      console.log('✅ Demo data loaded with test scenario for auto-fill');
    }, 100);
  }, [addNode, connect]);

  // Enhanced auto-fill function that refreshes skills and uses tree layout
  const handleAutoFillPrerequisites = async () => {
    try {
      await refreshUserSkills();
      await ensurePrerequisiteClosure();
      autoLayoutTree("LR");
      setAutoFillTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Auto-fill error:', error);
    }
  };

  const activeNode = useMemo(() => 
    nodes.find(n => n.id === activeNodeId),
    [nodes, activeNodeId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger shortcuts when typing in inputs
      }
      
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        autoLayoutPrereqOrder();
      } else if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        autoLayoutTree("LR");
        setTreeLayoutTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoLayoutPrereqOrder, autoLayoutTree]);

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

        <Separator />

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Edge Type</h4>
          <p className="text-xs text-muted-foreground/70">
            Select connection type for new edges
          </p>
          
          <ToggleGroup
            type="single"
            value={selectedEdgeType}
            onValueChange={(value) => value && setSelectedEdgeType(value as any)}
            className="grid grid-cols-1 gap-1"
          >
            <ToggleGroupItem value="sequence" className="h-7 text-xs justify-start">
              <ArrowRight className="w-3 h-3 mr-1" />
              Sequence
            </ToggleGroupItem>
            <ToggleGroupItem value="prerequisite" className="h-7 text-xs justify-start">
              <Lock className="w-3 h-3 mr-1" />
              Prerequisite
            </ToggleGroupItem>
            <ToggleGroupItem value="suggested" className="h-7 text-xs justify-start">
              <Zap className="w-3 h-3 mr-1" />
              Suggested
            </ToggleGroupItem>
            <ToggleGroupItem value="alternative" className="h-7 text-xs justify-start">
              <Shuffle className="w-3 h-3 mr-1" />
              Alternative
            </ToggleGroupItem>
            <ToggleGroupItem value="branch" className="h-7 text-xs justify-start">
              <GitBranch className="w-3 h-3 mr-1" />
              Branch
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Canvas Actions</h4>
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={autoLayoutPrereqOrder}
              className="w-full text-xs"
              title="Auto-layout nodes in prerequisite order (hotkey: A)"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Auto Layout (A)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                scheduleLayout("tree layout button");
                setTreeLayoutTrigger(prev => prev + 1);
              }}
              className="w-full text-xs"
              title="Organize in tree layout (hotkey: T)"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Tree Layout (T)
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAutoFillPrerequisites}
              className="w-full text-xs"
              title="Automatically add missing prerequisite courses"
            >
              <Zap className="w-3 h-3 mr-1" />
              Auto-fill Prerequisites
            </Button>
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
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={(deleted) => deleted.forEach(n => removeNode(n.id))}
          onEdgesDelete={(deleted) => deleted.forEach(e => removeEdge(e.id))}
          deleteKeyCode={['Backspace', 'Delete']}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-background"
        >
          <Background />
          <Controls />
          <TreeLayoutControls 
            onAutoFillComplete={autoFillTrigger > 0 ? () => {} : undefined}
            onTreeLayoutComplete={treeLayoutTrigger > 0 ? () => {} : undefined}
          />
          
          <Panel position="top-center">
            <div className="flex items-center gap-4">
              <PathManager userId={userId} />
              <Badge variant="outline" className="bg-background">
                Path Canvas - Click nodes to edit in right panel
              </Badge>
            </div>
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