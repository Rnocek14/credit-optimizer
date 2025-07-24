import React, { useMemo, useCallback } from 'react';
import { Node, Edge, MarkerType, Position } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';
import { useForceDirectedLayout } from './ForceDirectedLayout';

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

  // Dynamic layout calculator based on enabled content
  const layoutParams = useMemo(() => {
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 120;
    const MIN_SPACING_X = 60;
    const MIN_SPACING_Y = 100;
    const LAYER_GAP = 150; // Minimum gap between different layer types
    
    // Calculate active layers and their requirements
    const activeLayers = [];
    let currentY = 50; // Start from bottom
    
    // Skills layer (foundation)
    if (displayControls.showSkills) {
      const skillCategories = [...new Set(skills.map(s => s.category))];
      const maxSkillsPerRow = Math.min(8, skillCategories.length); // Limit skills per row
      activeLayers.push({
        type: 'skills',
        y: currentY,
        height: Math.ceil(skillCategories.length / maxSkillsPerRow) * (NODE_HEIGHT + MIN_SPACING_Y)
      });
      currentY += activeLayers[activeLayers.length - 1].height + LAYER_GAP;
    }
    
    // Courses layer
    if (displayControls.showCourses) {
      const coursesPerRow = Math.min(6, courses.length);
      activeLayers.push({
        type: 'courses', 
        y: currentY,
        height: Math.ceil(courses.length / coursesPerRow) * (NODE_HEIGHT + MIN_SPACING_Y)
      });
      currentY += activeLayers[activeLayers.length - 1].height + LAYER_GAP;
    }
    
    // Projects layer
    if (displayControls.showProjects) {
      activeLayers.push({
        type: 'projects',
        y: currentY,
        height: NODE_HEIGHT + MIN_SPACING_Y
      });
      currentY += activeLayers[activeLayers.length - 1].height + LAYER_GAP;
    }
    
    // Certifications layer
    if (displayControls.showCertifications) {
      activeLayers.push({
        type: 'certifications',
        y: currentY,
        height: NODE_HEIGHT + MIN_SPACING_Y
      });
      currentY += activeLayers[activeLayers.length - 1].height + LAYER_GAP;
    }
    
    // Career steps layer (dynamic height based on levels)
    const maxLevel = careerSteps.length > 0 ? Math.max(...careerSteps.map(s => s.level)) : 0;
    if (careerSteps.length > 0) {
      activeLayers.push({
        type: 'careerSteps',
        y: currentY,
        height: (maxLevel + 1) * (NODE_HEIGHT + MIN_SPACING_Y)
      });
      currentY += activeLayers[activeLayers.length - 1].height + LAYER_GAP;
    }
    
    // Jobs layer (at the top)
    if (displayControls.showJobs) {
      activeLayers.push({
        type: 'jobs',
        y: currentY,
        height: NODE_HEIGHT + MIN_SPACING_Y
      });
      currentY += activeLayers[activeLayers.length - 1].height;
    }
    
    // Pivot layer (side by side with jobs)
    if (displayControls.showPivots) {
      const jobLayer = activeLayers.find(l => l.type === 'jobs');
      activeLayers.push({
        type: 'pivots',
        y: jobLayer ? jobLayer.y - 50 : currentY,
        height: NODE_HEIGHT + MIN_SPACING_Y
      });
    }
    
    return { 
      NODE_WIDTH, 
      NODE_HEIGHT, 
      MIN_SPACING_X, 
      MIN_SPACING_Y, 
      LAYER_GAP,
      activeLayers,
      totalHeight: currentY
    };
  }, [graphLayout, displayControls, skills, courses, projects, certifications, careerSteps]);

  const createStepNodes = useCallback((stepsByLevel: Record<number, any[]>) => {
    const nodes: Node[] = [];
    
    // Simple grid positioning - force layout will handle the rest
    let nodeIndex = 0;
    Object.entries(stepsByLevel).forEach(([level, steps]) => {
      steps.forEach((step) => {
        const stepProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.stepId === step.id) : null;
        const isCompleted = stepProgress?.status === 'completed';
        const isInProgress = stepProgress?.status === 'in_progress';
        
        const prerequisitesMet = !step.prerequisites?.length || 
          step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
        
        nodes.push({
          id: step.id,
          type: 'careerStep',
          position: { x: (nodeIndex % 10) * 200, y: Math.floor(nodeIndex / 10) * 150 }, // Simple grid
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
        nodeIndex++;
      });
    });

    return nodes;
  }, [stepSkillMappings, skills, userProgress, displayControls.showProgress]);

  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    let nodeIndex = 0;
    
    skills.forEach((skill) => {
      const skillProgress = displayControls.showProgress ? 
        userProgress?.find(p => p.skillId === skill.id) : null;
      const isCompleted = skillProgress?.status === 'completed';
      
      const difficultyLevel = skill.difficulty_level || 1;
      const estimatedWeeks = difficultyLevel <= 2 ? '1-2 weeks' : 
                            difficultyLevel <= 4 ? '2-4 weeks' : '4-8 weeks';
      
      nodes.push({
        id: `skill-${skill.id}`,
        type: 'skill',
        position: { x: (nodeIndex % 12) * 160, y: 50 + Math.floor(nodeIndex / 12) * 130 }, // Simple grid
        data: {
          ...skill,
          isCompleted,
          isLocked: false,
          progress: skillProgress,
          difficultyLevel: difficultyLevel <= 2 ? 'beginner' : 
                         difficultyLevel <= 4 ? 'intermediate' : 'advanced',
          estimatedWeeks,
          trackCategory: skill.category,
          isFoundational: ['Programming', 'Framework', 'Tools'].includes(skill.category),
        } as Record<string, unknown>,
      });
      nodeIndex++;
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress]);

  const createCourseNodes = useCallback(() => {
    if (!displayControls.showCourses) return [];
    
    const { NODE_WIDTH, MIN_SPACING_X, MIN_SPACING_Y, activeLayers } = layoutParams;
    const courseLayer = activeLayers.find(l => l.type === 'courses');
    if (!courseLayer) return [];
    
    const coursesPerRow = 6;
    
    return courses.map((course, index) => {
      const row = Math.floor(index / coursesPerRow);
      const col = index % coursesPerRow;
      const rowCourses = courses.slice(row * coursesPerRow, (row + 1) * coursesPerRow);
      
      const x = (col - (rowCourses.length - 1) / 2) * (NODE_WIDTH + MIN_SPACING_X);
      const y = courseLayer.y + (row * (NODE_WIDTH + MIN_SPACING_Y));
      
      return {
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
      };
    });
  }, [courses, displayControls.showCourses, layoutParams]);

  const createProjectNodes = useCallback(() => {
    if (!displayControls.showProjects) return [];
    
    const { NODE_WIDTH, MIN_SPACING_X, activeLayers } = layoutParams;
    const projectLayer = activeLayers.find(l => l.type === 'projects');
    if (!projectLayer) return [];
    
    return projects.map((project, index) => ({
      id: `project-${project.id}`,
      type: 'project',
      position: { 
        x: (index - (projects.length - 1) / 2) * (NODE_WIDTH + MIN_SPACING_X), 
        y: projectLayer.y 
      },
      data: { 
        ...project,
        estimatedWeeks: project.difficulty === 'advanced' ? '8-16 weeks' : 
                       project.difficulty === 'intermediate' ? '4-8 weeks' : '2-4 weeks',
        difficultyLevel: project.difficulty || 'intermediate',
        isLocked: false,
      } as Record<string, unknown>,
    }));
  }, [projects, displayControls.showProjects]);

  const createCertificationNodes = useCallback(() => {
    if (!displayControls.showCertifications) return [];
    
    const { NODE_WIDTH, MIN_SPACING_X, activeLayers } = layoutParams;
    const certLayer = activeLayers.find(l => l.type === 'certifications');
    if (!certLayer) return [];
    
    return certifications.map((cert, index) => ({
      id: `cert-${cert.id}`,
      type: 'certification',
      position: { 
        x: (index - (certifications.length - 1) / 2) * (NODE_WIDTH + MIN_SPACING_X), 
        y: certLayer.y 
      },
      data: { 
        ...cert,
        estimatedWeeks: `${cert.exam_duration || '2-4 weeks'} prep`,
        difficultyLevel: cert.industry_recognition === 'high' ? 'advanced' : 'intermediate',
        isLocked: false,
      } as Record<string, unknown>,
    }));
  }, [certifications, displayControls.showCertifications, layoutParams]);

  const createJobNodes = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const { activeLayers } = layoutParams;
    const jobLayer = activeLayers.find(l => l.type === 'jobs');
    if (!jobLayer) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];
    
    return [{
      id: `job-${selectedPath.id}`,
      type: 'job',
      position: { x: 0, y: jobLayer.y },
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
    
    const { NODE_WIDTH, MIN_SPACING_X, activeLayers } = layoutParams;
    const pivotLayer = activeLayers.find(l => l.type === 'pivots');
    if (!pivotLayer) return [];
    
    return pivotRecommendations.map((pivot, index) => ({
      id: `pivot-${index}`,
      type: 'job', 
      position: { 
        x: (index - (pivotRecommendations.length - 1) / 2) * (NODE_WIDTH + MIN_SPACING_X), 
        y: pivotLayer.y 
      },
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

  const { applyForceDirectedLayout } = useForceDirectedLayout();

  // Main orchestration function
  const generateGraph = useCallback(() => {
    const stepsByLevel = careerSteps.reduce((acc, step) => {
      if (!acc[step.level]) acc[step.level] = [];
      acc[step.level].push(step);
      return acc;
    }, {} as Record<number, any[]>);

    const initialNodes = [
      ...createStepNodes(stepsByLevel),
      ...createSkillNodes(),
      ...createCourseNodes(),
      ...createProjectNodes(),
      ...createCertificationNodes(),
      ...createJobNodes(),
      ...createPivotNodes(),
    ];

    const allEdges = createEdges(initialNodes);

    // Apply force-directed layout to prevent overlapping
    const layoutedNodes = applyForceDirectedLayout({
      nodes: initialNodes,
      edges: allEdges,
      width: 2000,
      height: 1500,
      iterations: 100
    });

    return { nodes: layoutedNodes, edges: allEdges };
  }, [
    careerSteps,
    createStepNodes,
    createSkillNodes,
    createCourseNodes,
    createProjectNodes,
    createCertificationNodes,
    createJobNodes,
    createPivotNodes,
    createEdges,
    applyForceDirectedLayout
  ]);

  return {
    generateGraph,
    layoutParams
  };
};