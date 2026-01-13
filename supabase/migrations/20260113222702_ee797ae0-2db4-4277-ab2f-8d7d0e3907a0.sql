
-- Reset polluted queue rows: completed without templates
UPDATE template_generation_queue 
SET 
  status = 'queued',
  completed_at = NULL,
  locked_at = NULL,
  locked_by = NULL,
  error_code = 'LEGACY_COMPLETION_NO_TEMPLATE',
  error_message = 'Reset by audit: completed without corresponding template rows'
WHERE id IN (
  SELECT tgq.id
  FROM template_generation_queue tgq
  LEFT JOIN program_templates pt ON pt.program_catalog_id = tgq.program_catalog_id
  WHERE tgq.status = 'completed'
    AND pt.id IS NULL
);
