# MVP Audit — Pivot Platform
**Date**: 2026-03-03  
**Scope**: Production MVP loop: Today → Discover → Marketplace → Plan → Progress

---

## 1. SYSTEM MAP

### Spine Routes (4 Hubs + Planner)

| Route | Page | Data Sources |
|---|---|---|
| `/today` | TodayDashboard | `useActivePlan`, `useTodayHeroAction`, `useSmartTodayDashboard`, `useGamification`, `fetchUserLevel` |
| `/discover` | DiscoverHub | `fetchCareerPaths`, `useSkillGaps`, `useRealCourseRecommendations`, `useMarketIntelligence` |
| `/plan` | PlanHub | `useActivePlan`, `useTargetCareer`, `user_plan_courses` (inline query), `PlanCourseList` |
| `/progress` | ProgressHub | `fetchCourseProgress`, `fetchUserLevel`, `fetchLearningStreaks`, `fetchUserBadgesWithMeta` |
| `/edu-tree-v6` | EduTreeV6Page | V5 engine (all hooks), `useActivePlan`, `useTargetCareer`, fixtures/DB toggle |
| `/edu-tree-v5/marketplace` | MarketplacePage | `degree_templates`, `career_path_programs`, marketplace filters |

### Bridge Routes

| Route | Purpose |
|---|---|
| `/explore/careers/:id` | CareerDetailPage → "Browse Plans" CTA → marketplace |
| `/edu-tree-v5/marketplace` | Template selection → "Open Planner" → V6 |

### Supporting Routes (active, non-MVP)
- `/contribute`, `/teach/*`, `/institution/*`, `/employer/*` — stakeholder surfaces
- `/admin/*` — admin tooling (20+ routes)
- `/maya` — AI assistant
- `/resume-gallery`, `/embed/*`, `/verify/*` — public/embed

---

## 2. FEATURE COMPLETENESS SCORECARD

| # | Feature | Score | Notes |
|---|---|---|---|
| 1 | Today hero action correctness | ✅ 2 | Deterministic, plan-aware, edge cases handled |
| 2 | Discover → Marketplace bridge | ✅ 2 | Career cards → "Browse Plans" → filtered marketplace |
| 3 | Marketplace → Planner return path | ✅ 2 | "Back to Plan" button, career context preserved |
| 4 | Plan course status updates | ✅ 2 | DAL + mutation + cache invalidation + row-level pending |
| 5 | Progress hub: degree progress | ⚠️ 1 | Shows XP/badges/history but **no degree credit progress** (plan credits vs plan_stats not connected) |
| 6 | Career target set/change from banner | ✅ 2 | CareerContextBanner on all hubs, "Change" → /discover, "Clear" on PlanHub |
| 7 | EduTree V6 guided experience | ⚠️ 1 | Year cards + modules + side panel + templates work. **But**: mostly fixture-driven, DB mode is opt-in (`?db=1`), no real user data by default |
| 8 | Docked side panel integration | ✅ 2 | ScopePanelRouter with eligibility, costs, alternatives |
| 9 | Accessibility / keyboard nav | ❌ 0 | No visible keyboard navigation, no skip links, no ARIA roles on planner grid |
| 10 | Performance (large graph) | ⚠️ 1 | Lazy-loaded routes ✅, but V6 page is 674 lines monolith, no virtualization |
| 11 | RLS + mutation security | ⚠️ 1 | `updatePlanCourseStatus` has no RLS check visible client-side; needs server audit |
| 12 | Error boundaries | ⚠️ 1 | EduTree wrapped ✅, PlanHub wrapped ✅, but Today/Discover/Progress have none |
| 13 | Analytics/telemetry | ⚠️ 1 | `logEvent` exists in V6 but no funnel tracking across hubs |

---

## 3. RANKED GAP LIST (Top 15)

