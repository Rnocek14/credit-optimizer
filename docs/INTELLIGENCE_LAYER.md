# Unified Intelligence Layer — Architecture Spec

> **Status:** Approved with required edits applied (invalidation, types, cache model, Maya role).
> **Owner:** Intelligence unification (Phase 1 of strategic plan)
> **Last updated:** 2026-02-17

---

## 1. Problem Statement

The platform currently computes intelligence through **8 fragmented surfaces**:

| # | Hook | Inputs | Outputs | DAL Status |
|---|------|--------|---------|------------|
| 1 | `useUnifiedRecommendations` | `useSkillGaps` | `UnifiedRecommendation[]` | ✅ Clean |
| 2 | `useRealCourseRecommendations` | skill gap strings, targetCRI | `RealCourse[]` with CRI | ✅ Clean |
| 3 | `usePredictiveCareerInsights` | Maya + CRI + Market + UnifiedData | `PredictiveInsight[]` | ❌ Raw `supabase.from()` |
| 4 | `useSmartMarketSelection` | market_trends, career_paths, locations | auto-selected career/location | ❌ Raw `supabase.from()` |
| 5 | `useCrossHubIntegration` | orchestrates save-to-plan + milestones | actions + invalidations | ✅ Clean (uses DAL) |
| 6 | `useMarketIntelligence` | career_paths, locations, market_trends | `MarketTrend[]` | ✅ Clean (uses DAL) |
| 7 | `useMayaCRIIntegration` | CRI + Maya + goals | `CRIInsight[]` + `CareerTrajectory` | ⚠️ Edge invoke (allowed) |
| 8 | `useCareerReadiness` | userId, targetJob | `CRIScore` + `UserProgress` | ⚠️ Uses `careerReadiness` lib |
| 9 | `useIntelligentRecommendations` | `UnifiedDataContext` | context-filtered recs | ✅ Context-based |

### Concrete harms of fragmentation:

1. **Divergent outputs** — `useUnifiedRecommendations` and `useRealCourseRecommendations` produce different recommendation shapes for the same skill gaps
2. **Conflicting CRI** — CRI is calculated independently in `useCareerReadiness` vs `useRealCourseRecommendations` (different scoring)
3. **Market signals siloed** — `useMarketIntelligence`, `useSmartMarketSelection`, and `usePredictiveCareerInsights` all query market data independently
4. **DAL violations** — `usePredictiveCareerInsights` and `useSmartMarketSelection` use raw `supabase.from()` calls
5. **No single cache key** — each hook uses its own query key, making coordinated invalidation fragile
6. **Context blindness** — hooks don't share track context, so recommendations ignore the active track

---

## 2. Design Principles

1. **One pipe** — All intelligence flows through a single computation graph
2. **Inputs are declarative** — Context is assembled once, not scattered across hooks
3. **Outputs are typed** — A single `IntelligenceOutput` contract serves all consumers
4. **Cache is coordinated** — One query key family, one invalidation strategy
5. **Track-aware by default** — Every computation respects the active track
6. **Plug-in scoring** — CRI, market, reputation, Maya are scoring plugins, not parallel systems
7. **DAL compliant** — Zero raw `supabase.from()` calls

---

## 3. Architecture

### 3.1 Computation Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CONTEXT (assembled once)             │
│  userId · activeTrackId · activeGoal · location · intent    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                  DATA LAYER (parallel fetches)                │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │SkillGaps │ │CRI Score │ │ Market   │ │ Course        │  │
│  │(useQuery)│ │(useQuery)│ │ Trends   │ │ Candidates    │  │
│  │          │ │          │ │(useQuery)│ │ (useQuery)    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       │             │            │               │           │
└───────┼─────────────┼────────────┼───────────────┼───────────┘
        │             │            │               │
        ▼             ▼            ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│              SCORING ENGINE (pure functions)                  │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ CRI Scorer     │  │ Market Scorer  │  │ Skill Gap     │  │
