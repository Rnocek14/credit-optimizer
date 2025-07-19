
-- Fix demo data creation with correct badge slugs and ensure all users have published resumes
-- First, let's ensure all demo users have published resume drafts
INSERT INTO public.ai_resume_drafts (user_id, title, content, published_to_profile, cri_average, readiness_score) VALUES
  (
    '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
    'Senior Software Engineer Resume',
    '{
      "summary": "Experienced software engineer with 8+ years building scalable web applications and leading technical teams.",
      "bullets": [
        "Led development of microservices architecture serving 1M+ daily users with 99.9% uptime",
        "Mentored 5 junior developers and established code review processes that reduced bugs by 40%",
        "Built CI/CD pipelines using Docker and AWS that decreased deployment time from 2 hours to 15 minutes",
        "Architected React/Node.js applications with test coverage above 90% using Jest and Cypress"
      ],
      "skills": {
        "Frontend": ["React", "TypeScript", "Redux", "Next.js", "Tailwind CSS"],
        "Backend": ["Node.js", "Python", "PostgreSQL", "Redis", "GraphQL"],
        "DevOps": ["AWS", "Docker", "Kubernetes", "Jenkins", "Terraform"]
      }
    }'::jsonb,
    true,
    85.7,
    92.3
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

-- Ensure all demo users have complete profiles
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

-- Ensure XP data exists for all demo users
INSERT INTO public.user_xp (user_id, total_xp) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 750),  -- Level 3
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 1200), -- Level 4
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 180)   -- Level 2
ON CONFLICT (user_id) 
DO UPDATE SET total_xp = EXCLUDED.total_xp;

-- Award badges using correct slugs from the badges table
WITH badge_data AS (
  SELECT id, slug FROM public.badges WHERE slug IN ('goal-setter', 'resume-master', 'high-achiever', 'scholar')
)
INSERT INTO public.user_badges (user_id, badge_id) 
SELECT user_id, badge_id FROM (
  VALUES 
    -- Aisha gets all badges (senior level)
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'goal-setter'),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'resume-master'),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'high-achiever'),
    ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'scholar'),
    -- Mateo gets most badges (mid-level active)
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'goal-setter'),
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'resume-master'),
    ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'high-achiever'),
    -- Jade gets starter badges (newer user)
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'goal-setter'),
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'resume-master')
) AS user_badge_mapping(user_id, badge_slug)
JOIN badge_data ON badge_data.slug = user_badge_mapping.badge_slug
ON CONFLICT (user_id, badge_id) DO NOTHING;
