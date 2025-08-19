export interface ProofProject {
  id: string;
  user_id: string;
  track_id?: string;
  title: string;
  description?: string;
  project_type: 'personal' | 'course' | 'certification' | 'challenge';
  status: 'planning' | 'in_progress' | 'completed' | 'paused';
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  estimated_hours: number;
  github_url?: string;
  demo_url?: string;
  completion_percentage: number;
  skills_to_validate: string[];
  validation_criteria: any[];
  project_data: Record<string, any>;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  proof_project_milestones?: ProjectMilestone[];
  proof_project_skills?: ProjectSkill[];
}

export interface ValidationCriteria {
  skill: string;
  requirement: string;
  completed: boolean;
}

export interface ProjectSkill {
  id: string;
  project_id: string;
  skill_name: string;
  validation_level: 'basic' | 'intermediate' | 'advanced';
  is_primary: boolean;
  created_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  milestone_order: number;
  status: 'pending' | 'in_progress' | 'completed';
  completed_at?: string;
  created_at: string;
}

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  estimated_hours: number;
  skills_to_validate: string[];
  project_type: 'personal' | 'course' | 'certification' | 'challenge';
  template_data: {
    milestones: Omit<ProjectMilestone, 'id' | 'project_id' | 'created_at'>[];
    validation_criteria: ValidationCriteria[];
    recommended_tools: string[];
    learning_resources: Array<{
      title: string;
      url: string;
      type: 'docs' | 'tutorial' | 'video' | 'article';
    }>;
  };
}