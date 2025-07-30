-- Reset Step 5 (network_building) in Aisha Khan's workflow for manual execution testing
UPDATE workflow_steps 
SET 
  status = 'pending',
  execution_result = NULL,
  executed_at = NULL,
  updated_at = now()
WHERE workflow_id = '597328c5-3eeb-4f83-bdea-c8396c38e0fc'
  AND step_order = 5
  AND action_type = 'network_building';

-- Reset workflow progress to 50% (4 out of 8 steps completed)
UPDATE autonomous_workflows 
SET 
  progress_percentage = 50,
  updated_at = now()
WHERE id = '597328c5-3eeb-4f83-bdea-c8396c38e0fc';