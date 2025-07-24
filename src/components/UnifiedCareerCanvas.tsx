import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  MarkerType,
  ConnectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import smart layout functionality
import { calculateForceDirectedLayout, ForceDirectedLayoutOptions } from '@/lib/smartLayout';

// Import all node types
import { JobNode } from './SkillTree/JobNode';
import { CourseNode } from './SkillTree/CourseNode';
import { ProjectNode } from './SkillTree/ProjectNode';
import { CertificationNode } from './SkillTree/CertificationNode';
import { SkillTreeSkillNode } from './SkillTreeSkillNode';
import { SkillTreeStepNode } from './SkillTreeStepNode';

// Define unified node types
const nodeTypes = {
  skill: SkillTreeSkillNode,
  job: JobNode,
  course: CourseNode,
  project: ProjectNode,
  certification: CertificationNode,
  careerStep: SkillTreeStepNode,
};

// Define edge types for different relationships
const edgeTypes = {
  prerequisite: 'default', // skill -> skill
  learningPath: 'smoothstep', // skill -> course -> project
  careerPath: 'step', // skills -> job
  validation: 'straight', // project -> certification
};

interface UnifiedCareerData {
  skills: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    difficulty_level: number;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    description: string;
    level: string;
    industry: string;
    average_salary: number;
    roi_score: number;
    growth_outlook: string;
    required_skill_ids: string[];
  }>;
  courses: Array<{
    id: string;
    title: string;
    description: string;
    platform: string;
    cost: string;
    difficulty: string;
    skill_tags: string[];
    url?: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    estimated_time: string;
    skills_demonstrated: string[];
    project_type: string;
  }>;
  certifications: Array<{
    id: string;
    title: string;
    issuer: string;
    description: string;
    cost: string;
    validity: string;
    skills_validated: string[];
  }>;
  careerSteps: Array<{
    id: string;
    title: string;
    description: string;
    level: number;
    is_terminal: boolean;
    prerequisites: string[];
    skills: Array<{ id: string; name: string; category: string; importance: number }>;
  }>;
}

interface CareerRelationship {
  from: string;
  to: string;
  type: 'prerequisite' | 'learningPath' | 'careerPath' | 'validation';
  weight?: number;
}

interface UnifiedCareerCanvasProps {
  data: UnifiedCareerData;
  relationships: CareerRelationship[];
  selectedCareerPath?: string;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
  showMinimap?: boolean;
  layoutMode?: 'hierarchy' | 'force' | 'hybrid';
  forceOptions?: Partial<ForceDirectedLayoutOptions>;
  onLayoutCalculating?: (isCalculating: boolean) => void;
}

