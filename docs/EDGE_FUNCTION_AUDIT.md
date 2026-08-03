# Edge Function Audit — 2026-08-03

Classification of all 138 functions under `supabase/functions/` (excludes `_shared/`,
`import_map.json`), produced by the pre-deletion salvage audit. Caller evidence for every
KEEP; zero-reference confirmation (frontend + function-to-function + pg_cron) for every
DELETE. Companion to `SALVAGE_MANIFEST.md` and `DATA_ASSET_REGISTER.md`.

## Totals

| Category | Count |
|---|---|
| KEEP-RUNTIME (invoked by surviving frontend) | 19 |
| KEEP-PIPELINE (transfer-rules data machine + crons) | 37 |
| DELETE-LEGACY (no surviving caller) | 72 |
| UNCERTAIN (decide during Phase 2) | 10 |

## KEEP-RUNTIME (19)

`evidence-summary`, `evaluate-plan`†, `onboarding-submit`‡, `quota-check`,
`run-migrations`, `firecrawl-scrape`, `firecrawl-search`, `firecrawl-test`,
`url-verify-worker`, `get-invariant-snapshot`, `list-invariant-snapshots`,
`rerun-template-invariants`, `bulk-rerun-templates`, `bulk-rerun-worker`,
`get-bulk-rerun-job`, `seed-sophia-canonical`, `seed-studycom-canonical`,
`seed-clep-canonical`, `run-seeds`

† `evaluate-plan`'s only UI caller (`PlanDashboard`) is currently unmounted — kept
deliberately (server-side plan evaluator, see manifest §1).
‡ `onboarding-submit/index.ts:78` invokes legacy `maya-intelligence-engine` inside a
try-block — **cascade edit required** when the maya cluster is deleted.

Dangling frontend invokes of functions that DON'T exist (callers all legacy, delete with
them): `firecrawl-map`, `calculate-cri`, `find-pivot-opportunities`.

## KEEP-PIPELINE (37)

Scraper chain: `transfer-scraper-{auto-scan,crawl,extract,validate,merge,batch-scan}`.
Policy machine: `policy-change-scan`, `policy-refresh-{start,finalize}`, `promote-policy-pack`.
Template generation: `template-generation-{cron,worker}`, `template-job-processor`,
`generate-transfer-rules`, `validate-transfer-candidates`, `bulk-import-transfer-rules`,
`scrape-template-discover`.
ASSIST: `assist-discover`, `assist-fetch-parse`.
Seeders (data assets): `optimizer-seed-{tesu,cosc,excelsior,wgu}`, `seed-bsba-templates`
(1,415-line TESU BSBA dataset), `seed-equivalencies-v1`, `seed-v5-marketplace`,
`seed-marketplace` (manual-invoke runbook), `seed-data-2025`.
Ops: `ops-cron-runner`, `evidence-backfill-worker`, `run-degree-truth-scan`,
`canonical-enrichment-worker`, `program-inventory-scraper`,
`program-requirements-scraper`, `system-healthcheck`, `get-effective-invariant-config`,
`purge-seeded-invariant-data`.

## DELETE-LEGACY (72)

