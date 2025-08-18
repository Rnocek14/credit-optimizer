-- Phase 1: Database foundation - add missing track_id columns and indexes
-- Safe migration with IF NOT EXISTS guards
BEGIN;

-- 1) Add track_id to course_progress (nullable for backward compatibility)
ALTER TABLE public.course_progress
  ADD COLUMN IF NOT EXISTS track_id uuid;

-- Index for common queries by user and track
CREATE INDEX IF NOT EXISTS idx_course_progress_user_track
  ON public.course_progress (user_id, track_id);

-- 2) Add track_id to autonomous_workflows (nullable for backward compatibility)
ALTER TABLE public.autonomous_workflows
  ADD COLUMN IF NOT EXISTS track_id uuid;

-- Index for common queries by user and track
CREATE INDEX IF NOT EXISTS idx_workflows_user_track
  ON public.autonomous_workflows (user_id, track_id);

-- 3) Ensure ai_resume_drafts has a performant user+track index (column already exists per current schema)
CREATE INDEX IF NOT EXISTS idx_ai_resume_drafts_user_track
  ON public.ai_resume_drafts (user_id, track_id);

COMMIT;