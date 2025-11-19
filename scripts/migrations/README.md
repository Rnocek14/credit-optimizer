# Database Migrations

## Running Migrations

### 1. Add Slug Column to Career Paths
Run this first if your `career_paths` table is missing the `slug` column:

**File:** `add_slug_to_career_paths.sql`

1. Open Supabase SQL Editor
2. Copy and paste the contents of `add_slug_to_career_paths.sql`
3. Run the query

### 2. Running the Career Path Programs Migration

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `create_career_path_programs.sql`
4. Paste and run

### Option 2: Supabase CLI
```bash
supabase db push
```

### Option 3: Via MigrationTrigger Component
If you want to integrate this into the app's migration system:
1. Add the SQL to `supabase/functions/run-migrations/index.ts`
2. Use the `<MigrationTrigger />` component in the app

## Verification

After running the migration, verify with:

```sql
-- Check table was created
SELECT * FROM career_path_programs LIMIT 10;

-- Count mappings
SELECT COUNT(*) FROM career_path_programs;

-- View by career
SELECT 
  cp.title as career,
  cpp.program_id,
  cpp.anchor_school,
  cpp.strength,
  cpp.notes
FROM career_path_programs cpp
JOIN career_paths cp ON cp.id = cpp.career_path_id
ORDER BY cp.title, cpp.strength DESC;
```

## Next Steps

After migration:
- TypeScript types are in `src/types/career.ts`
- Query hook is in `src/hooks/useCareerPathPrograms.ts`
- Ready to implement Phase 2: `generateDegreeTemplate()`
