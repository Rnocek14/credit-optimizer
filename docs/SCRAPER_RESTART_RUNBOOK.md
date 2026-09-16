# Scraper Restart Runbook

Audit item 7 from `TRANSFERABILITY_ACCURACY_AUDIT_2026-09-15.md`. This is the
item that decides whether the product's numbers are **current**, as opposed to
merely honest about their age — items 1–6 and 8–10 did the latter.

**This runbook is not automated on purpose.** Restarting the scraper makes your
infrastructure crawl external university websites, and the 2026-05-21 addendum
is explicit that the restart should be *staged*: one institution, watched for
24 hours, before the other nine. A migration that did this on deploy would take
that decision away from you. Everything below is ready to paste; you choose
when.

Run every query in the Supabase SQL editor.

---

## Step 0 — Establish what is actually true

Nothing below is worth doing until you know the current state. The previous
audit's central lesson was that static analysis proves a pipeline *can* run,
never that it *does*.

```sql
-- 0a. Is there a scraper cron at all? This is THE question.
SELECT jobid, jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;
```

Expected job names if one exists: anything referencing `transfer-scraper`,
`auto-scan`, `policy-change-scan`, or `ops-cron-runner`. **None of these exist
in version control** — all 12 committed `cron.schedule()` calls resolve to six
unrelated jobs — so if one is running it was created in the Dashboard.

- **Returns a scraper job, `active = true`** → the pipeline has a heartbeat.
  Skip to Step 3 and find out why it produced nothing.
- **Returns nothing** → your transfer rules have been frozen since January and
  will stay frozen. Continue.

```sql
-- 0b. How stale is the corpus, per institution?
SELECT institution, max(created_at) AS last_scrape, count(*) AS jobs
FROM scrape_jobs
GROUP BY institution
ORDER BY last_scrape NULLS FIRST;

-- 0c. Did the 2026-08-03 template_id fix ever take effect?
--     Every value was NULL at the last baseline.
SELECT institution_code,
       count(*) FILTER (WHERE last_scraped_at IS NOT NULL) AS stamped,
       count(*)                                            AS total,
       max(last_scraped_at)                                AS newest
FROM scrape_url_templates
WHERE status = 'active'
GROUP BY institution_code
ORDER BY institution_code;

-- 0d. How much of the rule corpus would survive the 180-day freshness gate?
SELECT target_institution,
       count(*) FILTER (WHERE last_verified_at > now() - interval '180 days') AS fresh,
       count(*)                                                               AS total,
       max(last_verified_at)                                                  AS newest
FROM credit_transfer_rules
WHERE is_active
GROUP BY target_institution
ORDER BY target_institution;
```

Record the numbers before changing anything. They are your before-picture.

---

## Step 1 — Prove the scraper works for ONE institution, by hand

Do not schedule anything yet. Invoke it once, manually, for TESU — the
institution with the most data and therefore the most signal.

```bash
curl -X POST \
  "https://vzpissitddpunkpythsb.supabase.co/functions/v1/transfer-scraper-auto-scan" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"institution":"TESU"}'
```

Then watch **four signals**, exactly as the 2026-05-21 addendum specified:

| # | Query | Expected change |
|---|-------|-----------------|
| 1 | `0b` above | TESU `last_scrape` becomes today |
| 2 | `0c` above | TESU `stamped` goes from 0 to non-zero |
| 3 | `SELECT * FROM v_pipeline_health_scrape_success_weekly WHERE institution='TESU'` | a row for the current week |
| 4 | `0d` above | unchanged — one scan does not make rules |

**If signal 2 does not move, stop.** That means the 2026-08-03 `template_id`
fix (commit `3686cb0`) is not at the real write site, and scheduling the job
would just accumulate scrape rows that never stamp anything. Re-open that
investigation instead of proceeding.

Expect **zero detected changes** on this first successful run. That is by
design, not failure: `transfer-scraper-crawl` sets
`content_changed = !!old_hash && ...`, which is false when `last_hash` is NULL.
The first run establishes the baseline hash; the second run is the first that
can detect drift.

