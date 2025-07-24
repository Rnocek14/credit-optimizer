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
    // New hierarchical layout: Foundation to Career Goals (bottom to top)
    const LEVEL_HEIGHT = graphLayout.direction === 'vertical' ? 200 : 150;
    const LEVEL_WIDTH = graphLayout.direction === 'horizontal' ? 350 : 250;
    const NODE_SPACING = 40;
    const TRACK_SPACING = 300; // Space between learning tracks
    
    return { LEVEL_HEIGHT, LEVEL_WIDTH, NODE_SPACING, TRACK_SPACING };
  }, [graphLayout]);

  // Node generation factories with new hierarchical approach
  const createStepNodes = useCallback((stepsByLevel: Record<number, any[]>) => {
    const nodes: Node[] = [];
    const { LEVEL_HEIGHT, LEVEL_WIDTH, NODE_SPACING } = layoutParams;

    Object.entries(stepsByLevel).forEach(([level, steps]) => {
      const levelNum = parseInt(level);
      // Career steps now positioned in upper levels (600+ for senior roles)
      const baseY = graphLayout.direction === 'vertical' ? 600 + (levelNum * LEVEL_HEIGHT) : 0;
      const baseX = graphLayout.direction === 'horizontal' ? levelNum * LEVEL_WIDTH : 0;

      steps.forEach((step, index) => {
        const offsetX = graphLayout.direction === 'vertical' 
          ? (index - (steps.length - 1) / 2) * (250 + NODE_SPACING)
          : baseX;
        const offsetY = graphLayout.direction === 'horizontal'
          ? (index - (steps.length - 1) / 2) * (150 + NODE_SPACING)
          : baseY;

        const stepProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.stepId === step.id) : null;
        const isCompleted = stepProgress?.status === 'completed';
        const isInProgress = stepProgress?.status === 'in_progress';
        
        // Check if prerequisites are met for unlock status
        const prerequisitesMet = !step.prerequisites?.length || 
          step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
        
        nodes.push({
          id: step.id,
          type: 'careerStep',
          position: { x: offsetX, y: offsetY },
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
    });

    return nodes;
  }, [stepSkillMappings, skills, userProgress, displayControls.showProgress, layoutParams, graphLayout]);

  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    const { TRACK_SPACING } = layoutParams;
    
    // Group skills by category and create learning tracks
    const skillCategories = [...new Set(skills.map(s => s.category))];
    const foundationalSkills = ['Programming', 'Framework', 'Tools'];
    const advancedSkills = ['Data', 'DevOps', 'Design', 'Testing'];
    
    skillCategories.forEach((category, catIndex) => {
      const categorySkills = skills.filter(s => s.category === category);
      const isFoundational = foundationalSkills.includes(category);
      const baseY = isFoundational ? 50 : 200; // Foundational skills at bottom
      
      categorySkills.forEach((skill, skillIndex) => {
        const trackX = (catIndex - (skillCategories.length - 1) / 2) * TRACK_SPACING;
        const x = trackX + (skillIndex - (categorySkills.length - 1) / 2) * 180;
        const y = baseY + (isFoundational ? 0 : 150);
        
        const skillProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.skillId === skill.id) : null;
        const isCompleted = skillProgress?.status === 'completed';
        
        // Determine difficulty and time estimates
        const difficultyLevel = skill.difficulty_level || 1;
        const estimatedWeeks = difficultyLevel <= 2 ? '1-2 weeks' : 
                              difficultyLevel <= 4 ? '2-4 weeks' : '4-8 weeks';
        
        nodes.push({
          id: `skill-${skill.id}`,
          type: 'skill',
          position: { x, y },
          data: {
            ...skill,
            isCompleted,
            isLocked: false, // Skills are generally available to learn
            progress: skillProgress,
            difficultyLevel: difficultyLevel <= 2 ? 'beginner' : 
                           difficultyLevel <= 4 ? 'intermediate' : 'advanced',
            estimatedWeeks,
            trackCategory: category,
            isFoundational,
          } as Record<string, unknown>,
        });
      });
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress]);

  const createCourseNodes = useCallback(() => {
    if (!displayControls.showCourses) return [];
    
    // Position courses in learning layer (300-400y)
    return courses.map((course, index) => ({
      id: `course-${course.id}`,
      type: 'course',
      position: { x: (index - (courses.length - 1) / 2) * 220, y: 350 },
      data: { 
        ...course,
        estimatedWeeks: course.difficulty === 'advanced' ? '6-12 weeks' : 
                       course.difficulty === 'intermediate' ? '3-6 weeks' : '1-3 weeks',
        difficultyLevel: course.difficulty || 'beginner',
        isLocked: false, // Courses generally available
      } as Record<string, unknown>,
    }));
  }, [courses, displayControls.showCourses]);

  const createProjectNodes = useCallback(() => {
    if (!displayControls.showProjects) return [];
    
    // Position projects in practice layer (450-550y)
    return projects.map((project, index) => ({
      id: `project-${project.id}`,
      type: 'project',
      position: { x: (index - (projects.length - 1) / 2) * 280, y: 500 },
      data: { 
        ...project,
        estimatedWeeks: project.difficulty === 'advanced' ? '8-16 weeks' : 
                       project.difficulty === 'intermediate' ? '4-8 weeks' : '2-4 weeks',
        difficultyLevel: project.difficulty || 'intermediate',
        isLocked: false, // Projects can be started when ready
      } as Record<string, unknown>,
    }));
  }, [projects, displayControls.showProjects]);

  const createCertificationNodes = useCallback(() => {
    if (!displayControls.showCertifications) return [];
    
    // Position certifications in validation layer (550-600y)  
    return certifications.map((cert, index) => ({
      id: `cert-${cert.id}`,
      type: 'certification',
      position: { x: (index - (certifications.length - 1) / 2) * 250, y: 580 },
      data: { 
        ...cert,
        estimatedWeeks: `${cert.exam_duration || '2-4 weeks'} prep`,
        difficultyLevel: cert.industry_recognition === 'high' ? 'advanced' : 'intermediate',
        isLocked: false, // Certs available when ready
      } as Record<string, unknown>,
    }));
  }, [certifications, displayControls.showCertifications]);

  const createJobNodes = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];

    const maxLevel = Math.max(...careerSteps.map(s => s.level));
    // Position career goals at the top (highest Y values)
    const jobY = graphLayout.direction === 'vertical' ? 800 + (maxLevel * 200) : 0;
    
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
        isGoal: true,
        estimatedWeeks: '2-5 years total',
        difficultyLevel: 'advanced',
      } as Record<string, unknown>,
    }];
  }, [displayControls.showJobs, careerPaths, selectedCareerPath, careerSteps, skills, graphLayout, layoutParams]);

  const createPivotNodes = useCallback(() => {
    if (!displayControls.showPivots || !pivotRecommendations?.length) return [];
    
    // Position pivot options near current career level
    return pivotRecommendations.map((pivot, index) => ({
      id: `pivot-${index}`,
      type: 'job', 
      position: { x: (index - (pivotRecommendations.length - 1) / 2) * 350, y: 750 },
      data: {
        title: pivot.career_title,
        description: pivot.reasoning || '',
        level: 'Pivot Option',
        roiScore: pivot.roi_score,
        estimatedTime: pivot.estimated_time,
        estimatedWeeks: pivot.estimated_time || '6-18 months',
        sharedSkills: pivot.shared_skills,
        missingSkills: pivot.missing_skills,
        isPivot: true,
        difficultyLevel: 'intermediate',
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