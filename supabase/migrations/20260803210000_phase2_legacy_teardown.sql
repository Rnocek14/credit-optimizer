-- Phase-2 legacy teardown (see docs/EDGE_FUNCTION_AUDIT.md "Deletion order").
-- Unschedules the dead Maya crons and removes the signup trigger that posts to
-- the deleted signup-automation function. No tables are dropped here — data
-- cleanup is a separate, export-first step per docs/DATA_ASSET_REGISTER.md.

-- 1. Unschedule legacy Maya cron jobs (targets were deleted edge functions).
DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'maya-insight-generator',
    'maya-insight-generator-secure',
    'maya-hourly-insight-generation'
  ] LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
      RAISE NOTICE 'unscheduled %', job_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'cron job % not found (ok)', job_name;
    END;
  END LOOP;
END $$;

-- 2. Drop the signup trigger that invoked the deleted signup-automation
--    function on every new profile (installed by 20250718015703).
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- Note: the eight 20250718* "generate-roadmap" migrations were one-shot
-- net.http_post calls executed at migration time, not persistent triggers —
-- nothing further to drop for them.
