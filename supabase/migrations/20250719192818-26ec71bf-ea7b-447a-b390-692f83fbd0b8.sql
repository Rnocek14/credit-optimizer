-- Fix demo users by removing foreign key constraint and using mock data approach
-- 1. First, drop the foreign key constraint temporarily for the demo setup
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- 2. Update Aisha Khan's existing profile with mock user_id
UPDATE public.profiles 
SET 
  user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
  gallery_enabled = true,
  gallery_featured = true,
  role_title = 'Senior Software Engineer',
  location = 'San Francisco, CA',
  industry = 'Technology',
  years_experience = 5,
  experience_level = 'Senior',
  skills = ARRAY['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'GraphQL', 'MongoDB'],
  resume_review_summary = '{"overall_score": 87, "strengths": ["Strong technical skills in modern web development", "Excellent problem-solving abilities", "Great communication and leadership experience"], "gaps": ["Could benefit from more system design experience", "Consider adding cloud architecture certifications"], "taglines": ["Full-Stack Developer", "React Expert", "Team Lead"], "summary": "Aisha is a talented senior software engineer with strong full-stack development skills and proven leadership experience. Her expertise in React, TypeScript, and modern web technologies makes her an excellent candidate for senior engineering roles."}',
  updated_at = now()
WHERE name = 'Aisha Khan';

-- 3. Delete and recreate Mateo Silva profile
DELETE FROM public.profiles WHERE user_id = '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid OR name = 'Mateo Silva';
INSERT INTO public.profiles (
  user_id, name, role_title, location, industry, years_experience, experience_level,
  skills, gallery_enabled, gallery_featured,
  resume_review_summary, created_at, updated_at
) VALUES (
  '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
  'Mateo Silva',
  'Product Manager',
  'Austin, TX',
  'Technology',
  4,
  'Mid-Level',
  ARRAY['Product Strategy', 'User Research', 'Data Analysis', 'Agile', 'Figma', 'SQL', 'A/B Testing', 'Roadmapping'],
  true,
  false,
  '{"overall_score": 82, "strengths": ["Strong analytical and strategic thinking", "Excellent stakeholder management", "Data-driven decision making"], "gaps": ["Could expand technical product knowledge", "Consider pursuing product management certification"], "taglines": ["Strategic Product Leader", "Data-Driven PM", "User-Centric"], "summary": "Mateo is a results-oriented product manager with a strong background in user research and data analysis. His strategic thinking and collaborative approach make him ideal for driving product success in fast-paced environments."}',
  now(),
  now()
);

-- 4. Delete and recreate Jade Chen profile
DELETE FROM public.profiles WHERE user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid OR name = 'Jade Chen';
INSERT INTO public.profiles (
  user_id, name, role_title, location, industry, years_experience, experience_level,
  skills, gallery_enabled, gallery_featured,
  resume_review_summary, created_at, updated_at
) VALUES (
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
  'Jade Chen',
  'UX Designer',
  'Seattle, WA',
  'Design',
  3,
  'Mid-Level',
  ARRAY['User Research', 'Prototyping', 'Figma', 'Adobe Creative Suite', 'Wireframing', 'Usability Testing', 'Design Systems', 'Sketch'],
  true,
  false,
  '{"overall_score": 85, "strengths": ["Exceptional design thinking and creativity", "Strong user empathy and research skills", "Excellent visual design capabilities"], "gaps": ["Could benefit from more experience with design systems", "Consider learning front-end development basics"], "taglines": ["User-Centered Designer", "Creative Problem Solver", "Research-Driven"], "summary": "Jade is a creative and user-focused UX designer with excellent research skills and a keen eye for visual design. Her ability to translate user needs into intuitive design solutions makes her a valuable asset to any product team."}',
  now(),
  now()
);

-- 5. Delete existing resume drafts and create new ones
DELETE FROM public.ai_resume_drafts WHERE user_id IN (
  '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
  '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid
);

-- Insert all resume drafts
INSERT INTO public.ai_resume_drafts (user_id, title, content, published_to_profile, cri_average, readiness_score, created_at, updated_at) VALUES
-- Aisha Khan's resume
('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'Senior Software Engineer Resume', 
 '{"summary": "Experienced full-stack software engineer with 5+ years of experience building scalable web applications using React, Node.js, and cloud technologies. Proven track record of leading development teams and delivering high-quality products in fast-paced environments.", "bullets": ["Led development of React-based dashboard serving 10k+ daily active users", "Architected microservices infrastructure reducing response times by 40%", "Mentored 3 junior developers and established code review best practices", "Implemented CI/CD pipelines improving deployment frequency by 3x", "Built real-time chat system handling 1M+ messages daily using WebSocket"], "skills": {"Frontend": ["React", "TypeScript", "Next.js", "Tailwind CSS"], "Backend": ["Node.js", "Python", "Express", "FastAPI"], "Database": ["PostgreSQL", "MongoDB", "Redis"], "Cloud & DevOps": ["AWS", "Docker", "Kubernetes", "CI/CD"]}}', 
 true, 8.2, 87.0, now(), now()),
-- Mateo Silva's resume
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Product Manager Resume', 
 '{"summary": "Strategic product manager with 4+ years of experience driving product growth through data-driven insights and user-centric design. Successfully launched 5+ products resulting in $2M+ ARR and 50% user engagement increase.", "bullets": ["Launched mobile app feature increasing user retention by 35%", "Led cross-functional team of 8 engineers and designers", "Conducted 50+ user interviews to inform product roadmap decisions", "Implemented A/B testing framework improving conversion rates by 25%", "Developed go-to-market strategy for B2B SaaS product launch"], "skills": {"Product Strategy": ["Roadmapping", "Market Research", "Competitive Analysis"], "Analytics": ["SQL", "Mixpanel", "Google Analytics", "A/B Testing"], "Design": ["Figma", "User Research", "Wireframing", "Prototyping"], "Business": ["Stakeholder Management", "Agile", "Scrum", "OKRs"]}}', 
 true, 7.8, 82.0, now(), now()),
-- Jade Chen's resume
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'UX Designer Resume', 
 '{"summary": "Creative UX designer with 3+ years of experience crafting intuitive digital experiences. Specialized in user research, interaction design, and design systems. Successfully redesigned 10+ digital products improving user satisfaction scores by 40%.", "bullets": ["Redesigned e-commerce checkout flow increasing conversion rate by 28%", "Conducted usability testing with 100+ participants across 5 product iterations", "Created comprehensive design system adopted by 3 product teams", "Led user research initiatives resulting in 2 major product pivots", "Collaborated with engineers to implement pixel-perfect designs"], "skills": {"Design Tools": ["Figma", "Sketch", "Adobe Creative Suite", "Principle"], "Research": ["User Interviews", "Usability Testing", "Journey Mapping"], "Prototyping": ["Interactive Prototypes", "Wireframing", "Design Systems"], "Collaboration": ["Cross-functional Teams", "Design Handoff", "Stakeholder Presentations"]}}', 
 true, 8.0, 85.0, now(), now());

-- 6. Ensure demo users have XP data
DELETE FROM public.user_xp WHERE user_id IN (
  '2b458624-d498-4cca-a63d-9341cc20e363'::uuid,
  '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid
);

INSERT INTO public.user_xp (user_id, total_xp, created_at, last_updated) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 250, now(), now()),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 180, now(), now()),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 220, now(), now());