-- Enable RLS and add policies for system tables if they exist
DO $$ BEGIN
  -- system_performance_metrics
  IF to_regclass('public.system_performance_metrics') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.system_performance_metrics ENABLE ROW LEVEL SECURITY';

    -- Drop existing policies if present to avoid duplicates
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'system_performance_metrics' 
        AND policyname = 'Authenticated users can view system metrics'
    ) THEN
      EXECUTE 'DROP POLICY "Authenticated users can view system metrics" ON public.system_performance_metrics';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'system_performance_metrics' 
        AND policyname = 'Service role can manage system metrics'
    ) THEN
      EXECUTE 'DROP POLICY "Service role can manage system metrics" ON public.system_performance_metrics';
    END IF;

    -- Policies
    EXECUTE 'CREATE POLICY "Authenticated users can view system metrics" 
             ON public.system_performance_metrics 
             FOR SELECT 
             TO authenticated 
             USING (true)';

    EXECUTE 'CREATE POLICY "Service role can manage system metrics" 
             ON public.system_performance_metrics 
             FOR ALL 
             TO service_role 
             USING (true) 
             WITH CHECK (true)';
  END IF;

  -- maya_context_tracking
  IF to_regclass('public.maya_context_tracking') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.maya_context_tracking ENABLE ROW LEVEL SECURITY';

    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'maya_context_tracking' 
        AND policyname = 'Service role can manage context tracking'
    ) THEN
      EXECUTE 'DROP POLICY "Service role can manage context tracking" ON public.maya_context_tracking';
    END IF;

    EXECUTE 'CREATE POLICY "Service role can manage context tracking" 
             ON public.maya_context_tracking 
             FOR ALL 
             TO service_role 
             USING (true) 
             WITH CHECK (true)';
  END IF;
END $$;

-- Harden function search_path settings (no signature changes)
CREATE OR REPLACE FUNCTION public.update_goal_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_xp_last_updated()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_career_graph_nodes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_pattern_recognition_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;