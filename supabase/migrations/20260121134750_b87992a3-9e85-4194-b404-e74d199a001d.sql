
-- Fix STUDYCOM canonical_url using pattern (same as SOPHIA/STRAIGHTERLINE)
UPDATE public.source_courses sc
SET canonical_url = replace(pr.canonical_url_pattern, '{code}', sc.canonical_code),
    updated_at = now()
FROM public.provider_registry pr
WHERE pr.provider_code_norm = sc.provider_code
  AND pr.canonical_url_mode = 'pattern'
  AND sc.provider_code = 'STUDYCOM'
  AND sc.canonical_code IS NOT NULL
  AND (
    sc.canonical_url IS NULL 
    OR sc.canonical_url = 'https://study.com/'
    OR btrim(sc.canonical_url) = ''
  );

-- Mark queue items as succeeded (pattern-resolved, no fetch needed)
UPDATE public.canonical_enrichment_queue
SET enrichment_status = 'succeeded',
    completed_at = now(),
    notes = 'Pattern-resolved: URL generated from registry pattern (403 blocked raw fetch)',
    updated_at = now()
WHERE provider_code = 'STUDYCOM'
  AND enrichment_status IN ('queued', 'pending', 'running');
