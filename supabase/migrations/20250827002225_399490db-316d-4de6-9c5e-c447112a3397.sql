-- Fix security issues: Add missing RLS policies for CI tables

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

-- Add some sample course data to test with
DO $$
DECLARE
  platform_udemy UUID;
  platform_coursera UUID;
  instructor_john UUID;
  instructor_jane UUID;
  course_id_1 UUID;
  course_id_2 UUID;
BEGIN
  -- Get platform IDs
  SELECT id INTO platform_udemy FROM public.ci_platforms WHERE slug = 'udemy';
  SELECT id INTO platform_coursera FROM public.ci_platforms WHERE slug = 'coursera';
  
  -- Get instructor IDs
  SELECT id INTO instructor_john FROM public.ci_instructors WHERE name = 'John Doe';
  SELECT id INTO instructor_jane FROM public.ci_instructors WHERE name = 'Jane Smith';
  
  -- Insert sample courses
  INSERT INTO public.ci_courses (title, slug, platform_id, instructor_id, difficulty, duration_hours, url, active) VALUES 
  ('React Complete Course', 'react-complete', platform_udemy, instructor_john, 3, 40, 'https://udemy.com/react-complete', true),
  ('Advanced JavaScript', 'advanced-js', platform_coursera, instructor_jane, 4, 30, 'https://coursera.org/advanced-js', true),
  ('Product Management Fundamentals', 'pm-fundamentals', platform_udemy, instructor_john, 2, 25, 'https://udemy.com/pm-fundamentals', true),
  ('UX Design Masterclass', 'ux-design', platform_coursera, instructor_jane, 3, 35, 'https://coursera.org/ux-design', true)
  ON CONFLICT (title, platform_id) DO NOTHING
  RETURNING id INTO course_id_1;

  -- Insert sample CRI scores for courses
  INSERT INTO public.ci_course_cri_scores (course_id, rigor_score, difficulty_score, outcome_score) 
  SELECT id, 85, 75, 90 FROM public.ci_courses WHERE slug = 'react-complete'
  ON CONFLICT (course_id) DO NOTHING;
  
  INSERT INTO public.ci_course_cri_scores (course_id, rigor_score, difficulty_score, outcome_score) 
  SELECT id, 90, 85, 88 FROM public.ci_courses WHERE slug = 'advanced-js'
  ON CONFLICT (course_id) DO NOTHING;
  
  INSERT INTO public.ci_course_cri_scores (course_id, rigor_score, difficulty_score, outcome_score) 
  SELECT id, 80, 65, 85 FROM public.ci_courses WHERE slug = 'pm-fundamentals'
  ON CONFLICT (course_id) DO NOTHING;
  
  INSERT INTO public.ci_course_cri_scores (course_id, rigor_score, difficulty_score, outcome_score) 
  SELECT id, 88, 70, 92 FROM public.ci_courses WHERE slug = 'ux-design'
  ON CONFLICT (course_id) DO NOTHING;
END $$;