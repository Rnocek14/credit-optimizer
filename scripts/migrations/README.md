# Database Migrations

## ⚡ Quick Start (Run This First!)

### Final Career Foundation Migration
This is the **one migration you need** to get `/explore/careers` working.

**File:** `final_career_foundation.sql`

**What it does:**
- Creates `career_paths` table (with slug column)
- Creates `career_path_programs` table (with proper indexes & RLS)
- Seeds 3 demo careers (Software Engineer, Data Analyst, Cybersecurity Analyst)
- Seeds 11 program mappings (TESU, WGU, UMGC, EXCU)
- **Safe to run multiple times** (idempotent)

**How to run:**
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire contents of `final_career_foundation.sql`
4. Paste and click **Run**
5. You should see: "✅ Migration complete: career_paths: 3 rows, career_path_programs: 11 mappings"

---

## Legacy Migrations (For Reference Only)

These files were used during development. You don't need them if you run `final_career_foundation.sql`:

- `add_slug_to_career_paths.sql` - Now included in final migration
- `create_career_path_programs.sql` - Now included in final migration  
- `seed_career_data.sql` - Now included in final migration

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
