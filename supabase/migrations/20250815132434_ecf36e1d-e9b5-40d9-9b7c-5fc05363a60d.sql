-- CRITICAL: Demo Data Seeding for Life Path Platform (Fixed conflicts)
-- This seeds essential data for the 10-step demo flow

-- First, insert demo user profiles
INSERT INTO public.profiles (user_id, name, email, role, created_at) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Aisha Khan', 'aisha@demo.com', 'user', NOW()),
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Mateo Silva', 'mateo@demo.com', 'user', NOW()),
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'Jade Chen', 'jade@demo.com', 'user', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Insert user preferences for completed onboarding (with proper array format)
INSERT INTO public.user_preferences (user_id, experience_level, has_completed_onboarding, preferred_features, last_active_date) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'intermediate', true, ARRAY['unified_dashboard', 'ai_recommendations'], NOW()),
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'beginner', true, ARRAY['skill_tree', 'course_recommendations'], NOW()),
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'advanced', true, ARRAY['market_intelligence', 'workflow_automation'], NOW())
ON CONFLICT (user_id) DO UPDATE SET
  experience_level = EXCLUDED.experience_level,
  has_completed_onboarding = EXCLUDED.has_completed_onboarding,
  preferred_features = EXCLUDED.preferred_features,
  last_active_date = EXCLUDED.last_active_date,
  updated_at = NOW();

-- Insert sample career goals (with proper array format)
INSERT INTO public.career_goals (user_id, title, description, target_role, estimated_timeline_weeks, active, skill_gaps, created_at) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Become a Data Scientist', 'Transition from business analyst to data scientist with focus on machine learning', 'Senior Data Scientist', 24, true, ARRAY['Python', 'Machine Learning', 'Statistics'], NOW()),
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Full Stack Developer', 'Learn complete web development stack to become a full stack developer', 'Full Stack Developer', 18, true, ARRAY['React', 'Node.js', 'Database Design'], NOW()),
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'UX Design Lead', 'Advance from UX designer to lead role with team management skills', 'UX Design Lead', 12, true, ARRAY['Leadership', 'Design Systems', 'User Research'], NOW())
ON CONFLICT DO NOTHING;

-- Insert sample AI resume drafts
INSERT INTO public.ai_resume_drafts (user_id, title, content, published_to_profile, cri_average, readiness_score, created_at) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Data Scientist Resume', '{"personalInfo":{"name":"Aisha Khan","email":"aisha@demo.com","title":"Data Scientist"},"experience":[{"title":"Business Analyst","company":"TechCorp","duration":"2022-2024","achievements":["Analyzed business metrics","Created data visualizations"]}],"skills":["Python","SQL","Tableau","Statistics"],"education":[{"degree":"BS Computer Science","school":"State University","year":"2022"}]}', true, 78.5, 82.0, NOW()),
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Full Stack Developer Resume', '{"personalInfo":{"name":"Mateo Silva","email":"mateo@demo.com","title":"Full Stack Developer"},"experience":[{"title":"Frontend Developer","company":"WebStudio","duration":"2023-2024","achievements":["Built responsive web applications","Collaborated with design team"]}],"skills":["JavaScript","React","HTML/CSS","Git"],"education":[{"degree":"Coding Bootcamp","school":"DevAcademy","year":"2023"}]}', true, 72.0, 75.5, NOW()),
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'UX Design Lead Resume', '{"personalInfo":{"name":"Jade Chen","email":"jade@demo.com","title":"UX Design Lead"},"experience":[{"title":"UX Designer","company":"DesignLab","duration":"2021-2024","achievements":["Led user research projects","Designed mobile applications"]}],"skills":["Figma","User Research","Prototyping","Design Systems"],"education":[{"degree":"MS HCI","school":"Design Institute","year":"2021"}]}', true, 85.2, 88.0, NOW())
ON CONFLICT DO NOTHING;

-- Insert basic badges for achievements
INSERT INTO public.badges (slug, name, emoji, description, trigger_type, threshold) VALUES
('first-goal', 'Goal Setter', '🎯', 'Set your first career goal', 'goal_count', 1),
('course-starter', 'Learning Begins', '📚', 'Started your first course', 'transcript_count', 1),
('resume-creator', 'Resume Builder', '📄', 'Created your first AI resume', 'published_resume_count', 1),
('skill-tracker', 'Skill Hunter', '⭐', 'Tracked progress on 5+ skills', 'saved_courses_count', 5),
('cri-achiever', 'Career Ready', '🚀', 'Achieved CRI score of 75+', 'cri_score', 75)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description;

-- Award badges to demo users (with proper UUID casting)
INSERT INTO public.user_badges (user_id, badge_id, earned_at) 
SELECT u.user_id::uuid, b.id, NOW()
FROM (VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585')
) AS u(user_id)
CROSS JOIN public.badges b
WHERE b.slug IN ('first-goal', 'course-starter', 'resume-creator')
ON CONFLICT DO NOTHING;

-- Insert user XP for gamification
INSERT INTO public.user_xp (user_id, total_xp, last_updated) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 750, NOW()),
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 480, NOW()),
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 920, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  last_updated = EXCLUDED.last_updated;

-- Insert market intelligence data for Discover Hub (no conflict constraint)
INSERT INTO public.market_trends (career_path, location, average_salary, growth_rate, job_postings_count, demand_score, competition_level, data_source, time_period, updated_at) VALUES
('Data Scientist', 'San Francisco, CA', 145000, 18.9, 1250, 95.5, 'high', 'job_boards', 'Q1_2024', NOW()),
('Data Scientist', 'New York, NY', 135000, 16.5, 980, 92.0, 'high', 'job_boards', 'Q1_2024', NOW()),
('Full Stack Developer', 'Austin, TX', 95000, 22.3, 1450, 88.5, 'medium', 'job_boards', 'Q1_2024', NOW()),
('Full Stack Developer', 'Seattle, WA', 118000, 19.8, 1100, 91.0, 'medium', 'job_boards', 'Q1_2024', NOW()),
('UX Designer', 'Los Angeles, CA', 85000, 12.1, 650, 75.5, 'medium', 'job_boards', 'Q1_2024', NOW()),
('UX Designer', 'Chicago, IL', 78000, 14.7, 420, 72.0, 'medium', 'job_boards', 'Q1_2024', NOW()),
('DevOps Engineer', 'Denver, CO', 115000, 25.4, 380, 96.0, 'low', 'job_boards', 'Q1_2024', NOW()),
('Product Manager', 'Boston, MA', 125000, 15.2, 720, 85.0, 'high', 'job_boards', 'Q1_2024', NOW());