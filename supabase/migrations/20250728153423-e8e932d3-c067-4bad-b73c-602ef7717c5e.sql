-- Seed some sample market trends data for testing
INSERT INTO public.market_trends (career_path, location, job_postings_count, average_salary, growth_rate, demand_score, competition_level, data_source, time_period, raw_data, ai_insights, created_at, updated_at) 
VALUES 
  ('Software Engineer', 'california', 2450, 145000, 12.5, 95, 'high', 'ai_analysis', '30d', 
   '{"skills": ["React", "Python", "AWS"], "companies": ["Google", "Meta", "Apple"]}', 
   '{"growthRate": 12.5, "demandTrend": "increasing", "salaryTrend": "rising", "marketSaturation": "medium"}',
   now(), now()),
  ('Data Scientist', 'new york', 1850, 138000, 15.2, 92, 'high', 'ai_analysis', '30d',
   '{"skills": ["Python", "Machine Learning", "SQL"], "companies": ["Goldman Sachs", "JPMorgan", "Bloomberg"]}',
   '{"growthRate": 15.2, "demandTrend": "increasing", "salaryTrend": "rising", "marketSaturation": "low"}',
   now(), now()),
  ('UX Designer', 'california', 980, 112000, 8.7, 88, 'medium', 'ai_analysis', '30d',
   '{"skills": ["Figma", "User Research", "Prototyping"], "companies": ["Adobe", "Spotify", "Airbnb"]}',
   '{"growthRate": 8.7, "demandTrend": "stable", "salaryTrend": "rising", "marketSaturation": "medium"}',
   now(), now()),
  ('Blockchain Developer', 'california', 1240, 185000, 89.7, 97, 'high', 'crypto_api', '30d',
   '{"skills": ["Solidity", "Web3", "Smart Contracts"], "companies": ["Coinbase", "Binance", "ConsenSys"]}',
   '{"growthRate": 89.7, "demandTrend": "increasing", "salaryTrend": "rising", "marketSaturation": "low"}',
   now(), now())