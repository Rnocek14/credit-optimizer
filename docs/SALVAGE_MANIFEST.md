# Salvage Manifest — Pre-Deletion Audit Record

**Date:** 2026-08-03
**Produced by:** 17-agent salvage audit (6 cluster reviewers + 4 sweeps + 6 adversarial
refuters + 1 edge-function reclassification), run before the Phase-2 legacy cut.
**Purpose:** the permanent record of what this codebase contains, what is kept, what is
extracted, and what is deleted — so nothing valuable is lost and nobody has to re-derive
these conclusions from git archaeology.

The product being kept ("keep-set"): the Pivot funnel (landing → Get Started → Compare →
Plan Preview → /plan), the EduTree v5/v6 plan builder + multischool marketplace, the
admin optimizer/pipeline tooling, and the transfer-rules data machine.

---

## 1. CORRECTIONS TO THE KEEP-SET (found by the audit — these were at risk)

The original keep-set list missed live, load-bearing code. All of the following are
**KEEP — do not delete**:

| What | Why |
|---|---|
| `src/pages/EduTree/marketplace/**` (17 files) | Routed at `/edu-tree-v5/marketplace` (routes.tsx:46, :296-304). The multischool template storefront — the direct precursor of the multi-source router (roadmap #1). Imports only v5 + keep libs. |
| `src/lib/templateSavingsCalculator.ts`, `src/lib/tieredSavingsCalculator.ts`, provider normalization + `useMultiSchoolSavings`, two-phase timeline math | Marketplace dependency chain; the multi-school savings decomposition is roadmap-#1 IP. |
| `src/pages/EduTree/hooks/useUserEvidence.ts` | Imported by 4 v5 files (ModuleTemplatesPanel, CanonicalGapAnalysis, careerPivotValidator, templateValidator). **Action: move into v5/, rewrite its `useUnifiedData` dependency to `useAuth`** (it is the one hook binding v5 to the legacy UnifiedDataContext). Keep `supabase/functions/evidence-summary`. |
| `src/pages/EduTree/data/trackDefinitions.ts` | Imported by v5 CanonicalAuditPanel. Self-contained. Move into v5/. |
| `src/pages/PlanHub.tsx` + `src/components/plan/PlanCourseList.tsx`, `CareerContextBanner.tsx`, `CareerTargetPicker.tsx`, hooks `useActivePlan`, `useTargetCareer`, `useUpdatePlanCourseStatus` | The funnel's terminus — "Make this my plan" lands on `/plan`. Already lean (204 lines, shared/** deps only). |
| `src/hooks/useTodayHeroAction.ts`, `src/hooks/usePlanProgress.ts`, `src/components/today/TodayHeroCard.tsx` | The deterministic next-action strip. **Action: mount TodayHeroCard at top of PlanHub, then redirect /today → /plan.** |
| `src/components/transfer/PreApprovalEmailModal.tsx` + `src/hooks/useAdvisorPreapproval.ts` | Wired into kept v5 TransferBadge. This is the capture point for the transfer-outcome feedback loop (roadmap #7) — it reads/writes `transfer_outcomes`. |
| DB table `career_paths` + `career_path_programs` (+ seed migration `20260110201735`) | **Not legacy.** `user_plans.target_career_id` FKs into career_paths (migration `20260303194345`); GraduationPlanCard renders the career chip via `useTargetCareer`; career_path_programs is the curated career→program→anchor-school mapping (roadmap-#4 substrate). |
| `src/hooks/{useCareerPaths,useCareerDegreeOptions,useCareerPathPrograms}.ts`, `src/pages/{CareerListPage,CareerDetailPage}.tsx`, `src/components/careers/DegreeTemplateModal.tsx` | The working career→degree translation UI (routed at /explore/careers). Stage-4 seed. Keep or consciously descope — do not treat as dead code. |
| `src/components/{StakeholderProtectedRoute,EduTreeError,SecurityMonitor}.tsx`, `src/components/enhanced/EnhancedErrorBoundary.tsx` | Imported by keep-set routes/providers. (EduTreeError matches "EduTree" glob patterns — do not pattern-delete it.) |
| `src/types/marketplace.ts`, `src/components/{QuickMarketplaceSeed,ComprehensiveSeeder}.tsx`, `src/lib/seedMarketplace.ts`, `src/hooks/useMarketplaceSeeder.ts` | Used by v5 AdminFAB / OptimizerSeeding admin tooling. |
| `supabase/functions/evaluate-plan` | Server-side plan evaluator (credits by category, transfer caps, residency, upper-division, cost, gap warnings). Kept; consider porting lines 69-133 into the client scoring lib later. |
| `src/hooks/useUserExperienceLevel.ts` | Rewrite off UnifiedDataContext (it sources onboarding-completion prefs used by Index.tsx). |
| `cypress/e2e/{clear_year,eduTreeV5-options-count,exploration_mode,day2-flows}.cy.ts` + `cypress/support` + config | The only e2e specs targeting surviving routes; `run_day2_gate.sh` references day2-flows. |
| `docs/pipeline-health/**`, `TRUST_GATE_REQUIREMENTS.md`, `SCALE_READINESS_RUNBOOK.md`, `V1_EXPANSION_PLAYBOOK.md` + `V1_COMPLIANCE_AUDIT.md` (cross-referenced pair), `EVIDENCE_BACKFILL_PLAN.md`, `.lovable/plan.md`, `API_SEAMS.md`, `ops-dashboard-queries.sql`, `optimizer-setup-guide.md`, `OPTIMIZER_SETUP_INSTRUCTIONS.md`, `tests/` (Deno gate tests) | Living operational docs/tests for the kept pipeline. |

## 2. SALVAGED ARTIFACTS (extracted to `docs/salvage/` before deletion)

| Artifact | Source | Future use |
|---|---|---|
| `pdf-export/` (TrackResumePDFTemplate, TrackResumeExportModal, useTrackResumeExport, CertificatePDFTemplate) | resume/certificate builders | **The $49 plan-PDF product.** Best in-repo @react-pdf reference: A4 multi-section layout, stats row, chip lists, PDFDownloadLink wiring, typed data-assembly hook. ~1 day adaptation vs from-scratch. Keep `@react-pdf/renderer` in package.json. |
| `pareto-frontier.ts` | lib/pathfinding | Multi-objective dominance filter (time/cost/credits/roi) + tradeoff correlation. Reuse to rank multi-source plans (roadmap #1) instead of a single scalar score. Self-contained ~175 lines. |
| `ghosting.ts` | lib/pathfinding | Ghost-edge UX taxonomy: render excluded options greyed-out with machine-generated reasons ("Exceeds transfer cap", "Unlock via CLEP exam"). Port the *pattern*, not the code — real cap logic lives in the kept transfer libs. |
| `comparison.ts` | lib/pathfinding | Shared-subgraph detection between two plans (divergence/convergence points, shared %). Optional reference for a plan-vs-plan diff view. |
| `patterns/alert-engine-reference.ts` | supabase/functions/alert-engine | Config→evaluate→dedup→history alert pattern (per-user configs, anti-spam dedup, time-window parser, operator-based conditions). Maps 1:1 to the **plan-monitoring subscription** (roadmap #2). Data domain (market metrics) not reusable; the skeleton is. |
| `patterns/openbadge-export-reference.ts` | supabase/functions/openbadge-export | Correct OpenBadge 2.0 assertion JSON shape (stage-5 reference). NOTE: demo stub — hardcoded issuer, no signing. No signing crypto exists anywhere in this codebase. |

### Knowledge preserved as notes (no code worth porting)

- **Certificate "verification" was never cryptographic.** 12-char `Math.random()` lookup
  code, DB equality check, and the deployed `verify-certificate` function is a dry-run stub
  returning `valid:true` for any non-empty code. The schema shape (UNIQUE verification_code,
  revocation fields, expires_at, public /verify/:code route — migration `20250730205602`)
  is a reasonable sketch for stage 5, but stage 5 must be built on real signed credentials.
  The `SIGNATURE_FIX_*.md` root docs are unrelated (EduTree render-cache signatures).
- **CRI scoring formula** (deleted): weighted composite skills/experience/education/
  portfolio/marketReadiness (`cri-calculation-engine` L95-108); experience heuristic in
  `calculate-cri-score` L310-322. Hand-tuned, never outcome-validated.
- **Career graph was synthetic.** career_graph_nodes/edges seeded with hand-typed bootcamp
  content, uniform 0.9 confidence, zero degree nodes, zero O*NET/SOC/CIP/BLS codes. The
  typed-edge schema idea (TEACHES/REQUIRES/PIVOT_TO + time/cost + substitution groups) is
  noted; stage 4 should be built on a CIP→SOC crosswalk + BLS OEWS data instead.
- **All salary data was fabricated** (string-hash PRNG in stableMarketData.ts; 5 sample
  rows in market_trends). The exception worth exporting from the live DB: the ~10 curated
  `career_paths` rows + `salary_benchmarks` + `col_index` (see Data-Asset Register).
- **Location ROI choropleth** (react-simple-maps + d3, 1,097 lines) existed; generic
  map-UI, welded to legacy tables; see git history if ever needed.
- **DB seeding runbook:** marketplace re-seeding is done by manually invoking the
  `seed-marketplace` edge function (no UI path); optimizer data via `/admin/optimizer-seeding`
  and the `optimizer-seed-{tesu,cosc,wgu,excelsior}` functions; golden program via
  `/admin/seed-golden`. TESU BSBA template data lives in CODE (`seed-bsba-templates`,
  1,415 lines), not migrations — those functions are data assets, not disposable code.

## 3. REQUIRED CASCADE EDITS (deletion breaks the build without these)

Entry files to edit **in the same commit** as the cut:
- `src/main.tsx`: remove duplicate `UnifiedDataProvider` + duplicate QueryClientProvider
  (lines 2-3, 29, 33-41), `lib/initDevData`, `debug/edgeDiagnostics`, `debug/directEdgeTest`.
- `src/App.tsx`: remove `utils/triggerCourseSeeding` side-effect import (line 2 — its
  auth-state hook auto-invokes demo-course-seeder), `XPCelebrationOverlay` (6, 38),
  `DevMenu` (7, 39 — or keep DEV-gated), `MobileNavigation` decision (8, 21),
  `useCircuitBreakerClient`/`edgeFunctionClient` (9-10).
- `src/app/providers.tsx`: drop `UserJourneyProvider`, `UnifiedDataProvider`,
  `TutorialProvider` (lines 9-11, 23-26) after the useUserEvidence rewrite.
- `src/app/routes.tsx`: remove legacy imports + routes; remove `sandbox/TrackOverlayPOCPage`
  static import (line 135, route 309); repoint `/today` → `/plan`.
- `src/pages/Index.tsx`: drop `useUserJourney`/`journeyStore`/`MayaOnboarding`/
  `AdaptiveDashboard` (lines 3-5, 8-9); reduce to: no user → SecureLandingPage,
  user → Navigate /plan (onboarding gate via profiles/ProtectedRoute).
- `src/pages/Onboarding.tsx`: remove `generate-roadmap` invoke (line 164) and
  `LinkedInImport` (line 18) — decouple onboarding from the legacy AI roadmap generator.
- `src/pages/Auth.tsx`: remove `setupDevUser` import + demo-login buttons.
- `src/lib/auth.ts` (144, 184) + `src/lib/authHelper.ts` (91, 126): remove the
  `devUserSetup` dynamic imports and dev-user branches, then delete `lib/devUserSetup.ts`.
  (The prod backdoor is already dead via security.ts as of Phase 1.)
- `src/components/HubNavigation.tsx`: strip to funnel-relevant tabs; remove journeyStore
  (6, 39), tutorial imports (19-21), lazy TrackManager (24) — AppShell hard-imports it.
- `src/hooks/useUserExperienceLevel.ts`: rewrite off UnifiedDataContext (lines 2, 19).
- Tutorial system: either keep `src/tutorial/*` as no-op shims or edit surviving importers
  (Analytics.tsx:24, CareerProfileCard.tsx:7-8, SaveButton.tsx:6, + pages being deleted).

Tests/config to update in the same PR:
- Delete with their subjects: `src/__tests__/{pathfinding,skillTreeLayout}.test.ts`,
  `src/hooks/__tests__/useTrackTranscript.test.ts`, `src/lib/__tests__/{telemetry,
  mapToAnalyticsEvent}.test.ts` (or port mapToAnalyticsEvent assertions to lib/analytics).
- Delete ~38 cypress specs targeting legacy routes; keep the 4 listed in §1.
- `supabase/config.toml`: remove per-function blocks for deleted functions — esp. the
  `verify_jwt=false` (publicly invokable) ones: alt-resolve, yt-playlist-import,
  seed-marketplace (if deleted). Public + deleted = security win.
- Deleting `components/ui/{pareto-frontier-panel,ghost-path-visuals,checkpoint-timeline,
  florida-articulation-filter}.tsx` (zero importers post-cut) releases
  `lib/pathfinding/**`, `lib/florida/`, `types/lifePathGraph.ts`.

package.json removals:
- **Now:** `react-d3-tree` (zero imports), `openai` (functions use esm.sh, not node_modules).
- **With the cut:** `d3` (only orphan smartLayout.ts), `react-simple-maps` (only
  LocationROIExplorer), `elkjs` stays (v5 useGraphLayout uses it), `html-to-image` (verify),
  Capacitor packages (no android/ or ios/ dirs; mobile build abandoned).
- **Keep:** `@react-pdf/renderer` (plan-PDF product), `canvas-confetti` (still imported by
  routed Saved.tsx chain — remove only when that cluster goes).

pg_cron / backend cleanup migration (write one migration that):
- `cron.unschedule` the maya-insight jobs (created in `20250825192014` etc. — 4 files
  reference `functions/v1/maya-insight-generator`); it hourly-invokes course-cri-calculator
  and course-intelligence-recommendations, so those functions can only be deleted after.
- Drops `handle_new_user_profile` trigger (`20250718015703`:117-132 — net.http_post to
  signup-automation) and the generate-roadmap trigger functions (8 migration refs).
- Never delete migration FILES — the chain is the canonical backup of all seeded data.

## 4. VERIFICATION NOTES

- Legacy edu-tree v1–v4: **no algorithmic loss.** v5 has its own elkjs integration
  (v5/hooks/useGraphLayout.ts) and timeline packing; the legacy collision resolver is a
  naive pairwise-push loop; `dijkstra.ts` is O(V²) over mock data with a vacuously-true
  fallback predicate (dijkstra.ts:160-163) — deliberately NOT salvaged.
- The audit's cluster reviews were adversarially refuted; refuters found and fixed:
  the career_paths FK coupling, the marketplace keep-set omission, the maya cron →
  cri-function dependency, canvas-confetti's surviving importers, and stale-repo analysis
  in two reviews (re-verified against this repo).
- Full audit outputs: workflow run `wf_0a4c5661-dcc` (17 agents, ~2.7M tokens).
