-- Seed user_skill_progress for demo users

-- Aisha Khan (UX Designer) - verified skills
INSERT INTO user_skill_progress (user_id, skill_id, status, xp_earned, cri_score, verification_source) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'ux-fundamentals'), 'verified', 100, 78, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'wireframing'), 'verified', 100, 82, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'figma'), 'verified', 100, 85, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'empathy'), 'verified', 100, 75, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'design-systems'), 'verified', 100, 80, 'self_assessment'),
-- In progress
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'accessibility'), 'in_progress', 50, 65, 'self_assessment'),
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'interaction-design'), 'in_progress', 50, 70, 'self_assessment'),
-- Locked
('2b458624-d498-4cca-a63d-9341cc20e363', (SELECT id FROM skills WHERE slug = 'advanced-prototyping'), 'locked', 0, 60, 'self_assessment')
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Mateo Silva (Frontend Developer) - verified skills  
INSERT INTO user_skill_progress (user_id, skill_id, status, xp_earned, cri_score, verification_source) VALUES
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'html'), 'verified', 100, 88, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'css'), 'verified', 100, 85, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'javascript'), 'verified', 100, 90, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'git'), 'verified', 100, 82, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'react-basics'), 'verified', 100, 87, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'tailwind'), 'verified', 100, 83, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'responsive-design'), 'verified', 100, 80, 'self_assessment'),
-- In progress
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'apis'), 'in_progress', 50, 75, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'testing'), 'in_progress', 50, 78, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'typescript'), 'in_progress', 50, 72, 'self_assessment'),
-- Locked
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'advanced-react'), 'locked', 0, 70, 'self_assessment'),
('3c459625-e499-5ddb-b64d-a442dd21f474', (SELECT id FROM skills WHERE slug = 'web-performance'), 'locked', 0, 73, 'self_assessment')
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Jade Chen (Product Manager) - verified skills
INSERT INTO user_skill_progress (user_id, skill_id, status, xp_earned, cri_score, verification_source) VALUES
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'roadmapping'), 'verified', 100, 72, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'agile'), 'verified', 100, 75, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'mvp-strategy'), 'verified', 100, 68, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'stakeholder-communication'), 'verified', 100, 70, 'self_assessment'),
-- In progress
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'jira'), 'in_progress', 50, 60, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'data-analysis'), 'in_progress', 50, 65, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'prioritization'), 'in_progress', 50, 58, 'self_assessment'),
-- Locked
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'growth-hacking'), 'locked', 0, 55, 'self_assessment'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', (SELECT id FROM skills WHERE slug = 'market-sizing'), 'locked', 0, 57, 'self_assessment')
ON CONFLICT (user_id, skill_id) DO NOTHING;