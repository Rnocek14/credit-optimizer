-- 1) View: per-user transcript health (duplicates, total)
CREATE OR REPLACE VIEW public.v_transcript_health AS
SELECT
  u.id as user_id,
  COALESCE(COUNT(tu.id), 0) as total_tags,
  COALESCE(SUM(CASE WHEN dup.cnt > 1 THEN 1 ELSE 0 END), 0) as duplicate_rows
FROM auth.users u
LEFT JOIN public.course_progress_track_usage tu ON tu.user_id = u.id
LEFT JOIN (
  SELECT user_id, track_id, course_id, COUNT(*) as cnt
  FROM public.course_progress_track_usage
  GROUP BY user_id, track_id, course_id
) dup ON dup.user_id = tu.user_id AND dup.track_id = tu.track_id AND dup.course_id = tu.course_id
GROUP BY u.id;

-- 2) RLS for the view
ALTER VIEW public.v_transcript_health SET (security_invoker = on);

-- 3) Helper function for cleaner client calls
CREATE OR REPLACE FUNCTION public.get_transcript_health()
RETURNS TABLE(total_tags int, duplicate_rows int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT th.total_tags::int, th.duplicate_rows::int
  FROM public.v_transcript_health th
  WHERE th.user_id = auth.uid();
$$;

-- 4) Alternative courses catalog table
CREATE TABLE IF NOT EXISTS public.alternative_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('YouTube','Masterclass','Udemy','HustlersU','Other')),
  url text NOT NULL,
  difficulty int CHECK (difficulty BETWEEN 1 AND 5),
  estimated_hours int,
  cri_score int,
  created_at timestamptz DEFAULT now()
);

-- 5) User tagging for alternative courses
CREATE TABLE IF NOT EXISTS public.user_alt_course_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  alt_course_id uuid NOT NULL REFERENCES public.alternative_courses(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id, alt_course_id)
);

-- 6) RLS policies
ALTER TABLE public.alternative_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alt_course_usage ENABLE ROW LEVEL SECURITY;

-- Alternative courses readable by all authenticated users
CREATE POLICY "alt_courses_read" ON public.alternative_courses
  FOR SELECT USING (true);

-- User alt usage - owner only
CREATE POLICY "user_alt_usage_owner" ON public.user_alt_course_usage
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alt_courses_provider ON public.alternative_courses(provider);
CREATE INDEX IF NOT EXISTS idx_alt_courses_created_at ON public.alternative_courses(created_at);
CREATE INDEX IF NOT EXISTS idx_user_alt_usage_user_track ON public.user_alt_course_usage(user_id, track_id);

-- 8) Seed some example alternative courses
INSERT INTO public.alternative_courses (title, provider, url, difficulty, estimated_hours, cri_score)
VALUES
('Python Data Analysis - Complete Course', 'YouTube', 'https://www.youtube.com/playlist?list=PL-osiE80TeTsWmV9i9c58mdDCSskIFdDS', 2, 12, 75),
('Chris Voss: The Art of Negotiation', 'Masterclass', 'https://www.masterclass.com/classes/chris-voss-the-art-of-negotiation', 2, 6, 80),
('Business Fundamentals', 'HustlersU', 'https://www.cobratate.com/', 3, 10, 65),
('Complete React Developer Course', 'Udemy', 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', 3, 40, 85),
('Machine Learning Crash Course', 'YouTube', 'https://www.youtube.com/playlist?list=PLqnslRFeH2UoP2bKTEZKN0o0q7tBc5t8b', 4, 25, 82)
ON CONFLICT DO NOTHING;