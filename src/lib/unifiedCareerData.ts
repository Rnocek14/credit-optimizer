import { supabase } from '@/integrations/supabase/client';

export interface UnifiedCareerData {
  skills: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    difficulty_level: number;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    description: string;
    level: string;
    industry: string;
    averageSalary: number;
    roiScore: number;
    growthOutlook: string;
    requiredSkillIds: string[];
  }>;
  courses: Array<{
    id: string;
    title: string;
    description: string;
    platform: string;
    cost: string;
    difficulty: string;
    skillTags: string[];
    url?: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    estimated_time: string;
    skills_demonstrated: string[];
    project_type: string;
  }>;
  certifications: Array<{
    id: string;
    title: string;
    issuer: string;
    description: string;
    cost: string;
    validity: string;
    skills_validated: string[];
  }>;
  careerSteps: Array<{
    id: string;
    title: string;
    description: string;
    level: number;
    isTerminal: boolean;
    prerequisites: string[];
    skills: Array<{ id: string; name: string; category: string; importance: number }>;
  }>;
}

export interface CareerRelationship {
  from: string;
  to: string;
  type: 'prerequisite' | 'learningPath' | 'careerPath' | 'validation';
  weight?: number;
}

export const fetchUnifiedCareerData = async (careerPathId?: string): Promise<UnifiedCareerData> => {
  // Fetch skills
  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('*')
    .order('name');

  if (skillsError) throw skillsError;

  // Fetch career paths (jobs)
  const { data: careerPaths, error: careerPathsError } = await supabase
    .from('career_paths')
    .select('*')
    .order('title');

  if (careerPathsError) throw careerPathsError;

  // Fetch recommended courses with skill mappings
  const { data: courses, error: coursesError } = await supabase
    .from('recommended_courses')
    .select(`
      *,
      course_skill_map (
        skill_id,
        skills (
          id,
          name,
          category
        )
      )
    `)
    .eq('active', true)
    .order('title');

  if (coursesError) throw coursesError;

  // Fetch skill relationships
  const { data: skillBranches, error: skillBranchesError } = await supabase
    .from('skill_branches')
    .select('*');

  if (skillBranchesError) throw skillBranchesError;

  // Fetch career steps if specific path is selected
  let careerSteps: any[] = [];
  if (careerPathId) {
    const { data: steps, error: stepsError } = await supabase
      .from('career_steps')
      .select(`
        *,
        career_step_skills (
          skill_id,
          importance_score,
          skills (
            id,
            name,
            category
          )
        )
      `)
      .eq('career_path_id', careerPathId)
      .order('step_order');

    if (stepsError) throw stepsError;
    careerSteps = steps || [];
  }

  // Transform data into unified format
  const transformedData: UnifiedCareerData = {
    skills: skills?.map(skill => ({
      id: skill.id,
      name: skill.name,
      category: skill.category || 'General',
      description: skill.description || '',
      difficulty_level: skill.difficulty_level || 1,
    })) || [],

    jobs: careerPaths?.map(job => ({
      id: job.id,
      title: job.title,
      description: job.summary || '',
      level: job.level || 'Entry',
      industry: job.industry || 'Technology',
      averageSalary: job.average_salary || 50000, // Fixed: camelCase for React components
      roiScore: Number(job.roi_score) || 5, // Fixed: camelCase for React components
      growthOutlook: job.growth_outlook || 'Stable', // Fixed: camelCase for React components
      requiredSkillIds: job.required_skill_ids || [], // Fixed: camelCase for React components
    })) || [],

    courses: courses?.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      platform: course.platform,
      cost: course.cost || 'Free',
      difficulty: course.difficulty || 'Beginner',
      skillTags: course.skill_tags || [], // Fixed: camelCase for React components
      url: course.url,
    })) || [],

    projects: generateMockProjects(skills || []),
    certifications: generateMockCertifications(skills || []),
    
    careerSteps: careerSteps.map(step => ({
      id: step.id,
      title: step.title,
      description: step.description || '',
      level: 1, // Will be calculated based on prerequisites
      isTerminal: step.is_terminal || false, // Fixed: camelCase for React components
      prerequisites: step.prerequisites || [],
      skills: step.career_step_skills?.map((css: any) => ({
        id: css.skills.id,
        name: css.skills.name,
        category: css.skills.category,
        importance: css.importance_score || 1,
      })) || [],
    })),
  };

  // Store relationship data for generateCareerRelationships
  (transformedData as any).relationshipData = {
    skillBranches: skillBranches || [],
    courseSkillMaps: courses?.flatMap(c => c.course_skill_map || []) || [],
    careerStepSkills: careerSteps.flatMap(s => s.career_step_skills || [])
  };

  return transformedData;
};