| Rank | Gap | Where | What to change | Why it matters | Effort |
|---|---|---|---|---|---|
| 1 | **Progress hub lacks degree progress** | `ProgressHub.tsx` | Add plan credits earned / required strip (reuse `plan-stats` query from PlanHub) | Users can't see graduation progress in the tracking hub | S |
| 2 | **V6 planner defaults to fixtures, not DB** | `EduTreeV6Page.tsx:144-148` | Flip `USE_DATABASE` default or auto-detect from active plan | Demo/real users see fake data unless they know `?db=1` | M |
| 3 | **PlanCourseList shows IDs, not titles** | `PlanCourseList.tsx:67-71` | Join course titles from `edu_courses` or `source_courses` in `fetchPlanCoursesWithProvider` | Plan hub looks like a database dump | S |
| 4 | **No error boundaries on Today/Discover/Progress** | `routes.tsx:159-182` | Wrap with `EnhancedErrorBoundary` like PlanHub | One bad query crashes entire hub | S |
| 5 | **~130 orphaned hooks remain** | `src/hooks/` | Quarantine: `useEnhanced*`, `useMaya*`, `usePhase4*`, `useVoiceCommands`, `useRealTime*`, `useSocial*`, `usePredictive*` | Build bloat, confusion for contributors | M |
| 6 | **~150+ orphaned components remain** | `src/components/` | Quarantine: `Seeder*`, `Week2*`, `Optimizer*`, `Comprehensive*`, `SmartBatch*`, seeders, market panels | Same as above | M |
| 7 | **Accessibility: zero keyboard support in planner** | V6 planner, YearCard, ModuleCard | Add `tabIndex`, arrow key navigation, skip links, focus trapping in panel | Fails WCAG 2.1 AA | L |
| 8 | **V6 page is 674-line monolith** | `EduTreeV6Page.tsx` | Extract: template loading → hook, module resolution → hook, degree summary → hook | Hard to maintain, test, or debug | M |
| 9 | **Mentors tab is stub** | `DiscoverHub.tsx:260-272` | Either remove tab or add "coming soon" badge to tab trigger | Users click and find nothing | S |
| 10 | **Resume tab is stub** | `ProgressHub.tsx:267-292` | Links to `/resume-builder` which redirects to `/progress?tab=resume` — circular | Broken navigation loop | S |
| 11 | **Orphaned pages not deleted** | `src/pages/`: `CalmTest`, `ContributeHub`, `DegreeMarketplace`, `DiagnosticCareerData`, `EmployerHub`, `InstitutionHub`, `MentorChat`, `MentorInbox`, `Plan.tsx`, `TeachHub`, `TutorialSettings` | Delete — all have redirects or are unreachable | 12 dead page files | S |
| 12 | **PlanHub inline supabase query** | `PlanHub.tsx:33-53` | Extract to DAL (`fetchPlanStats`) | Breaks DAL discipline | S |
| 13 | **No "degree readiness %" on Progress** | `ProgressHub.tsx` | Compute from plan courses (complete/total) and display | Core metric missing from tracking hub | S |
| 14 | **No loading/error state for CareerDetailPage degree options** | `CareerDetailPage.tsx` | Degree template section needs skeleton + error handling | Bridge page feels broken when slow | S |
| 15 | **No analytics funnel tracking** | All hubs | Add `logEvent` calls at: Today mount, Discover career click, Marketplace template select, Plan status change, Progress tab view | Can't measure conversion | M |

---

## 4. "NEXT 7 DAYS" PLAN

### Day 1: Progress Hub + Error Boundaries
- Add degree progress strip to ProgressHub (reuse plan-stats pattern)
- Add readiness % (complete / total courses)
- Wrap Today, Discover, Progress in `EnhancedErrorBoundary` in routes.tsx
- Fix resume tab circular link
- **Accept**: Progress shows "12/40 credits • 30% complete" when user has plan

### Day 2: PlanCourseList titles + DAL cleanup
- Join course titles in `fetchPlanCoursesWithProvider` (from `edu_courses` or `source_courses`)
- Extract PlanHub inline query to `fetchPlanStats` in DAL
- **Accept**: Plan course list shows "ENG 101 — English Comp I" not UUIDs

### Day 3: V6 data mode fix
- Auto-detect: if active plan exists with template, use DB mode
- Remove `?db=1` requirement for real users
- Add loading skeleton for template hydration
- **Accept**: User with saved plan sees their real courses in V6 planner

### Day 4: Orphan quarantine Pass 2 (hooks + components)
- Delete ~30 clearly orphaned hooks (`useEnhanced*`, `useMaya*`, `usePhase4*`, `useVoiceCommands`, `usePredictive*`, `useRealTime*`)
- Delete ~40 orphaned components (seeders, debug, `Week2*`, `Comprehensive*`, market panels)
- Delete 12 orphaned page files
- **Accept**: `tsc --noEmit` passes, no import errors

### Day 5: V6 page decomposition
- Extract template loading into `useV6Template` hook
- Extract module resolution into `useV6Modules` hook  
- Extract degree summary into `useV6DegreeSummary` hook
- Main page drops to ~200 lines
- **Accept**: V6 planner works identically, code is 3 focused files

