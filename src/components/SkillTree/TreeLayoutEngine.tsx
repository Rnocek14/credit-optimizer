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

  // Create hierarchical skill tree with proper branching
  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    
    // Build dependency tree structure
    const skillDependencies = new Map();
    const skillsByLevel = new Map();
    
    // Analyze skills and their relationships through career steps
    skills.forEach(skill => {
      const relatedMappings = stepSkillMappings.filter(m => m.skill_id === skill.id);
      const steps = relatedMappings.map(m => careerSteps.find(s => s.id === m.step_id)).filter(Boolean);
      
      // Determine skill level based on connected career steps
      const avgStepLevel = steps.length > 0 
        ? steps.reduce((sum, step) => sum + step.level, 0) / steps.length 
        : 1;
      
      const skillLevel = Math.max(1, Math.floor(avgStepLevel));
      
      if (!skillsByLevel.has(skillLevel)) {
        skillsByLevel.set(skillLevel, []);
      }
      skillsByLevel.get(skillLevel).push({
        ...skill,
        level: skillLevel,
        relatedSteps: steps,
        category: skill.category || 'Programming'
      });
    });

    // Layout skills in a tree structure
    const maxLevel = Math.max(...Array.from(skillsByLevel.keys()));
    const rootX = 100;
    const levelSpacing = 300;
    
    skillsByLevel.forEach((levelSkills, level) => {
      const x = rootX + (level - 1) * levelSpacing;
      
      // Group by category within level
      const categorizedSkills = levelSkills.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = [];
        acc[skill.category].push(skill);
        return acc;
      }, {});
      
      let totalSkillsPlaced = 0;
      
      Object.entries(categorizedSkills).forEach(([category, categorySkills]) => {
        const categoryColor = skillCategories[category]?.color || '#3B82F6';
        const categorySize = (categorySkills as any[]).length;
        
        // Create branching pattern within category
        const branchHeight = categorySize * 80;
        const startY = totalSkillsPlaced * 80 - branchHeight / 2;
        
        (categorySkills as any[]).forEach((skill, index) => {
          const skillProgress = displayControls.showProgress ? 
            userProgress?.find(p => p.skillId === skill.id) : null;
          const isCompleted = skillProgress?.status === 'completed';
          const isInProgress = skillProgress?.status === 'in_progress';
          
          // Create natural branching offsets
          const branchOffset = (index - categorySize / 2) * 80;
          const y = startY + branchOffset + (level * 50); // Add slight level variation
          
          // Add some randomness for organic feel while keeping structure
          const xOffset = (Math.sin(index * 0.5) * 30);
          const yOffset = (Math.cos(index * 0.3) * 20);
          
          const difficultyLevel = skill.difficulty_level || 1;
          
          nodes.push({
            id: `skill-${skill.id}`,
            type: 'skill',
            position: { 
              x: x + xOffset, 
              y: y + yOffset 
            },
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
              isFoundational: level === 1,
              treeLevel: level,
            } as Record<string, unknown>,
          });
        });
        
        totalSkillsPlaced += categorySize;
      });
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress, skillCategories, stepSkillMappings, careerSteps]);

  // Create career step nodes in tree formation
  const createCareerStepNodes = useCallback(() => {
    const nodes: Node[] = [];
    
    // Build career step tree based on prerequisites
    const stepHierarchy = new Map();
    const processedSteps = new Set();
    
    // Find root steps (no prerequisites)
    const rootSteps = careerSteps.filter(step => !step.prerequisites?.length);
    const baseX = 1000; // Position after skills
    
    // Recursive function to position steps in tree structure
    const positionStep = (step: any, parentX: number, parentY: number, level: number, siblingIndex: number, totalSiblings: number) => {
      if (processedSteps.has(step.id)) return;
      
      const stepProgress = displayControls.showProgress ? 
        userProgress?.find(p => p.stepId === step.id) : null;
      const isCompleted = stepProgress?.status === 'completed';
      const isInProgress = stepProgress?.status === 'in_progress';
      
      const prerequisitesMet = !step.prerequisites?.length || 
        step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
      
      // Calculate position in tree
      const levelSpacing = 250;
      const siblingSpacing = 150;
      const x = parentX + levelSpacing;
      
      // Spread siblings vertically
      const totalHeight = (totalSiblings - 1) * siblingSpacing;
      const startY = parentY - totalHeight / 2;
      const y = startY + siblingIndex * siblingSpacing;
      
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
          treeLevel: level,
        } as Record<string, unknown>,
      });
      
      processedSteps.add(step.id);
      
      // Find children steps (steps that have this step as prerequisite)
      const childSteps = careerSteps.filter(childStep => 
        childStep.prerequisites?.includes(step.id)
      );
      
      // Recursively position children
      childSteps.forEach((childStep, index) => {
        positionStep(childStep, x, y, level + 1, index, childSteps.length);
      });
    };
    
    // Start with root steps
    rootSteps.forEach((rootStep, index) => {
      positionStep(rootStep, baseX, index * 200, 0, index, rootSteps.length);
    });

    return nodes;
  }, [careerSteps, stepSkillMappings, skills, userProgress, displayControls.showProgress]);

  // Create job goal node as the tree crown
  const createJobNode = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];
    
    // Position at the end of the career step tree
    const terminalSteps = careerSteps.filter(step => step.is_terminal);
    const avgTerminalX = terminalSteps.length > 0 
      ? terminalSteps.reduce((sum, step) => sum + 1500, 0) / terminalSteps.length 
      : 1700;
    
    return [{
      id: `job-${selectedPath.id}`,
      type: 'job',
      position: { x: avgTerminalX, y: 100 },
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
  }, [displayControls.showJobs, careerPaths, selectedCareerPath, skills, careerSteps]);

  // Create supporting content nodes organically placed
  const createSupportingNodes = useCallback(() => {
    const nodes: Node[] = [];

    // Courses - positioned near related skills
    if (displayControls.showCourses) {
      courses.forEach((course, index) => {
        // Find a skill this course might relate to
        const relatedSkillCategories = ['Programming', 'Framework', 'Tools'];
        const categoryIndex = index % relatedSkillCategories.length;
        const category = relatedSkillCategories[categoryIndex];
        
        // Position near skills of that category
        const x = 50 + (index * 120) + (Math.sin(index) * 30);
        const y = 400 + (index * 60) + (Math.cos(index) * 40);
        
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

    // Projects - positioned between skill levels
    if (displayControls.showProjects) {
      projects.forEach((project, index) => {
        const x = 600 + (index * 150) + (Math.sin(index * 1.5) * 50);
        const y = 200 + (index * 100) + (Math.cos(index * 1.2) * 60);
        
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

    // Certifications - positioned near career goals
    if (displayControls.showCertifications) {
      certifications.forEach((cert, index) => {
        const x = 1400 + (index * 120) + (Math.sin(index * 2) * 40);
        const y = -100 + (index * 80) + (Math.cos(index * 1.8) * 50);
        
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

    // Skill level progression - natural branching connections
    const skillNodes = nodes.filter(n => n.type === 'skill');
    const skillsByLevel = skillNodes.reduce((acc, node) => {
      const level = (node.data as any).treeLevel || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(node);
      return acc;
    }, {} as Record<number, Node[]>);

    // Connect skills showing natural progression
    for (let level = 1; level < 4; level++) {
      const currentLevelSkills = skillsByLevel[level] || [];
      const nextLevelSkills = skillsByLevel[level + 1] || [];
      
      currentLevelSkills.forEach(currentSkill => {
        // Find 1-2 related skills in next level
        const relatedSkills = nextLevelSkills
          .filter(nextSkill => (nextSkill.data as any).category === (currentSkill.data as any).category)
          .slice(0, 2);
        
        relatedSkills.forEach(nextSkill => {
          edges.push({
            id: `skill-progression-${currentSkill.id}-${nextSkill.id}`,
            source: currentSkill.id,
            target: nextSkill.id,
            type: 'smoothstep',
            style: {
              stroke: (currentSkill.data as any).categoryColor as string,
              strokeWidth: 1.5,
              opacity: 0.4,
              strokeDasharray: '2,2'
            }
          });
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