-- Stale processing reaper: self-healing for crashed/timed-out workers
CREATE OR REPLACE FUNCTION public.reap_stale_processing_jobs(
  p_stale_threshold_minutes int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reaped_count int;
  result jsonb;
BEGIN
  WITH reaped AS (
    UPDATE template_generation_queue
    SET 
      status = 'queued',
      locked_at = NULL,
      locked_by = NULL,
      error_code = 'STALE_LOCK_REAPED',
      error_message = format('Reaped after %s minutes in processing state', p_stale_threshold_minutes)
    WHERE status = 'processing'
      AND locked_at < now() - (p_stale_threshold_minutes || ' minutes')::interval
    RETURNING id
  )
  SELECT COUNT(*) INTO reaped_count FROM reaped;

  result := jsonb_build_object(
    'reaped_count', reaped_count,
    'threshold_minutes', p_stale_threshold_minutes,
    'reaped_at', now()
  );

  RETURN result;
END;
$$;

-- Enhanced health check with queue_by_institution and stale_processing_count
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
    'stale_processing_count', (
      SELECT COUNT(*)::int
      FROM template_generation_queue
      WHERE status = 'processing'
        AND locked_at < now() - interval '10 minutes'
    ),
    'queue_summary', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*)::int as cnt
        FROM template_generation_queue
        GROUP BY status
      ) s
    ),
    'queue_by_institution', (
      SELECT jsonb_object_agg(
        institution_code,
        status_counts
      )
      FROM (
        SELECT 
          pc.institution_code,
          jsonb_object_agg(tgq.status, cnt) as status_counts
        FROM (
          SELECT program_catalog_id, status, COUNT(*)::int as cnt
          FROM template_generation_queue
          GROUP BY program_catalog_id, status
        ) tgq
        JOIN program_catalog pc ON pc.id = tgq.program_catalog_id
        GROUP BY pc.institution_code
      ) by_inst
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