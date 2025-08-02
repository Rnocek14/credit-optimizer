-- Phase 5 Enhancement: Additional Market Intelligence Data and Enhanced Scenarios
-- Populate more diverse market intelligence alerts for test user

-- Insert additional career monitoring alerts with diverse scenarios
INSERT INTO public.career_monitoring_alerts (
  user_id, alert_type, title, description, severity, category, status, 
  trigger_data, recommended_actions, auto_create_workflow, expires_at
) VALUES 
  -- High-impact market shifts
  ('00000000-0000-0000-0000-000000000001', 'market_shift', 
   'AI/ML Job Market Surge', 
   'AI and Machine Learning roles have increased 45% in the last quarter in your location. High demand for Python and TensorFlow skills.',
   'high', 'opportunity', 'active',
   '{"career_path": "Machine Learning Engineer", "location": "San Francisco", "growth_rate": 45, "demand_score": 95}',
   '[{"action": "upskill_ai", "priority": "high", "description": "Complete advanced AI/ML certification"}, {"action": "network_expand", "priority": "medium", "description": "Connect with AI professionals"}]',
   true,
   NOW() + INTERVAL '30 days'
  ),
  
  -- Skill gap opportunities
  ('00000000-0000-0000-0000-000000000001', 'skill_gap_opportunity', 
   'Cloud Security Skills Gap', 
   'Critical shortage of cloud security professionals. Average salary premium of $35K for certified professionals.',
   'high', 'skill_development', 'active',
   '{"skill": "Cloud Security", "gap_level": "critical", "salary_premium": 35000, "certification": "AWS Security Specialty"}',
   '[{"action": "get_certified", "priority": "high", "description": "Pursue AWS Security Specialty certification"}, {"action": "practice_projects", "priority": "medium", "description": "Build security-focused portfolio"}]',
   true,
   NOW() + INTERVAL '60 days'
  ),
  
  -- Industry transformation alerts
  ('00000000-0000-0000-0000-000000000001', 'industry_transformation', 
   'FinTech Digital Transformation', 
   'Financial services are rapidly adopting blockchain and DeFi technologies. New roles emerging in crypto development.',
   'medium', 'industry_change', 'active',
   '{"industry": "FinTech", "transformation_type": "blockchain_adoption", "new_roles": ["DeFi Developer", "Blockchain Architect"], "timeline": "6-12 months"}',
   '[{"action": "learn_blockchain", "priority": "medium", "description": "Start Solidity and Web3 development"}, {"action": "join_communities", "priority": "low", "description": "Engage with blockchain communities"}]',
   false,
   NOW() + INTERVAL '90 days'
  ),
  
  -- Competitive analysis
  ('00000000-0000-0000-0000-000000000001', 'competitive_landscape', 
   'Remote Work Policy Changes', 
   'Major tech companies are adjusting remote work policies. Location flexibility becoming key differentiator for talent.',
   'medium', 'market_trend', 'active',
   '{"trend": "remote_work_evolution", "companies_affected": ["Google", "Meta", "Amazon"], "impact": "location_flexibility"}',
   '[{"action": "evaluate_remote_readiness", "priority": "medium", "description": "Assess remote work skills and setup"}, {"action": "location_strategy", "priority": "low", "description": "Consider location arbitrage opportunities"}]',
   false,
   NOW() + INTERVAL '45 days'
  ),
  
  -- Emerging technology alerts
  ('00000000-0000-0000-0000-000000000001', 'emerging_technology', 
   'Quantum Computing Investments', 
   'Government and enterprise quantum computing investments up 300%. Early-stage career opportunities emerging.',
   'low', 'future_opportunity', 'active',
   '{"technology": "Quantum Computing", "investment_growth": 300, "timeline": "2-5 years", "entry_barrier": "high"}',
   '[{"action": "quantum_education", "priority": "low", "description": "Explore quantum computing fundamentals"}, {"action": "monitor_developments", "priority": "low", "description": "Follow quantum computing news and research"}]',
   false,
   NOW() + INTERVAL '120 days'
  ),
  
  -- Salary trend alerts
  ('00000000-0000-0000-0000-000000000001', 'salary_trend', 
   'DevOps Engineer Salary Surge', 
   'DevOps Engineer salaries have increased 25% year-over-year. Kubernetes and Terraform expertise commanding premium.',
   'high', 'compensation', 'active',
   '{"role": "DevOps Engineer", "salary_increase": 25, "premium_skills": ["Kubernetes", "Terraform", "GitOps"]}',
   '[{"action": "devops_certification", "priority": "high", "description": "Get certified in Kubernetes and Terraform"}, {"action": "update_profile", "priority": "medium", "description": "Highlight DevOps experience"}]',
   true,
   NOW() + INTERVAL '30 days'
  );