// Layout algorithms
const calculateHierarchicalLayout = (
  skills: any[], 
  jobs: any[], 
  courses: any[], 
  projects: any[], 
  certifications: any[] = [],
  careerSteps: any[] = []
) => {
  const nodes: Node[] = [];
  const LAYER_HEIGHT = 200;
  const NODE_SPACING = 250;

  // Layer 1: Skills (foundation)
  skills.forEach((skill, index) => {
    const x = (index % 6) * NODE_SPACING;
    const y = 0;
    
    nodes.push({
      id: skill.id,
      type: 'skill',
      position: { x, y },
      data: {
        name: skill.name,
        category: skill.category,
        description: skill.description,
      },
    });
  });

  // Layer 2: Courses (learning resources)
  courses.forEach((course, index) => {
    const x = (index % 5) * (NODE_SPACING + 50);
    const y = LAYER_HEIGHT;
    
    nodes.push({
      id: course.id,
      type: 'course',
      position: { x, y },
      data: {
        title: course.title,
        description: course.description,
        platform: course.platform,
        cost: course.cost,
        difficulty: course.difficulty,
        skillTags: course.skill_tags,
        url: course.url,
      },
    });
  });

  // Layer 3: Projects (application)
  projects.forEach((project, index) => {
    const x = (index % 4) * (NODE_SPACING + 100);
    const y = LAYER_HEIGHT * 2;
    
    nodes.push({
      id: project.id,
      type: 'project',
      position: { x, y },
      data: {
        title: project.title,
        description: project.description,
        difficulty: project.difficulty,
        estimatedTime: project.estimated_time,
        skillsDemonstrated: project.skills_demonstrated,
        projectType: project.project_type,
      },
    });
  });

  // Layer 4: Certifications (validation)
  certifications.forEach((cert, index) => {
    const x = (index % 4) * (NODE_SPACING + 100);
    const y = LAYER_HEIGHT * 3;
    
    nodes.push({
      id: cert.id,
      type: 'certification',
      position: { x, y },
      data: {
        title: cert.title,
        issuer: cert.issuer,
        description: cert.description,
        cost: cert.cost,
        validity: cert.validity,
        skillsValidated: cert.skills_validated,
      },
    });
  });

  // Layer 5: Career Steps (intermediate goals)
  careerSteps.forEach((step, index) => {
    const x = (index % 4) * (NODE_SPACING + 100);
    const y = LAYER_HEIGHT * 4;
    
    nodes.push({
      id: step.id,
      type: 'careerStep',
      position: { x, y },
      data: {
        title: step.title,
        description: step.description,
        level: step.level,
        isTerminal: step.is_terminal,
        prerequisites: step.prerequisites,
        skills: step.skills,
      },
    });
  });

  // Layer 6: Jobs (career outcomes)
  jobs.forEach((job, index) => {
    const x = (index % 3) * (NODE_SPACING + 150);
    const y = LAYER_HEIGHT * 5;
    
    nodes.push({
      id: job.id,
      type: 'job',
      position: { x, y },
      data: {
        title: job.title,
        description: job.description,
        level: job.level,
        industry: job.industry,
        averageSalary: job.average_salary,
        roiScore: job.roi_score,
        growthOutlook: job.growth_outlook,
        requiredSkillIds: job.required_skill_ids,
      },
    });
  });

  return nodes;
};

const generateRelationshipEdges = (relationships: CareerRelationship[]): Edge[] => {
  return relationships.map((rel, index) => ({
    id: `edge-${index}`,
    source: rel.from,
    target: rel.to,
    type: getEdgeTypeForRelationship(rel.type),
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    style: getEdgeStyleForRelationship(rel.type, rel.weight),
    label: rel.weight >= 4 ? getEdgeLabelForRelationship(rel.type) : '', // Only show labels for strong relationships
    animated: rel.weight >= 5, // Animate only the strongest relationships
  }));
};

const getEdgeTypeForRelationship = (type: string) => {
  switch (type) {
    case 'prerequisite': return 'default';
    case 'learningPath': return 'smoothstep';
    case 'careerPath': return 'step';
    case 'validation': return 'straight';
    default: return 'default';
  }
};

const getEdgeStyleForRelationship = (type: string, weight: number = 1) => {
  // Calculate opacity and stroke width based on weight
  const opacity = Math.max(0.3, Math.min(1, weight / 5)); // Range: 0.3 to 1.0
  const strokeWidth = Math.max(1, Math.min(4, weight)); // Range: 1 to 4
  
  switch (type) {
    case 'prerequisite': return { 
      stroke: '#6b7280', 
      strokeWidth, 
      opacity: opacity * 0.8 // Slightly more transparent
    };
    case 'learningPath': return { 
      stroke: '#3b82f6', 
      strokeWidth, 
      opacity 
    };
    case 'careerPath': return { 
      stroke: '#10b981', 
      strokeWidth: strokeWidth + 1, // Career paths are more prominent
      opacity 
    };
    case 'validation': return { 
      stroke: '#f59e0b', 
      strokeWidth, 
      opacity 
    };
    default: return { 
      stroke: '#6b7280', 
      strokeWidth: 1, 
      opacity: 0.4 
    };
  }
};

const getEdgeLabelForRelationship = (type: string) => {
  switch (type) {
    case 'prerequisite': return 'requires';
    case 'learningPath': return 'learn';
    case 'careerPath': return 'leads to';
    case 'validation': return 'validates';
    default: return '';
  }
};

