-- Add unique constraint to prevent duplicate track course tagging
CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_progress_track_usage_user_track_course 
ON public.course_progress_track_usage (user_id, track_id, course_id);

-- Add index for better performance on course_id lookups
CREATE INDEX IF NOT EXISTS idx_course_progress_track_usage_course 
ON public.course_progress_track_usage (course_id);