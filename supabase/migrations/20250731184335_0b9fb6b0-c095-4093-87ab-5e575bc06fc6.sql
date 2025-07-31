-- Phase 1: Data Architecture Foundation - Schema Enhancement (Final)
-- Enhance career_graph_nodes for unified semantic layering

-- Add new columns to career_graph_nodes for enhanced functionality
ALTER TABLE career_graph_nodes 
ADD COLUMN IF NOT EXISTS location_multipliers jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS substitution_group_id uuid,
ADD COLUMN IF NOT EXISTS prerequisite_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS skill_validation_type text CHECK (skill_validation_type IN ('course', 'project', 'certification', 'experience', 'assessment')),
ADD COLUMN IF NOT EXISTS success_rate numeric DEFAULT 0.8 CHECK (success_rate >= 0 AND success_rate <= 1),
ADD COLUMN IF NOT EXISTS market_demand_score numeric DEFAULT 0.5 CHECK (market_demand_score >= 0 AND market_demand_score <= 1),
ADD COLUMN IF NOT EXISTS trending_score numeric DEFAULT 0.5 CHECK (trending_score >= 0 AND trending_score <= 1),
ADD COLUMN IF NOT EXISTS industry_alignment jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS salary_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visa_requirements jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS certification_body text,
ADD COLUMN IF NOT EXISTS expiry_period_months integer,
ADD COLUMN IF NOT EXISTS platform_url text,
ADD COLUMN IF NOT EXISTS instructor_rating numeric CHECK (instructor_rating >= 0 AND instructor_rating <= 5),
ADD COLUMN IF NOT EXISTS has_hands_on_projects boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_rate numeric DEFAULT 0.7 CHECK (completion_rate >= 0 AND completion_rate <= 1);

-- Update node_type to include all semantic types
ALTER TABLE career_graph_nodes 
DROP CONSTRAINT IF EXISTS career_graph_nodes_node_type_check;

ALTER TABLE career_graph_nodes 
ADD CONSTRAINT career_graph_nodes_node_type_check 
CHECK (node_type IN ('job', 'skill', 'course', 'project', 'certification', 'step'));

-- Enhance career_graph_edges for semantic relationships
ALTER TABLE career_graph_edges
ADD COLUMN IF NOT EXISTS semantic_strength numeric DEFAULT 0.5 CHECK (semantic_strength >= 0 AND semantic_strength <= 1),
ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS is_validated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_source text,
ADD COLUMN IF NOT EXISTS industry_specific boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS skill_transfer_rate numeric DEFAULT 0.7 CHECK (skill_transfer_rate >= 0 AND skill_transfer_rate <= 1),
ADD COLUMN IF NOT EXISTS location_specific boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
ADD COLUMN IF NOT EXISTS alternative_paths uuid[] DEFAULT '{}';

-- Update edge_type to include existing and new semantic relationships
ALTER TABLE career_graph_edges 
DROP CONSTRAINT IF EXISTS career_graph_edges_edge_type_check;

ALTER TABLE career_graph_edges 
ADD CONSTRAINT career_graph_edges_edge_type_check 
CHECK (edge_type IN (
  -- Existing types
  'requires', 'teaches', 'supports', 'qualifies_for',
  -- New semantic types
  'unlocks', 'next_role', 'pivot_to', 'demonstrates_skill', 
  'validates_skill', 'prerequisite', 'substitutes_for', 
  'leads_to', 'enhances', 'specializes', 'certifies', 
  'prepares_for', 'builds_on'
));

-- Create substitution groups table for alternative learning paths
CREATE TABLE IF NOT EXISTS substitution_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  group_type text NOT NULL CHECK (group_type IN ('skill_acquisition', 'role_preparation', 'certification_prep')),
  skill_target_id uuid REFERENCES career_graph_nodes(id),
  alternative_nodes uuid[] NOT NULL DEFAULT '{}',
  minimum_alternatives integer DEFAULT 1,
  recommended_combination text,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on substitution_groups
ALTER TABLE substitution_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view substitution groups" ON substitution_groups 
FOR SELECT USING (true);

