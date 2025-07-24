import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Simple node components
const SkillNode = ({ data }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed': return 'bg-green-100 border-green-400 text-green-800';
      case 'in_progress': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'available': return 'bg-blue-100 border-blue-400 text-blue-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-600';
    }
  };

  return (
    <div className={`px-3 py-2 border-2 rounded-lg font-medium ${getStatusColor()}`}>
      <div className="text-sm font-semibold">{data.name}</div>
      <div className="text-xs opacity-75">{data.category}</div>
    </div>
  );
};

const CareerStepNode = ({ data }) => {
  return (
    <div className="px-4 py-3 bg-purple-100 border-2 border-purple-400 rounded-lg text-purple-800">
      <div className="text-sm font-bold">{data.title}</div>
      <div className="text-xs">Level {data.level}</div>
      {data.completed && <div className="text-xs text-green-600">✓ Completed</div>}
    </div>
  );
};

const JobNode = ({ data }) => {
  return (
    <div className="px-6 py-4 bg-blue-100 border-3 border-blue-500 rounded-xl text-blue-900 font-bold text-lg">
      🎯 {data.title}
    </div>
  );
};

// Node types mapping
const nodeTypes = {
  skill: SkillNode,
  careerStep: CareerStepNode,
  job: JobNode,
};

interface SimpleSkillTreeProps {
  skills: Array<{
    id: string;
    name: string;
    category: string;
    xp_value: number;
    difficulty_level: number;
    description?: string;
    slug: string;
  }>;
  userProgress: Array<{
    skill_id: string;
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_earned: number;
    cri_score?: number;
  }>;
  skillEdges: Array<{
    prerequisite_skill_id: string;
    skill_id: string;
  }>;
  careerSteps?: Array<{
    id: string;
    title: string;
    level: number;
    prerequisites?: string[];
    is_checkpoint?: boolean;
    is_capstone?: boolean;
    is_terminal?: boolean;
    estimated_duration?: string;
    completed?: boolean;
  }>;
  careerPathName?: string;
  onSkillClick?: (skill: any) => void;
}

export const SimpleSkillTree: React.FC<SimpleSkillTreeProps> = ({
  skills,
  userProgress,
  skillEdges,
  careerSteps = [],
  careerPathName = "Your Career Path",
  onSkillClick
}) => {
  
  // Create nodes with simple positioning
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    // Job node at the top
    nodes.push({
      id: 'job-goal',
      type: 'job',
      position: { x: 400, y: 50 },
      data: { title: careerPathName },
    });

    // Career steps in the middle
    careerSteps.forEach((step, index) => {
      nodes.push({
        id: `step-${step.id}`,
        type: 'careerStep',
        position: { x: 200 + (index * 200), y: 200 },
        data: {
          title: step.title,
          level: step.level,
          completed: step.completed || false,
        },
      });
    });

    // Skills at the bottom - group by category
    const categories = [...new Set(skills.map(s => s.category))];
    categories.forEach((category, catIndex) => {
      const categorySkills = skills.filter(s => s.category === category);
      categorySkills.forEach((skill, skillIndex) => {
        const progress = userProgress.find(p => p.skill_id === skill.id);
        nodes.push({
          id: `skill-${skill.id}`,
          type: 'skill',
          position: { 
            x: 100 + (catIndex * 250) + (skillIndex % 3) * 80, 
            y: 400 + Math.floor(skillIndex / 3) * 80 
          },
          data: {
            ...skill,
            status: progress?.status || 'locked',
            xp_earned: progress?.xp_earned || 0,
          },
        });
      });
    });

    return nodes;
  }, [skills, userProgress, careerSteps, careerPathName]);

  // Create edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    // Connect job to career steps
    careerSteps.forEach((step) => {
      edges.push({
        id: `job-to-step-${step.id}`,
        source: 'job-goal',
        target: `step-${step.id}`,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#8B5CF6' }
      });
    });

    // Connect career steps to skills (basic mapping)
    careerSteps.forEach((step) => {
      // Connect each step to a few skills (simplified)
      const stepSkills = skills.slice(0, 3); // Just connect to first 3 skills for demo
      stepSkills.forEach((skill) => {
        edges.push({
          id: `step-${step.id}-to-skill-${skill.id}`,
          source: `step-${step.id}`,
          target: `skill-${skill.id}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6B7280', strokeDasharray: '5,5' }
        });
      });
    });

    // Add skill prerequisite edges
    skillEdges.forEach((edge) => {
      const sourceExists = skills.find(s => s.id === edge.prerequisite_skill_id);
      const targetExists = skills.find(s => s.id === edge.skill_id);
      
      if (sourceExists && targetExists) {
        edges.push({
          id: `skill-edge-${edge.prerequisite_skill_id}-${edge.skill_id}`,
          source: `skill-${edge.prerequisite_skill_id}`,
          target: `skill-${edge.skill_id}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#10B981' }
        });
      }
    });

    return edges;
  }, [skills, skillEdges, careerSteps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'skill' && onSkillClick) {
      const skill = skills.find(s => s.id === node.id.replace('skill-', ''));
      if (skill) {
        onSkillClick(skill);
      }
    }
  }, [skills, onSkillClick]);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
};