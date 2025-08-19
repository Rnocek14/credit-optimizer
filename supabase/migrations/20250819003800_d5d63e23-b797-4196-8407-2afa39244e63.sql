-- Phase 1: Critical Security & Data Integrity Fixes

-- 1. Update RLS policies for course_progress to include track ownership validation
DROP POLICY IF EXISTS "Users can manage their own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can create their own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can update their own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can view their own course progress" ON public.course_progress;
DROP POLICY IF EXISTS "Users can delete their own course progress" ON public.course_progress;

-- Create secure RLS policies for course_progress with track ownership validation
CREATE POLICY "Users can manage their own course progress with track access" 
ON public.course_progress 
FOR ALL 
USING (
  auth.uid() = user_id AND 
  (track_id IS NULL OR track_id IN (
    SELECT id FROM public.career_tracks WHERE user_id = auth.uid()
  ))
)
WITH CHECK (
  auth.uid() = user_id AND 
  (track_id IS NULL OR track_id IN (
    SELECT id FROM public.career_tracks WHERE user_id = auth.uid()
  ))
);

-- 2. Update RLS policies for autonomous_workflows to include track ownership validation
DROP POLICY IF EXISTS "Users can manage their own workflows" ON public.autonomous_workflows;

-- Create secure RLS policies for autonomous_workflows with track ownership validation
CREATE POLICY "Users can manage their own workflows with track access" 
ON public.autonomous_workflows 
FOR ALL 
USING (
  auth.uid() = user_id AND 
  (track_id IS NULL OR track_id IN (
    SELECT id FROM public.career_tracks WHERE user_id = auth.uid()
  ))
)
WITH CHECK (
  auth.uid() = user_id AND 
  (track_id IS NULL OR track_id IN (
    SELECT id FROM public.career_tracks WHERE user_id = auth.uid()
  ))
);

-- 3. Add composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_progress_user_track_status 
ON public.course_progress (user_id, track_id, status);

CREATE INDEX IF NOT EXISTS idx_autonomous_workflows_user_track_status 
ON public.autonomous_workflows (user_id, track_id, status);

-- 4. Backfill existing course_progress records with active track
WITH active_tracks AS (
  SELECT DISTINCT ON (user_id) user_id, id as track_id
  FROM public.career_tracks 
  WHERE archived = false
  ORDER BY user_id, created_at ASC
)
UPDATE public.course_progress 
SET track_id = active_tracks.track_id
FROM active_tracks
WHERE course_progress.user_id = active_tracks.user_id 
  AND course_progress.track_id IS NULL;

-- 5. Backfill existing autonomous_workflows records with active track
WITH active_tracks AS (
  SELECT DISTINCT ON (user_id) user_id, id as track_id
  FROM public.career_tracks 
  WHERE archived = false
  ORDER BY user_id, created_at ASC
)
UPDATE public.autonomous_workflows 
SET track_id = active_tracks.track_id
FROM active_tracks
WHERE autonomous_workflows.user_id = active_tracks.user_id 
  AND autonomous_workflows.track_id IS NULL;