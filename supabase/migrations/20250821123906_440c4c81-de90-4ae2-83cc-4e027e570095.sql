-- Seed meaningful defaults for career track scoring
-- This is safe and idempotent: only affects rows with zero/null values
UPDATE public.career_tracks
SET
  roi_score = CASE WHEN COALESCE(roi_score, 0) = 0 THEN 45 ELSE roi_score END,
  switch_readiness_score = CASE WHEN COALESCE(switch_readiness_score, 0) = 0 THEN 65 ELSE switch_readiness_score END,
  updated_at = now()
WHERE COALESCE(roi_score, 0) = 0 OR COALESCE(switch_readiness_score, 0) = 0;