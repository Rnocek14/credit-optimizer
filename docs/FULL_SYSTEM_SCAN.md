# Full System Lovable Scan — Life Path Platform
> Generated: 2026-02-17 | Scope: routes, hooks, API, DB, edge functions, design debt

---

## Deliverable A — System Inventory

### 1. Onboarding + Auth + Roles
| Layer | Assets |
|---|---|
| Routes | `/auth`, `/onboarding`, `/dev-login`, `/quick-start` |
| Hooks | `useSecureAuth`, `useUserRole`, `useMobileAuth`, `useOnboardingSubmit`, `useAuthDebug` |
| API | Auth via `supabase.auth.*` (documented exception) |
| DB Tables | `profiles`, `user_roles` (via RPC `get_user_role`) |
| Edge Functions | `signup-automation`, `onboarding-submit` |
| Demo Mode | `DevLogin` page with dev user bypass |

### 2. Discover Hub (Recommendations + Discovery)
| Layer | Assets |
|---|---|
| Routes | `/discover` (tabs: career, courses, intel, mentors), `/explore/careers`, `/explore/careers/:id` |
| Hooks | `useRealCourseRecommendations`, `useUnifiedRecommendations`, `useCourseMarketplace`, `useCareerPaths`, `useSmartMarketSelection`, `useEnhancedMarketIntelligence`, `useMarketIntelligence`, `useRealTimeMarketData` |
| API | `marketplaceCourses`, `marketIntelligence`, `crosshub` |
| Components | `discover/*`, `MarketIntelligenceDashboard`, `TopTrendingCareers`, `CourseRecommendationCard` |
| Edge Functions | `course-intelligence-recommendations`, `job-market-aggregator`, `market-trend-analyzer`, `market-forecast`, `market-stream`, `demand-forecaster`, `personalized-market-insights` |

### 3. Plan Hub (Goals + Roadmap + Workflows)
| Layer | Assets |
|---|---|
| Routes | `/plan` (tabs: roadmap, goals, workflows, proof), `/plan/compare` |
| Hooks | `useEnhancedGoals`, `useAIPlanningEngine`, `useUserPlan`, `useUserPlanSelections`, `useAutonomousWorkflows`, `useMayaWorkflowExecution`, `usePlanValidation`, `useProofProjects`, `useSemanticPlanning` |
| API | `userPlanSelections`, `crosshub`, `progress` |
| Edge Functions | `generate-roadmap`, `generate-smart-goals`, `generate-learning-plan`, `goal-learning-path-generator`, `goal-priority-ranking`, `intelligent-goal-optimizer`, `autonomous-workflow-engine`, `evaluate-plan`, `ai-planning-engine`, `semantic-planning-engine` |

### 4. Progress Hub (History + Portfolio + Resume + Achievements)
| Layer | Assets |
|---|---|
| Routes | `/progress` (tabs: history, skill-tree, achievements, resume, portfolio) |
| Hooks | `useCourseProgress`, `useGamification`, `useGamificationData`, `useCelebrations`, `useCertificateEngine`, `useWorkflowCertificates`, `useTrackTranscript`, `useTrackResumeExport`, `useTrackXP`, `useRealtimeXP` |
| API | `progress`, `gamification`, `publicResume` |
| Components | `progress/*`, `gamification/*`, `resume/*`, `transcript/*`, `proof-projects/*` |
| Edge Functions | `assign-badges`, `generate-workflow-certificate`, `certificate-generation`, `openbadge-export`, `verify-certificate`, `test-xp-system` |

### 5. Today Dashboard
| Layer | Assets |
|---|---|
| Routes | `/today` |
| Hooks | `useSmartTodayDashboard`, `useRealTimeEngagement`, `usePredictiveEngagement` |
| Components | `TodayDashboard`, `dashboard/*` |

### 6. Contribute Hub (Teach + Institution + Employer + Admin)
| Layer | Assets |
|---|---|
| Routes | `/contribute` (tabs: teach, institution, employer, admin), `/teach/*` (7 sub-routes), `/institution/*` (6 sub-routes), `/employer/*` (6 sub-routes) |
| Hooks | `useTeaching`, `useTeachers`, `useMentorAnalytics`, `useInstitution`, `useInstitutions`, `useInstitutionLimits`, `useCourseSubmissions` |
| API | `institutions`, `mentorAnalytics` |
| Edge Functions | `ai-mentor-chat`, `getMentorCurationQueue`, `send-resume-to-mentor` |

