-- Queue STUDYCOM courses with root-only URLs for enrichment
INSERT INTO public.canonical_enrichment_queue (
  source_course_id,
  provider_code,
  canonical_code,
  enrichment_status,
  missing_fields,
  priority,
  notes
)
SELECT 
  sc.id,
  sc.provider_code,
  sc.canonical_code,
  'pending',
  ARRAY['canonical_url'],
  5, -- higher priority for known gaps
  'Auto-queued: root-only URL needs enrichment'
FROM public.source_courses sc
WHERE sc.provider_code = 'STUDYCOM'
  AND sc.canonical_url = 'https://study.com/'
ON CONFLICT (source_course_id) DO UPDATE SET
  enrichment_status = 'pending',
  priority = 5,
  notes = 'Re-queued: root-only URL needs enrichment',
  updated_at = now();