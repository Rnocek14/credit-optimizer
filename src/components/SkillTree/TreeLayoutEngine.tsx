import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';
import { useConnectionEngine } from './ConnectionEngine';

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

  const { generateConnections } = useConnectionEngine();

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

  // Create skills layer - foundational layer
  const createSkillNodes = useCallback(() => {
    if (!displayControls.showSkills) return [];
    
    const nodes: Node[] = [];
    const skillsY = 600; // Skills layer position
    const skillSpacing = 180;
    
    // Group skills by category for better organization
    const skillsByCategory = skills.reduce((acc, skill) => {
      const category = skill.category || 'Programming';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, any[]>);
    
    let currentX = 100;
    
    Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
      const categoryColor = skillCategories[category]?.color || '#3B82F6';
      
      categorySkills.forEach((skill, index) => {
        const skillProgress = displayControls.showProgress ? 
          userProgress?.find(p => p.skillId === skill.id) : null;
        const isCompleted = skillProgress?.status === 'completed';
        const isInProgress = skillProgress?.status === 'in_progress';
        
        const difficultyLevel = skill.difficulty_level || 1;
        
        nodes.push({
          id: `skill-${skill.id}`,
          type: 'skill',
          position: { 
            x: currentX, 
            y: skillsY + (index * 100) 
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
          } as Record<string, unknown>,
        });
      });
      
      currentX += skillSpacing;
    });

    return nodes;
  }, [skills, displayControls.showSkills, displayControls.showProgress, userProgress, skillCategories]);

  // Create career steps layer - middle layer
  const createCareerStepNodes = useCallback(() => {
    const nodes: Node[] = [];
    const stepsY = 300; // Career steps layer position
    const stepSpacing = 200;
    
    // Sort career steps by level and order
    const sortedSteps = [...careerSteps].sort((a, b) => 
      (a.level || 1) - (b.level || 1)
    );
    
    sortedSteps.forEach((step, index) => {
      const stepProgress = displayControls.showProgress ? 
        userProgress?.find(p => p.stepId === step.id) : null;
      const isCompleted = stepProgress?.status === 'completed';
      const isInProgress = stepProgress?.status === 'in_progress';
      
      const prerequisitesMet = !step.prerequisites?.length || 
        step.prerequisites.every(id => userProgress?.find(p => p.stepId === id)?.status === 'completed');
      
      nodes.push({
        id: step.id,
        type: 'careerStep',
        position: { 
          x: 100 + (index * stepSpacing), 
          y: stepsY 
        },
        data: {
          ...step,
          isCompleted,
          isInProgress,
          isLocked: !prerequisitesMet && !isCompleted && !isInProgress,
          progress: stepProgress,
          difficultyLevel: (step.level || 1) > 3 ? 'advanced' : (step.level || 1) > 1 ? 'intermediate' : 'beginner',
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

  // Create job goal node - top layer
  const createJobNode = useCallback(() => {
    if (!displayControls.showJobs || !careerPaths.length) return [];
    
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return [];
    
    return [{
      id: `job-${selectedPath.id}`,
      type: 'job',
      position: { x: 600, y: 50 }, // Top center position
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

  // Create supporting content nodes - bottom layer
  const createSupportingNodes = useCallback(() => {
    const nodes: Node[] = [];
    const supportingY = 900; // Bottom layer position

    // Courses - foundational learning resources
    if (displayControls.showCourses) {
      courses.forEach((course, index) => {
        nodes.push({
          id: `course-${course.id}`,
          type: 'course',
          position: { x: 100 + (index * 180), y: supportingY },
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

    // Projects - practical applications
    if (displayControls.showProjects) {
      projects.forEach((project, index) => {
        nodes.push({
          id: `project-${project.id}`,
          type: 'project',
          position: { x: 100 + (index * 180), y: supportingY + 120 },
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

    // Certifications - validation credentials
    if (displayControls.showCertifications) {
      certifications.forEach((cert, index) => {
        nodes.push({
          id: `cert-${cert.id}`,
          type: 'certification',
          position: { x: 100 + (index * 180), y: supportingY + 240 },
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

  // Main generation function using new connection engine
  const generateTreeLayout = useCallback(() => {
    const allNodes = [
      ...createJobNode(),
      ...createSkillNodes(),
      ...createCareerStepNodes(),
      ...createSupportingNodes(),
    ];

    const allEdges = generateConnections(allNodes, []);

    return { nodes: allNodes, edges: allEdges };
  }, [
    createJobNode,
    createSkillNodes,
    createCareerStepNodes,
    createSupportingNodes,
    generateConnections
  ]);

  return {
    generateTreeLayout,
    skillCategories
  };
};