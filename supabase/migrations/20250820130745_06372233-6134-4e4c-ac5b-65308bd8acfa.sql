-- Phase 1: Data Foundation
-- Create missing tables, RLS policies, triggers, and seed data

-- Helpful generic trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1) switching_scenarios table
CREATE TABLE IF NOT EXISTS public.switching_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  from_track_id uuid,
  to_track_id uuid,
  locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.switching_scenarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='switching_scenarios' AND policyname='Service role can manage switching scenarios'
  ) THEN
    CREATE POLICY "Service role can manage switching scenarios"
    ON public.switching_scenarios
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='switching_scenarios' AND policyname='Users can manage their own switching scenarios'
  ) THEN
    CREATE POLICY "Users can manage their own switching scenarios"
    ON public.switching_scenarios
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_switching_scenarios_updated_at'
  ) THEN
    CREATE TRIGGER update_switching_scenarios_updated_at
    BEFORE UPDATE ON public.switching_scenarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) skill_automation_risk table (reference-like)
CREATE TABLE IF NOT EXISTS public.skill_automation_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL,
  risk_percentage numeric NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id)
);

ALTER TABLE public.skill_automation_risk ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='skill_automation_risk' AND policyname='Anyone can view skill automation risk'
  ) THEN
    CREATE POLICY "Anyone can view skill automation risk"
    ON public.skill_automation_risk
    FOR SELECT
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='skill_automation_risk' AND policyname='Service role can manage skill automation risk'
  ) THEN
    CREATE POLICY "Service role can manage skill automation risk"
    ON public.skill_automation_risk
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_skill_automation_risk_updated_at'
  ) THEN
    CREATE TRIGGER update_skill_automation_risk_updated_at
    BEFORE UPDATE ON public.skill_automation_risk
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) Helper: deterministic age penalty lookup
CREATE OR REPLACE FUNCTION public.get_age_penalty(age_int integer)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT penalty_factor 
    FROM public.age_penalty_curves 
    WHERE age_int BETWEEN age_min AND age_max 
    ORDER BY age_min ASC 
    LIMIT 1
  ), 1.0);
$$;

-- 4) Seed age penalty curves (idempotent)
INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor)
SELECT 18, 29, 1.00
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 18 AND age_max = 29
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor)
SELECT 30, 39, 1.05
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 30 AND age_max = 39
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor)
SELECT 40, 49, 1.10
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 40 AND age_max = 49
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor)
SELECT 50, 59, 1.15
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 50 AND age_max = 59
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor)
SELECT 60, 200, 1.20
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 60 AND age_max = 200
);

-- 5) Seed initial skill automation risks if the skills exist (idempotent)
INSERT INTO public.skill_automation_risk (skill_id, risk_percentage, source)
SELECT id, 20, 'seed-default'
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%Python%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, risk_percentage, source)
SELECT id, 30, 'seed-default'
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%Data Analysis%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, risk_percentage, source)
SELECT id, 15, 'seed-default'
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%Machine Learning%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, risk_percentage, source)
SELECT id, 35, 'seed-default'
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%SQL%'
ON CONFLICT (skill_id) DO NOTHING;