-- COMPLETE REBUILD: Phase 1 - Database Architecture Overhaul
-- This implements the research-specified unified graph database schema

-- Drop existing conflicting tables to start fresh
DROP TABLE IF EXISTS career_graph_edges CASCADE;
DROP TABLE IF EXISTS pivot_points CASCADE;
DROP TABLE IF EXISTS user_career_progress CASCADE;
DROP TABLE IF EXISTS user_cri_scores CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS project_skills CASCADE;
DROP TABLE IF EXISTS certification_skills CASCADE;

-- Projects table - missing from current schema
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_time_hours INTEGER DEFAULT 0,
  project_type TEXT CHECK (project_type IN ('portfolio', 'practice', 'professional', 'open_source')),
  github_url TEXT,
  demo_url TEXT,
  skills_demonstrated TEXT[], -- Array of skill names for quick reference
  technologies TEXT[], -- Tech stack used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Certifications table - missing from current schema  
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) DEFAULT 0,
  validity_years INTEGER,
  exam_url TEXT,
  prep_time_hours INTEGER DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  skills_validated TEXT[], -- Array of skill names
  industry_recognition TEXT CHECK (industry_recognition IN ('entry', 'professional', 'expert')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CORE: Unified Career Graph Edges - the foundation of the research architecture
CREATE TABLE career_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL CHECK (from_type IN ('job', 'skill', 'step', 'course', 'project', 'certification')),
  from_id UUID NOT NULL,
  to_type TEXT NOT NULL CHECK (to_type IN ('job', 'skill', 'step', 'course', 'project', 'certification')),
  to_id UUID NOT NULL,
  edge_type TEXT NOT NULL CHECK (edge_type IN ('requires', 'unlocks', 'teaches', 'demonstrates', 'validates', 'next_role', 'pivot', 'prerequisite', 'substitution', 'leads_to', 'strengthens')),
  
  -- Weighted properties from research
  importance_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (importance_weight >= 0 AND importance_weight <= 10),
  time_cost_hours INTEGER DEFAULT 0,
  monetary_cost DECIMAL(10,2) DEFAULT 0,
  difficulty_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (difficulty_multiplier >= 0.1 AND difficulty_multiplier <= 5.0),
  
  -- Advanced features
  substitution_group_id UUID, -- For OR logic (Course A OR Project B → Skill X)
  pivot_via TEXT, -- "via MBA", "via certification", etc.
  success_rate DECIMAL(5,2), -- Market success rate for this path
  roi_score DECIMAL(5,2), -- Return on investment score
  
  -- Metadata
  reasoning TEXT, -- Why this relationship exists
  data_source TEXT, -- Where this relationship came from
  last_validated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(from_type, from_id, to_type, to_id, edge_type)
);

-- Pivot Points table for explicit career transition analysis
CREATE TABLE pivot_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_job_id UUID REFERENCES career_paths(id) ON DELETE CASCADE,
  to_job_id UUID REFERENCES career_paths(id) ON DELETE CASCADE,
  pivot_type TEXT CHECK (pivot_type IN ('role_bridge', 'skill_bridge', 'education_bridge', 'certification_bridge', 'lateral_move', 'industry_switch')),
  
  -- Pivot analysis metrics
  pivot_mechanism TEXT, -- "via MBA", "via bootcamp", "via certification"
  skill_overlap_percentage DECIMAL(5,2) CHECK (skill_overlap_percentage >= 0 AND skill_overlap_percentage <= 100),
  estimated_transition_time TEXT,
  estimated_cost DECIMAL(10,2),
  success_rate DECIMAL(5,2) CHECK (success_rate >= 0 AND success_rate <= 100),
  roi_score DECIMAL(5,2),
  
  -- Market data
  average_salary_change DECIMAL(10,2), -- Expected salary change
  market_demand_score DECIMAL(3,2), -- How in-demand is this transition
  
  reasoning TEXT,
  intermediate_roles TEXT[], -- Suggested stepping stone roles
  required_skills TEXT[], -- Skills needed for transition
  recommended_courses UUID[], -- Course recommendations
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(from_job_id, to_job_id, pivot_type)
);

-- User Career Progress - tracks individual user progress through the graph
CREATE TABLE user_career_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('job', 'skill', 'step', 'course', 'project', 'certification')),
  node_id UUID NOT NULL,
  
  -- Progress tracking
  status TEXT NOT NULL CHECK (status IN ('locked', 'available', 'in_progress', 'completed', 'verified', 'expired')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- CRI contribution
  cri_contribution DECIMAL(5,2) DEFAULT 0 CHECK (cri_contribution >= 0 AND cri_contribution <= 100),
  importance_to_goal DECIMAL(3,2) DEFAULT 1.0,
  
  -- Verification and tracking
  completion_date TIMESTAMP WITH TIME ZONE,
  verification_method TEXT CHECK (verification_method IN ('self_reported', 'certificate', 'portfolio', 'assessment', 'mentor_verified')),
  verification_url TEXT, -- Link to certificate, portfolio, etc.
  
  -- User notes and planning
  notes TEXT,
  priority_level INTEGER CHECK (priority_level >= 1 AND priority_level <= 5),
  target_completion_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, node_type, node_id)
);

