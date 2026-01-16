# Admin Module - Import Restrictions

This directory contains admin-only modules that should NOT be imported outside of admin pages/components.

## Allowed Import Paths

✅ `src/pages/admin/**`
✅ `src/components/admin/**`
✅ `src/features/admin/**`

## Forbidden Import Paths

❌ `src/lib/invariant/**` - Use edge functions for effective config
❌ `src/hooks/**` (non-admin)
❌ `src/pages/**` (non-admin routes)
❌ `supabase/functions/**` - Edge has its own canonical implementation

## Why?

The admin module (`institutionOverridesAdmin.ts`) is a **dumb editor/viewer**:
- It displays stored values losslessly (no clamping, no defaults applied)
- It provides CRUD operations (save, disable, fetch audit log)
- It does NOT compute effective config

**Edge functions are the sole source of truth** for computing effective invariant config.

If non-admin code needs effective config, call the edge endpoint:
```
GET /get-effective-invariant-config?institution_code=WGU&template_status=active
```

## Enforcement

1. This module is NOT re-exported from any global barrel
2. Only import via relative path from admin pages
3. Future: Add ESLint `import/no-restricted-paths` rule
