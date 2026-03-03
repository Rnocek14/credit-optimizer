# Skill Tree for Life — Research Traceability Matrix

> Generated: 2026-03-03  
> Scope: Full research vision audit, not just MVP planner loop

---

## 1. Traceability Matrix

| # | Research Requirement | Source Doc | Status | Code Locations | Risk if Missing | Effort | Dependencies |
|---|---------------------|-----------|--------|---------------|----------------|--------|-------------|
| **1.1** | Unified Life Path Graph — single canonical typed multigraph (skills, courses, careers, projects, credentials, pivots) | Executive Summary: "What It Includes"; `graph.ts` core types | **Partial** | `src/shared/types/core/graph.ts` (NodeKind/EdgeKind enums), `src/types/lifePathGraph.ts` (rich GraphNode/GraphEdge), `src/hooks/useLifePathGraph.ts` | **Two competing graph type systems** — `shared/types/core/graph.ts` has 6 kinds, `types/lifePathGraph.ts` has 10 types with richer weights. Neither is canonical. | **M** | Must unify before overlays work |
| **1.2** | Graph persistence — nodes/edges stored in DB, not mock | Executive Summary: "course intelligence graph" | **Missing** | `useLifePathGraph.ts:43` → `generateEnhancedMockGraph()` — 100% mock data | **Critical** — no real graph = no real planning | **L** | Tables: `career_graph_edges` exists but unused by hook |
| **1.3** | Multi-objective pathfinding (time, cost, credit loss, ROI) with Pareto frontier | MapTree: "hybrid adaptive graph" | **Partial** | `src/lib/pathfinding/dijkstra.ts`, `src/lib/pathfinding/pareto-frontier.ts` exist; `useLifePathGraph.ts` calls them but on mock data. `paretoFrontier` always `[]` | Medium — logic exists but data is fake | **S** | Needs 1.2 |
| **1.4** | Credit transfer engine — rules, caps, residency, articulation | Executive Summary: "transfer policies" | **Done** | `credit_transfer_rules` table (DB), `src/shared/lib/api/edutree.ts`, resolution engine V3 (`transfer_rules_resolved` view), `normalizeProviderCode`, `validationParity.test.ts` | Low — this is the strongest subsystem | — | — |
| **1.5** | Skill mapping with stable IDs, levels, prereqs | Executive Summary: "skill mapping" | **Partial** | `skills` table: `{id, name, slug, category, difficulty_level, xp_value}`. `block_outcomes` links skills↔blocks. `career_step_skills` links skills↔career steps. **Missing**: skill levels/mastery per user, prereq edges between skills, equivalency/substitution mappings | **High** — no user skill state means CRI is computed from fallbacks | **M** | Needs `user_skill_progress` table |
| **1.6** | Skill normalization + equivalencies + substitutions | Executive Summary: "substitutions" | **Missing** | No `skill_equivalencies` or `skill_substitutions` table. `SkillGap` type uses string skill names, not skill IDs. `FALLBACK_SKILLS` hardcoded in `src/types/skill.ts` | **Medium** — prevents accurate gap detection | **M** | Needs 1.5 |
| **1.7** | Progress = mastery + evidence + projects + verification | Executive Summary: "trust layer"; MapTree: "progress tracking backbone" | **Partial** | `course_progress` table tracks status. `proof_projects` table exists (with `status`, `evidence_url`, `verification_status`). `proof_project_skills` links projects↔skills. **Missing**: mastery levels, verification workflow UI, readiness deltas displayed | **High** — progress is binary (done/not), not graduated | **M** | Needs 1.5 for skill-level tracking |
| **1.8** | CRI (Career Readiness Index) — integrated into main loop | Executive Summary: "CRI" | **Partial** | `useCareerReadiness` hook, `useCRIEngine` hook, `CRISnapshot` in intelligence types. Used by `useIntelligenceLayer`. **But**: not surfaced in Today/Progress hubs, lives only in intelligence pipeline | **Medium** — users can't see their readiness score | **S** | Wire to ProgressHub stats strip |
| **1.9** | Difficulty engine — course difficulty scoring | Executive Summary: "difficulty engine" | **Partial** | `skills.difficulty_level` column, `edu_courses` has no difficulty column. `GraphNode.difficulty` in types. `age_penalty_curves` table exists for age-adjusted difficulty | **Low** — nice to have, not blocking | **S** | — |
| **1.10** | Instructor rating / prestige | Executive Summary: "instructor rating" | **Missing** | No `instructor_ratings` or `instructor_prestige` table. `instructorReputation` field exists in `RecommendationCandidate` type but never populated | **Low** — V2 feature | **M** | Needs new table + UI |
| **2.1** | Graph UX — progressive disclosure | MapTree: "docked side panel" | **Partial** | EduTree V5 has `AdminFAB` and node click → modal. V6 has `GuidedEntryHero` + year collapse. **Missing**: docked right panel as primary interaction surface | **High** — modals are the current pattern, not panels | **M** | EduTree V6 work |
| **2.2** | Year spine + track bundles | MapTree: "year cards + track bundles" | **Partial** | EduTree V5 uses `level_year` ordering. V6 has year-based collapse. ReactFlow layout exists. **Missing**: visual "track bundle" grouping for fork visualization | **Medium** — forks aren't visually clear | **M** | EduTree V6 layout |
| **2.3** | No overlaps, stable layout | MapTree: "stable graph layout" | **Partial** | `useStaggeredEdgesV2` hook, ELK layout engine (`elkjs` installed). `edu-tree-multipath-design.md` spec exists. **But**: overlap prevention not verified at scale | **Medium** | **S** | Testing needed |
| **2.4** | Track comparison overlay (CSS-class based, no remount) | MapTree: "track/comparison overlay"; `edu-tree-multipath-design.md` | **Partial** | Full spec in `docs/specs/edu-tree-multipath-design.md`. `TrackOverlayPOCPage` exists at `/sandbox/track-overlay`. CSS classes defined (`.node--dim`, `.edge--comparison`). **Not integrated** into main EduTree | **Medium** — comparison is the key differentiator | **M** | Needs TrackDefinition data |
| **2.5** | Stable ReactFlow instance — no remounts, no key-based reinit | MapTree: "no key-based reinit" | **Done** | Spec enforced in `edu-tree-multipath-design.md`. V5/V6 both use single `<ReactFlow>` without dynamic keys | — | — | — |
| **3.1** | Intelligence layer — unified scoring pipeline | Executive Summary: "AI roadmap intelligence" | **Done** | `useIntelligenceLayer` hook with weighted scorers (CRI 0.35, market 0.25, skillGap 0.25, maya 0.10, reputation 0.05). `buildCandidates` → `buildRecommendations` pipeline. Full type contracts in `src/shared/types/intelligence.ts` | — | — | — |
| **3.2** | Intelligence integrated into main loop (not separate dashboards) | Consolidation strategy | **Partial** | `useIntelligenceLayer` exists but is **not consumed** by Today/Plan/Progress hubs. Orphaned Maya dashboards deleted. | **High** — intelligence is built but invisible | **S** | Wire to TodayDashboard |
| **3.3** | Maya AI — signal layer, not dashboard | Executive Summary: "AI" | **Done** | Maya correctly defined as signal layer in intelligence types (`mayaConfidence`, `mayaExplanation`). Orphaned Maya dashboards deleted in Phase 3 | — | — | — |
| **4.1** | Keyboard navigation for graph | MapTree: "accessibility baked in" | **Partial** | `SkillTreeAccessibility.tsx` component (arrow keys, Enter, Home/End). `useKeyboardNavigation` hook. `SkillTreeCanvas` has full aria-labels. **Not wired** into EduTree V5/V6 ReactFlow | **Medium** — a11y is table stakes | **S** | Port to EduTree |
| **4.2** | Screen reader labels + ARIA | MapTree: accessibility | **Partial** | `SkillTreeCanvas` has `role="application"`, `aria-describedby`, live region. EduTree nodes missing aria-labels | **Medium** | **S** | — |
| **4.3** | Color contrast + focus indicators | WCAG 2.1 AA | **Unknown** | Design system uses HSL tokens in `index.css`. No contrast audit performed | **Medium** | **S** | Audit needed |
| **5.1** | Bounded node counts for performance | MapTree: "performance" | **Partial** | `react-window` installed for virtualization. EduTree V5 renders all blocks without virtualization. Bounded only by DB query | **Low** — typically <100 nodes | **S** | — |
| **5.2** | Lazy loading for heavy views | Performance | **Done** | `React.lazy()` + `Suspense` on EduTree V5, V6, Marketplace routes in `routes.tsx` | — | — | — |
| **5.3** | No ReactFlow remounts | Performance | **Done** | See 2.5 | — | — | — |
| **6.1** | Transcript / resume integration | Executive Summary: "transcript/resume" | **Partial** | `useAltTranscript`, `useTrackTranscript`, `useTrackResumeExport` hooks. `ai_resume_drafts` table. Resume tab in ProgressHub. **Missing**: transcript import, credential verification workflow | **Low** — V2 feature | **L** | — |
| **6.2** | Decentralized school layer | Executive Summary: "decentralized school layer" | **Missing** | No implementation. Institutional hub exists but is stakeholder-facing admin, not decentralized | **Low** — V3 vision | **L** | — |
| **6.3** | Trust / abuse prevention | Executive Summary: "trust/abuse prevention" | **Partial** | `abuse_prevention_logs` table, `useTrustMetrics` hook. Admin moderation page exists. **Missing**: user-facing trust signals | **Low** | **M** | — |
| **6.4** | Monetization pathways | Executive Summary: "monetization" | **Missing** | `subscription_tiers` type exists. No Stripe integration, no paywall, no premium features gated | **Low** — business concern, not product blocker | **L** | Stripe integration |

