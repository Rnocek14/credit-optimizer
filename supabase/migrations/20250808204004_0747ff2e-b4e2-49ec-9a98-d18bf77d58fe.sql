
-- 1) Extend career_tracks for multi-track UX and archiving
ALTER TABLE public.career_tracks
  ADD COLUMN IF NOT EXISTS track_name text,
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

-- Backfill track_name from legacy title if needed
UPDATE public.career_tracks
SET track_name = COALESCE(track_name, title)
WHERE track_name IS NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_career_tracks_user_archived
  ON public.career_tracks (user_id, archived);

-- Prevent duplicate active track names per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_trackname_active
  ON public.career_tracks (user_id, track_name)
  WHERE archived = false;

-- Enable users to manage their own tracks (add if not present)
ALTER TABLE public.career_tracks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_tracks'
      AND policyname = 'Users can manage their own tracks'
  ) THEN
    CREATE POLICY "Users can manage their own tracks"
      ON public.career_tracks
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'career_tracks'
      AND policyname = 'Users can select their own tracks'
  ) THEN
    CREATE POLICY "Users can select their own tracks"
      ON public.career_tracks
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 2) Track-linked entities (skills, steps, courses, projects)
-- Skills mapped to career_graph_nodes (node_type='skill')
CREATE TABLE IF NOT EXISTS public.track_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.career_graph_nodes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_skills ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_track_skills_track ON public.track_skills (track_id);
CREATE INDEX IF NOT EXISTS idx_track_skills_node ON public.track_skills (skill_node_id);

CREATE POLICY "Users manage track_skills for their tracks"
  ON public.track_skills
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_skills.track_id AND ct.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_skills.track_id AND ct.user_id = auth.uid()
  ));

-- Steps mapped to career_steps
CREATE TABLE IF NOT EXISTS public.track_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.career_steps(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_track_steps_track ON public.track_steps (track_id);
CREATE INDEX IF NOT EXISTS idx_track_steps_step ON public.track_steps (step_id);

CREATE POLICY "Users manage track_steps for their tracks"
  ON public.track_steps
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_steps.track_id AND ct.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_steps.track_id AND ct.user_id = auth.uid()
  ));

-- Courses mapped generically by course_id (UUID from your catalog/progress)
-- No FK to unknown courses table to avoid migration failures
CREATE TABLE IF NOT EXISTS public.track_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_courses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_track_courses_track ON public.track_courses (track_id);
CREATE INDEX IF NOT EXISTS idx_track_courses_course ON public.track_courses (course_id);

CREATE POLICY "Users manage track_courses for their tracks"
  ON public.track_courses
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_courses.track_id AND ct.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_courses.track_id AND ct.user_id = auth.uid()
  ));

-- Projects mapped generically by project_id (UUID from Proof Projects state or future table)
CREATE TABLE IF NOT EXISTS public.track_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_track_projects_track ON public.track_projects (track_id);
CREATE INDEX IF NOT EXISTS idx_track_projects_project ON public.track_projects (project_id);

CREATE POLICY "Users manage track_projects for their tracks"
  ON public.track_projects
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_projects.track_id AND ct.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.career_tracks ct
    WHERE ct.id = track_projects.track_id AND ct.user_id = auth.uid()
  ));

-- 3) Transcript tagging (per-track usage of course progress)
-- We store (user_id, course_id, optional progress_id) for flexibility
CREATE TABLE IF NOT EXISTS public.course_progress_track_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  progress_id uuid NULL, -- optional reference to course_progress.id (not enforced)
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_progress_track_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cptu_user ON public.course_progress_track_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_cptu_track ON public.course_progress_track_usage (track_id);
CREATE INDEX IF NOT EXISTS idx_cptu_course ON public.course_progress_track_usage (course_id);

CREATE POLICY "Users manage their own course_progress_track_usage"
  ON public.course_progress_track_usage
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Resume drafts scoped to track (one profile per track)
ALTER TABLE public.ai_resume_drafts
  ADD COLUMN IF NOT EXISTS track_id uuid NULL REFERENCES public.career_tracks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_resume_drafts_track ON public.ai_resume_drafts (track_id);

-- Existing ai_resume_drafts RLS (user_id ownership) remains valid

