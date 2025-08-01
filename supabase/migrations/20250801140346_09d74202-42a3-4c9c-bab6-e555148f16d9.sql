-- Seed career_monitoring_alerts table with sample data
INSERT INTO career_monitoring_alerts (
  user_id,
  title,
  description,
  alert_type,
  category,
  severity,
  status,
  trigger_data,
  recommended_actions,
  auto_create_workflow,
  expires_at
) VALUES 
(
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'Market Opportunity: Product Manager Demand Surge',
  'There has been a 25% increase in Product Manager job postings in your target location. Companies are actively seeking candidates with your skill profile.',
  'market_opportunity',
  'career_intelligence',
  'high',
  'active',
  '{"metric": "job_postings_increase", "value": 25, "timeframe": "last_30_days", "location": "San Francisco", "role": "Product Manager"}',
  '[{"action": "Apply to 3-5 high-priority roles", "priority": "high"}, {"action": "Update LinkedIn profile", "priority": "medium"}, {"action": "Schedule networking calls", "priority": "medium"}]',
  true,
  NOW() + INTERVAL '7 days'
),
(
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'Skill Gap Alert: Strategic Planning Training Recommended',
  'Analysis shows that developing Strategic Planning skills could increase your career readiness score by 15 points. This is a critical skill for your target role.',
  'skill_gap',
  'skill_development',
  'medium',
  'active',
  '{"missing_skill": "Strategic Planning", "impact_score": 15, "current_cri": 72, "potential_cri": 87}',
  '[{"action": "Enroll in Strategic Planning course", "priority": "high"}, {"action": "Practice with case studies", "priority": "medium"}, {"action": "Seek mentorship opportunity", "priority": "low"}]',
  false,
  NOW() + INTERVAL '14 days'
),
(
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'Career Progress: Milestone Achievement Unlocked',
  'Congratulations! You have completed 3 key learning objectives this month. Your progress is accelerating toward your Product Manager goal.',
  'milestone_achieved',
  'progress_tracking',
  'low',
  'active',
  '{"milestones_completed": 3, "month": "current", "progress_rate": "accelerating", "target_role": "Product Manager"}',
  '[{"action": "Review next learning objectives", "priority": "medium"}, {"action": "Update portfolio with new projects", "priority": "medium"}]',
  false,
  NOW() + INTERVAL '3 days'
),
(
  '3c459625-e499-5ddb-b64d-a442dd21f474',
  'Salary Trend Alert: Software Engineering Compensation Rising',
  'Average Software Engineering salaries have increased 12% in your location. Consider timing your next career move strategically.',
  'salary_trend',
  'market_intelligence',
  'medium',
  'active',
  '{"salary_increase": 12, "location": "Seattle", "role": "Software Engineer", "timeframe": "last_6_months"}',
  '[{"action": "Research current market rates", "priority": "high"}, {"action": "Prepare for salary negotiations", "priority": "medium"}, {"action": "Consider role timing", "priority": "low"}]',
  false,
  NOW() + INTERVAL '5 days'
),
(
  '4d56a736-f5aa-6eec-c75e-b553ee32e585',
  'Learning Path Optimization: AI Focus Recommended',
  'Based on market trends and your interests, focusing on AI and Machine Learning could significantly boost your career prospects. 89% demand growth predicted.',
  'path_optimization',
  'career_intelligence',
  'high',
  'active',
  '{"recommended_focus": "AI/ML", "demand_growth": 89, "alignment_score": 0.92, "market_trend": "exponential"}',
  '[{"action": "Start AI/ML fundamentals course", "priority": "high"}, {"action": "Join AI community groups", "priority": "medium"}, {"action": "Build AI project portfolio", "priority": "high"}]',
  true,
  NOW() + INTERVAL '10 days'
);