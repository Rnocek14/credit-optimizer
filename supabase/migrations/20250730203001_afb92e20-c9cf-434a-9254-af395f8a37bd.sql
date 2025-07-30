-- Backfill maya_decisions execution_result from workflow_steps
UPDATE maya_decisions 
SET execution_result = workflow_steps.execution_result
FROM workflow_steps
WHERE maya_decisions.step_id = workflow_steps.id 
  AND maya_decisions.execution_result IS NULL 
  AND workflow_steps.execution_result IS NOT NULL;