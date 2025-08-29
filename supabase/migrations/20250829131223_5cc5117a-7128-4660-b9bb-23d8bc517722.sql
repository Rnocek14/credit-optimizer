
-- 1) If an older table exists, rename it to match the code's expectation
DO $$
BEGIN
  IF to_regclass('public.course_progress_track_usage') IS NULL
     AND to_regclass('public.track_course_usage') IS NOT NULL THEN
    ALTER TABLE public.track_course_usage RENAME TO course_progress_track_usage;
  END IF;
END$$;

-- 2) Create the table if it doesn't exist (aligned with the hook/interface)
CREATE TABLE IF NOT EXISTS public.course_progress_track_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  course_id text NOT NULL,
  progress_id uuid NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Backfill/normalize columns if table existed with different names/types
DO $$
BEGIN
  -- Rename progress_notes -> note if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='progress_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='note'
  ) THEN
    ALTER TABLE public.course_progress_track_usage
      RENAME COLUMN progress_notes TO note;
  END IF;

  -- Rename added_at -> created_at if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='added_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='created_at'
  ) THEN
    ALTER TABLE public.course_progress_track_usage
      RENAME COLUMN added_at TO created_at;
  END IF;

  -- Add missing columns (progress_id, note, created_at)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='progress_id'
  ) THEN
    ALTER TABLE public.course_progress_track_usage ADD COLUMN progress_id uuid NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='note'
  ) THEN
    ALTER TABLE public.course_progress_track_usage ADD COLUMN note text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='course_progress_track_usage' 
      AND column_name='created_at'
  ) THEN
    ALTER TABLE public.course_progress_track_usage ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  -- Ensure created_at default
  BEGIN
    ALTER TABLE public.course_progress_track_usage
      ALTER COLUMN created_at SET DEFAULT now();
  EXCEPTION WHEN others THEN
    -- ignore if not needed
    NULL;
  END;

  -- Align course_id to TEXT if it was UUID
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='course_progress_track_usage'
      AND column_name='course_id'
      AND data_type='uuid'
  ) THEN
    ALTER TABLE public.course_progress_track_usage
      ALTER COLUMN course_id TYPE text USING course_id::text;
  END IF;
END$$;

-- 4) RLS: enable and create owner-only policies
ALTER TABLE public.course_progress_track_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='course_progress_track_usage' 
      AND policyname='cptu_select_self'
  ) THEN
    CREATE POLICY cptu_select_self 
      ON public.course_progress_track_usage
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='course_progress_track_usage' 
      AND policyname='cptu_insert_self'
  ) THEN
    CREATE POLICY cptu_insert_self 
      ON public.course_progress_track_usage
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='course_progress_track_usage' 
      AND policyname='cptu_update_self'
  ) THEN
    CREATE POLICY cptu_update_self 
      ON public.course_progress_track_usage
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='course_progress_track_usage' 
      AND policyname='cptu_delete_self'
  ) THEN
    CREATE POLICY cptu_delete_self 
      ON public.course_progress_track_usage
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 5) Indexes: uniqueness and helpful lookups
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cptu_user_track_course
ON public.course_progress_track_usage (user_id, track_id, course_id);

CREATE INDEX IF NOT EXISTS idx_cptu_user
ON public.course_progress_track_usage (user_id);

CREATE INDEX IF NOT EXISTS idx_cptu_track
ON public.course_progress_track_usage (track_id);

CREATE INDEX IF NOT EXISTS idx_cptu_course
ON public.course_progress_track_usage (course_id);
