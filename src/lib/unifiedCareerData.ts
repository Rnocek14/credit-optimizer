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
    average_salary: number;
    roi_score: number;
    growth_outlook: string;
    required_skill_ids: string[];
  }>;
  courses: Array<{
    id: string;
    title: string;
    description: string;
    platform: string;
    cost: string;
    difficulty: string;
    skill_tags: string[];
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
    is_terminal: boolean;
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

  // Fetch recommended courses
  const { data: courses, error: coursesError } = await supabase
    .from('recommended_courses')
    .select('*')
    .eq('active', true)
    .order('title');

  if (coursesError) throw coursesError;

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
      average_salary: job.average_salary || 50000,
      roi_score: Number(job.roi_score) || 5,
      growth_outlook: job.growth_outlook || 'Stable',
      required_skill_ids: job.required_skill_ids || [],
    })) || [],

    courses: courses?.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      platform: course.platform,
      cost: course.cost || 'Free',
      difficulty: course.difficulty || 'Beginner',
      skill_tags: course.skill_tags || [],
      url: course.url,
    })) || [],

    projects: generateMockProjects(skills || []),
    certifications: generateMockCertifications(skills || []),
    
    careerSteps: careerSteps.map(step => ({
      id: step.id,
      title: step.title,
      description: step.description || '',
      level: 1, // Will be calculated based on prerequisites
      is_terminal: step.is_terminal || false,
      prerequisites: step.prerequisites || [],
      skills: step.career_step_skills?.map((css: any) => ({
        id: css.skills.id,
        name: css.skills.name,
        category: css.skills.category,
        importance: css.importance_score || 1,
      })) || [],
    })),
  };

  return transformedData;
};

export const generateCareerRelationships = (data: UnifiedCareerData): CareerRelationship[] => {
  const relationships: CareerRelationship[] = [];

  // 1. Generate prerequisite relationships between skills
  // (Based on difficulty levels and categories)
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

  // 2. Generate learning path relationships (skills -> courses -> projects)
  data.courses.forEach(course => {
    // Connect relevant skills to courses
    course.skill_tags.forEach(skillTag => {
      const matchingSkill = data.skills.find(s => 
        s.name.toLowerCase().includes(skillTag.toLowerCase()) ||
        s.category.toLowerCase().includes(skillTag.toLowerCase())
      );
      
      if (matchingSkill) {
        relationships.push({
          from: matchingSkill.id,
          to: course.id,
          type: 'learningPath',
          weight: 2,
        });
      }
    });
  });

  // 3. Connect courses to projects
  data.projects.forEach(project => {
    project.skills_demonstrated.forEach(skillName => {
      const relatedCourse = data.courses.find(c => 
        c.skill_tags.some(tag => 
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

  // 4. Generate career path relationships (skills/projects -> jobs)
  data.jobs.forEach(job => {
    job.required_skill_ids.forEach(skillId => {
      const skill = data.skills.find(s => s.id === skillId);
      if (skill) {
        relationships.push({
          from: skillId,
          to: job.id,
          type: 'careerPath',
          weight: 5,
        });
      }
    });

    // Connect advanced projects to jobs
    const relevantProjects = data.projects.filter(p => 
      p.project_type === 'portfolio' && 
      p.difficulty === 'advanced'
    );
    
    relevantProjects.forEach(project => {
      relationships.push({
        from: project.id,
        to: job.id,
        type: 'careerPath',
        weight: 4,
      });
    });
  });

  // 5. Generate validation relationships (projects -> certifications)
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

  // 6. Connect career steps
  data.careerSteps.forEach(step => {
    // Connect skills to career steps
    step.skills.forEach(skill => {
      relationships.push({
        from: skill.id,
        to: step.id,
        type: 'careerPath',
        weight: 3,
      });
    });

    // Connect prerequisites
    step.prerequisites.forEach(prereqId => {
      const prereqStep = data.careerSteps.find(s => s.id === prereqId);
      if (prereqStep) {
        relationships.push({
          from: prereqId,
          to: step.id,
          type: 'prerequisite',
          weight: 2,
        });
      }
    });

    // Connect terminal steps to jobs
    if (step.is_terminal) {
      const relatedJobs = data.jobs.filter(job => 
        job.required_skill_ids.some(skillId => 
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

  return relationships;
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