-- Insert enhanced Maya decisions with diverse scenarios
INSERT INTO public.maya_decisions (
  user_id, decision_type, title, description, status, confidence_score, 
  context_data, decision_options, selected_option_id, reasoning, impact_analysis, timeline_weeks
) VALUES 
  -- Career pivot decision
  ('00000000-0000-0000-0000-000000000001', 'career_pivot', 
   'Strategic Career Pivot: Data Science to AI Engineering', 
   'Analysis suggests optimal timing for transition from Data Science to AI Engineering based on market demand and skill alignment.',
   'pending_review', 0.87,
   '{"current_role": "Senior Data Scientist", "target_role": "AI Engineer", "skill_overlap": 0.75, "market_timing": "optimal"}',
   '[
     {
       "id": "option_1", 
       "title": "Gradual Transition (12 months)", 
       "description": "Complete AI/ML certifications while maintaining current role",
       "pros": ["Lower risk", "Steady income", "Skill building time"],
       "cons": ["Longer timeline", "Less focused learning"],
       "success_probability": 0.85,
       "impact_score": 7
     },
     {
       "id": "option_2", 
       "title": "Accelerated Transition (6 months)", 
       "description": "Intensive bootcamp and portfolio development with career break",
       "pros": ["Faster results", "Focused learning", "Strong portfolio"],
       "cons": ["Income gap", "Higher risk", "Intensive schedule"],
       "success_probability": 0.72,
       "impact_score": 9
     },
     {
       "id": "option_3", 
       "title": "Hybrid Approach (9 months)", 
       "description": "Part-time consulting while building AI engineering skills",
       "pros": ["Balanced risk", "Some income", "Real-world experience"],
       "cons": ["Complex scheduling", "Moderate pace"],
       "success_probability": 0.79,
       "impact_score": 8
     }
   ]',
   'option_3',
   'Market analysis shows 40% growth in AI Engineering roles with 65% salary premium. Current Data Science skills provide 75% transferability. Hybrid approach balances risk while maintaining momentum.',
   '{"salary_potential": 165000, "job_availability": "high", "skill_gap_weeks": 16, "roi_12_months": 2.4}',
   36
  ),
  
  -- Learning path optimization
  ('00000000-0000-0000-0000-000000000001', 'learning_optimization', 
   'Optimal Learning Path: Cloud Architecture Specialization', 
   'AI recommends prioritizing AWS Solutions Architect certification based on career goals and market demand analysis.',
   'approved', 0.91,
   '{"goal": "Cloud Architecture Mastery", "current_level": "intermediate", "target_certification": "AWS Solutions Architect Professional"}',
   '[
     {
       "id": "path_1", 
       "title": "AWS-First Approach", 
       "description": "Focus exclusively on AWS ecosystem for deep specialization",
       "pros": ["Deep expertise", "Market leader", "High demand"],
       "cons": ["Vendor lock-in", "Limited multi-cloud skills"],
       "success_probability": 0.88,
       "impact_score": 8
     },
     {
       "id": "path_2", 
       "title": "Multi-Cloud Strategy", 
       "description": "Balance AWS with Azure and GCP fundamentals",
       "pros": ["Broader skills", "Vendor flexibility", "Future-proof"],
       "cons": ["Less depth", "Longer timeline", "Complex focus"],
       "success_probability": 0.76,
       "impact_score": 7
     }
   ]',
   'path_1',
   'AWS holds 32% market share with highest enterprise adoption. Deep AWS expertise yields 40% salary premium over generalist cloud skills. Current intermediate level reduces certification timeline to 12 weeks.',
   '{"certification_timeline_weeks": 12, "salary_impact": 40, "job_openings": 15000, "skill_demand_score": 94}',
   16
  ),
  
  -- Market timing decision
  ('00000000-0000-0000-0000-000000000001', 'market_timing', 
   'Optimal Job Search Timing: Q1 2024 Market Analysis', 
   'AI analysis indicates Q1 2024 presents optimal job market conditions for your target role and location.',
   'pending_review', 0.83,
   '{"target_role": "Senior Full Stack Developer", "location": "Remote", "market_cycle": "growth_phase"}',
   '[
     {
       "id": "timing_1", 
       "title": "Immediate Search (January)", 
       "description": "Start job search immediately to capitalize on Q1 hiring surge",
       "pros": ["Peak hiring season", "Budget refreshes", "High competition for talent"],
       "cons": ["Holiday season delay", "Year-end busy schedules"],
       "success_probability": 0.81,
       "impact_score": 8
     },
     {
       "id": "timing_2", 
       "title": "Delayed Search (March)", 
       "description": "Wait for market to stabilize and complete additional certification",
       "pros": ["Additional prep time", "Market clarity", "Certification complete"],
       "cons": ["Miss Q1 surge", "Increased competition", "Delayed gratification"],
       "success_probability": 0.74,
       "impact_score": 7
     }
   ]',
   'timing_1',
   'Historical data shows 35% higher job posting volume in Q1. Remote opportunities increased 60% year-over-year. Current skill level meets 85% of market requirements.',
   '{"job_posting_increase": 35, "remote_opportunity_growth": 60, "skill_match": 85, "expected_offers": 3}',
   8
  );

