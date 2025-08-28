-- PR-1: Growth Layer Database Migration
-- Safely create tables, policies, and functions without touching reserved schemas

BEGIN;

-- 1) Minimal onboarding responses
CREATE TABLE IF NOT EXISTS public.user_onboarding_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  career_goal text CHECK (career_goal IN ('new_job','career_switch','skill_up')),
  target_role text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and owner-only access
ALTER TABLE public.user_onboarding_responses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_onboarding_responses' AND policyname='onboarding_own_select'
  ) THEN
    CREATE POLICY "onboarding_own_select" ON public.user_onboarding_responses
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_onboarding_responses' AND policyname='onboarding_own_insert'
  ) THEN
    CREATE POLICY "onboarding_own_insert" ON public.user_onboarding_responses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_onboarding_responses' AND policyname='onboarding_own_update'
  ) THEN
    CREATE POLICY "onboarding_own_update" ON public.user_onboarding_responses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Referrals (owner-visible stats)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_code text UNIQUE,
  clicks int NOT NULL DEFAULT 0,
  signups int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One referral row per user
CREATE UNIQUE INDEX IF NOT EXISTS referrals_user_unique ON public.referrals(user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='referrals' AND policyname='referrals_own_all'
  ) THEN
    CREATE POLICY "referrals_own_all" ON public.referrals
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Generate referral code automatically
CREATE OR REPLACE FUNCTION public.ensure_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR length(NEW.referral_code) = 0 THEN
    NEW.referral_code := encode(gen_random_bytes(6), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_code ON public.referrals;
CREATE TRIGGER trg_referral_code
BEFORE INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.ensure_referral_code();

-- 3) Referral events (server-only insert via RPC)
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('click','signup')),
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_referral_events_code ON public.referral_events(referral_code);

-- Enable RLS but do not add broad policies; use SECURITY DEFINER function to write
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

-- RPC-style function to record events and update counters atomically
CREATE OR REPLACE FUNCTION public.record_referral_event(p_code text, p_type text, p_ip inet, p_ua text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.referral_events(referral_code, event_type, ip, user_agent)
  VALUES (p_code, p_type, p_ip, p_ua);

  IF p_type = 'click' THEN
    UPDATE public.referrals SET clicks = clicks + 1 WHERE referral_code = p_code;
  ELSIF p_type = 'signup' THEN
    UPDATE public.referrals SET signups = signups + 1 WHERE referral_code = p_code;
  END IF;
END;
$$;

-- 4) Freemium quotas (per month)
CREATE TABLE IF NOT EXISTS public.usage_quotas (
  user_id uuid PRIMARY KEY,
  month_start date NOT NULL DEFAULT (date_trunc('month', now())::date),
  maya_analyses_used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='usage_quotas' AND policyname='quotas_own_select'
  ) THEN
    CREATE POLICY "quotas_own_select" ON public.usage_quotas
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Function to increment monthly Maya analysis quota usage
CREATE OR REPLACE FUNCTION public.after_maya_analysis_increment_quota()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  current_user uuid := auth.uid();
  ms date := date_trunc('month', now())::date;
BEGIN
  IF current_user IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to increment quota';
  END IF;

  INSERT INTO public.usage_quotas(user_id, month_start, maya_analyses_used)
  VALUES (current_user, ms, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET month_start = CASE 
          WHEN EXCLUDED.month_start > public.usage_quotas.month_start THEN EXCLUDED.month_start 
          ELSE public.usage_quotas.month_start
        END,
        maya_analyses_used = CASE
          WHEN EXCLUDED.month_start > public.usage_quotas.month_start THEN 1
          ELSE public.usage_quotas.maya_analyses_used + 1
        END,
        updated_at = now();
END;
$$;

COMMIT;