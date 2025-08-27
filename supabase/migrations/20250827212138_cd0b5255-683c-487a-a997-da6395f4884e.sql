-- Fix security definer view issues by dropping and recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_track_progress_v CASCADE;
DROP VIEW IF EXISTS public.track_cri_history_v CASCADE;

-- Recreate user_track_progress_v without SECURITY DEFINER
CREATE VIEW public.user_track_progress_v AS
SELECT 
  ct.user_id,
  ct.id as track_id,
  ct.title,
  ct.description,
  ct.icon,
  ct.color,
  COALESCE(cp.completion_percentage, 0) as completion_percentage,
  COALESCE(cp.courses_completed, 0) as courses_completed,
  COALESCE(cp.total_courses, 1) as total_courses,
  COALESCE(cp.skills_mastered, 0) as skills_mastered,
  COALESCE(cp.current_cri_score, 0) as current_cri_score,
  cp.last_activity_at,
  ct.created_at,
  ct.updated_at
FROM career_tracks ct
LEFT JOIN LATERAL (
  SELECT 
    COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) as courses_completed,
    COUNT(*) as total_courses,
    AVG(CASE WHEN cp.status = 'completed' THEN 100 ELSE COALESCE(cp.progress_percentage, 0) END) as completion_percentage,
    COUNT(DISTINCT ts.skill_id) as skills_mastered,
    AVG(COALESCE(ard.cri_average, 0)) as current_cri_score,
    MAX(GREATEST(cp.last_accessed_at, ard.updated_at)) as last_activity_at
  FROM track_courses tc
  LEFT JOIN course_progress cp ON cp.course_id = tc.course_id AND cp.user_id = ct.user_id
  LEFT JOIN track_skills tsm ON tsm.track_id = ct.id
  LEFT JOIN user_skills us ON us.skill_id = tsm.skill_node_id AND us.user_id = ct.user_id
  LEFT JOIN track_skills ts ON ts.track_id = ct.id AND us.proficiency_level >= 3
  LEFT JOIN ai_resume_drafts ard ON ard.track_id = ct.id AND ard.user_id = ct.user_id
  WHERE tc.track_id = ct.id
) cp ON true
WHERE ct.archived = false;

-- Recreate track_cri_history_v without SECURITY DEFINER  
CREATE VIEW public.track_cri_history_v AS
SELECT 
  ard.track_id,
  ard.user_id,
  ard.cri_average,
  ard.readiness_score,
  ard.created_at as recorded_at,
  ard.title as resume_title,
  ct.title as track_title
FROM ai_resume_drafts ard
JOIN career_tracks ct ON ct.id = ard.track_id
WHERE ard.cri_average IS NOT NULL
  AND ard.track_id IS NOT NULL
ORDER BY ard.created_at DESC;

-- Add RLS policies for the views
ALTER VIEW public.user_track_progress_v SET (security_barrier = true);
ALTER VIEW public.track_cri_history_v SET (security_barrier = true);