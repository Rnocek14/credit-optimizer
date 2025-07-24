-- Phase 2.1: Create unified career_graph_nodes table
CREATE TABLE IF NOT EXISTS public.career_graph_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_type TEXT NOT NULL CHECK (node_type IN ('skill', 'job', 'course', 'project', 'certification', 'step')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Semantic AI fields
  embedding_vector VECTOR(1536), -- OpenAI ada-002 embeddings
  semantic_tags TEXT[],
  ai_generated_description TEXT,
  ai_confidence_score NUMERIC DEFAULT 0.0,
  
  -- Original data references
  original_table TEXT,
  original_id UUID,
  
  -- Metadata
  category TEXT,
  difficulty_level INTEGER DEFAULT 1,
  estimated_time_hours INTEGER DEFAULT 0,
  cost_estimate NUMERIC DEFAULT 0,
  
  -- Status and tracking
  active BOOLEAN DEFAULT true,
  last_analyzed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Indexes for performance
  UNIQUE(original_table, original_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_type ON public.career_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_semantic_tags ON public.career_graph_nodes USING GIN(semantic_tags);
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_active ON public.career_graph_nodes(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_career_graph_nodes_last_analyzed ON public.career_graph_nodes(last_analyzed);

-- Enable RLS
ALTER TABLE public.career_graph_nodes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view active nodes" 
ON public.career_graph_nodes 
FOR SELECT 
USING (active = true);

CREATE POLICY "Service role can manage all nodes" 
ON public.career_graph_nodes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_career_graph_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_career_graph_nodes_updated_at
BEFORE UPDATE ON public.career_graph_nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_career_graph_nodes_updated_at();

-- Phase 2.2: Migrate existing data into unified nodes table
-- Migrate skills
INSERT INTO public.career_graph_nodes (node_type, title, description, original_table, original_id, category, difficulty_level, active)
SELECT 
  'skill' as node_type,
  name as title,
  description,
  'skills' as original_table,
  id as original_id,
  category,
  difficulty_level,
  true as active
FROM public.skills
ON CONFLICT (original_table, original_id) DO NOTHING;

-- Migrate career paths as jobs
INSERT INTO public.career_graph_nodes (node_type, title, description, original_table, original_id, category, active)
SELECT 
  'job' as node_type,
  title,
  summary as description,
  'career_paths' as original_table,
  id as original_id,
  industry as category,
  true as active
FROM public.career_paths
ON CONFLICT (original_table, original_id) DO NOTHING;

-- Migrate courses
INSERT INTO public.career_graph_nodes (node_type, title, description, original_table, original_id, active)
SELECT 
  'course' as node_type,
  title,
  description,
  'recommended_courses' as original_table,
  id as original_id,
  true as active
FROM public.recommended_courses
WHERE active = true
ON CONFLICT (original_table, original_id) DO NOTHING;

-- Migrate career steps
INSERT INTO public.career_graph_nodes (node_type, title, description, original_table, original_id, estimated_time_hours, active)
SELECT 
  'step' as node_type,
  title,
  description,
  'career_steps' as original_table,
  id as original_id,
  CASE 
    WHEN estimated_time ~ '^[0-9]+' THEN (regexp_replace(estimated_time, '[^0-9]', '', 'g'))::integer
    ELSE 0
  END as estimated_time_hours,
  true as active
FROM public.career_steps
ON CONFLICT (original_table, original_id) DO NOTHING;

-- Migrate projects
INSERT INTO public.career_graph_nodes (node_type, title, description, original_table, original_id, estimated_time_hours, active)
SELECT 
  'project' as node_type,
  title,
  description,
  'projects' as original_table,
  id as original_id,
  estimated_time_hours,
  true as active
FROM public.projects
ON CONFLICT (original_table, original_id) DO NOTHING;

-- Migrate certifications
INSERT INTO public.career_graph_nodes (node_type, title, description, original_table, original_id, estimated_time_hours, cost_estimate, active)
SELECT 
  'certification' as node_type,
  title,
  description,
  'certifications' as original_table,
  id as original_id,
  prep_time_hours as estimated_time_hours,
  cost as cost_estimate,
  true as active
FROM public.certifications
ON CONFLICT (original_table, original_id) DO NOTHING;