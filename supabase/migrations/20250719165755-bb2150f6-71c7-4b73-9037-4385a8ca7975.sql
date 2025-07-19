
-- Create comprehensive demo data for all 3 demo users

-- 1. Ensure all demo users have profiles with complete information
INSERT INTO public.profiles (user_id, name, role_title, experience_level, industry, skills, location, gallery_enabled) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Aisha Khan', 'Senior Software Engineer', 'Senior', 'Technology', ARRAY['JavaScript', 'React', 'Node.js', 'Python', 'AWS'], 'San Francisco, CA', true),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Mateo Silva', 'Product Manager', 'Mid-level', 'Technology', ARRAY['Product Strategy', 'Agile', 'Data Analysis', 'User Research', 'Roadmapping'], 'Austin, TX', true),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'Jade Chen', 'UX Designer', 'Mid-level', 'Design', ARRAY['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Usability Testing'], 'Seattle, WA', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role_title = EXCLUDED.role_title,
  experience_level = EXCLUDED.experience_level,
  industry = EXCLUDED.industry,
  skills = EXCLUDED.skills,
  location = EXCLUDED.location,
  gallery_enabled = EXCLUDED.gallery_enabled;

-- 2. Set up XP data for all demo users with varied levels
INSERT INTO public.user_xp (user_id, total_xp) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 750),  -- Level 3
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 1200), -- Level 4
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 180)   -- Level 2
ON CONFLICT (user_id) 
DO UPDATE SET total_xp = EXCLUDED.total_xp;

-- 3. Create comprehensive resume drafts for all demo users
INSERT INTO public.ai_resume_drafts (user_id, title, content, published_to_profile, cri_average, readiness_score) VALUES
  (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 
    'Senior Software Engineer Resume',
    '{
      "summary": "Experienced software engineer with 8+ years building scalable web applications and leading technical teams.",
      "bullets": [
        "Led development of microservices architecture serving 2M+ users, reducing API response time by 40%",
        "Mentored 12 junior developers and established coding standards adopted across 3 engineering teams",
        "Built real-time analytics dashboard using React and Node.js, increasing user engagement by 25%",
        "Architected CI/CD pipeline reducing deployment time from 2 hours to 15 minutes"
      ],
      "skills": {
        "Technical": ["JavaScript", "React", "Node.js", "Python", "AWS", "Docker", "PostgreSQL"],
        "Leadership": ["Team Management", "Code Review", "Technical Mentoring", "Architecture Design"],
        "Tools": ["Git", "JIRA", "Kubernetes", "Jenkins", "Datadog"]
      }
    }'::jsonb,
    true,
    85.5,
    92.0
  ),
  (
    '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
    'Product Manager Resume', 
    '{
      "summary": "Strategic product manager with 6+ years driving product vision and cross-functional collaboration to deliver user-centric solutions.",
      "bullets": [
        "Launched 3 major product features resulting in 35% increase in user retention and $2M ARR growth",
        "Conducted 50+ user interviews and A/B tests to validate product hypotheses and reduce churn by 20%",
        "Collaborated with engineering, design, and sales teams to deliver 12 releases on-time and under budget",
        "Defined product roadmap and OKRs for team of 15, achieving 90% of quarterly goals consistently"
      ],
      "skills": {
        "Product": ["Product Strategy", "Roadmapping", "User Research", "A/B Testing", "Analytics"],
        "Business": ["Stakeholder Management", "Cross-functional Leadership", "Data Analysis", "Go-to-Market"],
        "Tools": ["JIRA", "Figma", "Mixpanel", "SQL", "Tableau", "Slack"]
      }
    }'::jsonb,
    true,
    78.2,
    88.5
  ),
  (
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
    'UX Designer Resume',
    '{
      "summary": "Creative UX designer with 4+ years crafting intuitive digital experiences through user-centered design and collaborative innovation.",
      "bullets": [
        "Redesigned core user flow increasing conversion rate by 45% and reducing support tickets by 30%",
        "Created comprehensive design system adopted across 8 product teams, improving design consistency",
        "Conducted usability testing with 100+ users to validate design decisions and iterate on solutions",
        "Collaborated with product and engineering teams to ship 15+ features with 98% design QA approval"
      ],
      "skills": {
        "Design": ["User Research", "Prototyping", "Design Systems", "Usability Testing", "Information Architecture"],
        "Tools": ["Figma", "Sketch", "Adobe Creative Suite", "Principle", "InVision", "Miro"],
        "Research": ["User Interviews", "Survey Design", "Persona Development", "Journey Mapping"]
      }
    }'::jsonb,
    true,
    82.1,
    85.0
  )
