-- Fix STUDYCOM: URLs use human-readable slugs, not internal codes
-- So canonical_url_mode should be 'stored' (pre-populated URLs) not 'pattern'
UPDATE public.provider_registry
SET canonical_url_mode = 'stored',
    canonical_url_pattern = NULL,
    enrichment_fetch_strategy = 'manual'
WHERE provider_code_norm = 'STUDYCOM';

-- Add comment for clarity
COMMENT ON COLUMN public.provider_registry.canonical_url_mode
IS 'How canonical URLs are determined: pattern (templated from code), stored (pre-populated per course), root_only (provider homepage only)';