-- 1) Fix calculate_user_trust_metrics accuracy calculation and add indexes + trigger

-- Safely replace function to avoid referencing non-existent column "rating"
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

  -- Recommendation accuracy: proportion of positive feedback (derived rating or effectiveness)
  WITH fb AS (
    SELECT 
      feedback_effectiveness,
      CASE 
        WHEN user_action LIKE 'rated_%' THEN NULLIF(split_part(user_action, '_', 2), '')::INT
        ELSE NULL
      END AS rating
    FROM public.maya_feedback_correlations
    WHERE user_id = user_id_param
      AND measured_at >= now() - (days_back || ' days')::interval
  )
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE COALESCE(rating, 0) >= 4 OR feedback_effectiveness >= 0.6))::NUMERIC 
      / NULLIF(COUNT(*), 0)::NUMERIC, 0
    )
  INTO accuracy
  FROM fb;

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

-- 2) Ensure trigger to refresh trust metrics on feedback exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_trust_metrics_on_feedback'
  ) THEN
    CREATE TRIGGER trg_refresh_trust_metrics_on_feedback
    AFTER INSERT OR UPDATE OR DELETE ON public.maya_feedback_correlations
    FOR EACH ROW EXECUTE FUNCTION public.refresh_user_trust_metrics_on_feedback();
  END IF;
END $$;

-- 3) Helpful indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_maya_feedback_user_measured
  ON public.maya_feedback_correlations (user_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_user_triggered
  ON public.alert_history (user_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_started
  ON public.learning_engagement_sessions (user_id, started_at DESC);

-- 4) Shareable Trust Badge table with RLS
CREATE TABLE IF NOT EXISTS public.trust_badge_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  share_token text UNIQUE NOT NULL DEFAULT public.generate_verification_code(),
  visibility text NOT NULL DEFAULT 'public',
  title text,
  metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.trust_badge_shares ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trust_badge_shares' AND policyname = 'Users can manage their own trust badge shares'
  ) THEN
    CREATE POLICY "Users can manage their own trust badge shares"
    ON public.trust_badge_shares
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trust_badge_shares' AND policyname = 'Public can view public trust badge shares'
  ) THEN
    CREATE POLICY "Public can view public trust badge shares"
    ON public.trust_badge_shares
    FOR SELECT
    USING (visibility = 'public');
  END IF;
END $$;

-- updated_at trigger for trust_badge_shares
CREATE OR REPLACE FUNCTION public.update_trust_badge_shares_updated_at()
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_trust_badge_shares_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_trust_badge_shares_updated_at
    BEFORE UPDATE ON public.trust_badge_shares
    FOR EACH ROW EXECUTE FUNCTION public.update_trust_badge_shares_updated_at();
  END IF;
END $$;

-- Index to quickly resolve shares by token
CREATE INDEX IF NOT EXISTS idx_trust_badge_shares_token ON public.trust_badge_shares (share_token);
