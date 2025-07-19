-- Add realistic career goals and transcript entries for Mateo Silva and Jade Chen

-- Career Goals for Mateo Silva (Product Manager)
INSERT INTO public.career_goals (user_id, title, description, target_role, target_date, active) VALUES
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 
 'Transition to Senior Product Manager', 
 'Lead product strategy for a major feature launch and demonstrate impact through improved user metrics and business KPIs',
 'Senior Product Manager',
 '2025-12-31',
 true),

('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
 'Master Data-Driven Product Decisions',
 'Complete advanced analytics certification and implement comprehensive A/B testing framework for product features',
 'Lead Product Manager',
 '2025-08-15',
 true),

('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
 'Build Cross-Functional Leadership Skills',
 'Successfully manage a cross-functional team of 12+ members across engineering, design, and marketing to deliver a major product milestone',
 'VP of Product',
 '2026-06-30',
 true);

-- Career Goals for Jade Chen (UX Designer)
INSERT INTO public.career_goals (user_id, title, description, target_role, target_date, active) VALUES
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
 'Become a Senior UX Designer',
 'Lead end-to-end design for a major product feature, including user research, wireframing, prototyping, and usability testing',
 'Senior UX Designer',
 '2025-11-30',
 true),

('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
 'Master Design Systems Architecture',
 'Create and maintain a comprehensive design system used across multiple product teams, improving design consistency by 80%',
 'Design Systems Lead',
 '2025-09-15',
 true),

('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
 'Develop Front-End Development Skills',
 'Learn React and TypeScript to better collaborate with engineering teams and prototype interactive designs',
 'UX Engineer',
 '2026-03-31',
 true);

-- Transcript Entries for Mateo Silva (Product Manager)
INSERT INTO public.transcripts (user_id, title, description, credits, grade, difficulty, skill_tags, cri_score, verified, use_in_resume) VALUES
('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
 'Advanced Product Analytics with SQL and Python',
 'Comprehensive course covering advanced SQL queries, Python for data analysis, cohort analysis, and building product dashboards. Completed hands-on projects analyzing user funnels and implementing A/B testing frameworks.',
 4.0,
 'A',
 'Advanced',
 ARRAY['SQL', 'Python', 'Data Analysis', 'A/B Testing', 'Product Analytics', 'Dashboard Creation'],
 8.5,
 true,
 true),

('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid,
 'Strategic Product Management Fundamentals',
 'In-depth exploration of product strategy, roadmap planning, stakeholder management, and go-to-market strategies. Included case studies from leading tech companies and frameworks for prioritization and feature development.',
 3.5,
 'A-',
 'Intermediate',
 ARRAY['Product Strategy', 'Roadmapping', 'Stakeholder Management', 'Go-to-Market', 'Prioritization', 'Feature Planning'],
 7.8,
 true,
 true);

-- Transcript Entries for Jade Chen (UX Designer)
INSERT INTO public.transcripts (user_id, title, description, credits, grade, difficulty, skill_tags, cri_score, verified, use_in_resume) VALUES
('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
 'Human-Centered Design Research Methods',
 'Comprehensive study of user research methodologies including ethnographic studies, usability testing, card sorting, and journey mapping. Completed real-world research project resulting in actionable design recommendations.',
 4.0,
 'A+',
 'Advanced',
 ARRAY['User Research', 'Usability Testing', 'Journey Mapping', 'Ethnographic Studies', 'Card Sorting', 'Research Methods'],
 8.7,
 true,
 true),

('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid,
 'Advanced Prototyping and Design Systems',
 'Hands-on course covering high-fidelity prototyping in Figma, component libraries, design tokens, and systematic approach to scalable design. Built a complete design system from scratch as final project.',
 3.5,
 'A',
 'Intermediate',
 ARRAY['Prototyping', 'Design Systems', 'Figma', 'Component Libraries', 'Design Tokens', 'Systematic Design'],
 8.2,
 true,
 true);