---

## 2. Top 10 Blockers for "Skill Tree for Life" (Full Research Vision)

| Rank | Blocker | Why Critical | Items |
|------|---------|-------------|-------|
| 1 | **Two competing graph type systems** | Can't build unified overlays on a split foundation | 1.1 |
| 2 | **Graph uses 100% mock data** | No real planning possible without DB-backed graph | 1.2 |
| 3 | **No user skill state (mastery/levels)** | CRI, gap detection, and progress all degrade to fallbacks | 1.5, 1.6 |
| 4 | **Intelligence layer not surfaced in UI** | Built but invisible — users get no recommendations | 3.2 |
| 5 | **No docked detail panel in EduTree** | Modal-based interaction doesn't scale; research requires panel | 2.1 |
| 6 | **Track comparison overlay not integrated** | POC exists but isn't in production EduTree routes | 2.4 |
| 7 | **Progress is binary, not graduated** | No mastery levels, evidence tiers, or readiness deltas | 1.7 |
| 8 | **Skill normalization missing** | String-based skill matching causes false negatives | 1.6 |
| 9 | **CRI not visible to users** | Core metric computed but never displayed | 1.8 |
| 10 | **EduTree a11y gaps** | Keyboard nav exists for SkillTree but not EduTree ReactFlow | 4.1 |

