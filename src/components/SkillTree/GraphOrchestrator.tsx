import React, { useMemo, useCallback } from 'react';
import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

export const useGraphOrchestrator = () => {
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
    graphLayout,
    userProgress,
    pivotRecommendations
  } = useSkillTree();

  // Calculate layout parameters based on graph type
  const layoutParams = useMemo(() => {
    const LEVEL_HEIGHT = graphLayout.direction === 'vertical' ? 300 : 200;
    const LEVEL_WIDTH = graphLayout.direction === 'horizontal' ? 400 : 300;
    const NODE_SPACING = 50;
    
    return { LEVEL_HEIGHT, LEVEL_WIDTH, NODE_SPACING };
  }, [graphLayout]);

  // Node generation factories
  const createStepNodes = useCallback((stepsByLevel: Record<number, any[]>) => {
    const nodes: Node[] = [];
    const { LEVEL_HEIGHT, LEVEL_WIDTH, NODE_SPACING } = layoutParams;

    Object.entries(stepsByLevel).forEach(([level, steps]) => {
      const levelNum = parseInt(level);
      const baseY = graphLayout.direction === 'vertical' ? levelNum * LEVEL_HEIGHT : 0;
      const baseX = graphLayout.direction === 'horizontal' ? levelNum * LEVEL_WIDTH : 0;

      steps.forEach((step, index) => {
        const offsetX = graphLayout.direction === 'vertical' 
          ? (index - (steps.length - 1) / 2) * (300 + NODE_SPACING)
          : baseX;
        const offsetY = graphLayout.direction === 'horizontal'
          ? (index - (steps.length - 1) / 2) * (200 + NODE_SPACING)
          : baseY;

        const stepProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.stepId === step.id) : null;
        
        nodes.push({
          id: step.id,
          type: 'careerStep',
          position: { x: offsetX, y: offsetY },
          data: {
            ...step,
            isCompleted: stepProgress?.status === 'completed',
            isInProgress: stepProgress?.status === 'in_progress',
            progress: stepProgress,
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
          },
        });
      });
    });

    return nodes;
  }, [stepSkillMappings, skills, userProgress, displayControls.showProgress, layoutParams, graphLayout]);

  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    const skillCategories = [...new Set(skills.map(s => s.category))];
    
    skillCategories.forEach((category, catIndex) => {
      const categorySkills = skills.filter(s => s.category === category);
      
      categorySkills.forEach((skill, skillIndex) => {
        const x = (skillIndex - (categorySkills.length - 1) / 2) * 250;
        const y = -200 - (catIndex * 120);
        
        const skillProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.skillId === skill.id) : null;
        
        nodes.push({
          id: `skill-${skill.id}`,
          type: 'skill',
          position: { x, y },
          data: {
            ...skill,
            isCompleted: skillProgress?.status === 'completed',
            progress: skillProgress,
          } as Record<string, unknown>,
        });
      });
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress]);

  const createCourseNodes = useCallback(() => {
    if (!displayControls.showCourses) return [];
    
    return courses.map((course, index) => ({
      id: `course-${course.id}`,
      type: 'course',
      position: { x: index * 200 - (courses.length * 100), y: -400 },
      data: { ...course } as Record<string, unknown>,
    }));
  }, [courses, displayControls.showCourses]);

  const createProjectNodes = useCallback(() => {
    if (!displayControls.showProjects) return [];
    
    return projects.map((project, index) => ({
      id: `project-${project.id}`,
      type: 'project',
      position: { x: index * 250 - (projects.length * 125), y: -600 },
      data: { ...project } as Record<string, unknown>,
    }));
  }, [projects, displayControls.showProjects]);

  const createCertificationNodes = useCallback(() => {
    if (!displayControls.showCertifications) return [];
    
    return certifications.map((cert, index) => ({
      id: `cert-${cert.id}`,
      type: 'certification',
      position: { x: index * 200 - (certifications.length * 100), y: -800 },
      data: { ...cert } as Record<string, unknown>,
    }));
  }, [certifications, displayControls.showCertifications]);

  const createJobNodes = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];

    const maxLevel = Math.max(...careerSteps.map(s => s.level));
    const jobY = graphLayout.direction === 'vertical' ? (maxLevel + 1) * layoutParams.LEVEL_HEIGHT : 0;
    
    return [{
      id: `job-${selectedPath.id}`,
      type: 'job',
      position: { x: 0, y: jobY },
      data: {
        title: selectedPath.title,
        description: selectedPath.description || '',
        level: selectedPath.level || 'Senior',
        industry: selectedPath.industry || 'Technology',
        averageSalary: selectedPath.average_salary || 120000,
        roiScore: selectedPath.roi_score || 8.5,
        growthOutlook: selectedPath.growth_outlook || 'Excellent',
        requiredSkillIds: skills.slice(0, 8).map(s => s.id),
        isGoal: true
      } as Record<string, unknown>,
    }];
  }, [displayControls.showJobs, careerPaths, selectedCareerPath, careerSteps, skills, graphLayout, layoutParams]);

  const createPivotNodes = useCallback(() => {
    if (!displayControls.showPivots || !pivotRecommendations?.length) return [];
    
    return pivotRecommendations.map((pivot, index) => ({
      id: `pivot-${index}`,
      type: 'job',
      position: { x: (index - (pivotRecommendations.length - 1) / 2) * 350, y: -300 },
      data: {
        title: pivot.career_title,
        description: pivot.reasoning || '',
        level: 'Pivot Option',
        roiScore: pivot.roi_score,
        estimatedTime: pivot.estimated_time,
        sharedSkills: pivot.shared_skills,
        missingSkills: pivot.missing_skills,
        isPivot: true
      } as Record<string, unknown>,
    }));
  }, [displayControls.showPivots, pivotRecommendations]);

  // Edge generation
  const createEdges = useCallback((nodes: Node[]) => {
    const edges: Edge[] = [];

    // Step prerequisite edges
    careerSteps.forEach(step => {
      step.prerequisites?.forEach(prereqId => {
        const isUnlocked = !step.prerequisites || 
          step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
        
        edges.push({
          id: `${prereqId}-${step.id}`,
          source: prereqId,
          target: step.id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            stroke: isUnlocked ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            strokeWidth: isUnlocked ? 2 : 1,
            opacity: isUnlocked ? 1 : 0.5
          },
          data: { label: 'prerequisite', unlocked: isUnlocked }
        });
      });
    });

    // Skill to step edges
    if (displayControls.showSkills) {
      stepSkillMappings.forEach(mapping => {
        const importance = mapping.importance_score || 1;
        const opacity = Math.max(0.3, importance / 5);
        
        edges.push({
          id: `skill-${mapping.skill_id}-${mapping.step_id}`,
          source: `skill-${mapping.skill_id}`,
          target: mapping.step_id,
          type: 'smoothstep',
          style: { 
            stroke: 'hsl(var(--muted-foreground))',
            strokeWidth: 1,
            opacity
          },
          data: { importance }
        });
      });
    }

    // Course to skill edges (smart connections)
    if (displayControls.showCourses) {
      courses.forEach(course => {
        course.skill_tags?.forEach(skillTag => {
          const matchingSkill = skills.find(skill => 
            skill.name.toLowerCase().includes(skillTag.toLowerCase()) ||
            skillTag.toLowerCase().includes(skill.name.toLowerCase())
          );
          
          if (matchingSkill) {
            edges.push({
              id: `course-${course.id}-skill-${matchingSkill.id}`,
              source: `course-${course.id}`,
              target: `skill-${matchingSkill.id}`,
              type: 'smoothstep',
              style: { 
                stroke: 'hsl(var(--blue-500))',
                strokeWidth: 1,
                opacity: 0.6
              },
              data: { label: 'teaches' }
            });
          }
        });
      });
    }

    return edges;
  }, [careerSteps, userProgress, stepSkillMappings, displayControls, courses, skills]);

  // Main orchestration function
  const generateGraph = useCallback(() => {
    const stepsByLevel = careerSteps.reduce((acc, step) => {
      if (!acc[step.level]) acc[step.level] = [];
      acc[step.level].push(step);
      return acc;
    }, {} as Record<number, any[]>);

    const allNodes = [
      ...createStepNodes(stepsByLevel),
      ...createSkillNodes(),
      ...createCourseNodes(),
      ...createProjectNodes(),
      ...createCertificationNodes(),
      ...createJobNodes(),
      ...createPivotNodes(),
    ];

    const allEdges = createEdges(allNodes);

    return { nodes: allNodes, edges: allEdges };
  }, [
    careerSteps,
    createStepNodes,
    createSkillNodes,
    createCourseNodes,
    createProjectNodes,
    createCertificationNodes,
    createJobNodes,
    createPivotNodes,
    createEdges
  ]);

  return {
    generateGraph,
    layoutParams
  };
};