- Maya (7): `maya-{chat,context-processor,execution-engine,insight-generator,intelligence-engine,manual-insights}`, `enhanced-maya-response`
- AI analyzer/router (9): `ai-analyzer-{index,lifepath-audit,refactor,review,tests}`, `ai-mentor-chat`, `ai-model-router`, `ai-path-validator`, `ai-planning-engine`
- CRI (4): `calculate-cri-score`, `cri-calculation-engine`, `course-cri-calculator`, `course-intel-score`
- Career switch/pivot/graph (8): `calculate-career-switch`, `career-risk-analyzer`, `location-switch-optimizer`, `backtrack-analyzer`, `recommend-pivot-paths`, `semantic-node-matcher`, `semantic-planning-engine`, `goal-learning-path-generator`
- Market/salary (7): `market-trend-analyzer`, `market-forecast`, `market-stream`, `demand-forecaster`, `job-market-aggregator`, `personalized-market-insights`, `alert-engine` (pattern salvaged to docs/salvage/patterns/)
- Roadmap/goals (8 + 2 zero-ref getters): `generate-roadmap`, `roadmap-generate`, `generate-learning-plan`, `generate-smart-goals`, `goal-priority-ranking`, `intelligent-goal-optimizer`, `generate-skill-recommendations`, `generate-decision-explanation`, `get-career-steps-with-levels`, `get-demo-profiles`
- Resume/LinkedIn (7): `analyze-resume`, `send-resume-to-mentor`, `generate-resume-draft`, `resume-draft`, `pdf-export`, `linkedin-import`, `linkedin-parse`
- Badges/certificates (5): `assign-badges`, `certificate-generation`, `generate-workflow-certificate`, `verify-certificate` (stub), `openbadge-export` (shape salvaged)
- Workflow/patterns (3): `autonomous-workflow-engine`, `pattern-recognition-engine`, `generate-predictive-analysis`
- Course intel/teach (6): `course-intelligence-pipeline`, `course-intelligence-recommendations`, `course-path-integrator`, `coursera-api`, `getMentorCurationQueue`, `create-skill-tree`
- Social/misc (6): `social-learning-seeder`, `test-xp-system`, `referral-event`, `referral-preview`, `yt-playlist-import`, `signup-automation`

## UNCERTAIN (10) — resolve during Phase 2

`demo-course-seeder` (strip its button from kept ComprehensiveSeeder → then delete),
`alt-resolve` (dead by one hop; optimizer-domain), `seed-evidence-demo`,
`seed-alt-credits-v1` (likely one-shot data asset — keep), `seed-url-templates`,
`fix-clep-study-urls`, `fix-sophia-urls`, `fix-evidence-type` (one-shot repairs — keep
until confirmed run), `create-optimizer-tables` (superseded by migrations — verify not a
documented bootstrap step), `phase6-baseline-lock`.

## DELETION ORDER (must be respected)

1. **New migration first**: `cron.unschedule('maya-hourly-insight-generation')` (live,
   hourly — created `20250825195459`, re-created 6×) and
   `cron.unschedule('maya-insight-generator-secure')` (never unscheduled); `DROP TRIGGER`
   `handle_new_user_profile` (`20250718015703`:117-132 → posts to `signup-automation`);
   drop the 8 `generate-roadmap` trigger functions (`20250718020035` … `20250718030138`).
2. **Code cascade in the same commit**: remove `maya-intelligence-engine` invoke from
   `onboarding-submit/index.ts:77-92`; remove `useMarketIntelligence` from
   `DiscoverHub.tsx:10,43`; remove `generate-roadmap` invoke from `Onboarding.tsx:164`;
   plus the entry-file edits in `SALVAGE_MANIFEST.md` §3.
3. **Then** delete the 72 legacy function directories and resolve the 10 UNCERTAIN.
4. Crons that KEEP running: `evidence-backfill-worker-15m`, `degree-truth-scan-nightly`,
   `template-generation-cron`. The `util.invoke_edge_function` allow-list needs no edit.

## Security findings

- **No DELETE-LEGACY function is publicly invokable** (none has a `config.toml` entry;
  all default `verify_jwt=true`). This corrects `SALVAGE_MANIFEST.md` §3, which repeated
  a stale old-repo claim about `alt-resolve`/`yt-playlist-import`/`seed-marketplace`.
- **The real exposure is in the KEEP set**: 38 functions are `verify_jwt=false`.
  Two warranted immediate hardening (applied in this commit):
  `run-migrations` (public schema-migration runner) and `purge-seeded-invariant-data`
  (public data purge, zero callers) → flipped to `verify_jwt=true`.
  Worth review later: `run-seeds`, `seed-data-2025`, `seed-v5-marketplace`,
  `optimizer-seed-*` (public write-paths; in-function guards should be verified).
- **Rotate**: a cron secret literal is committed in migration `20250825210523`, and a
  live anon JWT in `20250825192014`/`20250825195935` (anon key is public-by-design;
  low severity, but rotating with the maya-cron teardown is free).
