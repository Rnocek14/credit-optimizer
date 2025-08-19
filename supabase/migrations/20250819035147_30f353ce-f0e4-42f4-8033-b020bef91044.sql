-- Create tables for storing user path configurations

-- Main path metadata
CREATE TABLE public.user_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'My Learning Path',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual nodes in paths
CREATE TABLE public.path_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.user_paths(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, -- Frontend node ID
  node_type TEXT NOT NULL CHECK (node_type IN ('track', 'course', 'project', 'milestone')),
  title TEXT NOT NULL,
  description TEXT,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  node_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(path_id, node_id)
);

-- Connections between nodes
CREATE TABLE public.path_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.user_paths(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL, -- Frontend edge ID
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  edge_type TEXT NOT NULL CHECK (edge_type IN ('prerequisite', 'sequence', 'branch', 'suggested', 'alternative')),
  edge_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(path_id, edge_id)
);

-- Enable RLS
ALTER TABLE public.user_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_paths
CREATE POLICY "Users can manage their own paths"
  ON public.user_paths
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view shared paths"
  ON public.user_paths
  FOR SELECT
  USING (is_shared = true OR auth.uid() = user_id);

-- RLS Policies for path_nodes
CREATE POLICY "Users can manage nodes in their paths"
  ON public.path_nodes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_paths 
      WHERE id = path_nodes.path_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_paths 
      WHERE id = path_nodes.path_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view nodes in shared paths"
  ON public.path_nodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_paths 
      WHERE id = path_nodes.path_id 
      AND (is_shared = true OR user_id = auth.uid())
    )
  );

-- RLS Policies for path_edges
CREATE POLICY "Users can manage edges in their paths"
  ON public.path_edges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_paths 
      WHERE id = path_edges.path_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_paths 
      WHERE id = path_edges.path_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view edges in shared paths"
  ON public.path_edges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_paths 
      WHERE id = path_edges.path_id 
      AND (is_shared = true OR user_id = auth.uid())
    )
  );

-- Service role policies
CREATE POLICY "Service role can manage all path data"
  ON public.user_paths
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all node data"
  ON public.path_nodes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all edge data"
  ON public.path_edges
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_user_paths_user_id ON public.user_paths(user_id);
CREATE INDEX idx_user_paths_share_token ON public.user_paths(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_path_nodes_path_id ON public.path_nodes(path_id);
CREATE INDEX idx_path_nodes_node_id ON public.path_nodes(path_id, node_id);
CREATE INDEX idx_path_edges_path_id ON public.path_edges(path_id);
CREATE INDEX idx_path_edges_source_target ON public.path_edges(path_id, source_node_id, target_node_id);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_paths_updated_at
  BEFORE UPDATE ON public.user_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_path_nodes_updated_at
  BEFORE UPDATE ON public.path_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_path_edges_updated_at
  BEFORE UPDATE ON public.path_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();