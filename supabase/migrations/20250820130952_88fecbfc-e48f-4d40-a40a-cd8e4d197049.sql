-- Phase 1: Data Foundation (Final)
-- Fix existing tables and seed data

-- Drop existing function first to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.get_age_penalty(integer);

-- Create the deterministic age penalty lookup function
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

-- Add missing columns to switching_scenarios if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'switching_scenarios' AND column_name = 'name') THEN
    ALTER TABLE public.switching_scenarios ADD COLUMN name text NOT NULL DEFAULT 'Untitled Scenario';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'switching_scenarios' AND column_name = 'locations') THEN
    ALTER TABLE public.switching_scenarios ADD COLUMN locations jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'switching_scenarios' AND column_name = 'assumptions') THEN
    ALTER TABLE public.switching_scenarios ADD COLUMN assumptions jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'switching_scenarios' AND column_name = 'metrics') THEN
    ALTER TABLE public.switching_scenarios ADD COLUMN metrics jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Seed age penalty curves (idempotent) 
INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes)
SELECT 18, 29, 1.00, 'Young professionals - minimal age penalty'
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 18 AND age_max = 29
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes)
SELECT 30, 39, 1.05, 'Early career professionals - slight penalty'
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 30 AND age_max = 39
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes)
SELECT 40, 49, 1.10, 'Mid-career professionals - moderate penalty'
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 40 AND age_max = 49
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes)
SELECT 50, 59, 1.15, 'Senior professionals - higher penalty'
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 50 AND age_max = 59
);

INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes)
SELECT 60, 200, 1.20, 'Near/post-retirement - highest penalty'
WHERE NOT EXISTS (
  SELECT 1 FROM public.age_penalty_curves WHERE age_min = 60 AND age_max = 200
);

-- Seed skill automation risks using existing column name (automation_risk_pct)
INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, source, horizon_years)
SELECT id, 20, 'seed-default', 5
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%Python%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, source, horizon_years)
SELECT id, 30, 'seed-default', 5
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%Data Analysis%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, source, horizon_years)
SELECT id, 15, 'seed-default', 5
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%Machine Learning%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, source, horizon_years)
SELECT id, 35, 'seed-default', 5
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%SQL%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, source, horizon_years)
SELECT id, 40, 'seed-default', 5
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%JavaScript%'
ON CONFLICT (skill_id) DO NOTHING;

INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, source, horizon_years)
SELECT id, 25, 'seed-default', 5
FROM public.career_graph_nodes
WHERE node_type = 'skill' AND title ILIKE '%React%'
ON CONFLICT (skill_id) DO NOTHING;