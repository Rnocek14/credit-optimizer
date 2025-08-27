-- Fix SECURITY DEFINER view issues by removing SECURITY DEFINER and adding proper RLS policies

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS user_track_progress_v;
DROP VIEW IF EXISTS track_cri_history_v;

-- Recreate track progress view as regular view (inherits caller's permissions)
CREATE VIEW user_track_progress_v AS
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
WHERE t.user_id = auth.uid() -- Add RLS constraint directly in view
GROUP BY t.user_id, t.id, t.track_name, t.title, t.color, t.icon, ux.total_xp, badge_count.count, goal_count.count, t.updated_at, t.archived;

-- Recreate CRI history view as regular view with RLS constraint
CREATE VIEW track_cri_history_v AS
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
WHERE t.archived = false AND t.user_id = auth.uid() -- Add RLS constraint
GROUP BY t.id, generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day');