export const generateCareerRelationships = (data: UnifiedCareerData): CareerRelationship[] => {
  const relationships: CareerRelationship[] = [];
  const relationshipData = (data as any).relationshipData;

  if (!relationshipData) {
    console.warn('No relationship data found, falling back to synthetic relationships');
    return generateSyntheticRelationships(data);
  }

  const { skillBranches, courseSkillMaps, careerStepSkills } = relationshipData;

  console.log('🔗 Generating relationships from database:', {
    skillBranches: skillBranches.length,
    courseSkillMaps: courseSkillMaps.length,
    careerStepSkills: careerStepSkills.length
  });

  // 1. Filter and prioritize skill prerequisite relationships
  const filteredSkillBranches = skillBranches
    .filter((branch: any) => branch.recommended) // Only show recommended connections
    .slice(0, Math.min(skillBranches.length, 50)); // Limit to 50 strongest connections

  filteredSkillBranches.forEach((branch: any) => {
    relationships.push({
      from: branch.from_skill_id,
      to: branch.to_skill_id,
      type: 'prerequisite',
      weight: 5, // Higher weight for recommended branches
    });
  });

  // 2. Limit course-skill relationships to prevent overcrowding
  const limitedCourseSkillMaps = courseSkillMaps
    .slice(0, Math.min(courseSkillMaps.length, 30)); // Limit to 30 connections

  limitedCourseSkillMaps.forEach((mapping: any) => {
    relationships.push({
      from: mapping.skill_id,
      to: mapping.course_id,
      type: 'learningPath',
      weight: 3,
    });
  });

  // 3. Filter career step-skill relationships by importance
  const importantStepSkills = careerStepSkills
    .filter((stepSkill: any) => (stepSkill.importance_score || 1) >= 3) // Only high importance
    .slice(0, Math.min(careerStepSkills.length, 40)); // Limit to 40 connections

  importantStepSkills.forEach((stepSkill: any) => {
    relationships.push({
      from: stepSkill.skill_id,
      to: stepSkill.step_id,
      type: 'careerPath',
      weight: stepSkill.importance_score || 3,
    });
  });

  // 4. Generate career path relationships using job required skills
  data.jobs.forEach(job => {
    job.requiredSkillIds.forEach(skillId => {
      relationships.push({
        from: skillId,
        to: job.id,
        type: 'careerPath',
        weight: 5,
      });
    });
  });

  // 5. Connect career steps with prerequisites
  data.careerSteps.forEach(step => {
    step.prerequisites.forEach(prereqId => {
      const prereqStep = data.careerSteps.find(s => s.id === prereqId);
      if (prereqStep) {
        relationships.push({
          from: prereqId,
          to: step.id,
          type: 'prerequisite',
          weight: 4,
        });
      }
    });

    // Connect terminal steps to jobs
    if (step.isTerminal) {
      const relatedJobs = data.jobs.filter(job => 
        job.requiredSkillIds.some(skillId => 
          step.skills.some(s => s.id === skillId)
        )
      );
      
      relatedJobs.forEach(job => {
        relationships.push({
          from: step.id,
          to: job.id,
          type: 'careerPath',
          weight: 5,
        });
      });
    }
  });

  // 6. Add some project and certification connections (keeping these synthetic for now)
  addProjectAndCertificationRelationships(data, relationships);

  console.log('✅ Generated relationships:', {
    total: relationships.length,
    byType: {
      prerequisite: relationships.filter(r => r.type === 'prerequisite').length,
      learningPath: relationships.filter(r => r.type === 'learningPath').length,
      careerPath: relationships.filter(r => r.type === 'careerPath').length,
      validation: relationships.filter(r => r.type === 'validation').length,
    }
  });

  return relationships;
};

