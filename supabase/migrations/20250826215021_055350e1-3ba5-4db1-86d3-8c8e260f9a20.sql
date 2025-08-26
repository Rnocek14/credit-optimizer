-- Master Integration: Seed Initial Data (Part 5)

-- Seed some initial platforms
INSERT INTO public.course_platforms (slug, name, website_url, api_enabled) VALUES
  ('coursera', 'Coursera', 'https://www.coursera.org', false),
  ('edx', 'edX', 'https://www.edx.org', false),
  ('udemy', 'Udemy', 'https://www.udemy.com', false),
  ('khan-academy', 'Khan Academy', 'https://www.khanacademy.org', false)
ON CONFLICT (slug) DO NOTHING;

-- Seed some initial skills
INSERT INTO public.skills (slug, name, category, market_demand_score) VALUES
  ('javascript', 'JavaScript', 'Programming', 8.5),
  ('python', 'Python', 'Programming', 9.0),
  ('react', 'React', 'Frontend', 8.0),
  ('node-js', 'Node.js', 'Backend', 7.5),
  ('sql', 'SQL', 'Database', 8.0),
  ('data-analysis', 'Data Analysis', 'Analytics', 7.8),
  ('machine-learning', 'Machine Learning', 'AI/ML', 9.2),
  ('product-strategy', 'Product Strategy', 'Product', 7.0),
  ('ui-ux-design', 'UI/UX Design', 'Design', 6.8),
  ('project-management', 'Project Management', 'Management', 7.2)
ON CONFLICT (slug) DO NOTHING;

-- Seed some initial tracks
INSERT INTO public.tracks (slug, name, description, category, estimated_duration_weeks) VALUES
  ('fullstack-developer', 'Full Stack Developer', 'Complete web development skills from frontend to backend', 'Engineering', 16),
  ('product-manager', 'Product Manager', 'Product strategy, planning, and execution skills', 'Product', 12),
  ('data-analyst', 'Data Analyst', 'Data analysis, visualization, and insights generation', 'Analytics', 14),
  ('frontend-developer', 'Frontend Developer', 'Modern frontend development with React and JavaScript', 'Engineering', 10),
  ('backend-developer', 'Backend Developer', 'Server-side development and database management', 'Engineering', 12)
ON CONFLICT (slug) DO NOTHING;

-- Create track-skill mappings
DO $$
DECLARE
    track_record RECORD;
    skill_record RECORD;
BEGIN
    -- Full Stack Developer track skills
    SELECT id INTO track_record FROM public.tracks WHERE slug = 'fullstack-developer';
    IF FOUND THEN
        FOR skill_record IN SELECT id FROM public.skills WHERE slug IN ('javascript', 'react', 'node-js', 'sql') LOOP
            INSERT INTO public.track_skills (track_id, skill_id, required_level, weight, is_core) 
            VALUES (track_record.id, skill_record.id, 7.0, 1.0, true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Product Manager track skills
    SELECT id INTO track_record FROM public.tracks WHERE slug = 'product-manager';
    IF FOUND THEN
        FOR skill_record IN SELECT id FROM public.skills WHERE slug IN ('product-strategy', 'data-analysis', 'project-management') LOOP
            INSERT INTO public.track_skills (track_id, skill_id, required_level, weight, is_core) 
            VALUES (track_record.id, skill_record.id, 8.0, 1.0, true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Data Analyst track skills
    SELECT id INTO track_record FROM public.tracks WHERE slug = 'data-analyst';
    IF FOUND THEN
        FOR skill_record IN SELECT id FROM public.skills WHERE slug IN ('python', 'sql', 'data-analysis', 'machine-learning') LOOP
            INSERT INTO public.track_skills (track_id, skill_id, required_level, weight, is_core) 
            VALUES (track_record.id, skill_record.id, 7.5, 1.0, true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;