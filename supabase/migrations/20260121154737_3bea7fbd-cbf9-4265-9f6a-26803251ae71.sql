-- Invariant registry: canonical list of all invariant views
CREATE OR REPLACE VIEW public.invariant_registry AS
SELECT
  v.schemaname,
  v.viewname,
  v.definition
FROM pg_views v
WHERE v.schemaname = 'public'
  AND (
    v.viewname LIKE 'invariant_%'
    OR v.viewname IN ('operational_health_dashboard','provider_health_breakdown','system_invariant_health')
  )
ORDER BY v.viewname;

COMMENT ON VIEW public.invariant_registry IS 'Canonical list of all invariant views and their definitions. Use: SELECT viewname FROM invariant_registry;';