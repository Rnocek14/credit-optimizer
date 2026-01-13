-- Enhanced health check with expected vs actual template counts
CREATE OR REPLACE FUNCTION public.check_template_generation_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  queue_by_inst jsonb;
  templates_expected_by_inst jsonb;
BEGIN
  -- Build queue_by_institution: {COSC: {queued: 17, completed: 3}, ...}
  SELECT COALESCE(
    jsonb_object_agg(institution_code, status_obj),
    '{}'::jsonb
  ) INTO queue_by_inst
  FROM (
    SELECT 
      institution_code,
      jsonb_object_agg(status, cnt ORDER BY status) as status_obj
    FROM (
      SELECT 
        pc.institution_code,
        tgq.status,
        COUNT(*)::int as cnt
      FROM template_generation_queue tgq
      JOIN program_catalog pc ON pc.id = tgq.program_catalog_id
      GROUP BY pc.institution_code, tgq.status
    ) raw
    GROUP BY institution_code
  ) agg;

  -- Build templates_expected_for_completed (sum of desired_tracks lengths for completed jobs)
  SELECT COALESCE(
    jsonb_object_agg(institution_code, expected_templates),
    '{}'::jsonb
  ) INTO templates_expected_by_inst
  FROM (
    SELECT 
      pc.institution_code,
      SUM(COALESCE(array_length(tgq.desired_tracks, 1), 1))::int as expected_templates
    FROM template_generation_queue tgq
    JOIN program_catalog pc ON pc.id = tgq.program_catalog_id
    WHERE tgq.status = 'completed'
    GROUP BY pc.institution_code
  ) exp;

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
    'partial_progress_jobs', (
      -- Jobs still queued but have some templates (like partial runs)
      SELECT COUNT(*)::int
      FROM template_generation_queue tgq
      WHERE tgq.status = 'queued'
        AND EXISTS (SELECT 1 FROM program_templates pt WHERE pt.program_catalog_id = tgq.program_catalog_id)
    ),
    'stale_processing_count', (
      SELECT COUNT(*)::int
      FROM template_generation_queue
      WHERE status = 'processing'
        AND locked_at < now() - interval '10 minutes'
    ),
    'queue_summary', (
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      FROM (
        SELECT status, COUNT(*)::int as cnt
        FROM template_generation_queue
        GROUP BY status
      ) s
    ),
    'queue_by_institution', queue_by_inst,
    'templates_by_institution', (
      SELECT COALESCE(jsonb_object_agg(institution_code, cnt), '{}'::jsonb)
      FROM (
        SELECT pc.institution_code, COUNT(*)::int as cnt
        FROM program_templates pt
        JOIN program_catalog pc ON pc.id = pt.program_catalog_id
        GROUP BY pc.institution_code
      ) t
    ),
    'templates_expected_for_completed', templates_expected_by_inst,
    'checked_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$;