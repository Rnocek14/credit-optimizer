-- Seed gamification metrics for demo users with correct column names
INSERT INTO public.gamification_metrics (
  user_id,
  metric_type,
  metric_value,
  measurement_period,
  measurement_date,
  context_data
) VALUES
-- Aisha Khan daily XP metrics (last 7 days)
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 45, 'daily', CURRENT_DATE - 6, '{"source": "course_completion", "streak_day": 1}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 62, 'daily', CURRENT_DATE - 5, '{"source": "course_completion", "streak_day": 2}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 38, 'daily', CURRENT_DATE - 4, '{"source": "course_completion", "streak_day": 3}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 73, 'daily', CURRENT_DATE - 3, '{"source": "course_completion", "streak_day": 4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 55, 'daily', CURRENT_DATE - 2, '{"source": "course_completion", "streak_day": 5}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 81, 'daily', CURRENT_DATE - 1, '{"source": "course_completion", "streak_day": 6}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'daily_xp', 67, 'daily', CURRENT_DATE, '{"source": "course_completion", "streak_day": 7}'),

-- Aisha Khan streak bonus metrics
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 15, 'daily', CURRENT_DATE - 6, '{"multiplier": 1.1, "streak_length": 1}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 18, 'daily', CURRENT_DATE - 5, '{"multiplier": 1.12, "streak_length": 2}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 22, 'daily', CURRENT_DATE - 4, '{"multiplier": 1.14, "streak_length": 3}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 25, 'daily', CURRENT_DATE - 3, '{"multiplier": 1.16, "streak_length": 4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 28, 'daily', CURRENT_DATE - 2, '{"multiplier": 1.18, "streak_length": 5}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 31, 'daily', CURRENT_DATE - 1, '{"multiplier": 1.2, "streak_length": 6}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'streak_bonus', 34, 'daily', CURRENT_DATE, '{"multiplier": 1.22, "streak_length": 7}'),

-- Aisha Khan Maya collaboration scores
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 85, 'daily', CURRENT_DATE - 6, '{"interactions": 3, "quality_score": 4.2}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 88, 'daily', CURRENT_DATE - 5, '{"interactions": 4, "quality_score": 4.4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 91, 'daily', CURRENT_DATE - 4, '{"interactions": 5, "quality_score": 4.5}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 87, 'daily', CURRENT_DATE - 3, '{"interactions": 3, "quality_score": 4.3}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 93, 'daily', CURRENT_DATE - 2, '{"interactions": 6, "quality_score": 4.6}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 89, 'daily', CURRENT_DATE - 1, '{"interactions": 4, "quality_score": 4.4}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_collaboration', 94, 'daily', CURRENT_DATE, '{"interactions": 7, "quality_score": 4.7}'),

-- Aisha Khan engagement trend metrics
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.72, 'daily', CURRENT_DATE - 6, '{"session_duration": 45, "completion_rate": 0.8}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.75, 'daily', CURRENT_DATE - 5, '{"session_duration": 52, "completion_rate": 0.85}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.78, 'daily', CURRENT_DATE - 4, '{"session_duration": 48, "completion_rate": 0.9}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.74, 'daily', CURRENT_DATE - 3, '{"session_duration": 43, "completion_rate": 0.82}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.81, 'daily', CURRENT_DATE - 2, '{"session_duration": 58, "completion_rate": 0.95}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.77, 'daily', CURRENT_DATE - 1, '{"session_duration": 50, "completion_rate": 0.88}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'engagement_trend', 0.83, 'daily', CURRENT_DATE, '{"session_duration": 62, "completion_rate": 0.98}'),

-- Mateo Silva metrics (smaller dataset)
('3c459625-e499-5ddb-b64d-a442dd21f474', 'daily_xp', 32, 'daily', CURRENT_DATE - 2, '{"source": "course_completion", "streak_day": 1}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'daily_xp', 48, 'daily', CURRENT_DATE - 1, '{"source": "course_completion", "streak_day": 2}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'daily_xp', 55, 'daily', CURRENT_DATE, '{"source": "course_completion", "streak_day": 3}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_collaboration', 76, 'daily', CURRENT_DATE - 2, '{"interactions": 2, "quality_score": 3.8}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_collaboration', 82, 'daily', CURRENT_DATE - 1, '{"interactions": 3, "quality_score": 4.1}'),
('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_collaboration', 85, 'daily', CURRENT_DATE, '{"interactions": 4, "quality_score": 4.2}'),

-- Jade Chen metrics (smaller dataset)
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'daily_xp', 29, 'daily', CURRENT_DATE - 1, '{"source": "course_completion", "streak_day": 1}'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'daily_xp', 41, 'daily', CURRENT_DATE, '{"source": "course_completion", "streak_day": 2}'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'maya_collaboration', 73, 'daily', CURRENT_DATE - 1, '{"interactions": 2, "quality_score": 3.6}'),
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'maya_collaboration', 79, 'daily', CURRENT_DATE, '{"interactions": 3, "quality_score": 3.9}');