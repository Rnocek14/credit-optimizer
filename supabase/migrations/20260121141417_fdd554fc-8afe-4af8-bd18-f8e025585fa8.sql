-- 1) Add enrichment_fetch_strategy column to provider_registry
ALTER TABLE public.provider_registry 
ADD COLUMN IF NOT EXISTS enrichment_fetch_strategy TEXT DEFAULT 'fetch';

COMMENT ON COLUMN public.provider_registry.enrichment_fetch_strategy
IS 'Controls how enrichment worker handles this provider: pattern_only (URL from pattern, no fetch), fetch (raw HTTP), firecrawl (browser-backed), manual (no automation)';

-- 2) Set pattern-mode providers to pattern_only (they block raw fetches)
UPDATE public.provider_registry
SET enrichment_fetch_strategy = 'pattern_only'
WHERE canonical_url_mode = 'pattern'
  AND provider_code_norm IN ('SOPHIA', 'STRAIGHTERLINE', 'STUDYCOM');

-- 3) Set root_only/manual providers to 'manual'
UPDATE public.provider_registry
SET enrichment_fetch_strategy = 'manual'
WHERE canonical_url_mode = 'root_only' 
  OR enrichment_strategy = 'manual';