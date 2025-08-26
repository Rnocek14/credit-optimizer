-- Master Integration: Final Schema Bits (Part 4)

-- Course substitutions/alternatives
CREATE TABLE IF NOT EXISTS public.course_substitutions (
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  substitute_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  reason TEXT,
  equivalence_score NUMERIC(4,2) DEFAULT 1.0 CHECK (equivalence_score >= 0 AND equivalence_score <= 1.0),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (course_id, substitute_course_id)
);

ALTER TABLE public.course_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course substitutions" ON public.course_substitutions
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage course substitutions" ON public.course_substitutions
  FOR ALL USING (true) WITH CHECK (true);

-- Function execution telemetry
CREATE TABLE IF NOT EXISTS public.fn_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fn_name TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL CHECK (status IN ('ok','error','timeout')),
  latency_ms INTEGER,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10,4) DEFAULT 0,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fn_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fn_runs" ON public.fn_runs
  FOR SELECT USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Service role can manage fn_runs" ON public.fn_runs
  FOR ALL USING (true) WITH CHECK (true);

-- Create supporting view now that dependencies exist
CREATE OR REPLACE VIEW public.courses_enriched AS
SELECT 
  c.*,
  i.prestige_score,
  i.name as instructor_name,
  i.rating_avg as instructor_rating,
  p.name as platform_name,
  p.slug as platform_slug
FROM public.courses c
LEFT JOIN public.instructors i ON i.id = c.instructor_id
LEFT JOIN public.course_platforms p ON p.id = c.platform_id;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_platform ON public.courses(platform_id);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_course_skills_skill ON public.course_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_course_skills_course ON public.course_skills(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_user ON public.user_course_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_course ON public.user_course_events(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_events_type ON public.user_course_events(event_type);
CREATE INDEX IF NOT EXISTS idx_track_skills_track ON public.track_skills(track_id);
CREATE INDEX IF NOT EXISTS idx_track_skills_skill ON public.track_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_track_cri_cache_user ON public.track_cri_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracks_user ON public.user_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_fn_runs_fn_name ON public.fn_runs(fn_name);
CREATE INDEX IF NOT EXISTS idx_fn_runs_created_at ON public.fn_runs(created_at);