### 7. EduTree V5 (Academic Planner)
| Layer | Assets |
|---|---|
| Routes | `/edu-tree-v5`, `/edu-tree-v5/marketplace`, `/marketplace`, `/build` |
| Hooks (dedicated) | `useCareerV5Data`, `useBatchRequirementOptions`, `useRequirementOptions`, `useDegreeTemplates`, `useMarketplaceTemplates`, `useOptimizedTemplates`, `useGenEdFramework`, `useGenEdCategories`, `useStaggeredEdgesV2`, `useLayoutManager` |
| API | `edutree`, `degreeTemplates`, `requirementOptions`, `transferRules` |
| Sub-structure | `pages/EduTree/` — nodes/, edges/, hooks/, ctx/, state/, components/, v5/, marketplace/, styles/ |
| Edge Functions | `template-generation-worker`, `template-generation-cron`, `template-job-processor`, `semantic-node-matcher`, `rerun-template-invariants`, `bulk-rerun-templates`, `bulk-rerun-worker` |

### 8. Skill Tree + Pivots + ROI
| Layer | Assets |
|---|---|
| Routes | Via `/progress?tab=skill-tree` |
| Hooks | `useSkillGaps`, `usePivotRecommendations`, `usePivotRoadmaps`, `useCareerReadiness`, `useCareerGraph`, `useAICareerGraph`, `useProviderAlternates`, `useSwitchingEngine` |
| Components | `SkillTree/*`, `pivot/*`, `EnhancedSkillTreeCanvas`, `SkillPivotModal`, `CrossPathComparisonPanel` |
| Edge Functions | `create-skill-tree`, `recommend-pivot-paths`, `calculate-career-switch`, `career-risk-analyzer` |

### 9. Maya AI System
| Layer | Assets |
|---|---|
| Routes | `/maya`, `/maya-intelligence` |
| Hooks | `useEnhancedMaya`, `useEnhancedMayaFeedback`, `useMayaCRIIntegration`, `useMayaContextTracking`, `useMayaProactiveInsights`, `useMayaWorkflowExecution`, `useRealtimeMayaData`, `useProactiveDecisions`, `useModelRouter` |
| API | `mayaFeedback` |
| Components | `maya/*`, `Maya*` (20+ components) |
| Edge Functions | `maya-chat`, `maya-context-processor`, `maya-execution-engine`, `maya-insight-generator`, `maya-intelligence-engine`, `maya-manual-insights`, `enhanced-maya-response`, `generate-decision-explanation` |

### 10. CRI (Course Relevance Index)
| Layer | Assets |
|---|---|
| Routes | `/cri-dashboard` |
| Hooks | `useCRIEngine`, `useCRIGoals`, `useCourseIntelligence`, `useCourseIntelligenceEngine`, `useCourseIntelligencePipeline`, `useCourseIntelligenceCache` |
| Edge Functions | `calculate-cri-score`, `course-cri-calculator`, `cri-calculation-engine`, `course-intel-score`, `course-intelligence-pipeline` |

### 11. Market Intelligence
| Layer | Assets |
|---|---|
| Routes | Via `/discover?tab=intel` |
| Hooks | `useMarketIntelligence`, `useEnhancedMarketIntelligence`, `useRealTimeMarketData`, `useSmartMarketSelection`, `usePredictiveCareerInsights` |
| API | `marketIntelligence` |
| Edge Functions | `market-trend-analyzer`, `market-forecast`, `market-stream`, `demand-forecaster`, `personalized-market-insights`, `job-market-aggregator`, `alert-engine`, `pattern-recognition-engine`, `generate-predictive-analysis` |

### 12. Multi-Track Planning
| Layer | Assets |
|---|---|
| Routes | `/plan/compare`, `/compare` |
| Hooks | `useTracks`, `useTrackParamSync`, `useTrackXP`, `useTrackTranscript`, `useTrackResumeExport` |
| API | `tracks` |
| Components | `tracks/*`, `multi-track/*`, `CompareTracks`, `CareerSwitchSimulator` |

### 13. Social Learning
| Layer | Assets |
|---|---|
| Hooks | `useSocialLearning`, `useSocialChallengeProgress` |
| Components | `SocialLearningDashboard`, `SocialMayaIntegration` |
| Edge Functions | `social-learning-seeder` |

### 14. Resume + Public + Verification
| Layer | Assets |
|---|---|
| Routes | `/resume/:userId` (public), `/embed/:resumeId`, `/verify/:code`, `/resume-gallery`, `/embed-generator`, `/embed-explorer`, `/certificate-gallery` |
| Hooks | `useTrackResumeExport`, `useProofProjectsForResume` |
| API | `publicResume` |
| Edge Functions | `generate-resume-draft`, `resume-draft`, `analyze-resume`, `pdf-export` |

