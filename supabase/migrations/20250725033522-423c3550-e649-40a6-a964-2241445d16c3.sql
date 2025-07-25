-- Insert mock historical market trends data for demonstration
INSERT INTO market_trends_history (
  market_trend_id,
  career_path,
  location,
  job_postings_count,
  average_salary,
  growth_rate,
  demand_score,
  competition_level,
  time_period,
  data_source,
  raw_data,
  ai_insights,
  recorded_at
) VALUES 
-- Data Scientist trends over past 12 months
('550e8400-e29b-41d4-a716-446655440000', 'Data Scientist', 'california', 450, 125000, 8.5, 85, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["AI boom", "Growing data needs"]}', NOW() - INTERVAL '1 month'),
('550e8400-e29b-41d4-a716-446655440000', 'Data Scientist', 'california', 420, 122000, 7.2, 82, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Machine learning growth"]}', NOW() - INTERVAL '2 months'),
('550e8400-e29b-41d4-a716-446655440000', 'Data Scientist', 'california', 400, 120000, 6.8, 80, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Market stabilization"]}', NOW() - INTERVAL '3 months'),
('550e8400-e29b-41d4-a716-446655440000', 'Data Scientist', 'california', 380, 118000, 6.5, 78, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Continued demand"]}', NOW() - INTERVAL '4 months'),
('550e8400-e29b-41d4-a716-446655440000', 'Data Scientist', 'california', 360, 115000, 5.8, 75, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Remote work adoption"]}', NOW() - INTERVAL '5 months'),
('550e8400-e29b-41d4-a716-446655440000', 'Data Scientist', 'california', 340, 112000, 5.2, 72, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Industry growth"]}', NOW() - INTERVAL '6 months'),

-- Software Engineer trends
('550e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'california', 800, 135000, 6.2, 88, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Tech expansion", "Digital transformation"]}', NOW() - INTERVAL '1 month'),
('550e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'california', 780, 132000, 5.8, 86, 'high', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Consistent demand"]}', NOW() - INTERVAL '2 months'),
('550e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'california', 760, 130000, 5.5, 84, 'high', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Market maturation"]}', NOW() - INTERVAL '3 months'),
('550e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'california', 740, 128000, 5.2, 82, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Cloud adoption"]}', NOW() - INTERVAL '4 months'),
('550e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'california', 720, 125000, 4.8, 80, 'high', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Remote opportunities"]}', NOW() - INTERVAL '5 months'),
('550e8400-e29b-41d4-a716-446655440001', 'Software Engineer', 'california', 700, 122000, 4.5, 78, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Startup growth"]}', NOW() - INTERVAL '6 months'),

-- Product Manager trends
('550e8400-e29b-41d4-a716-446655440002', 'Product Manager', 'new york', 350, 140000, 7.8, 82, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Product-led growth", "User experience focus"]}', NOW() - INTERVAL '1 month'),
('550e8400-e29b-41d4-a716-446655440002', 'Product Manager', 'new york', 330, 138000, 7.2, 80, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Market demand"]}', NOW() - INTERVAL '2 months'),
('550e8400-e29b-41d4-a716-446655440002', 'Product Manager', 'new york', 310, 135000, 6.8, 78, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Digital products"]}', NOW() - INTERVAL '3 months'),
('550e8400-e29b-41d4-a716-446655440002', 'Product Manager', 'new york', 290, 132000, 6.2, 75, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Strategic roles"]}', NOW() - INTERVAL '4 months'),
('550e8400-e29b-41d4-a716-446655440002', 'Product Manager', 'new york', 270, 130000, 5.8, 72, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Agile adoption"]}', NOW() - INTERVAL '5 months'),
('550e8400-e29b-41d4-a716-446655440002', 'Product Manager', 'new york', 250, 128000, 5.2, 70, 'medium', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Cross-functional demand"]}', NOW() - INTERVAL '6 months'),

-- UX Designer trends
('550e8400-e29b-41d4-a716-446655440003', 'UX Designer', 'california', 280, 110000, 9.2, 78, 'low', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["User-centric design", "Mobile-first approach"]}', NOW() - INTERVAL '1 month'),
('550e8400-e29b-41d4-a716-446655440003', 'UX Designer', 'california', 260, 108000, 8.5, 75, 'low', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Design thinking"]}', NOW() - INTERVAL '2 months'),
('550e8400-e29b-41d4-a716-446655440003', 'UX Designer', 'california', 240, 105000, 7.8, 72, 'low', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Digital transformation"]}', NOW() - INTERVAL '3 months'),
('550e8400-e29b-41d4-a716-446655440003', 'UX Designer', 'california', 220, 102000, 7.2, 70, 'low', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Accessibility focus"]}', NOW() - INTERVAL '4 months'),
('550e8400-e29b-41d4-a716-446655440003', 'UX Designer', 'california', 200, 100000, 6.5, 68, 'low', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Design systems"]}', NOW() - INTERVAL '5 months'),
('550e8400-e29b-41d4-a716-446655440003', 'UX Designer', 'california', 180, 98000, 6.0, 65, 'low', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Remote design tools"]}', NOW() - INTERVAL '6 months'),

-- DevOps Engineer trends
('550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'texas', 320, 130000, 10.5, 90, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Cloud migration", "Infrastructure automation"]}', NOW() - INTERVAL '1 month'),
('550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'texas', 300, 127000, 9.8, 88, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Kubernetes adoption"]}', NOW() - INTERVAL '2 months'),
('550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'texas', 280, 125000, 9.2, 85, 'high', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["CI/CD practices"]}', NOW() - INTERVAL '3 months'),
('550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'texas', 260, 122000, 8.5, 82, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Microservices"]}', NOW() - INTERVAL '4 months'),
('550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'texas', 240, 120000, 8.0, 80, 'high', '30d', 'ai_analysis', '{}', '{"trend": "stable", "factors": ["Containerization"]}', NOW() - INTERVAL '5 months'),
('550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'texas', 220, 118000, 7.5, 78, 'high', '30d', 'ai_analysis', '{}', '{"trend": "increasing", "factors": ["Security integration"]}', NOW() - INTERVAL '6 months');