-- =============================================
-- URL COMPLETENESS INVARIANTS + DATA FIXES
-- =============================================

-- 1) Invariant: pattern-mode providers must have non-root canonical_url
DROP VIEW IF EXISTS public.invariant_pattern_provider_root_urls;
CREATE VIEW public.invariant_pattern_provider_root_urls AS
SELECT
  sc.id,
  sc.provider_code,
  sc.canonical_code,
  sc.canonical_url,
  pr.root_url,
  pr.canonical_url_pattern
FROM public.source_courses sc
JOIN public.provider_registry pr
  ON pr.provider_code_norm = sc.provider_code
WHERE pr.canonical_url_mode = 'pattern'
  AND (
    sc.canonical_url IS NULL
    OR btrim(sc.canonical_url) = ''
    OR sc.canonical_url = pr.root_url
    OR sc.canonical_url = 'https://' || pr.root_url
  );

COMMENT ON VIEW public.invariant_pattern_provider_root_urls
IS 'Compliance tripwire: pattern-mode providers must not have NULL/root-only canonical_url.';

-- 2) Invariant: enrichment must never write when validation fails
DROP VIEW IF EXISTS public.invariant_enrichment_no_invalid_writes;
CREATE VIEW public.invariant_enrichment_no_invalid_writes AS
SELECT *
FROM public.canonical_enrichment_evidence
WHERE validation_passed = false
  AND field_written IS NOT NULL;

COMMENT ON VIEW public.invariant_enrichment_no_invalid_writes
IS 'Compliance tripwire: enrichment must not write fields when validation fails.';

-- 3) Fix SOPHIA canonical_url (rewrite sunyempire.sophia.org to canonical pattern)
UPDATE public.source_courses sc
SET canonical_url = replace(pr.canonical_url_pattern, '{code}', sc.canonical_code),
    updated_at = now()
FROM public.provider_registry pr
WHERE pr.provider_code_norm = sc.provider_code
  AND pr.canonical_url_mode = 'pattern'
  AND sc.provider_code = 'SOPHIA'
  AND sc.canonical_code IS NOT NULL
  AND (
    sc.canonical_url ILIKE '%sunyempire.sophia.org%'
    OR sc.canonical_url IS NULL
    OR sc.canonical_url = pr.root_url
  );

-- 4) Fix STRAIGHTERLINE canonical_url (generate from pattern)
UPDATE public.source_courses sc
SET canonical_url = replace(pr.canonical_url_pattern, '{code}', sc.canonical_code),
    updated_at = now()
FROM public.provider_registry pr
WHERE pr.provider_code_norm = sc.provider_code
  AND pr.canonical_url_mode = 'pattern'
  AND sc.provider_code = 'STRAIGHTERLINE'
  AND sc.canonical_code IS NOT NULL
  AND (
    sc.canonical_url IS NULL 
    OR sc.canonical_url = pr.root_url 
    OR btrim(sc.canonical_url) = ''
  );