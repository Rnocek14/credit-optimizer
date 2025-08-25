-- Add varied career risk data to career_risks table
INSERT INTO career_risks (user_id, track_id, ai_job_risk_pct, roi_volatility, switch_risk_score, cri_mismatch, age_penalty_factor, risk_breakdown)
VALUES 
-- Product Designer tracks
('2b458624-d498-4cca-a63d-9341cc20e363', 'e728ea1b-aeac-431a-b223-4315a7044fa5', 25.5, 18.2, 42.1, 12.8, 1.1, '{"automation_risk": 25.5, "age_penalty_impact": 5.5, "switch_difficulty": 42.1, "market_volatility": 18.2, "skill_mismatch": 12.8}'),
('cd43942f-56c5-49b5-8771-39f88b2775a2', '34598f2d-2b73-491b-9846-ce262c1fa14a', 28.3, 22.1, 38.5, 15.2, 1.2, '{"automation_risk": 28.3, "age_penalty_impact": 10.0, "switch_difficulty": 38.5, "market_volatility": 22.1, "skill_mismatch": 15.2}'),

-- UX/UI Designer tracks  
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', 'a613819f-a6ee-471b-bc31-4498bbcd5f09', 18.7, 15.3, 35.2, 8.9, 0.9, '{"automation_risk": 18.7, "age_penalty_impact": -5.0, "switch_difficulty": 35.2, "market_volatility": 15.3, "skill_mismatch": 8.9}'),
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '2a45efb9-5f7f-402c-b89d-4957aac0bb34', 21.4, 16.8, 32.7, 11.3, 1.0, '{"automation_risk": 21.4, "age_penalty_impact": 0.0, "switch_difficulty": 32.7, "market_volatility": 16.8, "skill_mismatch": 11.3}'),
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '12e60088-a70e-498c-af00-3c230c7d722b', 32.1, 19.5, 41.8, 16.7, 1.1, '{"automation_risk": 32.1, "age_penalty_impact": 5.5, "switch_difficulty": 41.8, "market_volatility": 19.5, "skill_mismatch": 16.7}'),

-- Leadership/Strategic roles
('cd43942f-56c5-49b5-8771-39f88b2775a2', 'ddcc63a7-f933-459d-88c0-53a2df005ef4', 15.2, 28.4, 52.3, 18.9, 1.3, '{"automation_risk": 15.2, "age_penalty_impact": 15.0, "switch_difficulty": 52.3, "market_volatility": 28.4, "skill_mismatch": 18.9}'),
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', 'd4a6012f-1b1b-4f5f-8295-db0ba4fb4932', 12.8, 31.7, 48.9, 22.1, 1.4, '{"automation_risk": 12.8, "age_penalty_impact": 20.0, "switch_difficulty": 48.9, "market_volatility": 31.7, "skill_mismatch": 22.1}'),

-- High-risk tracks  
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '3b013c05-dca3-44bd-a34d-6ae334a6b56c', 58.3, 35.2, 68.4, 28.7, 1.2, '{"automation_risk": 58.3, "age_penalty_impact": 10.0, "switch_difficulty": 68.4, "market_volatility": 35.2, "skill_mismatch": 28.7}'),
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '6329df6b-fe2e-4ce3-87ba-18f7487f643d', 68.9, 42.1, 78.5, 35.4, 1.1, '{"automation_risk": 68.9, "age_penalty_impact": 5.5, "switch_difficulty": 78.5, "market_volatility": 42.1, "skill_mismatch": 35.4}'),
('5b11f83e-2f25-422d-aa61-b4f9c07b7eee', '1ca26ad3-f44c-491b-ac13-e0dca87d1acd', 52.7, 38.9, 65.2, 31.8, 1.3, '{"automation_risk": 52.7, "age_penalty_impact": 15.0, "switch_difficulty": 65.2, "market_volatility": 38.9, "skill_mismatch": 31.8}')

ON CONFLICT (user_id, track_id) DO UPDATE SET
  ai_job_risk_pct = EXCLUDED.ai_job_risk_pct,
  roi_volatility = EXCLUDED.roi_volatility,
  switch_risk_score = EXCLUDED.switch_risk_score,
  cri_mismatch = EXCLUDED.cri_mismatch,
  age_penalty_factor = EXCLUDED.age_penalty_factor,
  risk_breakdown = EXCLUDED.risk_breakdown,
  updated_at = now();