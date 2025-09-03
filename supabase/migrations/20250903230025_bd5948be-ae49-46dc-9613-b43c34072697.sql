-- Life Path Unified Career Graph Schema
-- Phase 0: Core data model for nodes, edges, and user paths

-- Life Path Nodes table - represents all entities in the career graph
CREATE TABLE IF NOT EXISTS public.life_path_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type TEXT NOT NULL CHECK (node_type IN ('skill', 'job', 'course', 'project', 'certification', 'step', 'exam')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Core attributes
  estimated_hours INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  credits INTEGER,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 3,
  
  -- Institutional info
  institution TEXT,
  provider TEXT,
  modality TEXT CHECK (modality IN ('online', 'in-person', 'hybrid', 'self-paced')) DEFAULT 'online',
  
  -- Status and validation
  active BOOLEAN DEFAULT true,
  validated BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Categorization
  category TEXT,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Prerequisites and outcomes
  prerequisite_ids UUID[] DEFAULT '{}',
  skill_outcomes TEXT[] DEFAULT '{}',
  
  -- Credit transfer specific
  credit_value INTEGER,
  ace_recommended BOOLEAN DEFAULT false,
  articulation_agreements TEXT[] DEFAULT '{}',
  
  -- Visualization position
  position_x INTEGER,
  position_y INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Life Path Edges table - represents relationships between nodes
CREATE TABLE IF NOT EXISTS public.life_path_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.life_path_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.life_path_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN (
    'requires', 'enables', 'substitutes', 'transfersTo', 'builds', 
    'pivot', 'ghost', 'alternative', 'stacksTo', 'enhances', 'creditTransfersTo'
  )),
  
  -- Multi-objective weights
  weight_time NUMERIC NOT NULL DEFAULT 1.0,
  weight_cost NUMERIC NOT NULL DEFAULT 1.0,
  weight_credit_loss NUMERIC NOT NULL DEFAULT 0,
  weight_difficulty NUMERIC NOT NULL DEFAULT 1.0,
  weight_roi NUMERIC NOT NULL DEFAULT 1.0,
  
  -- Credit transfer specific
  credit_transfer_rate NUMERIC CHECK (credit_transfer_rate >= 0 AND credit_transfer_rate <= 1),
  institutional_cap INTEGER,
  residency_requirement INTEGER,
  
  -- Validation and metadata
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1) DEFAULT 0.8,
  data_source TEXT NOT NULL DEFAULT 'manual',
  validated BOOLEAN DEFAULT false,
  
  -- Business rules
  conditions TEXT[] DEFAULT '{}',
  time_constraints JSONB DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(source_id, target_id, edge_type)
);

-- User Paths table - stores user's current path and progress
CREATE TABLE IF NOT EXISTS public.user_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  path_name TEXT NOT NULL DEFAULT 'My Career Path',
  
  -- Goal and status
  goal_node_id UUID REFERENCES public.life_path_nodes(id),
  status TEXT CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
  
  -- Path composition
  selected_node_ids UUID[] DEFAULT '{}',
  completed_node_ids UUID[] DEFAULT '{}',
  in_progress_node_ids UUID[] DEFAULT '{}',
  
  -- User preferences
  preferences JSONB DEFAULT '{}',
  
  -- Path metrics
  total_estimated_time INTEGER DEFAULT 0,
  total_estimated_cost NUMERIC DEFAULT 0,
  total_credits INTEGER DEFAULT 0,
  estimated_completion_date DATE,
  
  -- Versioning for checkpoints
  version INTEGER DEFAULT 1,
  parent_path_id UUID REFERENCES public.user_paths(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Checkpoints table - for backtracking and audit trail
CREATE TABLE IF NOT EXISTS public.user_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  path_id UUID NOT NULL REFERENCES public.user_paths(id) ON DELETE CASCADE,
  
  checkpoint_name TEXT NOT NULL,
  description TEXT,
  
  -- Snapshot data
  plan_snapshot JSONB NOT NULL,
  
  -- Audit trail
  changes_since_last JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Credit Transfer Rules table - for institutional transfer policies
CREATE TABLE IF NOT EXISTS public.credit_transfer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source_institution TEXT NOT NULL,
  target_institution TEXT NOT NULL,
  source_node_id UUID REFERENCES public.life_path_nodes(id),
  target_node_id UUID REFERENCES public.life_path_nodes(id),
  
  transfer_rate NUMERIC CHECK (transfer_rate >= 0 AND transfer_rate <= 1) DEFAULT 1.0,
  max_credits INTEGER,
  conditions TEXT[] DEFAULT '{}',
  
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  rule_source TEXT CHECK (rule_source IN ('state_articulation', 'ace', 'nccrs', 'institutional')) DEFAULT 'institutional',
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.life_path_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_path_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transfer_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nodes and edges (public read, service role manage)
CREATE POLICY "Anyone can view active life path nodes" ON public.life_path_nodes
  FOR SELECT USING (active = true);

CREATE POLICY "Service role can manage life path nodes" ON public.life_path_nodes
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view life path edges" ON public.life_path_edges
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage life path edges" ON public.life_path_edges
  FOR ALL USING (true)
  WITH CHECK (true);

-- RLS Policies for user paths (user-specific)
CREATE POLICY "Users can manage their own paths" ON public.user_paths
  FOR ALL USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all user paths" ON public.user_paths
  FOR ALL USING (true)
  WITH CHECK (true);

-- RLS Policies for checkpoints (user-specific)
CREATE POLICY "Users can manage their own checkpoints" ON public.user_checkpoints
  FOR ALL USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage all checkpoints" ON public.user_checkpoints
  FOR ALL USING (true)
  WITH CHECK (true);

-- RLS Policies for transfer rules (public read, service manage)
CREATE POLICY "Anyone can view credit transfer rules" ON public.credit_transfer_rules
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage transfer rules" ON public.credit_transfer_rules
  FOR ALL USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_life_path_nodes_type ON public.life_path_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_life_path_nodes_active ON public.life_path_nodes(active);
CREATE INDEX IF NOT EXISTS idx_life_path_nodes_category ON public.life_path_nodes(category);
CREATE INDEX IF NOT EXISTS idx_life_path_edges_source ON public.life_path_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_life_path_edges_target ON public.life_path_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_life_path_edges_type ON public.life_path_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_user_paths_user ON public.user_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_user_paths_goal ON public.user_paths(goal_node_id);
CREATE INDEX IF NOT EXISTS idx_user_checkpoints_user ON public.user_checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_rules_institutions ON public.credit_transfer_rules(source_institution, target_institution);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_life_path_nodes_updated_at
  BEFORE UPDATE ON public.life_path_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_life_path_edges_updated_at
  BEFORE UPDATE ON public.life_path_edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_paths_updated_at
  BEFORE UPDATE ON public.user_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_transfer_rules_updated_at
  BEFORE UPDATE ON public.credit_transfer_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();