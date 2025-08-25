-- Enable RLS on backup table to fix security warning
ALTER TABLE career_tracks_backup_20250821 ENABLE ROW LEVEL SECURITY;

-- Add simple career risk data using INSERT without ON CONFLICT
DELETE FROM career_risks WHERE user_id IN (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  '5b11f83e-2f25-422d-aa61-b4f9c07b7eee', 
  'cd43942f-56c5-49b5-8771-39f88b2775a2'
);

INSERT INTO career_risks (user_id, track_id, ai_job_risk_pct, roi_volatility, switch_risk_score, cri_mismatch, age_penalty_factor, risk_breakdown)
VALUES 
-- Product Designer - Low risk
('2b458624-d498-4cca-a63d-9341cc20e363', 'e728ea1b-aeac-431a-b223-4315a7044fa5', 25.5, 18.2, 42.1, 12.8, 1.1, '{"automation_risk": 25.5, "age_penalty_impact": 5.5, "switch_difficulty": 42.1, "market_volatility": 18.2, "skill_mismatch": 12.8}'),

-- UX Designer - Low risk  
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', 'a613819f-a6ee-471b-bc31-4498bbcd5f09', 18.7, 15.3, 35.2, 8.9, 0.9, '{"automation_risk": 18.7, "age_penalty_impact": -5.0, "switch_difficulty": 35.2, "market_volatility": 15.3, "skill_mismatch": 8.9}'),

-- Senior Graphic Designer - High risk
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '3b013c05-dca3-44bd-a34d-6ae334a6b56c', 58.3, 35.2, 68.4, 28.7, 1.2, '{"automation_risk": 58.3, "age_penalty_impact": 10.0, "switch_difficulty": 68.4, "market_volatility": 35.2, "skill_mismatch": 28.7}'),

-- Freelance Graphic Designer - Very High risk
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '6329df6b-fe2e-4ce3-87ba-18f7487f643d', 68.9, 42.1, 78.5, 35.4, 1.1, '{"automation_risk": 68.9, "age_penalty_impact": 5.5, "switch_difficulty": 78.5, "market_volatility": 42.1, "skill_mismatch": 35.4}'),

-- UX Design Lead - Medium risk
('cd43942f-56c5-49b5-8771-39f88b2775a2', 'ddcc63a7-f933-459d-88c0-53a2df005ef4', 45.2, 28.4, 52.3, 18.9, 1.3, '{"automation_risk": 45.2, "age_penalty_impact": 15.0, "switch_difficulty": 52.3, "market_volatility": 28.4, "skill_mismatch": 18.9}');