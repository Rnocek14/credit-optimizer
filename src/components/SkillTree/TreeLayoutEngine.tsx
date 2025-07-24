import { useCallback, useMemo } from 'react';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

export const useTreeLayoutEngine = () => {
  const {
    careerSteps,
    skills,
    courses,
    projects,
    certifications,
    stepSkillMappings,
    careerPaths,
    selectedCareerPath,
    displayControls,
    userProgress
  } = useSkillTree();

  // Define skill categories with simpler color mapping
  const skillCategories = useMemo(() => ({
    'Programming': { color: '#3B82F6', tier: 1 },
    'Framework': { color: '#10B981', tier: 1 },
    'Tools': { color: '#8B5CF6', tier: 2 },
    'Database': { color: '#F59E0B', tier: 2 },
    'Cloud': { color: '#06B6D4', tier: 3 },
    'DevOps': { color: '#EF4444', tier: 3 },
    'Soft Skills': { color: '#F59E0B', tier: 2 },
    'Leadership': { color: '#EC4899', tier: 4 }
  }), []);

  // Create hierarchical skill nodes - left to right progression
  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    
    // Group skills by category and tier
    const skillsByTier = skills.reduce((acc, skill) => {
      const category = skill.category || 'Programming';
      const tier = skillCategories[category]?.tier || 1;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push({ ...skill, category });
      return acc;
    }, {} as Record<number, any[]>);

    // Layout skills in vertical columns by tier (left to right progression)
    Object.entries(skillsByTier).forEach(([tierStr, tierSkills]) => {
      const tier = parseInt(tierStr);
      const x = 200 + (tier - 1) * 250; // Horizontal progression
      
      // Group by category within tier for vertical clustering
      const skillsByCategory = tierSkills.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = [];
        acc[skill.category].push(skill);
        return acc;
      }, {} as Record<string, any[]>);
      
      let yOffset = 0;
      Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
        const categoryColor = skillCategories[category]?.color || '#3B82F6';
        
        (categorySkills as any[]).forEach((skill, index) => {
          const skillProgress = displayControls.showProgress ? 
            userProgress?.find(p => p.skillId === skill.id) : null;
          const isCompleted = skillProgress?.status === 'completed';
          const isInProgress = skillProgress?.status === 'in_progress';
          
          const y = yOffset + index * 120;
          const difficultyLevel = skill.difficulty_level || 1;
          
          nodes.push({
            id: `skill-${skill.id}`,
            type: 'skill',
            position: { x, y },
            data: {
              ...skill,
              isCompleted,
              isInProgress,
              isLocked: false,
              progress: skillProgress,
              difficultyLevel: difficultyLevel <= 2 ? 'beginner' : 
                             difficultyLevel <= 4 ? 'intermediate' : 'advanced',
              estimatedWeeks: difficultyLevel <= 2 ? '1-2 weeks' : 
                             difficultyLevel <= 4 ? '2-4 weeks' : '4-8 weeks',
              trackCategory: category,
              categoryColor,
              isFoundational: tier === 1,
            } as Record<string, unknown>,
          });
        });
        
        yOffset += (categorySkills as any[]).length * 120 + 50; // Add spacing between categories
      });
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress, skillCategories]);

  // Create career step nodes - right side final column
  const createCareerStepNodes = useCallback(() => {
    const nodes: Node[] = [];
    
    // Sort steps by level and position them in final column
    const sortedSteps = [...careerSteps].sort((a, b) => a.level - b.level);
    const x = 1200; // Final column position
    
    sortedSteps.forEach((step, index) => {
      const y = index * 150;
      
      const stepProgress = displayControls.showProgress ? 
        userProgress?.find(p => p.stepId === step.id) : null;
      const isCompleted = stepProgress?.status === 'completed';
      const isInProgress = stepProgress?.status === 'in_progress';
      
      const prerequisitesMet = !step.prerequisites?.length || 
        step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
      
      nodes.push({
        id: step.id,
        type: 'careerStep',
        position: { x, y },
        data: {
          ...step,
          isCompleted,
          isInProgress,
          isLocked: !prerequisitesMet && !isCompleted && !isInProgress,
          progress: stepProgress,
          difficultyLevel: step.level > 3 ? 'advanced' : step.level > 1 ? 'intermediate' : 'beginner',
          estimatedWeeks: step.estimated_duration || '2-4 weeks',
          skills: stepSkillMappings
            .filter(m => m.step_id === step.id)
            .map(m => {
              const skill = skills.find(s => s.id === m.skill_id);
              const skillProgress = displayControls.showProgress ? 
                userProgress?.find(p => p.skillId === skill?.id) : null;
              return skill ? { 
                ...skill, 
                importance: m.importance_score,
                isCompleted: skillProgress?.status === 'completed',
                progress: skillProgress
              } : null;
            })
            .filter(Boolean),
        } as Record<string, unknown>,
      });
    });

    return nodes;
  }, [careerSteps, stepSkillMappings, skills, userProgress, displayControls.showProgress]);

  // Create job goal node at the far right
  const createJobNode = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];
    
    return [{
      id: `job-${selectedPath.id}`,
      type: 'job',
      position: { x: 1500, y: 100 }, // Far right position
      data: {
        title: selectedPath.title,
        description: selectedPath.description || '',
        level: selectedPath.level || 'Senior',
        industry: selectedPath.industry || 'Technology',
        averageSalary: selectedPath.average_salary || 120000,
        roiScore: selectedPath.roi_score || 8.5,
        growthOutlook: selectedPath.growth_outlook || 'Excellent',
        requiredSkillIds: skills.slice(0, 8).map(s => s.id),
        isGoal: true,
        estimatedWeeks: 'Career Goal',
        difficultyLevel: 'advanced',
      } as Record<string, unknown>,
    }];
  }, [displayControls.showJobs, careerPaths, selectedCareerPath, skills]);

  // Create supporting content nodes in dedicated rows
  const createSupportingNodes = useCallback(() => {
    const nodes: Node[] = [];

    // Courses - bottom row
    if (displayControls.showCourses) {
      courses.forEach((course, index) => {
        const x = 200 + (index * 200);
        const y = 600; // Bottom row
        
        nodes.push({
          id: `course-${course.id}`,
          type: 'course',
          position: { x, y },
          data: { 
            ...course,
            estimatedWeeks: course.difficulty === 'advanced' ? '6-12 weeks' : 
                           course.difficulty === 'intermediate' ? '3-6 weeks' : '1-3 weeks',
            difficultyLevel: course.difficulty || 'beginner',
            isLocked: false,
          } as Record<string, unknown>,
        });
      });
    }

    // Projects - middle row between skills and career steps
    if (displayControls.showProjects) {
      projects.forEach((project, index) => {
        const x = 800 + (index * 200);
        const y = 300;
        
        nodes.push({
          id: `project-${project.id}`,
          type: 'project',
          position: { x, y },
          data: { 
            ...project,
            estimatedWeeks: project.difficulty === 'advanced' ? '8-16 weeks' : 
                           project.difficulty === 'intermediate' ? '4-8 weeks' : '2-4 weeks',
            difficultyLevel: project.difficulty || 'intermediate',
            isLocked: false,
          } as Record<string, unknown>,
        });
      });
    }

    // Certifications - top row
    if (displayControls.showCertifications) {
      certifications.forEach((cert, index) => {
        const x = 800 + (index * 200);
        const y = -200; // Top row
        
        nodes.push({
          id: `cert-${cert.id}`,
          type: 'certification',
          position: { x, y },
          data: { 
            ...cert,
            estimatedWeeks: `${cert.exam_duration || '2-4 weeks'} prep`,
            difficultyLevel: cert.industry_recognition === 'high' ? 'advanced' : 'intermediate',
            isLocked: false,
          } as Record<string, unknown>,
        });
      });
    }

    return nodes;
  }, [displayControls, courses, projects, certifications]);

  // Create simple, clear progression edges
  const createTreeEdges = useCallback((nodes: Node[]) => {
    const edges: Edge[] = [];

    // Skill tier progression edges - show learning progression
    const skillNodes = nodes.filter(n => n.type === 'skill');
    const skillsByTier = skillNodes.reduce((acc, node) => {
      const category = node.data.category || 'Programming';
      const tier = skillCategories[category as keyof typeof skillCategories]?.tier || 1;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(node);
      return acc;
    }, {} as Record<number, Node[]>);

    // Connect skills across tiers to show progression
    for (let tier = 1; tier < 4; tier++) {
      const currentTierSkills = skillsByTier[tier] || [];
      const nextTierSkills = skillsByTier[tier + 1] || [];
      
      currentTierSkills.forEach(currentSkill => {
        nextTierSkills.forEach(nextSkill => {
          // Connect if they're related by category or importance
          if (currentSkill.data.category === nextSkill.data.category) {
            edges.push({
              id: `tier-${currentSkill.id}-${nextSkill.id}`,
              source: currentSkill.id,
              target: nextSkill.id,
              type: 'smoothstep',
              style: {
                stroke: currentSkill.data.categoryColor as string,
                strokeWidth: 2,
                opacity: 0.3
              }
            });
          }
        });
      });
    }

    // Step prerequisite edges - clear dependency lines
    careerSteps.forEach(step => {
      step.prerequisites?.forEach(prereqId => {
        const isUnlocked = !step.prerequisites || 
          step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
        
        edges.push({
          id: `${prereqId}-${step.id}`,
          source: prereqId,
          target: step.id,
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            stroke: isUnlocked ? '#10B981' : '#6B7280',
            strokeWidth: 3,
            opacity: isUnlocked ? 1 : 0.5
          },
          animated: isUnlocked
        });
      });
    });

    // Skills to career steps - important connections only
    if (displayControls.showSkills) {
      stepSkillMappings.forEach(mapping => {
        if (mapping.importance_score >= 7) { // Only show high-importance connections
          const skill = skills.find(s => s.id === mapping.skill_id);
          const categoryColor = skillCategories[skill?.category || 'Programming']?.color || '#3B82F6';
          
          edges.push({
            id: `skill-${mapping.skill_id}-${mapping.step_id}`,
            source: `skill-${mapping.skill_id}`,
            target: mapping.step_id,
            type: 'smoothstep',
            style: { 
              stroke: categoryColor,
              strokeWidth: 2,
              opacity: 0.6
            }
          });
        }
      });
    }

    // Career steps to job goal - final connections
    const jobNode = nodes.find(n => n.type === 'job');
    if (jobNode && displayControls.showJobs) {
      const terminalSteps = careerSteps.filter(step => step.is_terminal);
      terminalSteps.forEach(step => {
        edges.push({
          id: `step-${step.id}-${jobNode.id}`,
          source: step.id,
          target: jobNode.id,
          type: 'straight',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: '#10B981',
            strokeWidth: 4,
            opacity: 0.8
          },
          animated: true
        });
      });
    }

    return edges;
  }, [careerSteps, userProgress, stepSkillMappings, displayControls, skills, skillCategories]);

  // Main generation function
  const generateTreeLayout = useCallback(() => {
    const allNodes = [
      ...createJobNode(),
      ...createSkillNodes(),
      ...createCareerStepNodes(),
      ...createSupportingNodes(),
    ];

    const allEdges = createTreeEdges(allNodes);

    return { nodes: allNodes, edges: allEdges };
  }, [
    createJobNode,
    createSkillNodes,
    createCareerStepNodes,
    createSupportingNodes,
    createTreeEdges
  ]);

  return {
    generateTreeLayout,
    skillCategories
  };
};