### 15. Admin + Ops
| Layer | Assets |
|---|---|
| Routes | 20+ admin routes under `/admin/*` |
| Edge Functions | `run-degree-truth-scan`, `policy-change-scan`, `policy-refresh-*`, `promote-policy-pack`, `transfer-scraper-*` (6 functions), `system-healthcheck`, `ops-cron-runner`, `bulk-import-transfer-rules` |

---

## Deliverable B — Completeness Matrix

| Domain | Status | What's Missing |
|---|---|---|
| **Onboarding + Auth** | ✅ Complete | Role-based onboarding flow polish |
| **Discover Hub** | ✅ Complete | Mentor discovery tab is scaffold-level |
| **Plan Hub** | ✅ Complete | Proof projects tab needs UX polish |
| **Progress Hub** | ✅ Complete | Portfolio tab is minimal |
| **Today Dashboard** | ✅ Complete | Needs real instrumentation data to be useful |
| **Contribute Hub** | 🟨 Partial | Institution/Employer tabs are scaffold with mock workflows; real approval pipelines need edge function wiring |
| **EduTree V5** | 🟨 Partial | Spine + year cards work; side panel + overlay polish (per V4 design doc) incomplete; docked decision panel needs iteration |
| **Skill Tree + Pivots** | ✅ Complete | ROI explorer functional |
| **Maya AI** | ✅ Complete | 8+ edge functions deployed; transparency + feedback loop working |
| **CRI** | ✅ Complete | Pipeline + dashboard + goals all wired |
| **Market Intelligence** | ✅ Complete | Alerts, forecasting, real-time all deployed |
| **Multi-Track** | ✅ Complete | Track-scoped artifacts, compare, switch simulator |
| **Social Learning** | 🟨 Partial | Components exist; seeder deployed but no real user interaction flow yet |
| **Resume + Verification** | ✅ Complete | Public view, embed, PDF export, certificate verification all work |
| **Admin + Ops** | ✅ Complete | Transfer scraper, policy pipeline, degree integrity, template generation |
| **Course Intelligence Trust** | 🟥 Schema concepts only | Verified feedback, AI moderation, hidden trust weights, instructor rebuttals — all documented but not implemented |
| **Reputation Economy** | 🟥 Doc only | School/instructor reputation scoring system designed but not built |

---

## Deliverable C — Quality Gates

### C1. Design System Debt (CRITICAL — ship blocker)

| Issue | Count | Severity |
|---|---|---|
| `text-xs` usages | **11,623** matches in 502 files | High — legibility/accessibility |
| Hardcoded `purple` classes | **990** matches in 125 files | High — token bypass, dark-mode breakage |
| Hardcoded color classes (non-semantic) | Est. **8,800+** across all colors | High — theming impossible |
| Touch targets < 44×44px | Unknown (needs audit) | Medium — mobile usability |

**Recommended gate**: CI lint rule banning new `text-xs` and hardcoded color classes. Existing violations migrated iteratively.

### C2. DAL Compliance

| Check | Status |
|---|---|
| `supabase.from()` in hooks | ✅ **0 violations** (clean!) |
| `supabase.from()` in components | ✅ **0 violations** |
| `supabase.from()` in pages | ✅ **0 violations** |
| Documented exceptions | Auth hooks, DevLogin, edge invoke — all correct |

**Gate: PASSED** ✅

### C3. Query Key Coherence

| Status | Keys |
|---|---|
| ✅ Canonical | `LEARNING_STREAKS`, `CELEBRATION_MOMENTS`, `GAMIFICATION_METRICS`, `LEARNING_SESSIONS`, `MOTIVATION_INTERVENTIONS`, `MAYA_FEEDBACK_CORRELATIONS`, all EduTree keys |
| ✅ Explicit Legacy | `CAREER_TRACKS`, `USER_CAREER_TRACKS` |
| 🟥 Still raw strings | `['institutions']`, `['trending-real-courses']`, `['real-course-recommendations']`, `['autonomous-workflows']`, `['user-plan-courses', planId]`, `['user-plan-selections', planId]`, `['edu-courses']`, `['requirement-blocks']`, `['batch-requirement-options']`, `['req-opt-batch']`, `['data-imports']`, `['skill-extractions']` |

**11 raw key families remain.** The EduTree invalidation cluster (`useUserPlan`) is the highest risk — mutations invalidate 6 different raw keys, any mismatch causes stale spine/node state.

### C4. Accessibility

| Check | Status |
|---|---|
| Focus order / keyboard nav | 🟨 `useKeyboardNavigation` hook exists; not wired to all surfaces |
| ARIA labels | 🟨 Present on interactive elements; missing on some custom components |
| Color contrast (WCAG AA) | 🟥 Hardcoded colors make systematic checking impossible until tokens are enforced |

### C5. Performance

