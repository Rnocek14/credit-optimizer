-- Invariant for stored-mode providers: must have non-empty, non-root canonical_url
CREATE OR REPLACE VIEW public.invariant_stored_provider_missing_urls AS
SELECT 
  sc.id AS course_id,
  sc.provider_code AS src_provider,
  sc.canonical_code AS src_code,
  sc.canonical_url AS actual_url,
  pr.root_url AS provider_root
FROM public.source_courses sc
JOIN public.provider_registry pr ON pr.provider_code_norm = sc.provider_code
WHERE pr.canonical_url_mode = 'stored'
  AND (
    sc.canonical_url IS NULL
    OR btrim(sc.canonical_url) = ''
    OR sc.canonical_url = pr.root_url
  );

COMMENT ON VIEW public.invariant_stored_provider_missing_urls
IS 'Compliance tripwire: stored-mode providers must have canonical_url populated and not root-only. Use for STUDYCOM and similar providers where URLs are pre-seeded.';