-- Check if life_path_nodes table exists, if not create minimal version
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'life_path_nodes') THEN
    -- Create minimal tables for Phase 0 prototype
    CREATE TABLE public.life_path_nodes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      node_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      estimated_hours INTEGER DEFAULT 0,
      cost NUMERIC DEFAULT 0,
      credits INTEGER,
      difficulty INTEGER DEFAULT 3,
      institution TEXT,
      provider TEXT,
      modality TEXT DEFAULT 'online',
      active BOOLEAN DEFAULT true,
      validated BOOLEAN DEFAULT false,
      tags TEXT[] DEFAULT '{}',
      prerequisite_ids UUID[] DEFAULT '{}',
      skill_outcomes TEXT[] DEFAULT '{}',
      ace_recommended BOOLEAN DEFAULT false,
      position_x INTEGER,
      position_y INTEGER,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    ALTER TABLE public.life_path_nodes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can view active life path nodes" ON public.life_path_nodes FOR SELECT USING (active = true);
    CREATE POLICY "Service role can manage life path nodes" ON public.life_path_nodes FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'life_path_edges') THEN
    CREATE TABLE public.life_path_edges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id UUID NOT NULL REFERENCES public.life_path_nodes(id) ON DELETE CASCADE,
      target_id UUID NOT NULL REFERENCES public.life_path_nodes(id) ON DELETE CASCADE,
      edge_type TEXT NOT NULL,
      weight_time NUMERIC DEFAULT 1.0,
      weight_cost NUMERIC DEFAULT 1.0,
      weight_credit_loss NUMERIC DEFAULT 0,
      weight_difficulty NUMERIC DEFAULT 1.0,
      weight_roi NUMERIC DEFAULT 1.0,
      credit_transfer_rate NUMERIC,
      confidence NUMERIC DEFAULT 0.8,
      data_source TEXT DEFAULT 'manual',
      validated BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    ALTER TABLE public.life_path_edges ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can view life path edges" ON public.life_path_edges FOR SELECT USING (true);
    CREATE POLICY "Service role can manage life path edges" ON public.life_path_edges FOR ALL USING (true);
  END IF;
END $$;