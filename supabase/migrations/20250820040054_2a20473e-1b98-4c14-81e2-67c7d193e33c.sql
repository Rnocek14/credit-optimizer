-- Insert sample skill automation risk data only (no user dependencies)
INSERT INTO public.skill_automation_risk (skill_id, automation_risk_pct, horizon_years, source) VALUES
('550e8400-e29b-41d4-a716-446655440001', 15.5, 10, 'Industry analysis - Creative roles'),
('550e8400-e29b-41d4-a716-446655440002', 65.2, 5, 'Industry analysis - Data entry roles'),
('550e8400-e29b-41d4-a716-446655440003', 25.8, 15, 'Industry analysis - Management roles'),
('550e8400-e29b-41d4-a716-446655440004', 45.3, 8, 'Industry analysis - Analytics roles'),
('550e8400-e29b-41d4-a716-446655440005', 35.7, 12, 'Industry analysis - Technical support')
ON CONFLICT (skill_id) DO NOTHING;