ON CONFLICT (user_id, title) 
DO UPDATE SET 
  content = EXCLUDED.content,
  published_to_profile = EXCLUDED.published_to_profile,
  cri_average = EXCLUDED.cri_average,
  readiness_score = EXCLUDED.readiness_score;

-- 4. Add some sample badges for demo users (first ensure badges exist)
INSERT INTO public.badges (name, slug, emoji, trigger_type, description, threshold) VALUES
  ('First Steps', 'first-steps', '🚀', 'transcript_count', 'Added your first learning transcript', 1),
  ('Goal Setter', 'goal-setter', '🎯', 'goal_count', 'Set your first career goal', 1),
  ('Course Explorer', 'course-explorer', '📚', 'saved_courses_count', 'Saved 5 courses for learning', 5),
  ('Resume Publisher', 'resume-publisher', '📄', 'published_resume_count', 'Published your first resume', 1),
  ('High Achiever', 'high-achiever', '⭐', 'cri_score', 'Achieved CRI score of 80+', 80)
ON CONFLICT (slug) DO NOTHING;

-- 5. Award badges to demo users
WITH badge_data AS (
  SELECT id, slug FROM public.badges WHERE slug IN ('first-steps', 'goal-setter', 'course-explorer', 'resume-publisher', 'high-achiever')
)
INSERT INTO public.user_badges (user_id, badge_id) 
SELECT user_id, badge_id FROM (
  VALUES 
    -- Aisha gets all badges (senior level)
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'first-steps'),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'goal-setter'),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'course-explorer'),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'resume-publisher'), 
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'high-achiever'),
    -- Mateo gets most badges (mid-level active)
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'first-steps'),
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'goal-setter'),
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'course-explorer'),
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'resume-publisher'),
    -- Jade gets starter badges (newer user)
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'first-steps'),
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'goal-setter'),
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'resume-publisher')
) AS user_badge_mapping(user_id, badge_slug)
JOIN badge_data ON badge_data.slug = user_badge_mapping.badge_slug
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- 6. Add some sample transcripts and career goals to make profiles more realistic
INSERT INTO public.career_goals (user_id, title, description, target_role, active) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Transition to Engineering Leadership', 'Move into a technical leadership role managing larger engineering teams', 'Engineering Manager', true),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Advance to Senior Product Manager', 'Lead product strategy for multiple product lines', 'Senior Product Manager', true),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'Become Lead UX Designer', 'Lead design initiatives and mentor junior designers', 'Lead UX Designer', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.transcripts (user_id, title, description, skill_tags, cri_score, use_in_resume) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Advanced React Patterns', 'Completed advanced course on React patterns and performance optimization', ARRAY['React', 'JavaScript', 'Performance'], 88.0, true),
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'AWS Solutions Architecture', 'Earned AWS Solutions Architect certification', ARRAY['AWS', 'Cloud Architecture', 'DevOps'], 92.0, true),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Product Management Fundamentals', 'Comprehensive course on product strategy and execution', ARRAY['Product Management', 'Strategy', 'Analytics'], 85.0, true),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Data Analysis with SQL', 'Advanced SQL course for product analytics', ARRAY['SQL', 'Data Analysis', 'Analytics'], 78.0, true),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'UX Research Methods', 'Course on user research methodologies and usability testing', ARRAY['UX Research', 'Usability Testing', 'Design'], 81.0, true),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'Design Systems', 'Building scalable design systems course', ARRAY['Design Systems', 'Figma', 'UI Design'], 84.0, true)
ON CONFLICT DO NOTHING;
