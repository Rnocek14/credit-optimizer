-- Phase 1: Seed Historical Market Trends Data for Testing
-- Generate 90 days of historical data for popular career paths and locations

INSERT INTO market_trends_history (market_trend_id, career_path, location, job_postings_count, average_salary, growth_rate, demand_score, competition_level, time_period, data_source, raw_data, ai_insights, recorded_at)
SELECT 
  gen_random_uuid() as market_trend_id,
  career_path,
  location,
  (50 + (random() * 950))::integer as job_postings_count,
  (70000 + (random() * 80000))::numeric as average_salary,
  (random() * 20 - 5)::numeric as growth_rate, -- -5% to +15%
  (random() * 100)::numeric as demand_score,
  CASE 
    WHEN random() < 0.33 THEN 'low'
    WHEN random() < 0.66 THEN 'medium'
    ELSE 'high'
  END as competition_level,
  '30d' as time_period,
  'ai_analysis' as data_source,
  jsonb_build_object(
    'market_activity', 'normal',
    'confidence', random() * 0.4 + 0.6,
    'data_points', (random() * 100)::integer + 50
  ) as raw_data,
  jsonb_build_object(
    'trend_direction', 
    CASE 
      WHEN random() < 0.4 THEN 'rising'
      WHEN random() < 0.8 THEN 'stable'
      ELSE 'declining'
    END,
    'market_sentiment', 
    CASE 
      WHEN random() < 0.5 THEN 'positive'
      ELSE 'neutral'
    END,
    'key_factors', array['remote_work', 'ai_adoption', 'market_demand']
  ) as ai_insights,
  (NOW() - (days || ' days')::interval) as recorded_at
FROM (
  SELECT 
    career_path,
    location,
    days
  FROM (
    VALUES 
      ('Data Scientist', 'california'),
      ('Data Scientist', 'new-york'),
      ('Data Scientist', 'remote'),
      ('Software Engineer', 'california'),
      ('Software Engineer', 'new-york'),
      ('Software Engineer', 'remote'),
      ('Blockchain Developer', 'california'),
      ('Blockchain Developer', 'new-york'),
      ('Product Manager', 'california'),
      ('Product Manager', 'new-york'),
      ('AI/ML Research Scientist', 'california'),
      ('DevOps Engineer', 'california'),
      ('Cybersecurity Analyst', 'california'),
      ('Cloud Solutions Architect', 'california')
  ) AS paths(career_path, location)
  CROSS JOIN generate_series(0, 89) AS days
) AS data_points;

-- Add some recent pattern recognition results for immediate testing
INSERT INTO pattern_recognition_results (career_path, location, pattern_type, pattern_data, confidence_score, detected_at, valid_until, anomaly_score)
VALUES 
  ('Data Scientist', 'california', 'trend', 
   jsonb_build_object('direction', 'up', 'strength', 0.75, 'duration', '3m', 'confidence', 0.85),
   0.85, NOW(), NOW() + INTERVAL '7 days', 0.1),
  ('Software Engineer', 'california', 'volatility',
   jsonb_build_object('level', 'low', 'coefficient', 0.12, 'confidence', 0.92),
   0.92, NOW(), NOW() + INTERVAL '7 days', 0.0),
  ('Blockchain Developer', 'california', 'seasonal',
   jsonb_build_object('peak_months', array['jan', 'feb', 'mar'], 'amplitude', 0.25),
   0.78, NOW(), NOW() + INTERVAL '7 days', 0.0);