export interface SemanticNode {
  id: string;
  title: string;
  type: 'skill' | 'job' | 'course' | 'project' | 'certification' | 'step';
  metadata: {
    category?: string;
    difficulty?: number;
    xp_value?: number;
    duration_weeks?: number;
    cost?: number;
    location_relevance?: number;
    personalization_score?: number;
    confidence_score?: number;
  };
  substitutions?: SubstitutionOption[];
  adaptations?: NodeAdaptation[];
  position?: { x: number; y: number };
}

export interface SubstitutionOption {
  node_id: string;
  title: string;
  type: string;
  substitution_score: number;
  confidence_score?: number;
  cost_benefit_ratio: number;
  skill_equivalence: number;
  reasoning: string;
}

export interface NodeAdaptation {
  type: 'difficulty' | 'location' | 'cost' | 'time';
  original_value: any;
  adapted_value: any;
  reasoning: string;
}

export interface SemanticEdge {
  id: string;
  source: string;
  target: string;
  type: 'prerequisite' | 'leads_to' | 'alternative' | 'pivot' | 'substitution';
  metadata: {
    strength?: number;
    confidence?: number;
    skill_overlap?: number;
    transition_difficulty?: number;
  };
}

export interface SemanticPath {
  id: string;
  title: string;
  nodes: SemanticNode[];
  edges: SemanticEdge[];
  metadata: {
    personalization_score: number;
    time_feasibility: number;
    budget_feasibility: number;
    location_relevance: number;
    total_cost: number;
    total_duration: number;
    confidence_score: number;
  };
  pivot_opportunities?: PivotOpportunity[];
}

export interface PivotOpportunity {
  from_job_id: string;
  to_job_id: string;
  skill_overlap_percentage: number;
  bridge_skills: string[];
  transition_difficulty: number;
  roi_score: number;
  estimated_timeline: string;
}

export interface SemanticContext {
  user_skills: string[];
  preferred_locations: string[];
  budget_constraints?: number;
  time_constraints?: number;
  learning_preferences: string[];
  career_goals: string[];
}