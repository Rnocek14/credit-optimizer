import React, { useState, useMemo } from 'react';
import { ReactFlow, Node, Edge, Background, Controls, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, Award, Clock, DollarSign } from 'lucide-react';

interface EducationNode {
  id: string;
  title: string;
  type: 'skill' | 'course' | 'credential' | 'job';
  credits?: number;
  cost?: number;
  duration?: string;
  prerequisites: string[];
  description: string;
}

const educationData: EducationNode[] = [
  {
    id: 'basic-math',
    title: 'Basic Mathematics',
    type: 'skill',
    duration: '2-3 months',
    cost: 0,
    prerequisites: [],
    description: 'Fundamental math skills including algebra and basic statistics'
  },
  {
    id: 'english-comp',
    title: 'English Composition',
    type: 'course',
    credits: 3,
    cost: 1200,
    duration: '4 months',
    prerequisites: [],
    description: 'College-level writing and communication skills'
  },
  {
    id: 'college-algebra',
    title: 'College Algebra',
    type: 'course',
    credits: 3,
    cost: 1200,
    duration: '4 months',
    prerequisites: ['basic-math'],
    description: 'Advanced algebraic concepts and problem solving'
  },
  {
    id: 'intro-programming',
    title: 'Introduction to Programming',
    type: 'course',
    credits: 4,
    cost: 1600,
    duration: '4 months',
    prerequisites: ['college-algebra'],
    description: 'Programming fundamentals using Python or Java'
  },
  {
    id: 'data-structures',
    title: 'Data Structures',
    type: 'course',
    credits: 4,
    cost: 1600,
    duration: '4 months',
    prerequisites: ['intro-programming'],
    description: 'Arrays, lists, trees, and algorithmic thinking'
  },
  {
    id: 'associate-cs',
    title: 'Associate in Computer Science',
    type: 'credential',
    credits: 60,
    cost: 24000,
    duration: '2 years',
    prerequisites: ['english-comp', 'data-structures'],
    description: 'Two-year degree in computer science fundamentals'
  },
  {
    id: 'bachelor-cs',
    title: 'Bachelor in Computer Science',
    type: 'credential',
    credits: 120,
    cost: 45000,
    duration: '4 years total',
    prerequisites: ['associate-cs'],
    description: 'Four-year degree with advanced CS concepts and specializations'
  },
  {
    id: 'software-developer',
    title: 'Software Developer',
    type: 'job',
    cost: 0,
    duration: 'Career',
    prerequisites: ['bachelor-cs'],
    description: 'Design and develop software applications and systems'
  }
];

const CustomNode = ({ data }: { data: any }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'skill': return <BookOpen className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'credential': return <GraduationCap className="w-4 h-4" />;
      case 'job': return <Award className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (data.type) {
      case 'skill': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'course': return 'bg-green-50 border-green-200 text-green-900';
      case 'credential': return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'job': return 'bg-amber-50 border-amber-200 text-amber-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 min-w-[200px] max-w-[250px] ${getColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <h3 className="font-semibold text-sm">{data.title}</h3>
      </div>
      
      <p className="text-xs mb-3 opacity-80">{data.description}</p>
      
      <div className="flex flex-wrap gap-1">
        {data.credits && (
          <Badge variant="secondary" className="text-xs">
            {data.credits} credits
          </Badge>
        )}
        {data.cost !== undefined && (
          <Badge variant="outline" className="text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            {data.cost === 0 ? 'Free' : `$${data.cost.toLocaleString()}`}
          </Badge>
        )}
        {data.duration && (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {data.duration}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default function EducationTree() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Create nodes and edges from education data
  const { nodes, edges } = useMemo(() => {
    // Position nodes in tiers based on prerequisites
    const nodesByTier: { [tier: number]: EducationNode[] } = {};
    
    // Calculate tier for each node (depth in prerequisite chain)
    const calculateTier = (nodeId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(nodeId)) return 0; // Avoid cycles
      visited.add(nodeId);
      
      const node = educationData.find(n => n.id === nodeId);
      if (!node || node.prerequisites.length === 0) return 0;
      
      const maxPrereqTier = Math.max(...node.prerequisites.map(prereq => 
        calculateTier(prereq, new Set(visited))
      ));
      
      return maxPrereqTier + 1;
    };

    // Group nodes by tier
    educationData.forEach(node => {
      const tier = calculateTier(node.id);
      if (!nodesByTier[tier]) nodesByTier[tier] = [];
      nodesByTier[tier].push(node);
    });

    // Create React Flow nodes with positions
    const flowNodes: Node[] = [];
    const tierWidth = 300;
    const tierHeight = 150;
    
    Object.keys(nodesByTier).forEach(tierStr => {
      const tier = parseInt(tierStr);
      const nodesInTier = nodesByTier[tier];
      
      nodesInTier.forEach((node, index) => {
        flowNodes.push({
          id: node.id,
          type: 'custom',
          position: {
            x: tier * tierWidth,
            y: index * tierHeight + (tier % 2) * 75 // Slight offset for better visibility
          },
          data: {
            ...node,
            isSelected: selectedNode === node.id
          },
          draggable: true
        });
      });
    });

    // Create edges based on prerequisites
    const flowEdges: Edge[] = [];
    educationData.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        flowEdges.push({
          id: `${prereqId}-${node.id}`,
          source: prereqId,
          target: node.id,
          type: 'smoothstep',
          animated: selectedNode === prereqId || selectedNode === node.id,
          style: {
            stroke: selectedNode === prereqId || selectedNode === node.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            strokeWidth: selectedNode === prereqId || selectedNode === node.id ? 3 : 1,
          },
          sourceHandle: 'right',
          targetHandle: 'left'
        });
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [selectedNode]);

  const nodeTypes = {
    custom: CustomNode
  };

  const selectedNodeData = selectedNode ? educationData.find(n => n.id === selectedNode) : null;

  const handleNodeClick = (event: any, node: Node) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Education Pathway Tree</h1>
        <p className="text-muted-foreground">
          Explore structured educational paths from basic skills to career goals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Path Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNodeData ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{selectedNodeData.title}</h3>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {selectedNodeData.type}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {selectedNodeData.description}
                  </p>
                  
                  <div className="space-y-2">
                    {selectedNodeData.credits && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-sm">{selectedNodeData.credits} Credits</span>
                      </div>
                    )}
                    
                    {selectedNodeData.cost !== undefined && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">
                          {selectedNodeData.cost === 0 ? 'Free' : `$${selectedNodeData.cost.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                    
                    {selectedNodeData.duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{selectedNodeData.duration}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedNodeData.prerequisites.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Prerequisites:</h4>
                      <div className="space-y-1">
                        {selectedNodeData.prerequisites.map(prereqId => {
                          const prereq = educationData.find(n => n.id === prereqId);
                          return prereq ? (
                            <div key={prereqId} className="text-xs text-muted-foreground">
                              • {prereq.title}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click on a node to see detailed information.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Tree View */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                className="w-full h-full"
              >
                <Background />
                <Controls />
              </ReactFlow>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}