-- Insert advanced autonomous workflows for demonstration
INSERT INTO public.autonomous_workflows (
  user_id, workflow_type, title, description, status, priority, 
  target_outcome, config, context_data, progress_percentage, 
  estimated_duration_days, target_completion_date
) VALUES 
  -- AI-driven skill development workflow
  ('00000000-0000-0000-0000-000000000001', 'skill_development_ai', 
   'AI-Guided Kubernetes Mastery Program', 
   'Autonomous workflow for mastering Kubernetes with AI-curated content and progress tracking.',
   'active', 'high',
   'Achieve Kubernetes certification and practical expertise for DevOps role transition',
   '{
     "learning_modules": [
       {"name": "Kubernetes Fundamentals", "duration_hours": 20, "status": "completed"},
       {"name": "Pod and Service Management", "duration_hours": 15, "status": "in_progress"},
       {"name": "ConfigMaps and Secrets", "duration_hours": 12, "status": "pending"},
       {"name": "Networking and Ingress", "duration_hours": 18, "status": "pending"},
       {"name": "Monitoring and Logging", "duration_hours": 16, "status": "pending"},
       {"name": "Security Best Practices", "duration_hours": 14, "status": "pending"}
     ],
     "practice_projects": 3,
     "certification_prep": true,
     "ai_mentor_sessions": 8
   }',
   '{"current_skill_level": "beginner", "target_certification": "CKA", "preferred_schedule": "evenings", "learning_style": "hands-on"}',
   35,
   60,
   NOW() + INTERVAL '45 days'
  ),
  
  -- Market intelligence workflow
  ('00000000-0000-0000-0000-000000000001', 'market_intelligence_automation', 
   'Automated Career Market Intelligence', 
   'Continuous monitoring and analysis of job market trends, salary data, and skill demand for optimal career positioning.',
   'active', 'medium',
   'Maintain competitive edge through real-time market insights and proactive career adjustments',
   '{
     "monitoring_frequency": "daily",
     "data_sources": ["job_boards", "salary_reports", "industry_news", "skill_trends"],
     "alert_thresholds": {
       "salary_change": 10,
       "job_posting_spike": 25,
       "skill_demand_shift": 15
     },
     "analysis_depth": "comprehensive",
     "predictive_modeling": true
   }',
   '{"target_roles": ["Senior Developer", "Tech Lead", "Solution Architect"], "locations": ["Remote", "San Francisco", "New York"], "industries": ["Tech", "FinTech", "Healthcare"]}',
   75,
   365,
   NOW() + INTERVAL '1 year'
  ),
  
  -- Professional network expansion
  ('00000000-0000-0000-0000-000000000001', 'network_expansion_ai', 
   'AI-Powered Professional Network Growth', 
   'Strategic network expansion using AI to identify and connect with key industry professionals and potential mentors.',
   'planning', 'medium',
   'Build influential professional network of 500+ connections in target industry with 20+ meaningful mentorship relationships',
   '{
     "target_connections_per_week": 10,
     "connection_quality_threshold": 0.7,
     "engagement_strategy": "value_first",
     "content_sharing_frequency": "3_per_week",
     "event_participation": "monthly",
     "mentor_outreach_cadence": "bi_weekly"
   }',
   '{"industry_focus": "Cloud Computing", "seniority_targets": ["Senior", "Principal", "Director"], "company_targets": ["FAANG", "Unicorn Startups", "Cloud Providers"]}',
   0,
   180,
   NOW() + INTERVAL '6 months'
  );

-- Add workflow steps for the AI-guided Kubernetes workflow
INSERT INTO public.workflow_steps (
  workflow_id, step_order, title, description, status, 
  step_type, estimated_hours, confidence_score, dependencies, metadata
) 
SELECT 
  w.id,
  step_data.step_order,
  step_data.title,
  step_data.description,
  step_data.status,
  'learning',
  step_data.estimated_hours,
  step_data.confidence_score,
  '[]'::jsonb,
  step_data.metadata
