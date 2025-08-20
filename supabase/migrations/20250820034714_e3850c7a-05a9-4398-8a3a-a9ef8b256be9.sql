-- Phase 1: Database Foundation for Career Switching & Risk Intelligence
-- 1) Utility trigger function (generic) for updated_at maintenance
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Reference tables (publicly readable)
-- 2a) Skill automation risk reference
CREATE TABLE IF NOT EXISTS public.skill_automation_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL,
  automation_risk_pct numeric NOT NULL DEFAULT 0,
  source text,
  horizon_years integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id)
);

ALTER TABLE public.skill_automation_risk ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'skill_automation_risk' AND policyname = 'Anyone can view skill automation risk'
  ) THEN
    CREATE POLICY "Anyone can view skill automation risk"
      ON public.skill_automation_risk
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'skill_automation_risk' AND policyname = 'Service role can manage skill automation risk'
  ) THEN
    CREATE POLICY "Service role can manage skill automation risk"
      ON public.skill_automation_risk
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_automation_risk_skill_id ON public.skill_automation_risk (skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_automation_risk_updated_at ON public.skill_automation_risk (updated_at DESC);

DROP TRIGGER IF EXISTS trg_skill_automation_risk_updated_at ON public.skill_automation_risk;
CREATE TRIGGER trg_skill_automation_risk_updated_at
BEFORE UPDATE ON public.skill_automation_risk
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2b) Age penalty curves reference
CREATE TABLE IF NOT EXISTS public.age_penalty_curves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  age_min integer NOT NULL,
  age_max integer NOT NULL,
  penalty_factor numeric NOT NULL DEFAULT 1.0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (age_min, age_max)
);

ALTER TABLE public.age_penalty_curves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'age_penalty_curves' AND policyname = 'Anyone can view age penalty curves'
  ) THEN
    CREATE POLICY "Anyone can view age penalty curves"
      ON public.age_penalty_curves
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'age_penalty_curves' AND policyname = 'Service role can manage age penalty curves'
  ) THEN
    CREATE POLICY "Service role can manage age penalty curves"
      ON public.age_penalty_curves
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_age_penalty_curves_bounds ON public.age_penalty_curves (age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_age_penalty_curves_updated_at ON public.age_penalty_curves (updated_at DESC);

DROP TRIGGER IF EXISTS trg_age_penalty_curves_updated_at ON public.age_penalty_curves;
CREATE TRIGGER trg_age_penalty_curves_updated_at
BEFORE UPDATE ON public.age_penalty_curves
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) User-specific tables
-- 3a) Career switches (stores computed switching metrics)
CREATE TABLE IF NOT EXISTS public.career_switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_track_id uuid,
  to_track_id uuid,
  -- Metrics
  skill_overlap numeric NOT NULL DEFAULT 0,
  transfer_credit_pct numeric NOT NULL DEFAULT 0,
  lost_time_hours integer NOT NULL DEFAULT 0,
  time_gained_hours integer NOT NULL DEFAULT 0,
  switch_cost numeric NOT NULL DEFAULT 0,
  direct_cost numeric NOT NULL DEFAULT 0,
  opportunity_cost numeric NOT NULL DEFAULT 0,
  friction_cost numeric NOT NULL DEFAULT 0,
  salary_uplift_3yr numeric NOT NULL DEFAULT 0,
  roi_3yr numeric NOT NULL DEFAULT 0,
  break_even_months integer NOT NULL DEFAULT 0,
  cri_delta numeric NOT NULL DEFAULT 0,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_id uuid,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_switches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_switches' AND policyname='Service role can manage career switches'
  ) THEN
    CREATE POLICY "Service role can manage career switches"
      ON public.career_switches
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_switches' AND policyname='Users can manage their own career switches'
  ) THEN
    CREATE POLICY "Users can manage their own career switches"
      ON public.career_switches
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_career_switches_user_id ON public.career_switches (user_id);
CREATE INDEX IF NOT EXISTS idx_career_switches_created_at ON public.career_switches (created_at DESC);

