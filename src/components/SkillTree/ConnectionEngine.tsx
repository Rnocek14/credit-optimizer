import { useCallback, useMemo } from 'react';
import { Edge, MarkerType } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

export const useConnectionEngine = () => {
  const {
    skills,
    careerSteps,
    stepSkillMappings,
    userProgress,
    displayControls
  } = useSkillTree();

  // Define skill categories locally
  const skillCategories = {
    'Programming': { color: '#3B82F6' },
    'Framework': { color: '#10B981' },
    'Tools': { color: '#8B5CF6' },
    'Database': { color: '#F59E0B' },
    'Cloud': { color: '#06B6D4' },
    'DevOps': { color: '#EF4444' },
    'Soft Skills': { color: '#F59E0B' },
    'Leadership': { color: '#EC4899' }
  };

  // Create prerequisite connections between skills
  const createSkillConnections = useCallback((skillEdges: any[]) => {
    return skillEdges.map(edge => ({
      id: `skill-${edge.prerequisite_skill_id}-${edge.skill_id}`,
      source: `skill-${edge.prerequisite_skill_id}`,
      target: `skill-${edge.skill_id}`,
      type: 'smoothstep',
      style: {
        stroke: '#94A3B8',
        strokeWidth: 2,
        opacity: 0.6,
        strokeDasharray: '3,3'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94A3B8',
        width: 16,
        height: 16
      }
    }));
  }, []);

  // Create connections from supporting content to skills
  const createSupportingConnections = useCallback((nodes: any[]) => {
    const edges: Edge[] = [];
    const skillNodes = nodes.filter(n => n.type === 'skill');
    const courseNodes = nodes.filter(n => n.type === 'course');
    const projectNodes = nodes.filter(n => n.type === 'project');
    const certNodes = nodes.filter(n => n.type === 'certification');

    // Connect courses to related skills
    courseNodes.forEach(courseNode => {
      skillNodes.slice(0, 2).forEach(skillNode => {
        edges.push({
          id: `${courseNode.id}-${skillNode.id}`,
          source: courseNode.id,
          target: skillNode.id,
          type: 'smoothstep',
          style: {
            stroke: '#8B5CF6',
            strokeWidth: 2,
            opacity: 0.5
          }
        });
      });
    });

    // Connect projects to skills they validate
    projectNodes.forEach(projectNode => {
      skillNodes.slice(1, 3).forEach(skillNode => {
        edges.push({
          id: `${projectNode.id}-${skillNode.id}`,
          source: projectNode.id,
          target: skillNode.id,
          type: 'smoothstep',
          style: {
            stroke: '#F59E0B',
            strokeWidth: 2,
            opacity: 0.5
          }
        });
      });
    });

    // Connect certifications to advanced skills
    certNodes.forEach(certNode => {
      skillNodes.slice(-2).forEach(skillNode => {
        edges.push({
          id: `${certNode.id}-${skillNode.id}`,
          source: certNode.id,
          target: skillNode.id,
          type: 'smoothstep',
          style: {
            stroke: '#06B6D4',
            strokeWidth: 2,
            opacity: 0.5
          }
        });
      });
    });

    return edges;
  }, []);

  // Create connections from skills to career steps
  const createSkillToStepConnections = useCallback(() => {
    return stepSkillMappings
      .filter(mapping => mapping.importance_score >= 7)
      .map(mapping => {
        const skill = skills.find(s => s.id === mapping.skill_id);
        const categoryColor = skillCategories[skill?.category || 'Programming']?.color || '#3B82F6';
        
        return {
          id: `skill-${mapping.skill_id}-${mapping.step_id}`,
          source: `skill-${mapping.skill_id}`,
          target: mapping.step_id,
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            stroke: categoryColor,
            strokeWidth: 3,
            opacity: 0.7
          }
        };
      });
  }, [stepSkillMappings, skills, skillCategories]);

  // Create prerequisite connections between career steps
  const createStepConnections = useCallback(() => {
    const edges: Edge[] = [];
    
    careerSteps.forEach(step => {
      step.prerequisites?.forEach(prereqId => {
        const isUnlocked = !step.prerequisites || 
          step.prerequisites.every(id => 
            userProgress?.find(p => p.stepId === id)?.status === 'completed'
          );
        
        edges.push({
          id: `${prereqId}-${step.id}`,
          source: prereqId,
          target: step.id,
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            stroke: isUnlocked ? '#10B981' : '#6B7280',
            strokeWidth: 2,
            opacity: isUnlocked ? 1 : 0.4
          },
          animated: isUnlocked
        });
      });
    });

    return edges;
  }, [careerSteps, userProgress]);

  // Create connections from career steps to job goal
  const createStepToJobConnections = useCallback((nodes: any[]) => {
    const jobNode = nodes.find(n => n.type === 'job');
    const stepNodes = nodes.filter(n => n.type === 'careerStep');
    
    if (!jobNode || !displayControls.showJobs) return [];

    return stepNodes.map(stepNode => ({
      id: `${stepNode.id}-${jobNode.id}`,
      source: stepNode.id,
      target: jobNode.id,
      type: 'straight',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: '#10B981',
        strokeWidth: 4,
        opacity: 0.8
      },
      animated: true
    }));
  }, [displayControls.showJobs]);

  // Main function to generate all connections
  const generateConnections = useCallback((nodes: any[], skillEdges: any[]) => {
    const edges: Edge[] = [
      ...createSupportingConnections(nodes),
      ...createSkillConnections(skillEdges),
      ...createSkillToStepConnections(),
      ...createStepConnections(),
      ...createStepToJobConnections(nodes)
    ];

    return edges;
  }, [
    createSupportingConnections,
    createSkillConnections,
    createSkillToStepConnections,
    createStepConnections,
    createStepToJobConnections
  ]);

  return {
    generateConnections
  };
};