-- Fix queue_by_institution aggregation
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
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      FROM (
        SELECT status, COUNT(*)::int as cnt
        FROM template_generation_queue
        GROUP BY status
      ) s
    ),
    'queue_by_institution', (
      SELECT COALESCE(jsonb_object_agg(institution_code, status_counts), '{}'::jsonb)
      FROM (
        SELECT 
          pc.institution_code,
          jsonb_object_agg(tgq.status, tgq.cnt) as status_counts
        FROM (
          SELECT 
            tgq.program_catalog_id,
            tgq.status,
            COUNT(*)::int as cnt
          FROM template_generation_queue tgq
          GROUP BY tgq.program_catalog_id, tgq.status
        ) sub
        JOIN program_catalog pc ON pc.id = sub.program_catalog_id
        CROSS JOIN LATERAL (SELECT sub.status, sub.cnt) tgq
        GROUP BY pc.institution_code
      ) by_inst
    ),
    'templates_by_institution', (
      SELECT COALESCE(jsonb_object_agg(institution_code, cnt), '{}'::jsonb)
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