-- Use valid source types and add Maya decisions with collaboration context
INSERT INTO public.workflow_validations (user_id, source_type, source_id, validation_score, confidence_score, validation_data)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'maya_decision', (SELECT id FROM maya_decisions WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363' LIMIT 1), 88.5, 0.85, 
   jsonb_build_object('collaboration_type', 'mentor_feedback', 'mentor_feedback', 'excellent_collaboration', 'sessions_completed', 3, 'quality_score', 4.8)),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'maya_decision', (SELECT id FROM maya_decisions WHERE user_id = '3c459625-e499-5ddb-b64d-a442dd21f474' LIMIT 1), 82.3, 0.82, 
   jsonb_build_object('collaboration_type', 'mentor_feedback', 'mentor_feedback', 'good_progress', 'sessions_completed', 2, 'quality_score', 4.2)),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'maya_decision', (SELECT id FROM maya_decisions WHERE user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585' LIMIT 1), 90.1, 0.90, 
   jsonb_build_object('collaboration_type', 'peer_collaboration', 'peer_collaboration', 'active_contributor', 'projects_completed', 2, 'team_rating', 4.5))
ON CONFLICT DO NOTHING;