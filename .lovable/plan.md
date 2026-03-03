

# System Consolidation Plan: Degree Planning as the Spine

## The Honest State of Things

You have **~250 components**, **60+ page files**, **532 route lines**, and **15+ admin pages**. But only one system actually works end-to-end with real data: **EduTree V5/V6 + Marketplace**.

Everything else is either partially wired or entirely hardcoded decoration.

### What's Real (keep, polish, connect)

| System | Status | Real Data? |
|--------|--------|------------|
| EduTree V5 engine | Fully functional | Yes — requirement_blocks, edu_courses, marketplace_courses |
| EduTree V6 wrapper | Functional | Yes — same engine |
| Marketplace (`/edu-tree-v5/marketplace`) | Functional | Yes — degree_templates (15), filters, comparison |
| Plan sync (`usePlanSync`) | Functional | Yes — writes to user_plan_courses |
| Policy packs + constraints | Functional | Yes — residency, alt-credit caps, transfer |
| Career list (`/explore/careers`) | Functional | Yes — career_paths (57 rows) |
| Skill gaps (`useSkillGaps`) | Functional | Yes — career_goals + user_skill_progress |
| Course recommendations (`useRealCourseRecommendations`) | Functional | Yes — marketplace_courses |
| Today Dashboard (`useSmartTodayDashboard`) | Partially functional | Partially — streak/XP real, focusSkills hardcoded |
| Gamification (XP, streaks, badges) | Functional | Yes — user_xp, badges (14), user_streaks |
| Admin pipeline (scrapers, policy, templates) | Functional | Yes — operational tooling |

### What's Fake (replace or remove)

| Surface | Problem |
|---------|---------|
| **DiscoverHub** career paths | 5 hardcoded objects ("Data Scientist", "UX Designer") |
| **DiscoverHub** mentors tab | 2 fake people ("Sarah Chen", "Marcus Johnson") |
| **ProgressHub** everything | 3 fake history items, 2 fake projects, 3 fake credentials, all stats hardcoded (totalXP: 1250, level: 5, streak: 15) |
| **PlanHub** roadmap tab | Hardcoded "Learn Python fundamentals" |
| **TodayDashboard page** | 3 dead links (`/education-tree`, `/skilltree3`, `/edu-tree-v3-vertical`) |
| **TodayDashboard component** | `focusSkills` hardcoded, debug panels (`DbHealthBadge`, `MayaInsightDebugPanel`, `DiagnosticsRunner`) leak into production |
| **Landing page** (unauthenticated) | "Secure Access Required" shield — looks like an error, not a product |
| **DegreeMarketplace** (`/marketplace`) | Separate, simpler duplicate of `/edu-tree-v5/marketplace` |

### What's Dead Weight (~100+ components)

- **~40 Maya components** (MayaAutonomousActions, MayaControlCenter, MayaPredictiveEngine, MayaPhase5Test, etc.) — no backend
- **~15 Phase/Test dashboards** (Phase4Dashboard through Phase7Dashboard, IntegrationTestMatrix, PerformanceBenchmarkSuite, etc.)
- **~20 seeder/debug panels** (ComprehensiveSeeder, DemoSeedingPanel, MarketDataSeeder, QuickMarketplaceSeed, etc.)
- **Duplicate surfaces**: CourseMarketplace vs DegreeMarketplace vs MarketplacePage
- **Standalone pages nobody reaches**: AIAnalyzer, MayaIntelligence, CRIDashboard, MentorInbox, MentorChat

### Navigation is Broken

Current `HubNavigation` shows: `DISCOVER | PLAN | PROGRESS | MARKETPLACE`

Problems:
- `/today` is not in the nav — only reachable via redirect from `/`
- EduTree V5/V6 is not linked from any nav — only via direct URL
- `MARKETPLACE` links to `/marketplace` (the duplicate DegreeMarketplace), not the real one at `/edu-tree-v5/marketplace`
- Mobile nav shows `Home | Plan | Discover | Progress | Theme` — "Home" goes to `/` which redirects to `/today`, creating a confusing loop

---

## The Consolidation Plan

### Phase 1: Fix the Spine (Navigation + Landing)

**Goal**: A user can find and reach the degree planner.

**Changes**:

1. **`HubNavigation.tsx`**: Replace `primaryHubs` array:
   - Remove `MARKETPLACE` entry
   - Add `TODAY` as the first hub (`/today`)
   - Add `DEGREE PLANNER` as a hub linking to `/edu-tree-v5/marketplace` (the real marketplace → V6 flow)
   - Final nav: `TODAY | DISCOVER | PLAN | DEGREE PLANNER | PROGRESS`

2. **`MobileNavigation.tsx`**: Update to match — replace `Home` with `Today`, add `Degree` linking to marketplace

3. **`SecureLandingPage.tsx`**: Replace "Secure Access Required" shield with a product pitch:
   - Headline: "Plan the smartest path to your degree"
   - Subheadline about transfer credit optimization, cost comparison
   - CTA: "Get Started" → `/auth`

