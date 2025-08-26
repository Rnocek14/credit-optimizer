-- Master Integration: Remaining Tables (Part 3)

-- Multi-Track system (career tracks)
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  difficulty_level TEXT DEFAULT 'beginner',
  estimated_duration_weeks INTEGER DEFAULT 12,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tracks" ON public.tracks
  FOR SELECT USING (active = true);

CREATE POLICY "Service role can manage tracks" ON public.tracks
  FOR ALL USING (true) WITH CHECK (true);

-- Track required skills with target levels
CREATE TABLE IF NOT EXISTS public.track_skills (
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  required_level NUMERIC(4,2) DEFAULT 5.0 CHECK (required_level >= 0 AND required_level <= 10),
  weight NUMERIC(4,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 10),
  is_core BOOLEAN DEFAULT true,
  PRIMARY KEY (track_id, skill_id)
);

ALTER TABLE public.track_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view track skills" ON public.track_skills
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage track skills" ON public.track_skills
  FOR ALL USING (true) WITH CHECK (true);

-- User course events (transcript/completion data)
CREATE TABLE IF NOT EXISTS public.user_course_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('enrolled','in_progress','completed','assessed','dropped')),
  progress_percent NUMERIC(5,2) DEFAULT 0.00 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  grade TEXT,
  completion_date DATE,
  source TEXT DEFAULT 'self_report',
  evidence JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_course_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own course events" ON public.user_course_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own course events" ON public.user_course_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all course events" ON public.user_course_events
  FOR ALL USING (true) WITH CHECK (true);

-- CRI cache per user per track
CREATE TABLE IF NOT EXISTS public.track_cri_cache (
  user_id UUID NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  cri NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (cri >= 0 AND cri <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  skill_levels JSONB DEFAULT '{}'::jsonb,
  gaps JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

ALTER TABLE public.track_cri_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own CRI cache" ON public.track_cri_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage CRI cache" ON public.track_cri_cache
  FOR ALL USING (true) WITH CHECK (true);

-- User track assignments
CREATE TABLE IF NOT EXISTS public.user_tracks (
  user_id UUID NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  target_completion_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

ALTER TABLE public.user_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own track assignments" ON public.user_tracks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage user tracks" ON public.user_tracks
  FOR ALL USING (true) WITH CHECK (true);

-- Apply triggers
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_course_events_updated_at BEFORE UPDATE ON public.user_course_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_tracks_updated_at BEFORE UPDATE ON public.user_tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();