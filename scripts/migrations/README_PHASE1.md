# Phase 1 Migration: Institution & Equivalency System

## Overview

This migration establishes the foundation for the **Transfer Credit Optimizer** and **Degree Templates Marketplace** by creating:

- Institution/anchor school management
- Credit transfer policies and limits
- GenEd frameworks per institution
- Alternative credit catalog (CLEP, DSST, Sophia, Study.com)
- Cross-institution equivalency mappings
- Degree template storage

## What's Included

### Core Tables (7 total)

1. **`institutions`** - Universities/colleges (TESU, COSC, WGU, etc.)
2. **`institution_credit_limits`** - Transfer caps, residency requirements, ACE/NCCRS limits
3. **`gened_frameworks`** - GenEd structures per institution (Framework 30, etc.)
4. **`gened_categories`** - Individual GenEd requirements (Written Comm, Math, etc.)
5. **`alt_credits`** - Alternative credit sources (exams, ACE courses)
6. **`cross_institution_equivalencies`** - Maps alt credits to institutional courses
7. **`degree_templates`** - Pre-built degree pathways (Standard/Fastest/Cheapest/Alt-Max)

### Seed Data (TESU Vertical Slice)

- **TESU institution** with full credit policies
- **8 GenEd categories** (Framework 30)
- **~20 alternative credits**:
  - 7 CLEP exams (Composition, Algebra, Literature, Management, etc.)
  - 3 DSST exams (Public Speaking, Ethics, Business Law)
  - 9 Sophia courses (English, Math, Ethics, Economics, Sciences)
  - 4 Study.com courses (Accounting, Management, Info Systems)
- **~30 equivalency mappings** (CLEP/DSST/Sophia/Study.com → TESU courses)

## How to Apply

### Option 1: Via Supabase Dashboard

1. Go to your Supabase project → **SQL Editor**
2. Copy and paste the contents of `phase1_institution_schema.sql`
3. Click **Run** to execute the migration
4. Verify tables were created in **Table Editor**

### Option 2: Via Supabase CLI

```bash
# From project root
supabase db reset  # If you want a clean slate
# OR apply just this migration
psql $DATABASE_URL -f scripts/migrations/phase1_institution_schema.sql
```

### Option 3: Via MigrationTrigger Component

If you have the `MigrationTrigger` component set up:

1. Navigate to your app
2. Click the **Apply Database Migrations** button
3. The migration will run automatically

## Verification Queries

After running the migration, verify the data:

```sql
-- Check institutions
SELECT code, name, accreditation FROM institutions;

-- Check TESU credit limits
SELECT limit_type, credit_value, notes 
FROM institution_credit_limits 
WHERE institution_id = (SELECT id FROM institutions WHERE code = 'TESU');

-- Check TESU GenEd categories
SELECT gc.category_code, gc.category_name, gc.credits_required
FROM gened_categories gc
JOIN gened_frameworks gf ON gc.framework_id = gf.id
WHERE gf.framework_code = 'FW30';

-- Check alternative credits
SELECT source_code, identifier, display_name, credit_recommendation, cost_usd
FROM alt_credits
ORDER BY source_code, identifier;

-- Check CLEP → TESU equivalencies
SELECT 
  ac.display_name AS clep_exam,
  cie.institutional_course_code,
  cie.institutional_course_name,
  cie.credits_awarded,
  gc.category_name AS gened_category
FROM cross_institution_equivalencies cie
JOIN alt_credits ac ON ac.id = cie.alt_credit_id
JOIN institutions i ON i.id = cie.institution_id
LEFT JOIN gened_categories gc ON gc.id = cie.gened_category_id
WHERE ac.source_code = 'CLEP' AND i.code = 'TESU'
ORDER BY ac.display_name;
```

## Expected Results

After successful migration, you should see:

- ✅ 1 institution (TESU)
- ✅ 6 credit limits for TESU
- ✅ 1 GenEd framework (Framework 30)
- ✅ 8 GenEd categories
- ✅ 23 alternative credits (CLEP/DSST/Sophia/Study.com)
- ✅ ~30 cross-institution equivalencies

## What's Next

### Phase 2: Integration (Hook Creation)

Create React Query hooks to consume this data:

```typescript
// src/hooks/useInstitutions.ts
export function useInstitution(code: string);
export function useInstitutionLimits(institutionId: string);

// src/hooks/useGenEd.ts
export function useGenEdFramework(institutionId: string);
export function useGenEdCategories(frameworkId: string);

// src/hooks/useAltCredits.ts
export function useAltCredits(filters?: { sourceCode?: string; sourceType?: string });
export function useAltCreditEquivalencies(altCreditId: string, institutionId: string);

// src/hooks/useDegreeTemplates.ts
export function useDegreeTemplates(institutionId: string, programCode?: string);
```

### Phase 3: Auto-Complete Integration

Update `autoCompletePlan.ts` to:

1. Read TESU GenEd categories
2. Find alternative credit equivalencies
3. Prioritize cheaper/faster options (Sophia over CLEP, etc.)
4. Respect `institution_credit_limits` (max 90 ACE, min 6 residency, etc.)

### Phase 4: Marketplace UI

Build the Degree Templates Marketplace page:

- Filter by institution, program, track type
- Display templates with cost/time estimates
- "Load Template" → auto-populates Edu-Tree plan
- Show equivalency options per course

### Phase 5: Scale to More Institutions

Repeat this pattern for COSC, Excelsior, WGU, SNHU, UMGC, Purdue Global.

## Rollback

If you need to undo this migration:

```sql
DROP TABLE IF EXISTS cross_institution_equivalencies CASCADE;
DROP TABLE IF EXISTS alt_credits CASCADE;
DROP TABLE IF EXISTS degree_templates CASCADE;
DROP TABLE IF EXISTS gened_categories CASCADE;
DROP TABLE IF EXISTS gened_frameworks CASCADE;
DROP TABLE IF EXISTS institution_credit_limits CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
```

## Notes

- All tables have RLS enabled with public read access
- Write access will need to be granted separately (admin-only)
- GenEd categories include `priority_order` for optimizer logic
- Equivalencies include `confidence` scores (0.0-1.0) for fuzzy matching
- All timestamps are UTC (`TIMESTAMPTZ`)
- `ON CONFLICT DO NOTHING` prevents duplicate data on re-runs

## Questions?

- **Issue**: Tables already exist → Safe to re-run (uses `CREATE TABLE IF NOT EXISTS` + `ON CONFLICT` clauses)
- **Issue**: No data showing → Check RLS policies and verify user auth
- **Issue**: Missing equivalencies → Verify `alt_credits` and `institutions` were seeded first

---

**Ready for Phase 2?** Ask for hook creation next!