export const UnifiedCareerCanvas: React.FC<UnifiedCareerCanvasProps> = ({
  data,
  relationships,
  selectedCareerPath,
  onNodeClick,
  showMinimap = true,
  layoutMode = 'hierarchy',
  forceOptions,
  onLayoutCalculating,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(false);
  const { fitView } = useReactFlow();

  // Calculate layout based on data and mode
  const calculatedNodes = useMemo(() => {
    if (layoutMode === 'hierarchy') {
      return calculateHierarchicalLayout(
        data.skills,
        data.jobs,
        data.courses,
        data.projects,
        data.certifications,
        data.careerSteps
      );
    }
    return []; // Force-directed layout will be calculated separately
  }, [data, layoutMode]);

  // Generate edges from relationships
  const calculatedEdges = useMemo(() => {
    return generateRelationshipEdges(relationships);
  }, [relationships]);

  // Calculate force-directed layout when needed
  useEffect(() => {
    const calculateLayout = async () => {
      if (layoutMode === 'force' || layoutMode === 'hybrid') {
        setIsCalculatingLayout(true);
        onLayoutCalculating?.(true);
        
        console.log('🎯 Starting layout calculation:', {
          mode: layoutMode,
          nodeCount: Object.values(data).flat().length,
          relationshipCount: relationships.length,
          hasForceOptions: !!forceOptions
        });
        
        try {
          const debugCallback = (debugData: any) => {
            console.log('📊 Layout Debug:', debugData);
          };

          const forceNodes = await calculateForceDirectedLayout(
            data,
            relationships,
            forceOptions,
            debugCallback
          );
          
          if (layoutMode === 'hybrid') {
            // For hybrid mode, blend hierarchical and force-directed positions
            const hierarchicalNodes = calculateHierarchicalLayout(
              data.skills,
              data.jobs,
              data.courses,
              data.projects,
              data.certifications,
              data.careerSteps
            );
            
            // Blend positions (70% force, 30% hierarchical)
            const blendedNodes = forceNodes.map(forceNode => {
              const hierarchicalNode = hierarchicalNodes.find(h => h.id === forceNode.id);
              if (hierarchicalNode) {
                return {
                  ...forceNode,
                  position: {
                    x: forceNode.position.x * 0.7 + hierarchicalNode.position.x * 0.3,
                    y: forceNode.position.y * 0.7 + hierarchicalNode.position.y * 0.3,
                  },
                };
              }
              return forceNode;
            });
            
            setNodes(blendedNodes);
          } else {
            setNodes(forceNodes);
          }
          
          // Auto-fit view after layout calculation
          setTimeout(() => fitView({ duration: 800 }), 100);
        } catch (error) {
          console.error('Error calculating force-directed layout:', error);
          // Fallback to hierarchical layout
          setNodes(calculatedNodes);
        } finally {
          setIsCalculatingLayout(false);
          onLayoutCalculating?.(false);
        }
      } else {
        // Hierarchical layout
        setNodes(calculatedNodes);
      }
    };

    calculateLayout();
  }, [data, relationships, layoutMode, forceOptions, calculatedNodes, setNodes, fitView, onLayoutCalculating]);

  // Update edges when relationships change
  useEffect(() => {
    setEdges(calculatedEdges);
  }, [calculatedEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id, node.type || 'unknown');
      }
    },
    [onNodeClick]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        className="bg-background"
      >
        <Background />
        <Controls />
        {showMinimap && (
          <MiniMap 
            nodeStrokeColor={(n) => {
              switch (n.type) {
                case 'skill': return '#3b82f6';
                case 'course': return '#10b981';
                case 'project': return '#f59e0b';
                case 'certification': return '#8b5cf6';
                case 'job': return '#ef4444';
                default: return '#6b7280';
              }
            }}
            nodeColor={(n) => {
              switch (n.type) {
                case 'skill': return '#dbeafe';
                case 'course': return '#d1fae5';
                case 'project': return '#fef3c7';
                case 'certification': return '#ede9fe';
                case 'job': return '#fee2e2';
                default: return '#f3f4f6';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.05)"
          />
        )}
      </ReactFlow>
    </div>
  );
};