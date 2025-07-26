-- Seed market trends history data for Data Analyst in California
INSERT INTO market_trends_history (
  career_path, 
  location, 
  demand_score, 
  growth_rate, 
  average_salary, 
  job_postings_count, 
  competition_level,
  time_period,
  data_source,
  recorded_at
) VALUES 
-- 90 days of data points for pattern recognition
('Data Analyst', 'california', 8.2, 12.5, 95000, 450, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '90 days'),
('Data Analyst', 'california', 8.0, 11.8, 94500, 425, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '80 days'),
('Data Analyst', 'california', 8.5, 13.2, 96000, 475, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '70 days'),
('Data Analyst', 'california', 8.3, 12.1, 95500, 460, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '60 days'),
('Data Analyst', 'california', 8.7, 14.0, 97000, 490, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '50 days'),
('Data Analyst', 'california', 8.4, 12.8, 96500, 455, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '40 days'),
('Data Analyst', 'california', 8.8, 15.2, 98000, 510, 'high', '30d', 'ai_analysis', NOW() - INTERVAL '30 days'),
('Data Analyst', 'california', 8.6, 13.5, 97500, 480, 'medium', '30d', 'ai_analysis', NOW() - INTERVAL '20 days'),
('Data Analyst', 'california', 9.0, 16.0, 99000, 525, 'high', '30d', 'ai_analysis', NOW() - INTERVAL '10 days'),
('Data Analyst', 'california', 8.9, 15.5, 98500, 515, 'high', '30d', 'ai_analysis', NOW())
ON CONFLICT DO NOTHING;

-- Also add current market trends record
INSERT INTO market_trends (
  career_path,
  location,
  demand_score,
  growth_rate,
  average_salary,
  job_postings_count,
  competition_level,
  time_period,
  data_source,
  ai_insights,
  raw_data
) VALUES (
  'Data Analyst',
  'california', 
  8.9,
  15.5,
  98500,
  515,
  'high',
  '30d',
  'ai_analysis',
  '{"trend_analysis": "Strong upward trend in demand", "skill_gaps": ["Python", "SQL", "Tableau"], "growth_drivers": ["AI adoption", "Data-driven decision making"]}'::jsonb,
  '{"last_updated": "2025-01-26", "confidence": 0.85, "data_sources": ["job_boards", "salary_surveys"]}'::jsonb
) ON CONFLICT (career_path, location) DO UPDATE SET
  demand_score = EXCLUDED.demand_score,
  growth_rate = EXCLUDED.growth_rate,
  average_salary = EXCLUDED.average_salary,
  job_postings_count = EXCLUDED.job_postings_count,
  updated_at = NOW();