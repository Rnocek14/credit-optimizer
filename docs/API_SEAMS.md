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

### 3. Infrastructure RPCs

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.rpc('get_user_role', ...)` | DevLogin.tsx | Role lookup for dev auth |

### 4. Realtime Subscriptions (`supabase.channel()`)

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
```

## Enforcement

- **ESLint**: `no-restricted-imports` warns on `supabase` imports in `src/components/` and `src/pages/`
- **ESLint**: `no-restricted-syntax` warns on `supabase.from()` / `supabase.rpc()` in `src/pages/`
- **Future (PR 11)**: Flip warnings → errors once migration is complete

### 5. Infrastructure RPCs (Hooks Layer)

| Usage | Where | Notes |
|-------|-------|-------|
| `supabase.rpc('get_user_role', ...)` | `useUserRole.ts` | Role lookup for auth |
| `supabase.rpc('get_user_role', ...)` | `useSecureAuth.ts` | Secure role validation |

> These are auth-adjacent infrastructure calls. They will be wrapped
> in `src/shared/lib/api/auth.ts` in a future PR, but are **not** data-access
> violations — they query auth metadata, not business tables.

## Migration Status

| Layer | `.from()` calls | `.rpc()` calls | Status |
|-------|----------------|----------------|--------|
| `src/components/` | 0 | 0 | ✅ Clean |
| `src/pages/` | 0 | 1 (DevLogin, infra) | ✅ Clean |
| `src/hooks/` | ~10 `.from()` | ~12 `.rpc()` | 🔄 PR 10 target |
| `src/shared/lib/api/` | All | All | ✅ Canonical home |