| Check | Status |
|---|---|
| ReactFlow stability (no remount) | ✅ Enforced by design invariants in spec |
| Large graph behavior | 🟨 `react-window` available but not applied to all lists |
| Bundle size | 🟨 120+ edge functions; main bundle not measured |

### C6. Telemetry Coverage

| Check | Status |
|---|---|
| `telemetry` API module | ✅ Exists in shared/lib/api |
| `useInsightTracking` hook | ✅ Exists |
| Instrumentation dashboard | 🟨 `/analytics` exists but relies on manual event logging |
| MapTree Phase 4 instrumentation | 🟥 Not started per doc requirements |

### C7. Single Source of Truth for Core Concepts

| Concept | Source | Conflict Risk |
|---|---|---|
| Current goal | `career_goals` table + `useEnhancedGoals` | Low — single table |
| Current track | `useTracks` + `useTrackParamSync` | Low — URL param synced |
| User skill gaps | `useSkillGaps` + `useCrossHubIntegration` | Medium — two computation paths |
| Recommendations feed | `useUnifiedRecommendations` + `useRealCourseRecommendations` | **High** — two separate systems |
| Progress & celebrations | `useGamification` (canonical) | Low — fixed in recent PR |
| Trust metrics | `useTrustMetrics` | Low — single hook |

---

## Deliverable D — "Next 20 Commits" Plan

### Phase 1: Design Tokens + Typography Floor (commits 1–4)
1. **CI lint gate**: Ban new `text-xs` and hardcoded color classes in changed files
2. **Typography floor**: Replace `text-xs` → `text-sm` in top 20 most-visited components (hubs, dashboard, EduTree nodes)
3. **Purple token migration**: Create semantic `--maya`, `--intelligence`, `--provider-mooc` tokens; migrate top 50 purple-hardcoded files
4. **Dark mode audit**: Fix saturation issues in gradient classes (`from-purple-50` etc.)

### Phase 2: Query Key Coherence Completion (commits 5–8)
5. **EduTree keys**: Canonicalize `['edu-courses']`, `['requirement-blocks']`, `['user-plan-courses']`, `['user-plan-selections']`, `['req-opt-batch']`
6. **useUserPlan invalidation cluster**: Wire all 6 invalidations to canonical keys
7. **Remaining raw keys**: `['institutions']`, `['autonomous-workflows']`, `['data-imports']`, `['skill-extractions']`, `['trending-real-courses']`
8. **DAL violations**: Move `useInstitutions` and `useDataImport` supabase calls to `src/shared/lib/api/`

### Phase 3: EduTree Signature UX Polish (commits 9–12)
9. **Decision dock iteration**: Polish docked side panel per V4 spec (anchor, resize, keyboard dismiss)
10. **Overlay system**: Verify compare/transfer/progress overlays use CSS class swap (no remount)
11. **Year card UX**: Ensure fork visualization at Year 3 is clean with stable spine
12. **Touch targets**: Ensure all EduTree interactive elements meet 44×44px minimum

### Phase 4: End-to-End User Journey QA (commits 13–16)
13. **New user flow**: Auth → Onboarding → Today → first Discover interaction
14. **Returning user flow**: Today → resume Plan → complete course → celebration → resume signal
15. **Recommendations unification**: Merge `useUnifiedRecommendations` and `useRealCourseRecommendations` into single pipeline
16. **Demo/prod parity**: Audit demo-mode paths to ensure they don't create prod-only dead ends

### Phase 5: Instrumentation + Strategic (commits 17–20)
17. **Telemetry alignment**: Implement MapTree Phase 4 instrumentation spec (event taxonomy, view tracking)
18. **Analytics dashboard**: Wire `/analytics` to real telemetry events (not mock data)
19. **Course Intelligence trust layer**: Implement verified feedback model + AI moderation (first slice from doc)
20. **Social Learning activation**: Wire social dashboard to real user interactions (not seeded data)

---

## Appendix: Remaining DAL Violations Found

```
src/hooks/useInstitutions.ts — supabase.from('institutions')
src/hooks/useDataImport.ts — supabase.from('data_imports'), supabase.from('skill_extractions')
```

These are the **only** remaining direct DB access in hooks. Both should be moved to `src/shared/lib/api/institutions.ts` and a new `dataImport.ts` module.

## Appendix: Edge Function Count by Domain

| Domain | Count |
|---|---|
| Maya AI | 8 |
| Market Intelligence | 9 |
| EduTree/Templates | 7 |
| Transfer Scraper | 6 |
| CRI/Course Intel | 5 |
| Career/Skills | 5 |
| Seeding (dev) | 14 |
| Admin/Ops | 10 |
| Resume/Certificates | 5 |
| AI Analyzer | 5 |
| Planning/Goals | 6 |
| Other | 40+ |
| **Total** | **120+** |
