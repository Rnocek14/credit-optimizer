-- Stop the evidence-backfill worker (2026-09-15 transferability accuracy audit).
--
-- WHY
-- ---
-- `evidence-backfill-worker` runs every 15 minutes and writes `evidence_url`
-- onto credit_transfer_rules rows. It does NOT fetch or verify anything: it
-- maps an institution/provider code to a hardcoded landing page
-- (EQUIVALENCY_PAGE_PATTERNS / PROVIDER_CATALOG_PATTERNS in that function) and
-- stores that generic URL as the rule's evidence, at confidence 0.6. Its own
-- source comment says "page exists but we haven't verified specific course".
--
-- The effect is that every Sophia rule acquires
-- `https://www.sophia.org/online-courses` as its "source" link, which the
-- public /transfer-check page renders behind a shield icon labelled "source".
-- That presents a marketing catalog page as documentary evidence that a
-- specific course transfers to a specific school. It does not establish that,
-- and it inflates any "evidence coverage" metric computed as
-- `count(evidence_url IS NOT NULL)`.
--
-- Every 15 minutes this runs, more rules acquire manufactured provenance. So
-- the first action is to stop it, before any cleanup of what it already wrote.
--
-- SCOPE
-- -----
-- This migration ONLY unschedules the job. It deliberately does not delete or
-- rewrite existing `evidence_url` values: identifying which rows carry
-- manufactured URLs versus genuine ones needs a review against production data
-- (see docs/TRANSFERABILITY_ACCURACY_AUDIT_2026-09-15.md for the query). The
-- UI now labels these URLs honestly in the meantime, so the user-facing
-- misrepresentation is closed without a destructive, unverified data change.
--
-- The edge function itself is retained and now requires admin/CRON_SECRET auth
-- (supabase/functions/_shared/requireAdminOrCron.ts), so it can still be run
-- deliberately once it actually verifies the pages it cites.
--
-- TO RE-ENABLE (only after the function does real verification):
--   SELECT cron.schedule(
--     'evidence-backfill-worker-15m', '*/15 * * * *',
--     $$ SELECT util.run_evidence_backfill_worker(25); $$
--   );

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('evidence-backfill-worker-15m');
    RAISE NOTICE 'unscheduled evidence-backfill-worker-15m';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'cron job evidence-backfill-worker-15m not found (ok)';
  END;
END $$;

COMMENT ON FUNCTION util.run_evidence_backfill_worker(integer) IS
  'DISABLED 2026-09-15: wrote hardcoded landing-page URLs as per-rule evidence '
  'without fetching them. Unscheduled by 20260915120000. Do not re-schedule '
  'until the worker verifies that the page it cites actually supports the rule.';