FROM public.autonomous_workflows w,
LATERAL (
  VALUES 
    (1, 'Complete Kubernetes Fundamentals Course', 'Master basic Kubernetes concepts including pods, nodes, and clusters', 'completed', 20, 0.95, '{"learning_resource": "official_docs", "practice_labs": 5}'),
    (2, 'Practice Pod and Service Management', 'Hands-on experience with creating, managing, and troubleshooting pods and services', 'in_progress', 15, 0.78, '{"lab_exercises": 8, "real_world_scenarios": 3}'),
    (3, 'Master ConfigMaps and Secrets', 'Learn to manage application configuration and sensitive data securely', 'pending', 12, 0.60, '{"security_focus": true, "best_practices": true}'),
    (4, 'Implement Networking and Ingress', 'Advanced networking concepts and ingress controllers for external access', 'pending', 18, 0.40, '{"ingress_controllers": ["nginx", "traefik"], "load_balancing": true}'),
    (5, 'Setup Monitoring and Logging', 'Implement comprehensive monitoring and logging solutions', 'pending', 16, 0.30, '{"tools": ["prometheus", "grafana", "elk"], "alerting": true}'),
    (6, 'Apply Security Best Practices', 'Implement Kubernetes security hardening and best practices', 'pending', 14, 0.20, '{"rbac": true, "network_policies": true, "pod_security": true}'),
    (7, 'Build Capstone Project', 'Create a comprehensive Kubernetes deployment showcasing all learned skills', 'pending', 25, 0.10, '{"project_scope": "microservices", "ci_cd_integration": true}'),
    (8, 'Take CKA Certification Exam', 'Complete Certified Kubernetes Administrator certification', 'pending', 4, 0.05, '{"exam_prep": true, "practice_tests": 3, "scheduling": "flexible"}}')
) AS step_data(step_order, title, description, status, estimated_hours, confidence_score, metadata)
WHERE w.title = 'AI-Guided Kubernetes Mastery Program'
  AND w.user_id = '00000000-0000-0000-0000-000000000001';

-- Create performance metrics tracking table
CREATE TABLE IF NOT EXISTS public.system_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  target_value NUMERIC,
  measurement_unit TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on performance metrics
ALTER TABLE public.system_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage performance metrics
CREATE POLICY "Service role can manage performance metrics" 
ON public.system_performance_metrics FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert initial performance metrics
INSERT INTO public.system_performance_metrics (
  metric_type, metric_name, metric_value, target_value, measurement_unit, metadata
) VALUES 
  ('system_health', 'overall_health_score', 95, 90, 'percentage', '{"components": {"database": 98, "api": 94, "ui": 96, "ai_services": 93}}'),
  ('user_engagement', 'daily_active_users', 1247, 1000, 'count', '{"growth_rate": 15.3, "retention_rate": 87.2}'),
  ('ai_performance', 'maya_response_time', 1.2, 2.0, 'seconds', '{"avg_complexity": "medium", "success_rate": 94.7}'),
  ('workflow_efficiency', 'automation_success_rate', 89, 85, 'percentage', '{"failed_workflows": 11, "total_workflows": 156}'),
  ('data_quality', 'market_data_freshness', 0.8, 0.9, 'hours', '{"sources": 8, "coverage": 92.5}'),
  ('security', 'vulnerability_score', 2, 5, 'count', '{"critical": 0, "high": 0, "medium": 2, "low": 3}'),
  ('scalability', 'api_throughput', 450, 500, 'requests_per_second', '{"peak_load": 680, "avg_response_time": 180}'),
  ('reliability', 'uptime_percentage', 99.7, 99.5, 'percentage', '{"downtime_minutes": 21.6, "incidents": 1}');

-- Add system health monitoring function
CREATE OR REPLACE FUNCTION public.calculate_system_health_score()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  WITH latest_metrics AS (
    SELECT DISTINCT ON (metric_name) 
      metric_name, 
      metric_value, 
      target_value,
      CASE 
        WHEN target_value > 0 THEN (metric_value / target_value) * 100
        ELSE metric_value 
      END as performance_ratio
    FROM public.system_performance_metrics
    WHERE recorded_at >= NOW() - INTERVAL '1 hour'
    ORDER BY metric_name, recorded_at DESC
  ),
  weighted_scores AS (
    SELECT 
      metric_name,
      CASE 
        WHEN metric_name = 'overall_health_score' THEN performance_ratio * 0.3
        WHEN metric_name = 'maya_response_time' THEN 
          CASE WHEN performance_ratio <= 100 THEN 100 ELSE (200 - performance_ratio) END * 0.2
        WHEN metric_name = 'automation_success_rate' THEN performance_ratio * 0.2
        WHEN metric_name = 'uptime_percentage' THEN performance_ratio * 0.15
        WHEN metric_name = 'vulnerability_score' THEN 
          CASE WHEN metric_value <= target_value THEN 100 ELSE 60 END * 0.1
        ELSE performance_ratio * 0.05
      END as weighted_score
    FROM latest_metrics
  )
  SELECT ROUND(COALESCE(SUM(weighted_score), 85), 1)
  FROM weighted_scores;
$$;