import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

interface LearningPath {
  id: string;
  name: string;
  nodes: string[];
  edges: string[];
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
}

export const usePathHighlighter = () => {
  const {
    careerSteps,
    skills,
    stepSkillMappings,
    userProgress,
    selectedCareerPath
  } = useSkillTree();

  // Generate learning paths based on career progression
  const learningPaths = useMemo((): LearningPath[] => {
    const paths: LearningPath[] = [];

    // Create foundational path (beginner skills)
    const foundationalSkills = skills.filter(skill => 
      (skill.difficulty_level || 1) <= 2
    ).slice(0, 8);

    if (foundationalSkills.length > 0) {
      paths.push({
        id: 'foundational',
        name: 'Foundation Skills',
        nodes: foundationalSkills.map(s => `skill-${s.id}`),
        edges: [],
        estimatedDuration: '8-12 weeks',
        difficulty: 'beginner',
        prerequisites: []
      });
    }

    // Create career step paths
    const sortedSteps = [...careerSteps].sort((a, b) => (a.level || 1) - (b.level || 1));
    
    sortedSteps.forEach((step, index) => {
      const stepSkills = stepSkillMappings
        .filter(m => m.step_id === step.id)
        .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
        .slice(0, 6) // Top 6 most important skills
        .map(m => `skill-${m.skill_id}`);

      if (stepSkills.length > 0) {
        paths.push({
          id: `step-${step.id}`,
          name: step.title,
          nodes: [step.id, ...stepSkills],
          edges: stepSkills.map(skillId => `edge-${step.id}-${skillId}`),
          estimatedDuration: step.estimated_duration || '4-6 weeks',
          difficulty: (step.level || 1) <= 2 ? 'beginner' : 
                     (step.level || 1) <= 4 ? 'intermediate' : 'advanced',
          prerequisites: step.prerequisites || []
        });
      }
    });

    // Create specialization paths (advanced skills)
    const advancedSkills = skills.filter(skill => 
      (skill.difficulty_level || 1) >= 4
    );

    const specializations = ['Cloud', 'DevOps', 'Leadership', 'Database'];
    specializations.forEach(specialization => {
      const specSkills = advancedSkills.filter(skill => 
        skill.category === specialization
      );

      if (specSkills.length >= 3) {
        paths.push({
          id: `specialization-${specialization.toLowerCase()}`,
          name: `${specialization} Specialization`,
          nodes: specSkills.slice(0, 5).map(s => `skill-${s.id}`),
          edges: [],
          estimatedDuration: '12-16 weeks',
          difficulty: 'advanced',
          prerequisites: ['foundational']
        });
      }
    });

    return paths;
  }, [careerSteps, skills, stepSkillMappings]);

  // Calculate recommended path based on user progress
  const getRecommendedPath = useCallback((): LearningPath | null => {
    if (!userProgress || userProgress.length === 0) {
      return learningPaths.find(p => p.id === 'foundational') || null;
    }

    const completedSkills = userProgress.filter(p => p.status === 'completed').length;
    const inProgressSkills = userProgress.filter(p => p.status === 'in_progress').length;

    // Beginner: start with foundation
    if (completedSkills < 3) {
      return learningPaths.find(p => p.id === 'foundational') || null;
    }

    // Intermediate: focus on career steps
    if (completedSkills < 10) {
      const availableStepPaths = learningPaths.filter(p => 
        p.id.startsWith('step-') && 
        p.prerequisites.every(prereq => 
          learningPaths.find(lp => lp.id === prereq)?.nodes.every(nodeId =>
            userProgress.find(up => `skill-${up.skillId}` === nodeId)?.status === 'completed'
          )
        )
      );
      return availableStepPaths[0] || null;
    }

    // Advanced: choose specialization
    const availableSpecializations = learningPaths.filter(p => 
      p.id.startsWith('specialization-') &&
      p.prerequisites.every(prereq => 
        learningPaths.find(lp => lp.id === prereq)?.nodes.every(nodeId =>
          userProgress.find(up => `skill-${up.skillId}` === nodeId)?.status === 'completed'
        )
      )
    );

    return availableSpecializations[0] || null;
  }, [learningPaths, userProgress]);

  // Apply path highlighting to nodes and edges
  const highlightPath = useCallback((
    nodes: Node[], 
    edges: Edge[], 
    pathId: string | null
  ): { nodes: Node[], edges: Edge[] } => {
    if (!pathId) return { nodes, edges };

    const selectedPath = learningPaths.find(p => p.id === pathId);
    if (!selectedPath) return { nodes, edges };

    const highlightedNodes = nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: selectedPath.nodes.includes(node.id) ? 1 : 0.3,
        filter: selectedPath.nodes.includes(node.id) ? 
          'drop-shadow(0 0 8px var(--primary))' : 'none',
        transform: selectedPath.nodes.includes(node.id) ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s ease'
      },
      data: {
        ...node.data,
        isHighlighted: selectedPath.nodes.includes(node.id),
        pathInfo: selectedPath.nodes.includes(node.id) ? {
          pathName: selectedPath.name,
          difficulty: selectedPath.difficulty,
          estimatedDuration: selectedPath.estimatedDuration
        } : null
      }
    }));

    const highlightedEdges = edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: selectedPath.edges.includes(edge.id) || 
                selectedPath.nodes.includes(edge.source) && selectedPath.nodes.includes(edge.target) ? 1 : 0.2,
        strokeWidth: selectedPath.edges.includes(edge.id) || 
                    selectedPath.nodes.includes(edge.source) && selectedPath.nodes.includes(edge.target) ? 3 : 1,
        stroke: selectedPath.edges.includes(edge.id) || 
               selectedPath.nodes.includes(edge.source) && selectedPath.nodes.includes(edge.target) ? 
               'hsl(var(--primary))' : edge.style?.stroke,
      },
      animated: selectedPath.edges.includes(edge.id) || 
               selectedPath.nodes.includes(edge.source) && selectedPath.nodes.includes(edge.target)
    }));

    return { nodes: highlightedNodes, edges: highlightedEdges };
  }, [learningPaths]);

  // Get path progress
  const getPathProgress = useCallback((pathId: string): number => {
    const path = learningPaths.find(p => p.id === pathId);
    if (!path || !userProgress) return 0;

    const completedNodes = path.nodes.filter(nodeId => {
      const skillId = nodeId.replace('skill-', '');
      return userProgress.find(p => p.skillId === skillId)?.status === 'completed';
    }).length;

    return path.nodes.length > 0 ? completedNodes / path.nodes.length : 0;
  }, [learningPaths, userProgress]);

  return {
    learningPaths,
    getRecommendedPath,
    highlightPath,
    getPathProgress
  };
};