DROP TRIGGER IF EXISTS trg_career_switches_updated_at ON public.career_switches;
CREATE TRIGGER trg_career_switches_updated_at
BEFORE UPDATE ON public.career_switches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3b) Career risks (per user per track; historical snapshots allowed)
CREATE TABLE IF NOT EXISTS public.career_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  ai_job_risk_pct numeric NOT NULL DEFAULT 0,
  age_penalty_factor numeric NOT NULL DEFAULT 1.0,
  roi_volatility numeric NOT NULL DEFAULT 0,
  cri_mismatch numeric NOT NULL DEFAULT 0,
  switch_risk_score numeric NOT NULL DEFAULT 0,
  risk_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_risks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_risks' AND policyname='Service role can manage career risks'
  ) THEN
    CREATE POLICY "Service role can manage career risks"
      ON public.career_risks
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='career_risks' AND policyname='Users can manage their own career risks'
  ) THEN
    CREATE POLICY "Users can manage their own career risks"
      ON public.career_risks
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_career_risks_user_id ON public.career_risks (user_id);
CREATE INDEX IF NOT EXISTS idx_career_risks_track_id ON public.career_risks (track_id);
CREATE INDEX IF NOT EXISTS idx_career_risks_calculated_at ON public.career_risks (calculated_at DESC);

DROP TRIGGER IF EXISTS trg_career_risks_updated_at ON public.career_risks;
CREATE TRIGGER trg_career_risks_updated_at
BEFORE UPDATE ON public.career_risks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3c) Switching scenarios (user-defined inputs & results)
CREATE TABLE IF NOT EXISTS public.switching_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_track_id uuid,
  to_track_id uuid,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.switching_scenarios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='switching_scenarios' AND policyname='Service role can manage switching scenarios'
  ) THEN
    CREATE POLICY "Service role can manage switching scenarios"
      ON public.switching_scenarios
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='switching_scenarios' AND policyname='Users can manage their own switching scenarios'
  ) THEN
    CREATE POLICY "Users can manage their own switching scenarios"
      ON public.switching_scenarios
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_switching_scenarios_user_id ON public.switching_scenarios (user_id);
CREATE INDEX IF NOT EXISTS idx_switching_scenarios_created_at ON public.switching_scenarios (created_at DESC);

DROP TRIGGER IF EXISTS trg_switching_scenarios_updated_at ON public.switching_scenarios;
CREATE TRIGGER trg_switching_scenarios_updated_at
BEFORE UPDATE ON public.switching_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Extend existing tables
-- 4a) career_tracks: add risk/readiness & ROI/LQI columns
ALTER TABLE public.career_tracks
  ADD COLUMN IF NOT EXISTS risk_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_job_risk_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS age_penalty_factor numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS switch_readiness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roi_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lqi_score numeric DEFAULT 0;

-- Add trigger to maintain updated_at on updates (idempotent by drop/create)
DROP TRIGGER IF EXISTS trg_career_tracks_updated_at ON public.career_tracks;
CREATE TRIGGER trg_career_tracks_updated_at
BEFORE UPDATE ON public.career_tracks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4b) career_graph_nodes: add risk-related attributes
ALTER TABLE public.career_graph_nodes
  ADD COLUMN IF NOT EXISTS automation_risk_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS age_sensitivity_score numeric DEFAULT 0;

-- Note: existing RLS remains unchanged. We won't attach a new trigger to avoid conflicts with existing ones.

-- 5) Helpful comments for documentation
COMMENT ON TABLE public.career_switches IS 'Computed metrics and outcomes for user career switching scenarios';
COMMENT ON TABLE public.career_risks IS 'Risk intelligence per user and track, including AI risk and age penalties';
COMMENT ON TABLE public.switching_scenarios IS 'User-defined switching inputs and cached results for simulations';
COMMENT ON TABLE public.skill_automation_risk IS 'Reference table containing automation/displacement risk per skill';
COMMENT ON TABLE public.age_penalty_curves IS 'Reference table mapping age ranges to switching penalty factors';