│  │ (weight: 0.35) │  │ (weight: 0.25) │  │ Scorer (0.25) │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │ Maya Scorer    │  │ Reputation     │                     │
│  │ (weight: 0.10) │  │ Scorer (0.05)  │  ← future plug-in  │
│  └────────────────┘  └────────────────┘                     │
│                                                              │
│  composite_score = Σ (scorer_weight × scorer_output)         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              UNIFIED OUTPUT (IntelligenceOutput)              │
│  (derived via useMemo — NOT its own useQuery)                │
│                                                              │
│  recommendations: IntelligenceRecommendation[]               │
│  skillGaps: SkillGap[]                                       │
│  criSnapshot: CRISnapshot                                    │
│  marketSignals: MarketSignal[]                               │
│  meta: { computedAt, staleAt, scoringWeights, trackId }     │
│                                                              │
│  Maya is a SIGNAL LAYER, not a candidate source.             │
│  Maya provides boosts/penalties via mayaConfidence on         │
│  existing candidates — it does NOT generate its own.         │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Query Key Strategy

```typescript
// In src/lib/queryKeys.ts:
QUERY_KEYS.INTELLIGENCE = (userId?: string, trackId?: string) =>
  ['intelligence', userId, trackId] as const;

QUERY_KEYS.INTELLIGENCE_SIGNALS = (userId?: string, trackId?: string) =>
  ['intelligence', 'signals', userId, trackId] as const;
```

**Invalidation strategy (predicate-based — NO wildcards):**

React Query does NOT support `'*'` in query keys. All cross-key invalidation
uses predicates. See `src/shared/lib/intelligence/invalidation.ts` for utilities.

```typescript
// Milestone completion → invalidate user's intelligence
invalidateUserIntelligence(queryClient, userId);

// Track switch → invalidate old track + all user intelligence
invalidateOnTrackSwitch(queryClient, userId, oldTrackId);

// Market data refresh → invalidate all signal queries
invalidateMarketSignals(queryClient);

// Save-to-plan / proof project → plan + intelligence
invalidateOnPlanMutation(queryClient, userId, trackId);
```

### 3.3 Cache Model

Composite output is **derived via `useMemo`** from cached input queries.
It does NOT have its own `useQuery` — this prevents double-caching and
incoherent invalidation. Only the input queries have cache entries:

| Data | staleTime | gcTime | Rationale |
|------|-----------|--------|-----------|
| Skill gaps | 60s | 5min | Changes with course completions |
| CRI score | 5min | 15min | Expensive to compute, slow-changing |
| Market trends | 10min | 30min | External data, infrequent updates |
| Course candidates | 5min | 15min | Based on skill gaps (derived) |
| **Composite output** | — | — | `useMemo` from above caches, not its own query |

---

## 4. Type Contracts

See `src/shared/types/intelligence.ts` for the canonical type definitions.

### Key types:

- `UserIntelligenceContext` — All inputs needed to compute intelligence
- `IntelligenceRecommendation` — Unified recommendation with composite score + breakdown
- `ScoringBreakdown` — Per-scorer contribution to the composite score
- `IntelligenceOutput` — The complete output contract
- `ScorerPlugin` — Interface for pluggable scoring functions

---

## 5. Migration Plan

### Phase 1: Foundation (Commits 1–2)
1. Create `src/shared/types/intelligence.ts` ← type contracts
2. Create `src/shared/lib/intelligence/scorers.ts` ← pure scoring functions
3. Create `src/shared/lib/intelligence/buildRecommendations.ts` ← assembly logic

### Phase 2: Hook (Commits 3–4)
4. Create `src/hooks/useIntelligenceLayer.ts` ← single hook consuming all inputs
5. Add `QUERY_KEYS.INTELLIGENCE*` to query key registry

### Phase 3: Consumer Migration (Commits 5–8)
6. Migrate `useSmartTodayDashboard` → consume `useIntelligenceLayer`
7. Migrate `NextStepsPanel` → consume `useIntelligenceLayer`
8. Migrate `DiscoverHub` → consume `useIntelligenceLayer`
9. Migrate `CRIRecommendationEngine` → consume `useIntelligenceLayer`

### Phase 4: Deprecation (Commits 9–10)
10. Mark deprecated hooks with `@deprecated` JSDoc + console.warn in dev
11. Remove deprecated hooks after all consumers migrated

### Hooks to deprecate:
- `useRealCourseRecommendations` → absorbed into intelligence layer
- `usePredictiveCareerInsights` → absorbed (+ DAL violations fixed)
- `useSmartMarketSelection` → absorbed (+ DAL violations fixed)
- `useIntelligentRecommendations` → absorbed (was thin wrapper)

### Hooks to preserve (consumed by intelligence layer as inputs):
- `useSkillGaps` — canonical skill gap source
- `useCareerReadiness` — canonical CRI source
- `useMarketIntelligence` — canonical market data source
- `useEnhancedMaya` — Maya AI integration (edge function invocation)
- `useCrossHubIntegration` — action orchestrator (save-to-plan, milestones)

