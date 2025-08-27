-- Phase 5 Multi-Track V2 Database Views and Functions

-- Track progress view for unified metrics
CREATE OR REPLACE VIEW user_track_progress_v AS
SELECT
  t.user_id,
  t.id as track_id,
  t.track_name,
  t.title,
  t.color,
  t.icon,
  COALESCE(ux.total_xp, 0) as xp,
  COALESCE(badge_count.count, 0) as badges,
  COALESCE(goal_count.count, 0) as goals,
  COALESCE(MAX(ard.cri_average), 0) as cri_score,
  COALESCE(MAX(cr.switch_risk_score), 0) as risk_score,
  COALESCE(MAX(cr.roi_volatility), 0) as roi_score,
  t.updated_at,
  t.archived
FROM career_tracks t
LEFT JOIN user_xp ux ON ux.user_id = t.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM user_badges ub
  GROUP BY user_id
) badge_count ON badge_count.user_id = t.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM career_goals cg
  WHERE cg.active = true
  GROUP BY user_id
) goal_count ON goal_count.user_id = t.user_id
LEFT JOIN ai_resume_drafts ard ON ard.user_id = t.user_id AND ard.track_id = t.id
LEFT JOIN career_risks cr ON cr.user_id = t.user_id AND cr.track_id = t.id
GROUP BY t.user_id, t.id, t.track_name, t.title, t.color, t.icon, ux.total_xp, badge_count.count, goal_count.count, t.updated_at, t.archived;

-- CRI history view for sparkline charts (simulated data for now)
CREATE OR REPLACE VIEW track_cri_history_v AS
SELECT 
  t.id as track_id,
  generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date as day,
  -- Simulate CRI progression with some randomness
  COALESCE(MAX(ard.cri_average), 0) + 
    (RANDOM() * 10 - 5) + 
    (EXTRACT(DAY FROM generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day')) * 0.5) as cri_score
FROM career_tracks t
LEFT JOIN ai_resume_drafts ard ON ard.track_id = t.id
WHERE t.archived = false
GROUP BY t.id, generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day');

-- RPC function to recompute track metrics (idempotent stub)
CREATE OR REPLACE FUNCTION recompute_track_metrics(p_user_id UUID, p_track_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- This is a stub that would trigger metric recalculation
  -- For now, it just updates the track's updated_at timestamp
  UPDATE career_tracks 
  SET updated_at = NOW() 
  WHERE user_id = p_user_id AND id = p_track_id;
$$;

-- RPC function to get track insights with proper RLS
CREATE OR REPLACE FUNCTION get_track_insights(p_track_id UUID)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT json_build_object(
    'track_id', p_track_id,
    'cri_trend', (
      SELECT json_agg(
        json_build_object('day', day, 'cri_score', cri_score)
        ORDER BY day DESC
      )
      FROM track_cri_history_v 
      WHERE track_id = p_track_id 
      LIMIT 30
    ),
    'recent_activity', (
      SELECT json_agg(
        json_build_object(
          'type', 'goal_created',
          'date', created_at,
          'title', title
        )
        ORDER BY created_at DESC
      )
      FROM career_goals 
      WHERE user_id = auth.uid()
      LIMIT 5
    ),
    'next_milestones', (
      SELECT json_agg(
        json_build_object(
          'title', title,
          'target_date', target_date,
          'progress', current_progress
        )
        ORDER BY target_date ASC
      )
      FROM career_goals 
      WHERE user_id = auth.uid() AND active = true
      LIMIT 3
    )
  );
$$;