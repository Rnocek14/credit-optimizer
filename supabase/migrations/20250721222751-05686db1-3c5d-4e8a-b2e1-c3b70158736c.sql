-- Seed user_skill_progress for demo users
-- Demo user IDs from the existing system:
-- Aisha Khan: '2b458624-d498-4cca-a63d-9341cc20e363'
-- Mateo Silva: '3c459625-e499-5ddb-b64d-a442dd21f474' 
-- Jade Chen: '4d56a736-f5aa-6eec-c75e-b553ee32e585'

-- First, let's add some UX/Design skills for Aisha Khan
INSERT INTO skills (name, slug, category, description, difficulty_level, xp_value) VALUES
('UX Fundamentals', 'ux-fundamentals', 'Design', 'Core principles of user experience design', 2, 100),
('Wireframing', 'wireframing', 'Design', 'Creating low-fidelity mockups and layouts', 2, 100),
('Figma', 'figma', 'Design', 'Design and prototyping in Figma', 3, 100),
('Empathy', 'empathy', 'Design', 'Understanding and designing for user needs', 1, 100),
('Accessibility', 'accessibility', 'Design', 'Designing for users with disabilities', 3, 100),
('Interaction Design', 'interaction-design', 'Design', 'Designing interactive user interfaces', 4, 100),
('Advanced Prototyping', 'advanced-prototyping', 'Design', 'High-fidelity interactive prototypes', 5, 100)
ON CONFLICT (slug) DO NOTHING;

-- Add more frontend skills for Mateo
INSERT INTO skills (name, slug, category, description, difficulty_level, xp_value) VALUES
('Git', 'git', 'DevOps', 'Version control with Git', 2, 100),
('React Basics', 'react-basics', 'Framework', 'Introduction to React fundamentals', 3, 100),
('Tailwind', 'tailwind', 'Styling', 'Utility-first CSS framework', 2, 100),
('Responsive Design', 'responsive-design', 'Design', 'Creating mobile-friendly layouts', 3, 100),
('APIs', 'apis', 'API', 'Working with REST APIs', 3, 100),
('Advanced React', 'advanced-react', 'Framework', 'Advanced React patterns and hooks', 5, 100),
('Web Performance', 'web-performance', 'Quality', 'Optimizing web application performance', 4, 100)
ON CONFLICT (slug) DO NOTHING;

-- Add Product Management skills for Jade
INSERT INTO skills (name, slug, category, description, difficulty_level, xp_value) VALUES
('Roadmapping', 'roadmapping', 'Product', 'Creating product roadmaps and strategy', 3, 100),
('Agile', 'agile', 'Product', 'Agile methodologies and practices', 2, 100),
('MVP Strategy', 'mvp-strategy', 'Product', 'Minimum viable product planning', 3, 100),
('Stakeholder Communication', 'stakeholder-communication', 'Product', 'Managing stakeholder relationships', 2, 100),
('Jira', 'jira', 'Product', 'Project management with Jira', 2, 100),
('Data Analysis', 'data-analysis', 'Product', 'Analyzing product data and metrics', 4, 100),
('Prioritization', 'prioritization', 'Product', 'Feature and task prioritization', 3, 100),
('Growth Hacking', 'growth-hacking', 'Product', 'Growth strategies and optimization', 4, 100),
('Market Sizing', 'market-sizing', 'Product', 'Market analysis and sizing techniques', 4, 100)
ON CONFLICT (slug) DO NOTHING;

-- Now seed user_skill_progress for Aisha Khan (UX Designer)
INSERT INTO user_skill_progress (user_id, skill_id, status, xp_earned, cri_score, verification_source) VALUES
-- Completed skills (5)
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'ux-fundamentals'), 'completed', 100, 78, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'wireframing'), 'completed', 100, 82, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'figma'), 'completed', 100, 85, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'empathy'), 'completed', 100, 75, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'design-systems'), 'completed', 100, 80, 'self_assessment'),
-- In progress skills (2)
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'accessibility'), 'in_progress', 50, 65, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'interaction-design'), 'in_progress', 50, 70, 'self_assessment'),
-- Locked skill (1) - no record needed for locked status
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'advanced-prototyping'), 'locked', 0, 60, 'self_assessment')
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Seed user_skill_progress for Mateo Silva (Frontend Developer)
INSERT INTO user_skill_progress (user_id, skill_id, status, xp_earned, cri_score, verification_source) VALUES
-- Completed skills (7)
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'html'), 'completed', 100, 88, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'css'), 'completed', 100, 85, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'javascript'), 'completed', 100, 90, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'git'), 'completed', 100, 82, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'react-basics'), 'completed', 100, 87, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'tailwind'), 'completed', 100, 83, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'responsive-design'), 'completed', 100, 80, 'self_assessment'),
-- In progress skills (3)
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'apis'), 'in_progress', 50, 75, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'testing'), 'in_progress', 50, 78, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'typescript'), 'in_progress', 50, 72, 'self_assessment'),
-- Locked skills (2)
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'advanced-react'), 'locked', 0, 70, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'web-performance'), 'locked', 0, 73, 'self_assessment')
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Seed user_skill_progress for Jade Chen (Product Manager)
INSERT INTO user_skill_progress (user_id, skill_id, status, xp_earned, cri_score, verification_source) VALUES
-- Completed skills (4)
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'roadmapping'), 'completed', 100, 72, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'agile'), 'completed', 100, 75, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'mvp-strategy'), 'completed', 100, 68, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'stakeholder-communication'), 'completed', 100, 70, 'self_assessment'),
-- In progress skills (3)
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'jira'), 'in_progress', 50, 60, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'data-analysis'), 'in_progress', 50, 65, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'prioritization'), 'in_progress', 50, 58, 'self_assessment'),
-- Locked skills (2)
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'growth-hacking'), 'locked', 0, 55, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'market-sizing'), 'locked', 0, 57, 'self_assessment')
ON CONFLICT (user_id, skill_id) DO NOTHING;