-- Career Readiness Index - core metric from research
CREATE TABLE user_cri_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_job_id UUID REFERENCES career_paths(id) ON DELETE CASCADE,
  
  -- CRI calculation components
  current_cri_score DECIMAL(5,2) DEFAULT 0 CHECK (current_cri_score >= 0 AND current_cri_score <= 100),
  required_cri_score DECIMAL(5,2) DEFAULT 75, -- Threshold for job readiness
  
  -- Breakdown by category
  skill_completion_percentage DECIMAL(5,2) DEFAULT 0,
  step_completion_percentage DECIMAL(5,2) DEFAULT 0,
  project_completion_percentage DECIMAL(5,2) DEFAULT 0,
  certification_completion_percentage DECIMAL(5,2) DEFAULT 0,
  experience_score DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  experience_years DECIMAL(3,1) DEFAULT 0,
  readiness_level TEXT CHECK (readiness_level IN ('beginner', 'developing', 'ready', 'overqualified')),
  estimated_time_to_ready TEXT, -- "6 months", "1 year", etc.
  
  -- Recommendations
  next_priority_items TEXT[], -- What to focus on next
  blocking_factors TEXT[], -- What's preventing progress
  
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, target_job_id)
);

-- Project-Skill mapping with demonstration levels
CREATE TABLE project_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  demonstration_level TEXT CHECK (demonstration_level IN ('uses', 'applies', 'demonstrates', 'masters')),
  importance_weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, skill_id)
);

-- Certification-Skill mapping with validation levels
CREATE TABLE certification_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID REFERENCES certifications(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  validation_level TEXT CHECK (validation_level IN ('covers', 'validates', 'certifies', 'specializes')),
  importance_weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(certification_id, skill_id)
);

-- Critical indexes for graph traversal performance
CREATE INDEX idx_career_graph_edges_from ON career_graph_edges(from_type, from_id);
CREATE INDEX idx_career_graph_edges_to ON career_graph_edges(to_type, to_id);
CREATE INDEX idx_career_graph_edges_type ON career_graph_edges(edge_type);
CREATE INDEX idx_career_graph_edges_weight ON career_graph_edges(importance_weight DESC);
CREATE INDEX idx_career_graph_edges_substitution ON career_graph_edges(substitution_group_id) WHERE substitution_group_id IS NOT NULL;
CREATE INDEX idx_user_progress_user ON user_career_progress(user_id);
CREATE INDEX idx_user_progress_node ON user_career_progress(node_type, node_id);
CREATE INDEX idx_user_progress_status ON user_career_progress(status);
CREATE INDEX idx_user_cri_user_job ON user_cri_scores(user_id, target_job_id);
CREATE INDEX idx_pivot_points_jobs ON pivot_points(from_job_id, to_job_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE pivot_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_career_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cri_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_skills ENABLE ROW LEVEL SECURITY;

-- Public read policies for reference data
CREATE POLICY public_read_projects ON projects FOR SELECT USING (true);
CREATE POLICY public_read_certifications ON certifications FOR SELECT USING (true);
CREATE POLICY public_read_edges ON career_graph_edges FOR SELECT USING (true);
CREATE POLICY public_read_pivots ON pivot_points FOR SELECT USING (true);
CREATE POLICY public_read_project_skills ON project_skills FOR SELECT USING (true);
CREATE POLICY public_read_cert_skills ON certification_skills FOR SELECT USING (true);

-- User-specific policies
CREATE POLICY user_progress_own ON user_career_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_cri_own ON user_cri_scores FOR ALL USING (auth.uid() = user_id);

-- Service role policies
CREATE POLICY service_role_all_projects ON projects FOR ALL USING (true);
CREATE POLICY service_role_all_certifications ON certifications FOR ALL USING (true);
CREATE POLICY service_role_all_edges ON career_graph_edges FOR ALL USING (true);
CREATE POLICY service_role_all_pivots ON pivot_points FOR ALL USING (true);
CREATE POLICY service_role_all_progress ON user_career_progress FOR ALL USING (true);
CREATE POLICY service_role_all_cri ON user_cri_scores FOR ALL USING (true);
CREATE POLICY service_role_all_project_skills ON project_skills FOR ALL USING (true);
CREATE POLICY service_role_all_cert_skills ON certification_skills FOR ALL USING (true);