---

## 3. Top 10 Blockers for "Lovable MVP" (Coherent User Loop)

| Rank | Blocker | Why Critical | Effort |
|------|---------|-------------|--------|
| 1 | **ProgressHub missing degree credit progress** | Users can't see "42/120 credits earned" — only XP/badges | S |
| 2 | **PlanCourseList shows UUIDs, not course titles** | Requires join with `edu_courses` in `fetchPlanCoursesWithProvider` | S |
| 3 | **EduTree V6 defaults to fixtures** | Should auto-detect active plan and use DB mode | S |
| 4 | **Intelligence layer invisible** | Wire `useIntelligenceLayer` top recommendation to Today hero | S |
| 5 | **CRI score not displayed anywhere** | Add to Progress stats strip (already computed) | S |
| 6 | **Career target banner → can't change target** | Banner shows target but link to change is just `/discover` | S |
| 7 | **No error boundaries on Discover/Progress** | Plan has one; other hubs crash on data errors | S |
| 8 | **Resume tab is placeholder** | Links to dead `/resume-builder` route (redirects to `/progress?tab=resume`) | S |
| 9 | **Orphaned hooks still in build** | ~30 `useEnhanced*`, `useMaya*`, `usePhase*` hooks inflate bundle | M |
| 10 | **No degree completion percentage** | `user_plan_courses` has status but no aggregation to "X% complete" | S |

---

## 4. 14-Day Implementation Plan

### Week 1: Finish Lovable MVP (Days 1–7)

| Day | Focus | Files | Acceptance Test |
|-----|-------|-------|----------------|
| **1** | **Degree progress strip** in ProgressHub | `ProgressHub.tsx`, new `DegreeProgressStrip.tsx`, DAL query joining `user_plan_courses` + `edu_courses` | Stats strip shows "X/120 credits • Y courses complete" |
| **2** | **Course titles in PlanCourseList** | `src/shared/lib/api/plan.ts` (join edu_courses), `PlanCourseList.tsx` | Course names shown, not UUIDs |
| **3** | **CRI display** in Progress + Today | `ProgressHub.tsx` stats strip, `TodayDashboard.tsx` hero subtitle | CRI score visible: "Career Readiness: 62%" |
| **4** | **Intelligence → Today hero** | `useTodayHeroAction.ts`, `TodayDashboard.tsx` | Top recommendation shown as secondary CTA below hero |
| **5** | **Error boundaries + career target change** | Wrap Discover/Progress in `EnhancedErrorBoundary`. Career banner → modal to pick new career | No unhandled crashes. Users can change career target |
| **6** | **EduTree V6 auto-detect plan** | `EduTreeV6Page.tsx` — read `useActivePlan` → set DB mode if plan exists | V6 loads real plan data without manual toggle |
| **7** | **MVP smoke test + orphan hook purge** | Delete ~30 orphaned hooks. Full click-through test | Build clean. All 4 hubs + EduTree + Marketplace work |

### Week 2: Unified Graph Foundation (Days 8–14)

