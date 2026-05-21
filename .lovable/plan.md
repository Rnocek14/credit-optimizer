# Scraper Pipeline Revival — Phased Plan

End goal: scraper reliably pulls transfer data for the existing 10 institutions on a schedule, with a visible health panel, so adding new schools (UMPI next) becomes a config change instead of an investigation.

## What the codebase actually shows (verified this pass)

- **No scraper cron is registered.** `cron.job` contains only `template-generation-cron`, `evidence-backfill-worker-15m`, `degree-truth-scan-nightly`, `maya-hourly-insight-generation`. No entry invokes `transfer-scraper-auto-scan`, `policy-refresh-start`, or `ops-cron-runner`. The "cron dead since January" symptom is "scraper cron was never wired in this repo."
- **`last_scraped_at` write is missing, not broken.** `transfer-scraper-auto-scan/index.ts` reads `scrape_url_templates` but contains zero writes to `last_scraped_at` anywhere in the file. The audit addendum's `:283` is a misdiagnosis; it's an absent write, not a wrong one.
- **Observability is already shipped.** Six `v_pipeline_health_*` views + `operational_health_dashboard` + `system-healthcheck` edge function exist. The admin panel just needs to render them.
- **All pipeline stages exist** as edge functions (crawl, extract, merge, validate, promote-policy-pack, plus `ops-cron-runner` and `policy-refresh-start` as orchestrators). The plumbing is there; the orchestration trigger and the stamp-back write are not.
- **Admin routes exist**: `/admin/transfer-scraper`, `/admin/policy-promotion`, `/admin/policy-pipeline`, `/admin/policy-refresh`. Link contract surface is stable.

## Phases

### Phase 1 — Close the audit artifact (30 min, no code)
Unblock the paper trail so future readers have a single source of truth.
- Paste original audit into Appendix A of `AUDIT_ADDENDUM_2026-05-21.md`, **or** label Appendix A "Reconstruction, not original" and write from memory.
- Link-contract audit: confirm `/admin/policy-promotion` and `/admin/transfer-scraper` do not parse `useSearchParams` today, so the panel can pass query strings without breaking either page. (Both files already confirmed not to use search params.)

### Phase 2 — Build the pipeline-health panel (1 session)
A read-only `/admin/pipeline-health` page on top of the six existing views. No new backend work.
- Headline cohort split: Original-5 vs V2-expansion-5, last-scrape age per institution.
- Per-section captions naming the source view (`v_pipeline_health_scrape_success_weekly`, etc.) so the panel is self-documenting.
- `pack_promotion_ratio` (lifetime) and `pack_promotion_ratio_live` (non-deprecated) side by side.
- "Investigate" links to `/admin/transfer-scraper?institution=X` and `/admin/policy-promotion?institution=X` (URL shape locked by Phase 1).
- Re-uses `EnhancedErrorBoundary` and the standard admin layout.

### Phase 3 — 24-hour observation pause
Panel sits before any patches. Purpose: subsequent patches show as deltas against a known baseline. Skip this and we lose the signal from steps 4 and 5.

### Phase 4 — Fix template stamp-back (small patch)
Add the missing `last_scraped_at` write in `transfer-scraper-auto-scan/index.ts` after a successful crawl, keyed on `(institution_code, url)`. Manual invoke against TESU only. Watch the `v_pipeline_health_template_stamp_freshness` view for null→timestamp transitions on the 9 TESU templates. If they don't move, the write is in the wrong handler and gets rolled back.

### Phase 5 — Wire scraper cron (staged)
Register the missing cron job via the `pg_cron` + `pg_net` pattern (per project rules — insert via the Supabase tool, not migration, because the URL/key are project-specific).
- **Stage 5a:** schedule `policy-refresh-start` for TESU only, daily. Watch panel for 24h.
- **Stage 5b:** if Q1/Q1b/Q2 move as expected and nothing surprises, expand the schedule to the other 9 institutions.
- Decoupled change + deltable signal. If a fourth bug exists, it surfaces in one institution, not ten.

### Phase 6 — Re-baseline and investigate stragglers
Compare against `BASELINE_2026-05-21_v1.md`. Known suspects to investigate post-revival:
- **UMGC:** 145 scrapes, 0 packs → merge-side failure independent of scrape quality.
- **Validate writer silent since February** → no code change explains it, parked for this phase.
- **16 abandoned drafts** with no `promoted_at` and no `blocked_reason` → either auto-expire or surface in the promotion queue.

### Phase 7 — UMPI onboarding (the actual end goal)
Gated on: (a) Q1 shows successful scrapes within 7 days for ≥8/10 institutions, (b) Q1b shows non-null template stamps for the same 8, (c) `pack_promotion_ratio_live` >50% for ≥3 institutions. Failing any one is a re-block, not a partial win. If gates pass, UMPI is a row insert into `scrape_url_templates` + `institutions` and the existing pipeline handles it.

## Distance estimate

- Phases 1–2: ~1 working session (panel build is the bulk).
- Phase 3: calendar wait, not work.
- Phases 4–5: ~1 session combined if the stamp fix lands cleanly; +1 if Phase 4 reveals a deeper write-path issue.
- Phase 6: scope unknown until panel shows post-cron state.
- Phase 7: hours, once gates pass.

Realistic: 2–3 focused sessions from here to the inflection point where new schools are routine.

## Out of scope for this plan

- Refactoring the 5-stage pipeline architecture (it works; the issue is orchestration and observability).
- Adding new scrapers or new sources.
- The validate-writer silence — surfaced in Phase 6 only after the cron-revival signal is clean enough to distinguish "validate broken" from "nothing reaches validate."
