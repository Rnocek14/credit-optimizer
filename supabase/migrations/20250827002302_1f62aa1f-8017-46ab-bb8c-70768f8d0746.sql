-- Fix security issues: Add missing RLS policies for CI tables (fixed version)

-- Add RLS policies for ci_instructors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_instructors' AND policyname = 'Anyone can view instructors') THEN
    CREATE POLICY "Anyone can view instructors" ON public.ci_instructors FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_instructors' AND policyname = 'Service role can manage instructors') THEN
    CREATE POLICY "Service role can manage instructors" ON public.ci_instructors FOR ALL USING (true);
  END IF;
END $$;

-- Add RLS policies for ci_courses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_courses' AND policyname = 'Anyone can view active courses') THEN
    CREATE POLICY "Anyone can view active courses" ON public.ci_courses FOR SELECT USING (active = true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_courses' AND policyname = 'Service role can manage courses') THEN
    CREATE POLICY "Service role can manage courses" ON public.ci_courses FOR ALL USING (true);
  END IF;
END $$;

-- Add RLS policies for ci_course_cri_scores
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_course_cri_scores' AND policyname = 'Anyone can view course CRI scores') THEN
    CREATE POLICY "Anyone can view course CRI scores" ON public.ci_course_cri_scores FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_course_cri_scores' AND policyname = 'Service role can manage course CRI scores') THEN
    CREATE POLICY "Service role can manage course CRI scores" ON public.ci_course_cri_scores FOR ALL USING (true);
  END IF;
END $$;

-- Add RLS policies for ci_track_cri_cache
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_track_cri_cache' AND policyname = 'Users can view their own CRI cache') THEN
    CREATE POLICY "Users can view their own CRI cache" ON public.ci_track_cri_cache FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_track_cri_cache' AND policyname = 'Users can manage their own CRI cache') THEN
    CREATE POLICY "Users can manage their own CRI cache" ON public.ci_track_cri_cache FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ci_track_cri_cache' AND policyname = 'Service role can manage all CRI cache') THEN
    CREATE POLICY "Service role can manage all CRI cache" ON public.ci_track_cri_cache FOR ALL USING (true);
  END IF;
END $$;

-- Add RLS policies for user_course_events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_course_events' AND policyname = 'Users can view their own course events') THEN
    CREATE POLICY "Users can view their own course events" ON public.user_course_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_course_events' AND policyname = 'Users can manage their own course events') THEN
    CREATE POLICY "Users can manage their own course events" ON public.user_course_events FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_course_events' AND policyname = 'Service role can manage all course events') THEN
    CREATE POLICY "Service role can manage all course events" ON public.user_course_events FOR ALL USING (true);
  END IF;
END $$;

-- Add sample course data with simpler conflict handling
INSERT INTO public.ci_courses (title, slug, platform_id, instructor_id, difficulty, duration_hours, url, active) 
SELECT 
  'React Complete Course', 
  'react-complete', 
  (SELECT id FROM public.ci_platforms WHERE slug = 'udemy' LIMIT 1),
  (SELECT id FROM public.ci_instructors WHERE name = 'John Doe' LIMIT 1),
  3, 40, 'https://udemy.com/react-complete', true
WHERE NOT EXISTS (SELECT 1 FROM public.ci_courses WHERE slug = 'react-complete');

INSERT INTO public.ci_courses (title, slug, platform_id, instructor_id, difficulty, duration_hours, url, active) 
SELECT 
  'Advanced JavaScript', 
  'advanced-js', 
  (SELECT id FROM public.ci_platforms WHERE slug = 'coursera' LIMIT 1),
  (SELECT id FROM public.ci_instructors WHERE name = 'Jane Smith' LIMIT 1),
  4, 30, 'https://coursera.org/advanced-js', true
WHERE NOT EXISTS (SELECT 1 FROM public.ci_courses WHERE slug = 'advanced-js');

INSERT INTO public.ci_courses (title, slug, platform_id, instructor_id, difficulty, duration_hours, url, active) 
SELECT 
  'Product Management Fundamentals', 
  'pm-fundamentals', 
  (SELECT id FROM public.ci_platforms WHERE slug = 'udemy' LIMIT 1),
  (SELECT id FROM public.ci_instructors WHERE name = 'John Doe' LIMIT 1),
  2, 25, 'https://udemy.com/pm-fundamentals', true
WHERE NOT EXISTS (SELECT 1 FROM public.ci_courses WHERE slug = 'pm-fundamentals');