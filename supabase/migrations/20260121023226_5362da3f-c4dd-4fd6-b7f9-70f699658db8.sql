-- Create enrichment_blocked view for operational visibility
CREATE OR REPLACE VIEW public.enrichment_blocked AS
SELECT *
FROM public.canonical_enrichment_queue
WHERE enrichment_status = 'blocked'
ORDER BY updated_at DESC;