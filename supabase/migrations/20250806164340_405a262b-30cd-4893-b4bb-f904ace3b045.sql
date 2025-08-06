-- Fix mentor analytics system issues (without foreign key dependency)

-- Add validated_at column to course_intelligence_pipeline
ALTER TABLE public.course_intelligence_pipeline 
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone;

-- Fix the calculate_mentor_performance_metrics function
CREATE OR REPLACE FUNCTION public.calculate_mentor_performance_metrics(mentor_user_id uuid, start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE(courses_reviewed integer, courses_approved integer, courses_rejected integer, approval_rate numeric, avg_review_time_hours numeric, impact_score numeric, quality_score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH validation_stats AS (
    SELECT 
      COUNT(*) as total_reviewed,
      COUNT(*) FILTER (WHERE mentor_validation_status = 'approved') as approved,
      COUNT(*) FILTER (WHERE mentor_validation_status = 'rejected') as rejected,
      AVG(EXTRACT(EPOCH FROM (COALESCE(validated_at, updated_at) - created_at)) / 3600) as avg_hours
    FROM public.course_intelligence_pipeline
    WHERE validated_by = mentor_user_id
      AND COALESCE(validated_at, updated_at) BETWEEN start_date AND end_date
  ),
  feedback_stats AS (
    SELECT 
      AVG(course_quality_rating)::NUMERIC as avg_quality,
      AVG(learning_outcome_rating)::NUMERIC as avg_outcome
    FROM public.mentor_course_feedback mcf
    JOIN public.course_intelligence_pipeline cip ON cip.course_id = mcf.course_id
    WHERE cip.validated_by = mentor_user_id
      AND mcf.created_at BETWEEN start_date AND end_date
  )
  SELECT 
    vs.total_reviewed::INTEGER,
    vs.approved::INTEGER,
    vs.rejected::INTEGER,
    CASE WHEN vs.total_reviewed > 0 THEN (vs.approved::NUMERIC / vs.total_reviewed * 100) ELSE 0 END,
    COALESCE(vs.avg_hours, 0)::NUMERIC,
    COALESCE(fs.avg_outcome * 20, 50)::NUMERIC, -- Convert 1-5 scale to 0-100
    COALESCE(fs.avg_quality * 20, 50)::NUMERIC   -- Convert 1-5 scale to 0-100
  FROM validation_stats vs
  CROSS JOIN feedback_stats fs;
END;
$function$;