| Day | Focus | Files | Acceptance Test |
|-----|-------|-------|----------------|
| **8** | **Unify graph type system** | Merge `types/lifePathGraph.ts` into `shared/types/core/graph.ts`. Single `NodeKind` (expand to cover all 10 types), single `GraphEdge` with weights | Single import path, no dual types |
| **9** | **Graph from DB** | `useLifePathGraph.ts` → query `career_graph_edges` + node tables instead of mock | Graph renders real DB data |
| **10** | **User skill state table** | Migration: `user_skill_progress (user_id, skill_id, current_level, evidence[], updated_at)`. Hook: `useUserSkillProgress` | Skills have per-user levels |
| **11** | **CRI from real skill state** | `useCRIEngine` reads `user_skill_progress` instead of fallbacks | CRI reflects actual user skills |
| **12** | **Docked detail panel (EduTree V6)** | New `DockedDetailPanel.tsx` — slides in from right on node click, replaces modal | Click node → panel slides in with course details, eligibility, cost |
| **13** | **Track overlay integration** | Port `TrackOverlayPOCPage` logic into EduTree V6. Wire `TrackDefinition` data from `program_requirements` | Toggle comparison → CSS overlay appears, no remount |
| **14** | **A11y + integration test** | Port `useKeyboardNavigation` to EduTree ReactFlow nodes. ARIA labels on all node types. Full regression | Arrow keys navigate EduTree. SR announces node info |

---

## 5. Safe Cleanup Policy

### Principles
1. **No deletes without route reachability proof** — file must be proven unreachable from any route in `src/app/routes.tsx`
2. **Archive outside TS build graph** — move to `_archive/` directory (not `src/`), excluded via `tsconfig.json` `exclude`
3. **Conservative quarantine first** — rename/move before delete; verify build; then delete after 1 sprint

### Immediate Safe Quarantine (Pass 2)

**Hooks (~30 files):**
```
useEnhancedAIInsights, useEnhancedGoals, useEnhancedMarketIntelligence,
useEnhancedMaya, useEnhancedMayaFeedback, useEnhancedPhase5,
useMayaCRIIntegration, useMayaContextTracking, useMayaProactiveInsights,
useMayaWorkflowExecution, usePhase4Integration,
usePredictiveCareerInsights, usePredictiveEngagement,
useProactiveDecisions, useRealTimeEngagement, useRealTimeMarketData,
useRealTimeUpdates, useRealtimeMayaData, useRealtimeXP,
useSocialChallengeProgress, useSocialLearning,
useVoiceCommands, useModelRouter, useSemanticPlanning,
useSemanticVisualization, useSmartMarketSelection,
useCourseIntelligenceCache, useCourseIntelligencePipeline,
useUnifiedRecommendations, useUnifiedState
```

**Components (~40 files):**
- Any remaining `Seeder*`, `Diagnostic*`, `MarketForecast*`, `Social*` components
- `SemanticCareerCanvas.tsx` and `semantic/*` (orphaned — not used by any route)
- `VoiceCommandInterface` components if any remain

**Pages (~12 files):**
- `DiagnosticCareerData.tsx`, `CalmTest.tsx` — already redirect but files exist
- `DegreeMarketplace.tsx` — redirects to marketplace
- `AIAnalyzer.tsx` — not in routes

### Verification Method
```bash
# For each candidate file, verify no route imports it:
grep -r "ComponentName" src/app/routes.tsx src/pages/ src/components/AppShell.tsx
# If zero hits → safe to archive
```

### tsconfig.json exclusion
```json
{
  "exclude": ["_archive/**", "sandbox/**"]
}
```

---

## 6. Acceptance Tests Checklist

### MVP Loop (Week 1)
- [ ] Progress hub shows degree credits (X/120) from real `user_plan_courses` data
- [ ] Plan course list shows course titles, not UUIDs
- [ ] CRI score visible in Progress stats strip
- [ ] Today hero shows intelligence-derived recommendation
- [ ] Error boundaries on all 4 hub routes
- [ ] Career target changeable from banner
- [ ] EduTree V6 loads real plan data automatically
- [ ] Build succeeds with zero orphaned hook imports
- [ ] Full click-through: auth → onboarding → today → discover → marketplace → plan → progress

### Unified Graph (Week 2)
- [ ] Single graph type system (`shared/types/core/graph.ts`) — no dual imports
- [ ] `useLifePathGraph` returns DB data, not mock
- [ ] `user_skill_progress` table created with RLS
- [ ] CRI computed from real user skill levels
- [ ] EduTree V6 docked panel opens on node click (no modal)
- [ ] Track comparison overlay togglable in EduTree V6
- [ ] Arrow keys navigate EduTree nodes
- [ ] Screen reader announces node type, title, and status
- [ ] No ReactFlow remount during overlay toggle
- [ ] No white flash during any view transition