CREATE POLICY "Service role can manage substitution groups" ON substitution_groups 
FOR ALL USING (true);

-- Create career progression paths table for structured learning sequences
CREATE TABLE IF NOT EXISTS career_progression_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_node_id uuid REFERENCES career_graph_nodes(id),
  target_node_id uuid REFERENCES career_graph_nodes(id),
  path_nodes jsonb NOT NULL DEFAULT '[]', -- Ordered sequence of node IDs
  total_estimated_hours integer DEFAULT 0,
  total_estimated_cost numeric DEFAULT 0,
  difficulty_progression text[] DEFAULT '{}',
  success_metrics jsonb DEFAULT '{}',
  industry_focus text,
  experience_level text CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),
  location_optimized text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on career_progression_paths
ALTER TABLE career_progression_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view career progression paths" ON career_progression_paths 
FOR SELECT USING (true);

CREATE POLICY "Service role can manage career progression paths" ON career_progression_paths 
FOR ALL USING (true);

-- Create location-specific career metrics table
CREATE TABLE IF NOT EXISTS location_career_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id),
  career_node_id uuid REFERENCES career_graph_nodes(id),
  metric_type text NOT NULL CHECK (metric_type IN ('salary', 'demand', 'growth', 'competition', 'visa_score')),
  metric_value numeric NOT NULL,
  data_source text DEFAULT 'market_research',
  confidence_level numeric DEFAULT 0.7 CHECK (confidence_level >= 0 AND confidence_level <= 1),
  last_updated timestamptz DEFAULT now(),
  seasonal_adjustment numeric DEFAULT 1.0,
  trend_direction text CHECK (trend_direction IN ('increasing', 'stable', 'decreasing')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(location_id, career_node_id, metric_type)
);

-- Enable RLS on location_career_metrics
ALTER TABLE location_career_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view location career metrics" ON location_career_metrics 
FOR SELECT USING (true);

CREATE POLICY "Service role can manage location career metrics" ON location_career_metrics 
FOR ALL USING (true);

-- Create semantic validation table for AI-powered content validation
CREATE TABLE IF NOT EXISTS semantic_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid REFERENCES career_graph_nodes(id),
  edge_id uuid REFERENCES career_graph_edges(id),
  validation_type text NOT NULL CHECK (validation_type IN ('content_accuracy', 'prerequisite_logic', 'skill_relevance', 'market_alignment')),
  validation_status text NOT NULL CHECK (validation_status IN ('pending', 'validated', 'flagged', 'rejected')),
  confidence_score numeric DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_notes text,
  validated_by text, -- 'ai_system', 'human_expert', 'market_data'
  validated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on semantic_validations
ALTER TABLE semantic_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view semantic validations" ON semantic_validations 
FOR SELECT USING (true);

CREATE POLICY "Service role can manage semantic validations" ON semantic_validations 
FOR ALL USING (true);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_node_type ON career_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_category ON career_graph_nodes(category);
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_substitution_group ON career_graph_nodes(substitution_group_id);
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_semantic_tags ON career_graph_nodes USING GIN(semantic_tags);
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_prerequisite_ids ON career_graph_nodes USING GIN(prerequisite_ids);

CREATE INDEX IF NOT EXISTS idx_career_graph_edges_edge_type ON career_graph_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_career_graph_edges_from_type_id ON career_graph_edges(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_career_graph_edges_to_type_id ON career_graph_edges(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_career_graph_edges_substitution_group ON career_graph_edges(substitution_group_id);

CREATE INDEX IF NOT EXISTS idx_substitution_groups_skill_target ON substitution_groups(skill_target_id);
CREATE INDEX IF NOT EXISTS idx_substitution_groups_alternatives ON substitution_groups USING GIN(alternative_nodes);

CREATE INDEX IF NOT EXISTS idx_location_career_metrics_location ON location_career_metrics(location_id);
CREATE INDEX IF NOT EXISTS idx_location_career_metrics_career_node ON location_career_metrics(career_node_id);
CREATE INDEX IF NOT EXISTS idx_location_career_metrics_type ON location_career_metrics(metric_type);