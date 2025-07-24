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

  // Define skill categories and their positions in the tree
  const skillCategories = useMemo(() => ({
    'Programming': { 
      angle: 0, 
      color: 'hsl(var(--blue-500))',
      radius: 300,
      foundational: true 
    },
    'Framework': { 
      angle: 90, 
      color: 'hsl(var(--green-500))',
      radius: 320,
      foundational: true 
    },
    'Tools': { 
      angle: 180, 
      color: 'hsl(var(--purple-500))',
      radius: 340,
      foundational: true 
    },
    'Database': { 
      angle: 270, 
      color: 'hsl(var(--orange-500))',
      radius: 360,
      foundational: false 
    },
    'Cloud': { 
      angle: 45, 
      color: 'hsl(var(--cyan-500))',
      radius: 380,
      foundational: false 
    },
    'DevOps': { 
      angle: 135, 
      color: 'hsl(var(--red-500))',
      radius: 400,
      foundational: false 
    },
    'Soft Skills': { 
      angle: 225, 
      color: 'hsl(var(--yellow-500))',
      radius: 420,
      foundational: false 
    },
    'Leadership': { 
      angle: 315, 
      color: 'hsl(var(--pink-500))',
      radius: 440,
      foundational: false 
    }
  }), []);

  // Create tree-structured skill nodes
  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    const centerX = 0;
    const centerY = 0;
    
    // Group skills by category
    const skillsByCategory = skills.reduce((acc, skill) => {
      const category = skill.category || 'Programming';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
      const categoryConfig = skillCategories[category] || skillCategories['Programming'];
      const baseAngle = (categoryConfig.angle * Math.PI) / 180;
      const baseRadius = categoryConfig.radius;
      
      categorySkills.forEach((skill, index) => {
        const skillProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.skillId === skill.id) : null;
        const isCompleted = skillProgress?.status === 'completed';
        const isInProgress = skillProgress?.status === 'in_progress';
        
        // Arrange skills in a spiral within their category
        const angleOffset = (index * 0.3) - (categorySkills.length * 0.15);
        const radiusOffset = Math.floor(index / 4) * 60;
        const angle = baseAngle + angleOffset;
        const radius = baseRadius + radiusOffset;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const difficultyLevel = skill.difficulty_level || 1;
        
        nodes.push({
          id: `skill-${skill.id}`,
          type: 'skill',
          position: { x: x - 90, y: y - 60 }, // Center the node
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
            categoryColor: categoryConfig.color,
            isFoundational: categoryConfig.foundational,
          } as Record<string, unknown>,
        });
      });
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress, skillCategories]);

  // Create hierarchical career step nodes
  const createCareerStepNodes = useCallback(() => {
    const nodes: Node[] = [];
    const centerX = 0;
    const centerY = 0;
    
    // Group steps by level
    const stepsByLevel = careerSteps.reduce((acc, step) => {
      if (!acc[step.level]) acc[step.level] = [];
      acc[step.level].push(step);
      return acc;
    }, {} as Record<number, any[]>);

    Object.entries(stepsByLevel).forEach(([level, steps]) => {
      const levelNum = parseInt(level);
      const levelRadius = 600 + (levelNum * 150); // Career steps form outer rings
      
      steps.forEach((step, index) => {
        const angle = (index * (2 * Math.PI)) / steps.length;
        const x = centerX + Math.cos(angle) * levelRadius;
        const y = centerY + Math.sin(angle) * levelRadius;
        
        const stepProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.stepId === step.id) : null;
        const isCompleted = stepProgress?.status === 'completed';
        const isInProgress = stepProgress?.status === 'in_progress';
        
        const prerequisitesMet = !step.prerequisites?.length || 
          step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
        
        nodes.push({
          id: step.id,
          type: 'careerStep',
          position: { x: x - 100, y: y - 60 },
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
  }, [careerSteps, stepSkillMappings, skills, userProgress, displayControls.showProgress]);

  // Create job goal node at the center
  const createJobNode = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];
    
    return [{
      id: `job-${selectedPath.id}`,
      type: 'job',
      position: { x: -100, y: -60 }, // Center position
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

  // Create supporting content nodes (courses, projects, certifications)
  const createSupportingNodes = useCallback(() => {
    const nodes: Node[] = [];
    let courseIndex = 0;
    let projectIndex = 0;
    let certIndex = 0;

    // Courses - placed in inner rings around skills
    if (displayControls.showCourses) {
      courses.forEach((course, index) => {
        const angle = (index * (2 * Math.PI)) / courses.length;
        const radius = 200; // Inner ring
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        nodes.push({
          id: `course-${course.id}`,
          type: 'course',
          position: { x: x - 90, y: y - 60 },
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

    // Projects - placed between skill and career step rings
    if (displayControls.showProjects) {
      projects.forEach((project, index) => {
        const angle = (index * (2 * Math.PI)) / projects.length + Math.PI / 4; // Offset from courses
        const radius = 500;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        nodes.push({
          id: `project-${project.id}`,
          type: 'project',
          position: { x: x - 90, y: y - 60 },
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

    // Certifications - outer ring with career steps
    if (displayControls.showCertifications) {
      certifications.forEach((cert, index) => {
        const angle = (index * (2 * Math.PI)) / certifications.length + Math.PI / 2;
        const radius = 750;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        nodes.push({
          id: `cert-${cert.id}`,
          type: 'certification',
          position: { x: x - 90, y: y - 60 },
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

  // Create enhanced edges with better visual hierarchy
  const createTreeEdges = useCallback((nodes: Node[]) => {
    const edges: Edge[] = [];

    // Step prerequisite edges with enhanced styling
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
            strokeWidth: isUnlocked ? 3 : 1,
            opacity: isUnlocked ? 1 : 0.3,
            strokeDasharray: isUnlocked ? 'none' : '5,5'
          },
          animated: isUnlocked,
          data: { label: 'prerequisite', unlocked: isUnlocked }
        });
      });
    });

    // Skill to step connections - curved and color-coded
    if (displayControls.showSkills) {
      stepSkillMappings.forEach(mapping => {
        const skill = skills.find(s => s.id === mapping.skill_id);
        const importance = mapping.importance_score || 1;
        const category = skill?.category || 'Programming';
        const categoryColor = skillCategories[category]?.color || 'hsl(var(--muted-foreground))';
        
        edges.push({
          id: `skill-${mapping.skill_id}-${mapping.step_id}`,
          source: `skill-${mapping.skill_id}`,
          target: mapping.step_id,
          type: 'smoothstep',
          style: { 
            stroke: categoryColor,
            strokeWidth: Math.max(1, importance / 2),
            opacity: 0.6 + (importance / 10)
          },
          data: { importance, category }
        });
      });
    }

    // Job to career step connections - central goal connections
    const jobNode = nodes.find(n => n.type === 'job');
    if (jobNode && displayControls.showJobs) {
      careerSteps.forEach(step => {
        edges.push({
          id: `job-${jobNode.id}-${step.id}`,
          source: jobNode.id,
          target: step.id,
          type: 'smoothstep',
          style: {
            stroke: 'hsl(var(--primary))',
            strokeWidth: 2,
            opacity: 0.4,
            strokeDasharray: '3,3'
          },
          data: { label: 'career path' }
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