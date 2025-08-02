-- Populate Career Monitoring Alerts for enhanced demonstration
INSERT INTO public.career_monitoring_alerts (
  user_id,
  alert_type,
  title,
  description,
  severity,
  category,
  status,
  trigger_data,
  recommended_actions,
  auto_create_workflow,
  expires_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'market_opportunity',
  'AI/ML Engineer Demand Surge in San Francisco',
  'Market intelligence detected a 45% increase in AI/ML Engineer job postings in San Francisco over the past 30 days. Average salary increased by 12%.',
  'high',
  'market_intelligence',
  'active',
  jsonb_build_object(
    'location', 'San Francisco, CA',
    'career_path', 'AI/ML Engineer',
    'demand_increase', 45,
    'salary_increase', 12,
    'job_postings_count', 1247,
    'trending_skills', ARRAY['Machine Learning', 'Python', 'TensorFlow', 'PyTorch', 'Computer Vision']
  ),
  jsonb_build_array(
    jsonb_build_object('action', 'update_skills', 'description', 'Focus on TensorFlow and PyTorch certifications'),
    jsonb_build_object('action', 'network', 'description', 'Connect with AI/ML professionals in San Francisco'),
    jsonb_build_object('action', 'apply', 'description', 'Consider immediate job applications in this market')
  ),
  true,
  now() + interval '7 days'
),
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'skill_obsolescence',
  'Legacy Framework Usage Declining',
  'Market analysis shows jQuery usage declining 23% this quarter. React and Vue.js adoption increasing rapidly.',
  'medium',
  'technology_trends',
  'active',
  jsonb_build_object(
    'declining_skill', 'jQuery',
    'decline_percentage', 23,
    'replacement_skills', ARRAY['React', 'Vue.js', 'Angular'],
    'market_impact', 'medium',
    'transition_timeline', '6-12 months'
  ),
  jsonb_build_array(
    jsonb_build_object('action', 'learn_framework', 'description', 'Start React or Vue.js certification path'),
    jsonb_build_object('action', 'migrate_projects', 'description', 'Update portfolio projects to modern frameworks'),
    jsonb_build_object('action', 'skill_assessment', 'description', 'Evaluate current frontend skill stack')
  ),
  true,
  now() + interval '14 days'
),
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'compensation_alert',
  'DevOps Engineer Salary Spike',
  'DevOps Engineer salaries increased 18% in your region. Market competition intensifying for experienced professionals.',
  'high',
  'salary_intelligence',
  'active',
  jsonb_build_object(
    'career_path', 'DevOps Engineer',
    'salary_increase', 18,
    'region', 'San Francisco Bay Area',
    'experience_level', 'mid-senior',
    'market_competition', 'high',
    'demand_score', 92
  ),
  jsonb_build_array(
    jsonb_build_object('action', 'salary_negotiation', 'description', 'Consider salary review with current employer'),
    jsonb_build_object('action', 'skill_upgrade', 'description', 'Focus on Kubernetes and cloud architecture'),
    jsonb_build_object('action', 'job_market', 'description', 'Explore senior DevOps opportunities')
  ),
  false,
  now() + interval '30 days'
),
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'certification_deadline',
  'AWS Certification Changes Coming',
  'AWS is updating certification requirements in Q2 2024. Current certifications may need renewal with new exam format.',
  'medium',
  'certification_updates',
  'active',
  jsonb_build_object(
    'certification_provider', 'AWS',
    'affected_certs', ARRAY['AWS Solutions Architect', 'AWS DevOps Engineer'],
    'deadline', '2024-06-30',
    'changes', 'exam format updates, new service coverage',
    'preparation_time', '2-3 months'
  ),
  jsonb_build_array(
    jsonb_build_object('action', 'register_exam', 'description', 'Schedule certification exam before deadline'),
    jsonb_build_object('action', 'study_plan', 'description', 'Create intensive study schedule for new format'),
    jsonb_build_object('action', 'practice_tests', 'description', 'Complete updated practice examinations')
  ),
  true,
  now() + interval '21 days'
),
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'industry_shift',
  'Remote Work Policy Changes',
  'Major tech companies implementing hybrid work policies. Remote-first roles decreasing by 15% in your target industry.',
  'low',
  'industry_trends',
  'active',
  jsonb_build_object(
    'trend_type', 'work_arrangement',
    'remote_decrease', 15,
    'hybrid_increase', 28,
    'affected_companies', ARRAY['Google', 'Meta', 'Apple', 'Microsoft'],
    'location_impact', 'high',
    'timeline', 'next 12 months'
  ),
  jsonb_build_array(
    jsonb_build_object('action', 'location_strategy', 'description', 'Consider relocation to tech hub cities'),
    jsonb_build_object('action', 'hybrid_skills', 'description', 'Develop in-person collaboration skills'),
    jsonb_build_object('action', 'network_local', 'description', 'Build local professional network')
  ),
  false,
  now() + interval '60 days'
);