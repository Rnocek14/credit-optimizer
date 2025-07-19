-- Create function to suggest badges user is close to earning
CREATE OR REPLACE FUNCTION suggest_badges_for_user(user_uuid uuid)
RETURNS TABLE (
  badge_id uuid,
  slug text,
  name text,
  emoji text,
  reason text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_stats AS (
    SELECT 
      user_uuid as user_id,
      (SELECT COUNT(*) FROM career_goals WHERE user_id = user_uuid AND active = true) as goal_count,
      (SELECT COUNT(*) FROM transcripts WHERE user_id = user_uuid) as transcript_count,
      (SELECT COUNT(*) FROM saved_courses WHERE user_id = user_uuid) as saved_courses_count,
      (SELECT COUNT(*) FROM ai_resume_drafts WHERE user_id = user_uuid AND published_to_profile = true) as published_resume_count,
      (SELECT COALESCE(MAX(cri_average), 0) FROM ai_resume_drafts WHERE user_id = user_uuid) as cri_score,
      (SELECT COALESCE(MAX(readiness_score), 0) FROM ai_resume_drafts WHERE user_id = user_uuid) as readiness_score
  ),
  earned_badges AS (
    SELECT badge_id FROM user_badges WHERE user_id = user_uuid
  )
  SELECT 
    b.id as badge_id,
    b.slug,
    b.name,
    b.emoji,
    CASE 
      WHEN b.trigger_type = 'goal_count' THEN 
        'You have completed ' || us.goal_count || ' of ' || b.threshold || ' goals needed'
      WHEN b.trigger_type = 'transcript_count' THEN 
        'You have added ' || us.transcript_count || ' of ' || b.threshold || ' transcripts needed'
      WHEN b.trigger_type = 'saved_courses_count' THEN 
        'You have saved ' || us.saved_courses_count || ' of ' || b.threshold || ' courses needed'
      WHEN b.trigger_type = 'published_resume_count' THEN 
        'You have published ' || us.published_resume_count || ' of ' || b.threshold || ' resume drafts needed'
      WHEN b.trigger_type = 'cri_score' THEN 
        'Your CRI score is ' || ROUND(us.cri_score) || '/' || b.threshold
      WHEN b.trigger_type = 'readiness_score' THEN 
        'Your readiness score is ' || ROUND(us.readiness_score) || '/' || b.threshold
      ELSE 'Progress toward this badge'
    END as reason
  FROM badges b
  CROSS JOIN user_stats us
  WHERE b.id NOT IN (SELECT badge_id FROM earned_badges)
    AND b.threshold IS NOT NULL
    AND (
      (b.trigger_type = 'goal_count' AND us.goal_count >= CEIL(b.threshold * 0.8) AND us.goal_count < b.threshold) OR
      (b.trigger_type = 'transcript_count' AND us.transcript_count >= CEIL(b.threshold * 0.8) AND us.transcript_count < b.threshold) OR
      (b.trigger_type = 'saved_courses_count' AND us.saved_courses_count >= CEIL(b.threshold * 0.8) AND us.saved_courses_count < b.threshold) OR
      (b.trigger_type = 'published_resume_count' AND us.published_resume_count >= CEIL(b.threshold * 0.8) AND us.published_resume_count < b.threshold) OR
      (b.trigger_type = 'cri_score' AND us.cri_score >= (b.threshold * 0.8) AND us.cri_score < b.threshold) OR
      (b.trigger_type = 'readiness_score' AND us.readiness_score >= (b.threshold * 0.8) AND us.readiness_score < b.threshold)
    )
  ORDER BY 
    CASE 
      WHEN b.trigger_type = 'goal_count' THEN us.goal_count::float / b.threshold
      WHEN b.trigger_type = 'transcript_count' THEN us.transcript_count::float / b.threshold
      WHEN b.trigger_type = 'saved_courses_count' THEN us.saved_courses_count::float / b.threshold
      WHEN b.trigger_type = 'published_resume_count' THEN us.published_resume_count::float / b.threshold
      WHEN b.trigger_type = 'cri_score' THEN us.cri_score::float / b.threshold
      WHEN b.trigger_type = 'readiness_score' THEN us.readiness_score::float / b.threshold
      ELSE 0
    END DESC
  LIMIT 5;
$$;