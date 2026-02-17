# API Seams — Allowed Direct Supabase Usage

> This document defines what is allowed to import `supabase` directly
> vs. what **must** go through `src/shared/lib/api/*`.

## The Rule

```
Components → Hooks → API modules → supabase client
```

**Only `src/shared/lib/api/*.ts` may call `supabase.from()` or `supabase.rpc()`.**

Pages and components must never import the Supabase client for data access.

## Allowed Exceptions

These are the **only** cases where direct `supabase` usage is permitted
outside `src/shared/lib/api/`:

### 1. Authentication (`supabase.auth.*`)

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.auth.getUser()` | Hooks, pages | Used for auth guards |
| `supabase.auth.signIn*()` | Auth pages | Login flows |
| `supabase.auth.signOut()` | Auth components | Logout |
| `supabase.auth.onAuthStateChange()` | Providers | Session management |

### 2. Edge Function Invocation (`supabase.functions.invoke()`)

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.functions.invoke('promote-policy-pack', ...)` | PolicyFieldReview | Admin action |
| `supabase.functions.invoke('policy-refresh-start', ...)` | PolicyFieldReview | Build trigger |
| `supabase.functions.invoke(...)` | Various admin pages | One-off actions |

> **Future**: Consider wrapping these in `src/shared/lib/api/functions.ts`
> for consistent error handling and logging.

### 3. Infrastructure RPCs (Pages)

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.rpc('get_user_role', ...)` | DevLogin.tsx | Role lookup for dev auth |

### 4. Infrastructure RPCs (Hooks)

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.rpc('get_user_role', ...)` | `useUserRole.ts` | Role lookup for auth |
| `supabase.rpc('get_user_role', ...)` | `useSecureAuth.ts` | Secure role validation |

> These are auth-adjacent infrastructure calls. They will be wrapped
> in `src/shared/lib/api/auth.ts` in a future PR, but are **not** data-access
> violations — they query auth metadata, not business tables.

### 5. Realtime Subscriptions (`supabase.channel()`)

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.channel(...)` | Realtime hooks | Live data subscriptions |

## Banned Patterns

These patterns are **not allowed** outside `src/shared/lib/api/`:

```typescript
// ❌ Direct table access in components/pages
supabase.from('some_table').select(...)
supabase.from('some_table').insert(...)
supabase.from('some_table').update(...)
supabase.from('some_table').delete(...)

// ❌ Direct RPC for data fetching in components/pages
supabase.rpc('calculate_something', ...)

// ❌ Treating business tables as "infra"
supabase.from('profiles').select(...)  // profiles = business table, use API layer
```

## Naming Conventions

| Context | Prefix | Example |
|---------|--------|---------|
| Canonical API functions | None | `fetchEduCourses()` |
| Seed/dev-only helpers | `seed` or `dev` | `seedFetchEduCourses()` |
| Query keys | Namespaced by domain | `['edutree', 'edu-courses']` |

> Canonical exports live in `src/shared/lib/api/*` and must **never** be
> prefixed. Dev/seed helpers in `devTools.ts` must always be prefixed
> to avoid export collisions.

## Refactor Safety Checklist

When moving a query to the API layer:

1. **Preserve query semantics**: `single()` vs `maybeSingle()`, `order()`, `limit()`, join type (`!inner` vs default)
2. **Preserve error handling**: unique constraint (23505), idempotency, retry semantics
3. **Key completeness**: every input to the `queryFn` must appear in the `queryKey`
4. **Run smoke checks** before merging (see below)

### Smoke Checks (6 paths)

1. `/edu-tree-v5` loads with real data
2. TranscriptQuickEntry: provider → course list → add completed course
3. TeachAnalytics: metrics + leaderboard + "Check Achievements"
4. PolicyPackPipeline: institutions list + add/delete URL template
5. PolicyFieldReview: select institution → extractions → approve one
6. SeedV5Database: Lite seed → load `/edu-tree-v5?db=1`

## Enforcement

- **ESLint**: `no-restricted-imports` warns on `supabase` imports in `src/components/` and `src/pages/`
- **ESLint**: `no-restricted-syntax` warns on `supabase.from()` / `supabase.rpc()` in `src/pages/`
- **Future (PR 11)**: Flip warnings → errors once migration is complete

## Migration Status

| Layer | `.from()` calls | `.rpc()` calls | Status |
|-------|----------------|----------------|--------|
| `src/components/` | 0 | 0 | ✅ Clean |
| `src/pages/` | 0 | 1 (DevLogin, infra) | ✅ Clean |
| `src/hooks/` | ~3 `.from()` | ~4 `.rpc()` | 🔄 Batch E target |
| `src/shared/lib/api/` | All | All | ✅ Canonical home |

### Batch D modules added

| Module | Covers |
|--------|--------|
| `telemetry.ts` | `logAiModelUsage`, `fetchCiCourseSummaries` |
| `marketIntelligence.ts` | `fetchMarketTrendsRaw`, `fetchTopGrowingCareers`, `fetchSalaryInsightsRaw`, `fetchCareerPathTitle`, `fetchLocationDetails` |
| `mentorAnalytics.ts` | `fetchMentorMetrics`, `fetchMentorAchievements`, `fetchMentorLeaderboard`, `fetchMentorFeedback`, `checkMentorAchievements`, `submitMentorFeedback` |