---

## Step 2 — Schedule it, one institution first

Only after all four signals behaved. Put the schedule in a migration so it is
auditable — the reason nobody could answer "is the scraper running?" is that
the previous one lived only in the Dashboard.

```sql
-- Wrapper, matching the util.* convention already used by
-- evidence-backfill-worker and degree-truth-scan (migration 20260113160411).
CREATE OR REPLACE FUNCTION util.run_transfer_scraper(inst text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM util.invoke_edge_function(
    name => 'transfer-scraper-auto-scan',
    body => jsonb_build_object('institution', inst)
  );
END;
$$;

-- TESU only, nightly at 03:00 UTC.
SELECT cron.schedule(
  'transfer-scraper-tesu-nightly',
  '0 3 * * *',
  $$ SELECT util.run_transfer_scraper('TESU'); $$
);
```

> **Check `app.settings.service_role_key` is set first.**
> `util.invoke_edge_function` falls back to the **anon key** when it is unset
> (see migration 20260113160411, lines ~22-27). The scraper chain still has
> `verify_jwt = false` so an anon call currently succeeds — but that fallback is
> silent, and it will break the moment those functions are hardened. Set the
> key rather than relying on it.

**Now wait 24 hours and look at the panel before doing anything else.** The
panel exists to make changes visible against history; patching the same day
defeats it.

---

## Step 3 — Widen, or diagnose

**If TESU produced new rules after 48 hours**, add the rest one cohort at a
time, same pattern. Do not schedule all ten at once: if there is a fourth bug
nobody has found, surface it in one institution rather than ten.

**If TESU scraped successfully but produced no rules**, the failure is
downstream of the scrape, and these narrow it:

```sql
-- Where do packs die? (blocked_reason is only set on some failures)
SELECT institution, status, blocked_reason, count(*)
FROM institution_policy_packs
WHERE status <> 'deprecated'
GROUP BY 1, 2, 3
ORDER BY 1;

-- The known merge-side failure: UMGC had 145 successful scrapes and 0 packs.
SELECT * FROM v_pipeline_health_funnel_monthly ORDER BY month DESC LIMIT 20;
```

Known open threads from the last baseline, still unresolved:
- **UMGC**: 145 successful scrapes, 0 packs. Merge-side, not scrape-side.
- **The `validate` writer went silent in February.** January packs came via
  `validate`; April packs were entirely `merge`. No code change explains it.
- **59% of non-promoted packs carry neither `promoted_at` nor
  `blocked_reason`**, so "gate rejected it" and "nobody tried" are
  indistinguishable. Worth fixing before drawing conclusions from promotion rates.

---

## Step 4 — Turn the freshness gate from cosmetic into enforcing

Once `0d` shows a meaningful fresh fraction, staleness stops being something
the UI merely labels and becomes something the engine can enforce:

- `src/pages/EduTree/v5/engine/transferEngine.ts` — `TransferRuleCheckResult.stale`
  is computed and returned but deliberately **not enforced**, because enforcing
  it against a 100%-stale corpus would zero out every plan rather than improve
  any answer. Flipping it is a one-line change at the call sites that read it.
- `src/lib/transfer/ruleFreshness.ts` — `RULE_FRESHNESS_DAYS` is 180. Shorten it
  once refresh is routine.

---

## What "done" looks like

Borrowed from the 2026-05-21 addendum, which set these thresholds before
anyone could game them. Failing any one is a re-block, not a partial win:

1. Successful scrapes within the last 7 days for **at least 8 of 10** institutions.
2. Non-null `last_scraped_at` template stamps for the same 8.
3. `pack_promotion_ratio_live` above **50%** for at least 3 institutions.

Until then, the product is honest about its uncertainty but is not current, and
`docs/MONETIZATION_RUNBOOK.md` should stay blocked for paid traffic.
