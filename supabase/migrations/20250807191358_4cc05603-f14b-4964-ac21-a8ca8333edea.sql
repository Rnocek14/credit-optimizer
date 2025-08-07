-- Phase 7: Feedback Intelligence Layer migration
-- 1) Aggregation tables for trust metrics and insights

-- Create user_trust_metrics table
CREATE TABLE IF NOT EXISTS public.user_trust_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trust_score NUMERIC NOT NULL DEFAULT 50,
  satisfaction_score NUMERIC NOT NULL DEFAULT 50,
  engagement_score NUMERIC NOT NULL DEFAULT 50,
  recommendation_accuracy NUMERIC NOT NULL DEFAULT 0,
  feedback_volume INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trend JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_trust_metrics_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_trust_metrics ENABLE ROW LEVEL SECURITY;

-- Policies: service role manage all; users can view their own
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_trust_metrics' AND policyname='Service role can manage trust metrics'
  ) THEN
    CREATE POLICY "Service role can manage trust metrics"
    ON public.user_trust_metrics
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_trust_metrics' AND policyname='Users can view their own trust metrics'
  ) THEN
    CREATE POLICY "Users can view their own trust metrics"
    ON public.user_trust_metrics
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create feedback_intelligence_insights table
CREATE TABLE IF NOT EXISTS public.feedback_intelligence_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_intelligence_insights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='feedback_intelligence_insights' AND policyname='Service role can manage insights'
  ) THEN
    CREATE POLICY "Service role can manage insights"
    ON public.feedback_intelligence_insights
    AS PERMISSIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='feedback_intelligence_insights' AND policyname='Users can view their own insights'
  ) THEN
    CREATE POLICY "Users can view their own insights"
    ON public.feedback_intelligence_insights
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Utility trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_user_trust_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_user_trust_metrics_updated_at ON public.user_trust_metrics;
CREATE TRIGGER trg_update_user_trust_metrics_updated_at
BEFORE UPDATE ON public.user_trust_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_user_trust_metrics_updated_at();

-- 3) Calculation function for trust metrics
CREATE OR REPLACE FUNCTION public.calculate_user_trust_metrics(user_id_param uuid, days_back integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  feedback_count INTEGER := 0;
  avg_effectiveness NUMERIC := 0;
  avg_rating NUMERIC := NULL;
  pos_count INTEGER := 0;
  accuracy NUMERIC := 0;
  engagement NUMERIC := 0;
  trust NUMERIC := 0;
  trend_data JSONB := '[]'::jsonb;
BEGIN
  -- Aggregate feedback from the past period
  WITH feedback AS (
    SELECT 
      feedback_effectiveness,
      measured_at,
      CASE 
        WHEN user_action LIKE 'rated_%' THEN NULLIF(split_part(user_action, '_', 2), '')::INT
        ELSE NULL
      END AS rating
    FROM public.maya_feedback_correlations
    WHERE user_id = user_id_param
      AND measured_at >= now() - (days_back || ' days')::interval
  )
  SELECT 
    COUNT(*)::INT,
    COALESCE(AVG(feedback_effectiveness), 0),
    AVG(rating)
  INTO feedback_count, avg_effectiveness, avg_rating
  FROM feedback;

  -- Recommendation accuracy: proportion of positive feedback
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE COALESCE(rating, 0) >= 4 OR feedback_effectiveness >= 0.6))::NUMERIC 
      / NULLIF(COUNT(*), 0)::NUMERIC, 0
    )
  INTO accuracy
  FROM public.maya_feedback_correlations
  WHERE user_id = user_id_param
    AND measured_at >= now() - (days_back || ' days')::interval;

  -- Engagement score scaled by feedback volume per 30 days (target 10)
  engagement := LEAST(100, GREATEST(0, (feedback_count::NUMERIC / 10.0) * 100));

  -- Satisfaction score from ratings fallback to effectiveness
  IF avg_rating IS NOT NULL THEN
    -- Convert 1-5 rating to 0-100
    avg_rating := (avg_rating / 5.0) * 100.0;
  ELSE
    avg_rating := avg_effectiveness * 100.0;
  END IF;

  -- Trust score blend: 60% effectiveness, 40% satisfaction
  trust := ROUND((avg_effectiveness * 100.0) * 0.6 + (avg_rating) * 0.4, 1);

  -- Weekly trend for last 6 weeks
  SELECT COALESCE(jsonb_agg(x ORDER BY week), '[]'::jsonb) INTO trend_data
  FROM (
    SELECT 
      to_char(date_trunc('week', measured_at), 'YYYY-MM-DD') AS week,
      ROUND(AVG(feedback_effectiveness) * 100.0, 1) AS effectiveness
    FROM public.maya_feedback_correlations
    WHERE user_id = user_id_param
      AND measured_at >= now() - interval '42 days'
    GROUP BY 1
  ) x;

  RETURN jsonb_build_object(
    'trust_score', trust,
    'satisfaction_score', ROUND(avg_rating, 1),
    'engagement_score', ROUND(engagement, 1),
    'recommendation_accuracy', ROUND(accuracy * 100.0, 1),
    'feedback_volume', feedback_count,
    'trend', trend_data,
    'calculated_at', now()
  );
END;
$$;

-- 4) Upsert function to store metrics
CREATE OR REPLACE FUNCTION public.upsert_user_trust_metrics(user_id_param uuid, days_back integer DEFAULT 90)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calc jsonb;
  rec_id uuid;
BEGIN
  calc := public.calculate_user_trust_metrics(user_id_param, days_back);

  INSERT INTO public.user_trust_metrics (
    user_id, trust_score, satisfaction_score, engagement_score,
    recommendation_accuracy, feedback_volume, trend, metadata, last_calculated_at
  ) VALUES (
    user_id_param,
    (calc->>'trust_score')::NUMERIC,
    (calc->>'satisfaction_score')::NUMERIC,
    (calc->>'engagement_score')::NUMERIC,
    (calc->>'recommendation_accuracy')::NUMERIC,
    (calc->>'feedback_volume')::INT,
    calc->'trend',
    jsonb_build_object('days_back', days_back),
    (calc->>'calculated_at')::timestamptz
  )
  ON CONFLICT (user_id)
  DO UPDATE SET 
    trust_score = EXCLUDED.trust_score,
    satisfaction_score = EXCLUDED.satisfaction_score,
    engagement_score = EXCLUDED.engagement_score,
    recommendation_accuracy = EXCLUDED.recommendation_accuracy,
    feedback_volume = EXCLUDED.feedback_volume,
    trend = EXCLUDED.trend,
    metadata = EXCLUDED.metadata,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = now()
  RETURNING id INTO rec_id;

  RETURN rec_id;
END;
$$;

-- 5) Trigger to refresh metrics when feedback changes
CREATE OR REPLACE FUNCTION public.refresh_user_trust_metrics_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.upsert_user_trust_metrics(COALESCE(NEW.user_id, OLD.user_id), 90);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on maya_feedback_correlations if table exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='maya_feedback_correlations'
  ) THEN
    DROP TRIGGER IF EXISTS trg_refresh_trust_metrics_on_feedback ON public.maya_feedback_correlations;
    CREATE TRIGGER trg_refresh_trust_metrics_on_feedback
    AFTER INSERT OR UPDATE ON public.maya_feedback_correlations
    FOR EACH ROW
    EXECUTE FUNCTION public.refresh_user_trust_metrics_on_feedback();
  END IF;
END $$;