4. **`TodayDashboard.tsx` (page)**: Remove the "Career Planning Tools" card with 3 dead links (lines 26-56). Add a "Start Your Degree Plan" CTA linking to `/edu-tree-v5/marketplace`.

5. **Routes cleanup**: Remove `/marketplace` route (DegreeMarketplace duplicate). Redirect `/marketplace` → `/edu-tree-v5/marketplace`.

### Phase 2: Kill Fake Data on Core Pages

**Goal**: Every page shows real data or honest empty states. No illusions.

**Changes**:

1. **`DiscoverHub.tsx`**:
   - Replace hardcoded `careerPaths` array (lines 79-115) with a query to `career_paths` table (57 real rows exist)
   - The `useRealCourseRecommendations` hook is already imported and functional — remove the hardcoded `recommendedCourses` array (lines 117-145) and ensure the hook output renders directly (it partially does already for the courses tab)
   - Replace Mentors tab content with a "Coming Soon" empty state — remove fake "Sarah Chen" / "Marcus Johnson"
   - Remove hardcoded `MayaGuidancePanel` message

2. **`ProgressHub.tsx`**:
   - Replace `learningHistory` (lines 40-71) with query to `course_progress` table
   - Replace `portfolioProjects` (lines 73-94) with query to user's proof projects (the `TrackProofProjectManager` component already queries real data — reuse its hook)
   - Replace `credentials` (lines 96-123) with query to `badges` + certificates tables
   - Replace `overallStats` (lines 125-133) with real aggregations from `user_xp`, `user_streaks`, `course_progress`
   - Show proper empty states when data is empty (which it mostly will be for new users)
   - Remove hardcoded Maya guidance message

3. **`PlanHub.tsx`**:
   - Replace hardcoded roadmap tab (lines 323-345, "Learn Python fundamentals") with a degree plan summary card:
     - If user has an active plan in `user_plan_courses`: show credits planned, estimated cost, progress %
     - If no plan: show CTA "Start your degree plan" → `/edu-tree-v5/marketplace`
   - Add "Degree Planner" card to the Overview tab linking to `/edu-tree-v5/marketplace`

### Phase 3: Wire the Golden Journey

**Goal**: A user can go Discover → Marketplace → Plan → see it in Progress/Today.

**Changes**:

1. **Discover → Marketplace bridge**: Add a prominent CTA in DiscoverHub that links career paths to degree templates. When a user views a career, show "See degree plans for this career" → `/edu-tree-v5/marketplace?career={id}`

2. **Today → Plan bridge**: In `TodayDashboard` component, replace hardcoded `focusSkills` (around line 170) with data from `useSkillGaps` hook (already used elsewhere). When user has an active degree plan, show plan progress summary instead of generic widgets.

3. **Debug cleanup in TodayDashboard component**: Gate `DbHealthBadge`, `MayaInsightDebugPanel`, `DiagnosticsRunner` behind `import.meta.env.DEV` check.

### Phase 4: Route Pruning

**Goal**: Remove unreachable or duplicate routes.

**Routes to remove** (redirect or delete):
- `/marketplace` → redirect to `/edu-tree-v5/marketplace`
- `/maya-intelligence` — standalone Maya page, no users reach it
- `/ai-analyzer` — standalone AI tool, no users reach it  
- `/cri-dashboard` — standalone CRI page, data available in Plan hub
- `/mentor` and `/mentor-inbox` — no mentor system exists
- `/calm-test` — test page
- `/diagnostic/career-data` — debug page

**Routes to keep but not touch** (admin, functional):
- All `/admin/*` routes — operational tooling
- All `/institution/*` and `/employer/*` — stakeholder portals  
- All `/teach/*` — instructor tools
- Public routes (`/resume/:userId`, `/embed/:userId`, `/verify/:code`)

### Phase 5: Component Pruning (Optional, Low Priority)

Not deleting files yet — just removing imports and route registrations. The ~100 dead-weight components become unreferenced and can be cleaned in a future pass.

---

## Implementation Order and Effort

| Phase | Files Changed | Effort | Impact |
|-------|--------------|--------|--------|
| 1. Navigation + Landing | 4-5 files | Small | Users can find the product |
| 2. Kill Fake Data | 3 files | Medium | No more illusions |
| 3. Wire Golden Journey | 2-3 files | Medium | End-to-end flow works |
| 4. Route Pruning | 1 file (routes.tsx) | Small | Cleaner architecture |
| 5. Component Pruning | 0 (deferred) | None | Future cleanup |

## What NOT to Touch

- EduTree V5/V6 engine — it works, don't refactor
- Marketplace internals — it works
- Pipeline (scrapers, policy packs, template generation) — it works
- Admin pages — operational, not user-facing
- Gamification system — wired and functional
- Database schema — stable

## Success Criteria

After phases 1-4, a logged-in user can:
1. Land on `/today` and see real XP/streak data + "Start your degree plan" CTA
2. Navigate to `/discover` and see 57 real career paths from DB
3. Click through to the degree marketplace and browse 15+ real templates
4. Select a template, land in V6 planner, customize their plan
5. Navigate to `/progress` and see real data (or clean empty states)
6. No dead links, no fake mentors, no hardcoded roadmaps anywhere

