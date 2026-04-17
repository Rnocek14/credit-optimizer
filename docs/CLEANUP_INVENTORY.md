# Cleanup Inventory — Phase 1 Audit

> Read-only audit. No code moved yet. Source of truth for Phases 2–5.
>
> **Decisions locked by user:**
> 1. `/contribute` → hide from nav, keep route (future B2B lives here)
> 2. Maya → remove from UI entirely (route + components quarantined)
> 3. `/compare` → canonical comparison surface; redirect duplicates
>
> **Hard rules:**
> - Never touch `src/shared/lib/api/` (DAL)
> - Never touch `supabase/functions/` (edge functions)
> - Never touch DB schema (no migrations)
> - Never touch EduTree V5 engine, V6 wrapper, scoring, invariants, transfer rules
> - Skill tree (Progress) stays — user's call

---

## 1. Routes — keep / quarantine / redirect

### KEEP (canonical, in nav)
| Route | Component | Status |
|---|---|---|
| `/` | `Index` | landing |
| `/auth`, `/dev-login`, `/onboarding` | auth flow | keep |
| `/get-started` | `GetStartedPage` | **wedge** |
| `/compare` | `ComparePage` | **canonical comparison** |
| `/today` | `TodayDashboard` | hub |
| `/discover` | `DiscoverHub` | hub |
| `/plan` | `PlanHub` | hub |
| `/progress` | `ProgressHub` | hub (incl. skill tree tab) |
| `/edu-tree-v5`, `/edu-tree-v6`, `/edu-tree-v6/:templateId` | EduTree engine | keep |
| `/edu-tree-v5/marketplace` | `MarketplacePage` | keep (engine surface) |
| `/build` | `Build` | keep (protected) |
| `/explore/careers`, `/explore/careers/:id` | `CareerListPage`, `CareerDetailPage` | keep |
| `/plan/compare` | `CompareTracks` | keep (intra-plan track compare) |

### KEEP (admin/operational, not in primary nav)
All `/admin/*`, `/institution/*`, `/employer/*`, `/teach/*`, `/contribute` routes — kept as-is. Direct-URL only. Already gated by `StakeholderProtectedRoute`.

### KEEP (public/embed)
`/resume/:userId`, `/embed/:resumeId`, `/embed-generator`, `/embed-explorer`, `/share/trust/:token`, `/verify/:code?`, `/badges/:slug`, `/certificate-gallery`, `/resume-gallery`.

### QUARANTINE (move to `src/_archive/`, replace route with redirect)
| Route | Component | Redirect target | Reason |
|---|---|---|---|
| `/maya` | `MayaPage` | `/today` | Confuses product, not in conversion loop |

### ALREADY REDIRECT (no component renders)
`/dashboard`, `/calm-test`, `/explore`, `/explore-hub`, `/explore-courses`, `/market-intelligence`, `/salary-insights`, `/diagnostic/career-data`, `/plan-hub`, `/planner`, `/goals`, `/maya-roadmap`, `/career-copilot`, `/workflows`, `/edu-tree`, `/edu-tree-v2..v4`, `/edu-tree-v3-vertical`, `/edu-tree-v3-harness`, `/marketplace`, `/progress-hub`, `/history-hub`, `/history`, `/learning-history`, `/course-history`, `/skill-tree`, `/transcripts`, `/badges`, `/certificates`, `/resume-builder`, `/resume-analytics`, `/projects`, `/wallet`, `/teach-hub`, `/institution-hub`, `/employer-hub`, `/admin` (legacy), `/maya-intelligence`, `/ai-analyzer`, `/cri-dashboard`, `/mentor`, `/mentor-inbox`. **Leave intact.**

---

## 2. Components — Maya UI shell

### QUARANTINE (only used by `/maya` page)
Verified by grep — these have **zero importers outside MayaPage and each other**:
| File | Used by |
|---|---|
| `src/pages/MayaPage.tsx` | route only |
| `src/components/maya/MayaChatInterface.tsx` | MayaPage only |
| `src/components/MayaIntelligenceCore.tsx` | MayaPage only |
| `src/components/SocialMayaIntegration.tsx` | MayaPage only |
| `src/components/dashboard/MayaInsightsCard.tsx` (re-export) | MayaPage only |
| `src/components/maya/MayaLiveInsights.tsx` | re-exported by MayaInsightsCard, MayaPage only |
| `src/components/maya/MayaDailyBriefing.tsx` | `Phase4Overview` only (also unused) |
| `src/components/maya/MayaTimelineInsights.tsx` | unused |
| `src/components/MayaGuidancePanel.tsx` | unused at hub level — verify before quarantine |
| `src/components/maya/MayaInlinePanel.tsx` | unused at hub level — verify before quarantine |
| `src/components/enhanced/Phase4Overview.tsx` | unused |