---

## 6. Scoring Weights (Default)

| Scorer | Weight | Description |
|--------|--------|-------------|
| `criScorer` | 0.35 | CRI gap analysis — how much does this close the CRI gap? |
| `marketScorer` | 0.25 | Market demand alignment — growth rate, demand score |
| `skillGapScorer` | 0.25 | Skill gap severity — priority × criImpact |
| `mayaScorer` | 0.10 | Maya AI contextual boost — personalization signal |
| `reputationScorer` | 0.05 | Trust & reputation (future plug-in, defaults to 1.0) |

Weights sum to 1.0. Currently client-side constants in `DEFAULT_SCORING_WEIGHTS`.
Per-user/per-track configurability is deferred until a `user_intelligence_weights`
table is implemented (keyed by `user_id, track_id`). Do NOT scatter weight overrides
in components — all weight resolution must go through the intelligence layer.

---

## 6.5 Scorer Normalization Contract

Every scorer MUST normalize its inputs to [0, 1] and clamp the output.
Use `clamp01()` and `normalize()` from `src/shared/types/intelligence.ts`.

| Input Field | Raw Range | Normalization |
|-------------|-----------|---------------|
| `criContribution` | 0–1 | passthrough |
| `marketDemandScore` | 0–1 | passthrough |
| `marketGrowthRate` | -1 to +1 | `normalize(v, -1, 1)` |
| `instructorReputation` | 0–5 | `normalize(v, 0, 5)` |
| `platformTrust` | 0–1 | passthrough |
| `mayaConfidence` | 0–1 | passthrough |
| `priority` (SkillPriority) | 1–4 | `normalize(PRIORITY_SCORE[p], 1, 4)` |
| `difficulty` | 1–5 | `normalize(v, 1, 5)` |

Scorers that receive `undefined` for an optional input MUST return a neutral
score (0.5) for that dimension, not 0 — to avoid penalizing missing data.

---

## 7. DAL Compliance

All data fetching in the intelligence layer MUST go through:
- `src/shared/lib/api/marketIntelligence.ts` — market data
- `src/shared/lib/api/tracks.ts` — track data
- `src/shared/lib/api/progress.ts` — course progress
- React Query hooks (`useSkillGaps`, `useCareerReadiness`) — derived data

**Zero raw `supabase.from()` or `supabase.rpc()` calls in the intelligence layer.**

Edge function invocations (`supabase.functions.invoke()`) are allowed per `API_SEAMS.md`.

---

## 8. Consumer API

```typescript
// Single hook for all intelligence needs
const {
  recommendations,     // IntelligenceRecommendation[] (sorted by composite score)
  skillGaps,           // SkillGap[] (from useSkillGaps)
  cri,                 // CRISnapshot
  marketSignals,       // MarketSignal[]
  isLoading,           // boolean
  isError,             // boolean
  meta,                // { computedAt, trackId, scoringWeights }
  // Derived convenience:
  topRecommendation,   // IntelligenceRecommendation | null
  quickWins,           // IntelligenceRecommendation[] (≤60min)
  criticalGaps,        // SkillGap[] (priority === 'critical')
} = useIntelligenceLayer(userId, trackId);
```

This replaces the need to import 5+ hooks in every consumer component.

---

## 9. Future Plug-in Points

### Reputation Scorer (Phase 5)
```typescript
const reputationScorer: ScorerPlugin = {
  name: 'reputation',
  weight: 0.05,
  score: (candidate, context) => {
    // Instructor credibility × platform trust × verified completions
    return candidate.instructorReputation * candidate.platformTrust;
  }
};
```

### Social Signal Scorer (Post-V1)
```typescript
const socialScorer: ScorerPlugin = {
  name: 'social',
  weight: 0.05, // carved from market weight
  score: (candidate, context) => {
    // Peer recommendations, group challenges, mentor endorsements
    return candidate.peerScore;
  }
};
```

---

## 10. Success Criteria

1. **One import** — Any component needing intelligence imports only `useIntelligenceLayer`
2. **Zero divergence** — All surfaces show the same ranked recommendations
3. **Track-aware** — Switching tracks re-computes all intelligence
4. **DAL clean** — Zero `supabase.from()` in any intelligence code path
5. **Testable** — Scoring functions are pure, deterministic, and unit-tested
6. **Cache coherent** — One invalidation path for all intelligence data
