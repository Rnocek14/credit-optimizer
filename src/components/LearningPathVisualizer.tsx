import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Brain, TrendingUp } from 'lucide-react';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { AIPlannerDataBridge, type GraphNode as BridgeGraphNode } from '@/lib/aiPlannerDataBridge';
import type { LearningPath } from '@/hooks/useAIPlanningEngine';
import type { GraphNode } from '@/lib/careerGraph';

interface LearningPathVisualizerProps {
  learningPaths: LearningPath[];
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

export function LearningPathVisualizer({ 
  learningPaths, 
  onNodeClick,
  className = ""
}: LearningPathVisualizerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Convert learning paths to graph format
  const graphData = useMemo(() => {
    if (learningPaths.length === 0) return null;

    try {
      setConversionError(null);
      console.log('🔄 Converting learning paths to graph format:', learningPaths);
      const converted = AIPlannerDataBridge.convertLearningPathsToGraph(learningPaths);
      console.log('✅ Conversion successful:', converted);
      return converted;
    } catch (error) {
      console.error('❌ Error converting learning paths:', error);
      setConversionError(error instanceof Error ? error.message : 'Unknown conversion error');
      return null;
    }
  }, [learningPaths]);

  // Convert bridge format to unified format for canvas
  const canvasNodes: GraphNode[] = useMemo(() => {
    if (!graphData) return [];
    
    return graphData.nodes.map(bridgeNode => {
      // Map bridge node type to valid NodeType
      const nodeType = (['job', 'skill', 'step', 'course', 'project', 'certification'].includes(bridgeNode.type)) 
        ? bridgeNode.type as import('@/lib/careerGraph').NodeType
        : 'skill' as const;
      
      // Create appropriate data based on node type
      let data: any;
      switch (nodeType) {
        case 'job':
          data = {
            required_skills: [],
            preferred_skills: [],
            average_salary: bridgeNode.cost_estimate,
            industry: bridgeNode.category || 'Technology'
          } as import('@/lib/careerGraph').JobData;
          break;
        case 'skill':
          data = {
            category: bridgeNode.category || 'Technical',
            xp_value: 100,
            difficulty_level: bridgeNode.difficulty_level || 1,
            market_demand: bridgeNode.market_demand_score || 1
          } as import('@/lib/careerGraph').SkillData;
          break;
        case 'course':
          data = {
            platform: 'AI Planner',
            cost: bridgeNode.cost_estimate,
            duration: `${bridgeNode.estimated_time_hours || 0}h`,
            skill_tags: []
          } as import('@/lib/careerGraph').CourseData;
          break;
        case 'step':
          data = {
            step_type: 'learning',
            step_order: 1,
            prerequisites: []
          } as import('@/lib/careerGraph').StepData;
          break;
        case 'project':
          data = {
            project_type: 'practice' as const,
            skills_demonstrated: [],
            technologies: []
          } as import('@/lib/careerGraph').ProjectData;
          break;
        case 'certification':
          data = {
            issuer: 'AI Planner',
            cost: bridgeNode.cost_estimate,
            prep_time_hours: bridgeNode.estimated_time_hours,
            skills_validated: []
          } as import('@/lib/careerGraph').CertificationData;
          break;
        default:
          data = {
            category: 'General',
            xp_value: 100
          } as import('@/lib/careerGraph').SkillData;
      }
        
      return {
        id: bridgeNode.id,
        type: nodeType,
        title: bridgeNode.title,
        description: bridgeNode.description,
        estimated_time_hours: bridgeNode.estimated_time_hours,
        data
      };
    });
  }, [graphData]);

  const canvasEdges = useMemo(() => {
    if (!graphData) return [];
    
    return graphData.edges.map(bridgeEdge => {
      // Map bridge edge type to valid EdgeType
      const edgeType = (['requires', 'unlocks', 'teaches', 'demonstrates', 'validates', 
                        'next_role', 'pivot', 'prerequisite', 'substitution', 'leads_to', 'strengthens'].includes(bridgeEdge.type)) 
        ? bridgeEdge.type as import('@/lib/careerGraph').EdgeType
        : 'requires' as const;
        
      return {
        id: bridgeEdge.id,
        from_type: 'skill' as const, // Default to skill
        from_id: bridgeEdge.source,
        to_type: 'skill' as const,   // Default to skill  
        to_id: bridgeEdge.target,
        edge_type: edgeType,
        importance_weight: bridgeEdge.weight || 1,
        time_cost_hours: 0,
        monetary_cost: 0,
        difficulty_multiplier: 1,
      };
    });
  }, [graphData]);

  // Handle node clicks
  const handleNodeClick = (node: GraphNode) => {
    console.log('📍 Node clicked:', node);
    
    // Call parent callback
    onNodeClick?.(node);
  };

  // Show loading state
  if (learningPaths.length === 0) {
    return (
      <Card className={`w-full h-96 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-4">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No Learning Paths to Visualize</h3>
            <p className="text-muted-foreground max-w-md">
              Generate a learning path first to see the visual roadmap.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show conversion error
  if (conversionError) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Visualization Error:</strong> {conversionError}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show conversion loading or no data
  if (!graphData) {
    return (
      <Card className={`w-full h-96 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">🎨 Generating Visual Roadmap...</p>
            <p className="text-sm text-muted-foreground">
              Converting learning paths to interactive graph
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const { nodes, edges } = graphData;
  
  // Calculate metadata from graph data
  const metadata = useMemo(() => {
    if (!graphData) return { totalPaths: 0, hasCheckpoints: false, hasBranching: false, pathTypes: [] };
    
    const hasCheckpoints = nodes.some(node => node.metadata?.isCheckpoint);
    const hasBranching = nodes.some(node => node.metadata?.isBranchPoint);
    const pathTypes = Array.from(new Set(learningPaths.map(path => path.path_type)));
    
    return {
      totalPaths: learningPaths.length,
      hasCheckpoints,
      hasBranching,
      pathTypes
    };
  }, [graphData, nodes, learningPaths]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Visualization Stats Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">🎯 Visual Learning Roadmap</h3>
          <p className="text-sm text-muted-foreground">
            Interactive graph showing {metadata.totalPaths} learning path{metadata.totalPaths !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            {nodes.length} nodes
          </Badge>
          <Badge variant="outline" className="text-xs">
            {edges.length} connections
          </Badge>
          {metadata.hasCheckpoints && (
            <Badge variant="secondary" className="text-xs">
              ✓ Checkpoints
            </Badge>
          )}
          {metadata.hasBranching && (
            <Badge variant="secondary" className="text-xs">
              🔀 Branching
            </Badge>
          )}
        </div>
      </div>

      {/* Interactive Graph Canvas */}
      <Card className="border border-border/40">
        <CardContent className="p-0">
          <div className="h-96 md:h-[500px] lg:h-[600px] relative">
            <UnifiedCareerCanvas
              nodes={canvasNodes}
              edges={canvasEdges}
              onNodeClick={handleNodeClick}
              layoutAlgorithm="semantic-hierarchy"
              selectedCareerPath={selectedPath}
              focusMode={false}
              showPivotPaths={true}
              layoutConfig={{
                algorithm: 'hierarchical',
                spacing: {
                  nodeWidth: 200,
                  nodeHeight: 80,
                  levelGap: 150,
                  nodeGap: 120
                },
                direction: 'horizontal',
                groupByType: true
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Graph Legend */}
      <Card className="border border-border/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary"></div>
              <span>Skills</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-secondary"></div>
              <span>Courses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-accent"></div>
              <span>Target Jobs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-primary bg-background"></div>
              <span>Checkpoints</span>
            </div>
          </div>
          
          {metadata.pathTypes.length > 1 && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-2">Path Types:</p>
              <div className="flex gap-2 flex-wrap">
                {metadata.pathTypes.map(type => (
                  <Badge key={type} variant="outline" className="text-xs capitalize">
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}