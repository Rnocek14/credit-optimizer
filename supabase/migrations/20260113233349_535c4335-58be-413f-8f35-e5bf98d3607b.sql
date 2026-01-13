-- Health check RPC: reusable audit for queue/template reconciliation
CREATE OR REPLACE FUNCTION public.check_template_generation_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'completed_queue_missing_templates', (
      SELECT COUNT(*)::int
      FROM template_generation_queue tgq
      LEFT JOIN program_templates pt ON pt.program_catalog_id = tgq.program_catalog_id
      WHERE tgq.status = 'completed' AND pt.id IS NULL
    ),
    'templates_without_queue_rows', (
      SELECT COUNT(*)::int
      FROM program_templates pt
      LEFT JOIN template_generation_queue tgq ON tgq.program_catalog_id = pt.program_catalog_id
      WHERE tgq.id IS NULL
    ),
    'queued_rows_missing_programs', (
      SELECT COUNT(*)::int
      FROM template_generation_queue tgq
      LEFT JOIN program_catalog pc ON pc.id = tgq.program_catalog_id
      WHERE tgq.status = 'queued' AND pc.id IS NULL
    ),
    'duplicate_templates', (
      SELECT COUNT(*)::int
      FROM (
        SELECT program_catalog_id, track, COUNT(*) as cnt
        FROM program_templates
        GROUP BY program_catalog_id, track
        HAVING COUNT(*) > 1
      ) dupes
    ),
    'queue_summary', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*)::int as cnt
        FROM template_generation_queue
        GROUP BY status
      ) s
    ),
    'templates_by_institution', (
      SELECT jsonb_object_agg(institution_code, cnt)
      FROM (
        SELECT pc.institution_code, COUNT(*)::int as cnt
        FROM program_templates pt
        JOIN program_catalog pc ON pc.id = pt.program_catalog_id
        GROUP BY pc.institution_code
      ) t
    ),
    'checked_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$;