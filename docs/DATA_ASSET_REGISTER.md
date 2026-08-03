# Data-Asset Register

**Date:** 2026-08-03. The canonical list of irreplaceable data this project has
accumulated. The frontend cut deletes NO database objects; this register exists so no
future cleanup, migration squash, or project pause ever loses these assets.

## Tier 0 — URGENT protection actions (live DB only, no DDL in repo)

Four pipeline tables have **no CREATE TABLE anywhere in the repo** — their schema and
accumulated data exist only in the live Supabase project:

- `scrape_jobs` (scrape history for 10 institutions, Jan+Apr 2026 runs)
- `scraped_content` (raw crawled pages + AI extractions)
- `institution_policy_packs` (all drafts + active packs, promotion history)
- `transfer_evidence` (evidence provenance chain)

**Actions (require live DB access):**
1. `supabase db pull` to generate + commit their DDL so schema is reproducible.
2. Full `pg_dump` (schema + data) before ANY database maintenance; at minimum export:
   scrape_jobs, scraped_content, institution_policy_packs, policy_pack_events,
   transfer_evidence, transfer_rule_candidates, evidence_jobs, credit_transfer_rules,
   edu_courses, degree_templates, template_baseline_snapshots,
   institution_policy_ground_truth, institution_transfer_edges (+ evidence).
3. Export `institution_policy_ground_truth` rows specifically — they have been updated
   via the admin UI after their seed migrations, so migrations alone cannot rebuild them.

## Tier 1 — The verified rule corpus (the product's moat)

| Asset | Where | Contents |
|---|---|---|
| 2026-04-16 verified batch | 24 migrations dated 20260416* | ~351 verified `credit_transfer_rules` and ~880 `edu_courses` catalog rows: TESU 364 courses (scraped from tesu.edu listall.php), EXCELSIOR ~357, WGU 43, EMPIRE 37, COSC 35+. EXCELSIOR rules: 69 study.com partner-page + 36 CLEP/CollegeBoard (incl. supersede of 9 hallucinated legacy rows). |
| 2026-01-20 evidence backfills | 13 migrations dated 20260120* | 15 EXCELSIOR SOPHIA rules verified against the official Excelsior PDF; 18 EMPIRE SOPHIA rules against sunyempire.sophia.org; 1 human_override via Degree Forum wiki. Freshness TTL model: institution_pdf 365d, institution_web 180d, provider_page 90d. |
| Policy ground truth + promotion | ground_truth seeds, LIBERTY seed+promote, `ground_truth_overrides`, `resolve_policy_conflict` RPC | The human-verified policy layer that gates pack activation. |
| Scrape config | 11 migrations seeding `scrape_url_templates` | Per-institution source URLs — the operational map of where policies live. |
| Pricing + economics | `institution_pricing_packs`(+sources), `alt_provider_pricing_packs`, `compute_template_baseline` RPC, COSC baseline snapshots | Powers all savings claims. |
| Multischool templates | migration `20260217133250` | The 3 multischool degree templates (WGU BS-IT, TESU BS-CS, COSC BSBA) with cost baselines — the only in-repo worked example of the multi-source router concept. |
| Template/seed data in CODE | `supabase/functions/seed-bsba-templates` (1,415 lines), `optimizer-seed-{tesu,cosc,wgu,excelsior}`, `src/data/seeds/goldenBsCs*` | TESU BSBA templates exist ONLY here (no migration inserts them). These functions are data assets. |
| Exploration analytics schema | `docs/exploration-analytics-setup.sql` + `-slices.sql` | ONLY definition of views/RPCs the keep-set calls at runtime (explorationApi.ts → exploration_bucket_split, exploration_funnel, exploration_daily_rollup, get_active_re_rank_weights). **Action: convert to a committed migration.** |

## Tier 2 — Worth exporting before any legacy-table drop

- `career_paths` (~10 hand-curated rows: title, salary, growth outlook, skills,
  certifications, entry/advanced roles) — ALSO live-coupled: `user_plans.target_career_id`
  FK + funnel career chip. Do not drop; export anyway.
- `career_path_programs` (+ seed `20260110201735`) — curated career→program→anchor-school
  mapping; roadmap-#4 substrate.
- `salary_benchmarks`, `col_index`, `career_location_multipliers`, `market_trends` —
  small curated sets mixed with synthetic; export to docs/salvage/career-data.csv first.
- `transfer_outcomes` (migration `20260112181814`) — the roadmap-#7 feedback table;
  already read by kept `useAdvisorPreapproval`.

## Tier 3 — Legacy tables safe to drop AFTER export snapshot

maya_* (6), mentor_* (10), learning_* (6), badges/badge_types/user_badges(+_old),
xp_events/user_xp/gamification_metrics/celebration_moments/motivation_interventions,
career_graph_nodes/edges (synthetic), career_steps/career_step_skills,
career_switch_scenarios/career_switches, career_monitoring_alerts,
career_tracks(+backup_20250821), course_intelligence_pipeline, mentor_course_curations,
saved_courses, course_submissions, recommended_courses, locations, continent_bounds,
workflow_certificates, salary_insights (empty), skill_automation_risk.

**Deferred until code rewired:** market_trends (DiscoverHub reads it via
marketIntelligence.ts), career_tracks/career_goals (shared/lib/api consumers).

## Standing rules

1. **Never delete migration files** — the chain is the canonical backup of every seeded row.
2. **Never squash migrations** dated 20260416* or 20260120* (the verified corpus).
3. Any DB cleanup happens in a NEW migration, never by editing history.
4. Before dropping anything with an FK into a kept table (career_paths ← user_plans),
   detach the FK in the same migration and update the reading code first.
