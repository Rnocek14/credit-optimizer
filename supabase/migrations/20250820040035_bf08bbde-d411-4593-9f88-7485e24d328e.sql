-- Insert sample skill automation risk data (with correct column names)
INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, horizon_years, source) VALUES
('550e8400-e29b-41d4-a716-446655440001', 15.5, 10, 'Industry analysis - Creative roles'),
('550e8400-e29b-41d4-a716-446655440002', 65.2, 5, 'Industry analysis - Data entry roles'),
('550e8400-e29b-41d4-a716-446655440003', 25.8, 15, 'Industry analysis - Management roles'),
('550e8400-e29b-41d4-a716-446655440004', 45.3, 8, 'Industry analysis - Analytics roles'),
('550e8400-e29b-41d4-a716-446655440005', 35.7, 12, 'Industry analysis - Technical support');

-- Sample career tracks for testing (these will be user-specific)
INSERT INTO public.career_tracks (
  user_id, 
  title, 
  track_name,
  description, 
  goal,
  roi_score,
  switch_readiness_score,
  ai_job_risk_pct,
  age_penalty_factor,
  order_index
) VALUES 
-- Sample tracks for demo user
('2b458624-d498-4cca-a63d-9341cc20e363', 'Software Engineer', 'software-engineer', 'Full-stack software development career path', 'Senior Software Engineer at FAANG', 85.5, 70.2, 25.3, 1.0, 1),
('2b458624-d498-4cca-a63d-9341cc20e363', 'Product Manager', 'product-manager', 'Product management and strategy career path', 'VP of Product at tech startup', 92.1, 45.8, 15.7, 1.0, 2),
('2b458624-d498-4cca-a63d-9341cc20e363', 'Data Scientist', 'data-scientist', 'Data science and machine learning career path', 'Lead Data Scientist', 88.3, 55.4, 45.2, 1.0, 3),
-- Sample tracks for other demo users
('3c459625-e499-5ddb-b64d-a442dd21f474', 'UX Designer', 'ux-designer', 'User experience design career path', 'Senior UX Designer', 78.9, 65.1, 20.4, 1.0, 1),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'Marketing Manager', 'marketing-manager', 'Digital marketing and growth career path', 'VP Marketing', 82.6, 58.3, 35.8, 1.0, 2);

-- Sample track skills mapping (using existing skill node IDs from career_graph_nodes)
INSERT INTO public.track_skills (track_id, skill_node_id) 
SELECT ct.id, '550e8400-e29b-41d4-a716-446655440001'
FROM career_tracks ct 
WHERE ct.title = 'Software Engineer' AND ct.user_id = '2b458624-d498-4cca-a63d-9341cc20e363';

INSERT INTO public.track_skills (track_id, skill_node_id) 
SELECT ct.id, '550e8400-e29b-41d4-a716-446655440002'
FROM career_tracks ct 
WHERE ct.title = 'Software Engineer' AND ct.user_id = '2b458624-d498-4cca-a63d-9341cc20e363';

INSERT INTO public.track_skills (track_id, skill_node_id) 
SELECT ct.id, '550e8400-e29b-41d4-a716-446655440003'
FROM career_tracks ct 
WHERE ct.title = 'Product Manager' AND ct.user_id = '2b458624-d498-4cca-a63d-9341cc20e363';

INSERT INTO public.track_skills (track_id, skill_node_id) 
SELECT ct.id, '550e8400-e29b-41d4-a716-446655440004'
FROM career_tracks ct 
WHERE ct.title = 'Data Scientist' AND ct.user_id = '2b458624-d498-4cca-a63d-9341cc20e363';