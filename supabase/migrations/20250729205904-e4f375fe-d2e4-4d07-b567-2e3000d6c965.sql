-- Create Senior Product Manager transition template
INSERT INTO workflow_templates (
  template_name,
  title,
  description,
  category,
  estimated_duration_days,
  template_steps,
  required_context,
  is_active
) VALUES (
  'senior_product_manager_transition',
  'Transition to Senior Product Manager',
  'Complete 90-day pathway to become a Senior Product Manager with market validation and skill development',
  'role_transition',
  90,
  ARRAY[
    'skill_gap_analysis',
    'market_check',
    'learning_plan_creation',
    'project_assignment',
    'network_building',
    'portfolio_building',
    'interview_preparation',
    'salary_negotiation_prep'
  ],
  ARRAY['current_role', 'target_role', 'location', 'timeline'],
  true
);

-- Create generic role transition template as fallback
INSERT INTO workflow_templates (
  template_name,
  title,
  description,
  category,
  estimated_duration_days,
  template_steps,
  required_context,
  is_active
) VALUES (
  'generic_role_transition',
  'Career Role Transition',
  'General pathway for transitioning between career roles with skill development and market preparation',
  'role_transition',
  75,
  ARRAY[
    'skill_gap_analysis',
    'market_check',
    'learning_plan_creation',
    'project_assignment',
    'network_building',
    'portfolio_building'
  ],
  ARRAY['current_role', 'target_role', 'location'],
  true
);