### Day 6: Analytics funnel + Mentors tab polish
- Add `logEvent` at 5 funnel points (Today mount, career click, template select, status change, progress view)
- Add "Coming soon" badge on Mentors tab trigger
- Add skeleton to CareerDetailPage degree options section
- **Accept**: Console shows funnel events in dev mode

### Day 7: Integration testing + polish
- Click through full loop: Today → Discover → Career → Marketplace → Planner → Plan → Progress
- Verify all toasts, loading states, error boundaries
- Fix any broken links or stale imports
- **Accept**: Zero console errors, no blank states, no broken navigation

---

## 5. CLEANUP CONTINUATION PLAN (Phase 3 Pass 2)

### Orphaned Hooks (safe to delete — grep confirms no route imports)
```
useEnhancedAIInsights, useEnhancedGoals, useEnhancedMarketIntelligence,
useEnhancedMaya, useEnhancedMayaFeedback, useEnhancedPhase5,
useMayaCRIIntegration, useMayaContextTracking, useMayaProactiveInsights,
useMayaWorkflowExecution, usePhase4Integration, useVoiceCommands,
usePredictiveCareerInsights, usePredictiveEngagement, useProactiveDecisions,
useRealTimeEngagement, useRealTimeMarketData, useRealTimeUpdates,
useRealtimeMayaData, useSocialChallengeProgress, useSocialLearning,
useSemanticPlanning, useSemanticVisualization, useModelRouter,
useUnifiedState, useCrossHubIntegration, useSmartMarketSelection,
useLocationSwitchOptimizer
```

### Orphaned Components (safe to delete)
```
ComprehensiveSeeder, DemoCourseSeedTrigger, DemoSeedingPanel,
MarketDataSeeder, OptimizerDataSeeder, QuickMarketplaceSeed,
Week2AltCreditSeeder, Week2EquivalencySeeder, Week2TemplateSeeder,
SmartBatchOperations, AutoValidationDashboard, CourseIntelligenceSystemValidator,
MigrationTrigger, OptimizerMigrationTrigger, SeedStatus, SeedTrigger,
CompareMarketTrendsPanel, HistoricalTrendsVisualization, PatternRecognitionPanel,
PatternTimeline, RealTimeMarketIntelligence, RealTimeMarketPulse,
MarketForecastPanel, MarketIntelligenceExportPanel, StrategyGeneratorPanel,
SocialMayaIntegration, GamificationInformedIntelligence,
VoiceCommandInterface (already deleted), AdaptiveDashboard, AdaptiveLearningTracker,
UnifiedIntelligencePanel, WorkflowIntelligencePanel
```

### Orphaned Pages (safe to delete)
```
CalmTest.tsx, ContributeHub.tsx, DegreeMarketplace.tsx,
DiagnosticCareerData.tsx, EmployerHub.tsx, InstitutionHub.tsx,
MentorChat.tsx, MentorInbox.tsx, Plan.tsx, TeachHub.tsx, TutorialSettings.tsx
```

### Method
1. Grep each file for imports across `src/`
2. If zero imports outside its own directory → delete
3. Run `tsc --noEmit` after each batch
4. Verify routes.tsx has no broken imports

---

## 6. ACCEPTANCE TESTS CHECKLIST

- [ ] Today → shows hero CTA with plan name
- [ ] Today → stats strip shows level, XP, streak
- [ ] Discover → career cards render with salary/growth
- [ ] Discover → click career → CareerDetailPage loads
- [ ] CareerDetail → "Browse Plans" → marketplace filtered
- [ ] Marketplace → select template → "Open Planner" → V6
- [ ] V6 → year cards render, modules show credits
- [ ] V6 → side panel opens on module click
- [ ] V6 → "Back to Plan" returns to PlanHub
- [ ] PlanHub → course list shows titles (not UUIDs)
- [ ] PlanHub → status dropdown works, toast fires
- [ ] PlanHub → career context shows "Targeting: {title}"
- [ ] Progress → shows degree credits earned / required
- [ ] Progress → shows readiness %
- [ ] Progress → badges tab renders earned badges
- [ ] CareerContextBanner → visible on all 4 hubs
- [ ] Error boundary → catches thrown errors gracefully
- [ ] No console errors on full loop navigation
- [ ] Build passes (`tsc --noEmit` + `vite build`)