-- 5) Per-track Gamification (XP and Badges)
CREATE TABLE IF NOT EXISTS public.user_track_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);
ALTER TABLE public.user_track_xp ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_track_xp_user_track ON public.user_track_xp (user_id, track_id);

CREATE POLICY "Users manage their own user_track_xp"
  ON public.user_track_xp
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_track_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  xp integer NOT NULL,
  reason text NULL,
  source text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_track_xp_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_track_xp_events_user_track ON public.user_track_xp_events (user_id, track_id);
CREATE INDEX IF NOT EXISTS idx_user_track_xp_events_created ON public.user_track_xp_events (created_at DESC);

CREATE POLICY "Users manage their own user_track_xp_events"
  ON public.user_track_xp_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_track_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id, badge_id)
);
ALTER TABLE public.user_track_badges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_track_badges_user_track ON public.user_track_badges (user_id, track_id);

CREATE POLICY "Users manage their own user_track_badges"
  ON public.user_track_badges
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6) Mentor verifications per-track
CREATE TABLE IF NOT EXISTS public.track_mentor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,   -- owner of the track (redundant but helpful for RLS)
  mentor_id uuid NOT NULL, -- verifier
  entity_type text NOT NULL, -- 'project' | 'skill' | 'step' | 'course'
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  impact_notes text NULL,
  verification_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_mentor_verifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tmv_track ON public.track_mentor_verifications (track_id);
CREATE INDEX IF NOT EXISTS idx_tmv_user ON public.track_mentor_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_tmv_mentor ON public.track_mentor_verifications (mentor_id);
CREATE INDEX IF NOT EXISTS idx_tmv_entity ON public.track_mentor_verifications (entity_type, entity_id);

-- Users can view verifications for their tracks
CREATE POLICY "Users can view mentor verifications for their tracks"
  ON public.track_mentor_verifications
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.career_tracks ct
      WHERE ct.id = track_id AND ct.user_id = auth.uid()
    )
  );

-- Mentors can insert/update verifications they authored
CREATE POLICY "Mentors can insert their verifications"
  ON public.track_mentor_verifications
  FOR INSERT
  WITH CHECK (mentor_id = auth.uid() AND public.is_mentor());

CREATE POLICY "Mentors can update their verifications"
  ON public.track_mentor_verifications
  FOR UPDATE
  USING (mentor_id = auth.uid() AND public.is_mentor())
  WITH CHECK (mentor_id = auth.uid() AND public.is_mentor());

-- Owners can update status to acknowledge (optional)
CREATE POLICY "Users can update verifications on their tracks"
  ON public.track_mentor_verifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 7) Helper: clone a career track (copies mappings)
CREATE OR REPLACE FUNCTION public.clone_career_track(source_track_id uuid, new_track_name text, new_icon text DEFAULT NULL, new_color text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  src_user uuid;
  new_track uuid;
BEGIN
  -- Ensure the source track belongs to the caller
  SELECT user_id INTO src_user
  FROM public.career_tracks
  WHERE id = source_track_id;

  IF src_user IS NULL OR src_user <> auth.uid() THEN
    RAISE EXCEPTION 'Insufficient permissions to clone this track';
  END IF;

  -- Create new track (inherit select fields)
  INSERT INTO public.career_tracks (user_id, track_name, title, goal, icon, color, archived, order_index, description, growth_potential, time_to_proficiency, reasoning)
  SELECT user_id,
         new_track_name,
         COALESCE(new_track_name, title),
         goal,
         COALESCE(new_icon, icon),
         COALESCE(new_color, color),
         false,
         order_index,
         description,
         growth_potential,
         time_to_proficiency,
         reasoning
  FROM public.career_tracks
  WHERE id = source_track_id
  RETURNING id INTO new_track;

  -- Copy mappings
  INSERT INTO public.track_skills (track_id, skill_node_id)
  SELECT new_track, skill_node_id FROM public.track_skills WHERE track_id = source_track_id;

  INSERT INTO public.track_steps (track_id, step_id)
  SELECT new_track, step_id FROM public.track_steps WHERE track_id = source_track_id;

  INSERT INTO public.track_courses (track_id, course_id)
  SELECT new_track, course_id FROM public.track_courses WHERE track_id = source_track_id;

  INSERT INTO public.track_projects (track_id, project_id)
  SELECT new_track, project_id FROM public.track_projects WHERE track_id = source_track_id;

  RETURN new_track;
END;
$$;
