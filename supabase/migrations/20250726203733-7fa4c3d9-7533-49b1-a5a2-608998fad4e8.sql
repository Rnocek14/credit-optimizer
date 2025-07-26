-- First, get the market_trend_id for Data Analyst in California
WITH trend_ref AS (
  SELECT id as trend_id FROM market_trends 
  WHERE career_path = 'Data Analyst' AND location = 'california'
  LIMIT 1
)
-- Insert history data with proper market_trend_id reference
INSERT INTO market_trends_history (
  market_trend_id,
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
) 
SELECT 
  trend_ref.trend_id,
  'Data Analyst',
  'california',
  unnest(ARRAY[8.2, 8.0, 8.5, 8.3, 8.7, 8.4, 8.8, 8.6, 9.0, 8.9]) as demand_score,
  unnest(ARRAY[12.5, 11.8, 13.2, 12.1, 14.0, 12.8, 15.2, 13.5, 16.0, 15.5]) as growth_rate,
  unnest(ARRAY[95000, 94500, 96000, 95500, 97000, 96500, 98000, 97500, 99000, 98500]) as average_salary,
  unnest(ARRAY[450, 425, 475, 460, 490, 455, 510, 480, 525, 515]) as job_postings_count,
  unnest(ARRAY['medium'::text, 'medium', 'medium', 'medium', 'medium', 'medium', 'high', 'medium', 'high', 'high']) as competition_level,
  '30d' as time_period,
  'ai_analysis' as data_source,
  unnest(ARRAY[
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '80 days', 
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '50 days',
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '10 days',
    NOW()
  ]) as recorded_at
FROM trend_ref
ON CONFLICT DO NOTHING;