// Fallback function for synthetic relationships
const generateSyntheticRelationships = (data: UnifiedCareerData): CareerRelationship[] => {
  const relationships: CareerRelationship[] = [];

  // Basic skill prerequisite relationships based on difficulty
  data.skills.forEach(skill => {
    const prerequisites = data.skills.filter(s => 
      s.category === skill.category && 
      s.difficulty_level < skill.difficulty_level
    );
    
    prerequisites.forEach(prereq => {
      relationships.push({
        from: prereq.id,
        to: skill.id,
        type: 'prerequisite',
        weight: 1,
      });
    });
  });

  return relationships;
};

// Helper function to add project and certification relationships
const addProjectAndCertificationRelationships = (data: UnifiedCareerData, relationships: CareerRelationship[]) => {
  // Connect courses to projects
  data.projects.forEach(project => {
    project.skills_demonstrated.forEach(skillName => {
      const relatedCourse = data.courses.find(c => 
        c.skillTags.some(tag => 
          tag.toLowerCase().includes(skillName.toLowerCase())
        )
      );
      
      if (relatedCourse) {
        relationships.push({
          from: relatedCourse.id,
          to: project.id,
          type: 'learningPath',
          weight: 3,
        });
      }
    });
  });

  // Connect projects to certifications
  data.certifications.forEach(cert => {
    cert.skills_validated.forEach(skillName => {
      const relatedProject = data.projects.find(p => 
        p.skills_demonstrated.some(s => 
          s.toLowerCase().includes(skillName.toLowerCase())
        )
      );
      
      if (relatedProject) {
        relationships.push({
          from: relatedProject.id,
          to: cert.id,
          type: 'validation',
          weight: 3,
        });
      }
    });
  });
};

// Mock data generators for projects and certifications
const generateMockProjects = (skills: any[]) => {
  const projectTemplates = [
    {
      id: 'proj-1',
      title: 'Personal Portfolio Website',
      description: 'Build a responsive portfolio website showcasing your projects and skills',
      difficulty: 'beginner',
      estimated_time: '2-3 weeks',
      skills_demonstrated: ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
      project_type: 'portfolio',
    },
    {
      id: 'proj-2',
      title: 'E-commerce API',
      description: 'Create a RESTful API for an e-commerce platform with authentication',
      difficulty: 'intermediate',
      estimated_time: '4-6 weeks',
      skills_demonstrated: ['Node.js', 'Express', 'Database Design', 'API Development'],
      project_type: 'portfolio',
    },
    {
      id: 'proj-3',
      title: 'Machine Learning Dashboard',
      description: 'Build a data visualization dashboard for ML model insights',
      difficulty: 'advanced',
      estimated_time: '6-8 weeks',
      skills_demonstrated: ['Python', 'Machine Learning', 'Data Visualization', 'React'],
      project_type: 'portfolio',
    },
    {
      id: 'proj-4',
      title: 'Mobile Task Manager',
      description: 'Develop a cross-platform mobile app for task management',
      difficulty: 'intermediate',
      estimated_time: '5-7 weeks',
      skills_demonstrated: ['React Native', 'Mobile Development', 'State Management'],
      project_type: 'practice',
    },
  ];

  return projectTemplates;
};

const generateMockCertifications = (skills: any[]) => {
  const certificationTemplates = [
    {
      id: 'cert-1',
      title: 'AWS Cloud Practitioner',
      issuer: 'Amazon Web Services',
      description: 'Foundational understanding of AWS Cloud',
      cost: '$100',
      validity: '3 years',
      skills_validated: ['Cloud Computing', 'AWS', 'DevOps'],
    },
    {
      id: 'cert-2',
      title: 'Google Analytics Certified',
      issuer: 'Google',
      description: 'Proficiency in Google Analytics',
      cost: 'Free',
      validity: '1 year',
      skills_validated: ['Analytics', 'Data Analysis', 'Marketing'],
    },
    {
      id: 'cert-3',
      title: 'Certified Kubernetes Administrator',
      issuer: 'Cloud Native Computing Foundation',
      description: 'Kubernetes administration skills',
      cost: '$300',
      validity: '3 years',
      skills_validated: ['Kubernetes', 'Container Orchestration', 'DevOps'],
    },
  ];

  return certificationTemplates;
};