### KEEP (hooks powering non-Maya features — DO NOT MOVE)
These are referenced by 20+ files including CRI, cross-hub integration, proactive decisions. The "Maya" prefix is misleading; they're general intelligence helpers.
- `src/hooks/useEnhancedMaya.ts` — used by CRI, cross-hub, proactive decisions
- `src/hooks/useMayaCRIIntegration.ts` — wraps CRI scoring
- `src/hooks/useCrossHubIntegration.ts`
- `src/hooks/useProactiveDecisions.ts`
- `src/hooks/useEnhancedMayaFeedback.ts`
- `src/hooks/useMayaContextTracking.ts` — only used by MayaPage; **safe to quarantine**

### KEEP (edge functions, untouched per rules)
`maya-context-processor`, `maya-*` edge functions all stay deployed. Cost is negligible; signal may be reused.

### KEEP (DB tables, untouched per rules)
`maya_context_tracking`, `maya_proactive_insights`, all related tables — preserved.

---

## 3. Mentor pages

| File | Route | Action |
|---|---|---|
| `src/pages/MentorChat.tsx` | none (orphaned) | Already unrouted. Quarantine. |
| `src/pages/MentorInbox.tsx` | none (orphaned) | Already unrouted. Quarantine. |
| `/mentor`, `/mentor-inbox` | redirect to `/discover` | Keep redirect. |

---

## 4. Career Switch / Social Learning

Searched: no standalone `/career-switch` route exists. No standalone Social Learning page exists. The "Social" surface is only `SocialMayaIntegration` (already in Maya quarantine list above) and `useSocialLearning` hook used by it. Safe to quarantine `SocialMayaIntegration` with Maya; **leave `useSocialLearning` hook alone** unless verified unused after quarantine.

---

## 5. Navigation surfaces to update (Phase 2)

| File | Change |
|---|---|
| `src/components/HubNavigation.tsx` | Hide `CONTRIBUTE` dropdown from primary nav (kept reachable via direct URL + admin panel link). Already shows only 4 hubs. |
| `src/components/MobileNavigation.tsx` | Already 4 tabs. No change. |
| `src/tutorial/tutorial-map.ts` | Comment out Maya/Mentor tutorial entries (do not delete keys — referenced by TIPS lookups). |

---

## 6. Files to redirect for `/compare` canonicalization

`/compare` is already canonical via `ComparePage`. No competing route exists at top level. `/plan/compare` is intra-plan track compare (different surface) — **keep distinct**, do not redirect.

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| `MayaGuidancePanel` / `MayaInlinePanel` referenced somewhere we missed | Re-grep before move; if any importer outside Maya tree found, leave in place |
| Quarantining `useMayaContextTracking` breaks MayaPage | Move hook with MayaPage to `_archive/` |
| `useEnhancedMaya` etc. accidentally moved | Explicitly excluded from move list above |
| Tutorial map references break | Keys retained, only Maya/Mentor entries commented |
| Edge function calls from quarantined Maya code | Edge functions stay deployed — calls just stop happening |

---

## 8. Phase order (no big-bang)

1. **Phase 2 (Day 1):** Update `HubNavigation` to hide CONTRIBUTE. Mark deprecated routes in `CANONICAL_SURFACE.md`. *No file moves.*
2. **Phase 3 (Day 2–3):** Create `src/_archive/maya-2026-04/`. Move 11 Maya files + MentorChat + MentorInbox. Replace `/maya` route with `<Navigate to="/today" replace />`. Remove `MayaPage` import from `routes.tsx`. Run typecheck.
3. **Phase 4 (Day 4+):** Sharpen surface copy, confirm `/compare` is primary CTA on `/discover`, scope graduation plan view in `/plan`.
4. **Phase 5:** Update `CANONICAL_SURFACE.md`, `MVP_AUDIT.md`, write `mem://project/cleanup-2026-04`.

---

## 9. Reversibility

Every quarantined file lives at `src/_archive/maya-2026-04/<original-path>`. Restoration:
```
git mv src/_archive/maya-2026-04/* src/  # preserves structure
# re-add /maya route + MayaPage import in routes.tsx
```
Zero data loss. Zero schema change. Zero engine touch.
