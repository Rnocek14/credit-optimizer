# Optimizer Setup Instructions

## Overview
This guide walks you through setting up the optimizer database tables and seeding initial data. If you're getting SQL errors about policies or tables already existing, start with Step 0.

## What Was Fixed

### ✅ Edge Function Improvements
- Added detailed error logging with codes, hints, and details
- Better error messages for troubleshooting
- Proper validation at each seeding step

### 🔧 What You Need To Do

## Step 0: Cleanup (If Needed)

**⚠️ Only do this if you're getting errors like:**
- `ERROR: policy "..." already exists`
- `ERROR: relation "..." already exists`
- You've run setup scripts before and want a fresh start

### When to Run Cleanup
- You previously ran `phase1_institution_schema.sql` or other optimizer SQL scripts
- You're seeing policy conflict errors in the SQL Editor
- You want to completely reset the optimizer tables

### How to Run Cleanup

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Cleanup Script**
   - Open the file: `scripts/optimizer-cleanup.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor
   - Click "Run" or press `Ctrl/Cmd + Enter`

3. **Verify Cleanup**
   - You should see: `"Cleanup complete! All optimizer tables and policies removed."`
   - All optimizer tables and policies are now removed
   - You're ready for a fresh setup

**Alternative:** You can also copy the cleanup script from the app at `/optimizer-setup` (Step 0 button)

---

## Step 1: Create Database Tables

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Setup Script**
   - Open the file: `scripts/optimizer-complete-setup.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor
   - Click "Run" or press `Ctrl/Cmd + Enter`

3. **Verify Success**
   - The script will show a verification query at the end
   - You should see all 6 tables listed with 0 rows initially:
     ```
     alt_credits: 0 rows
     cross_institution_equivalencies: 0 rows
     degree_templates: 0 rows
     gened_frameworks: 0 rows
     gened_categories: 0 rows
     institution_credit_limits: 0 rows
     ```
   - You should see TESU institution with code 'TESU'

## Step 2: Seed the Data

1. **Return to your app** at `/optimizer-setup`
2. **Click "Seed Optimizer Data"** button
3. **Wait for success message**
   - Should complete in 2-5 seconds
   - Success message: "Optimizer data seeded successfully! 50 courses, 50 equivalencies, 1 template."

## Step 3: Verify the Data

Run this query in SQL Editor to verify:

```sql
SELECT 
  'alt_credits' as table_name, 
  COUNT(*) as row_count 
FROM alt_credits
UNION ALL
SELECT 'cross_institution_equivalencies', COUNT(*) FROM cross_institution_equivalencies
UNION ALL
SELECT 'degree_templates', COUNT(*) FROM degree_templates;
```

**Expected Results:**
- `alt_credits`: 50 rows
- `cross_institution_equivalencies`: 50 rows
- `degree_templates`: 1 row

## Tables Created

### 1. **institutions** (updated)
- Added `code` column (VARCHAR, UNIQUE)
- Ensures TESU institution exists with code 'TESU'

### 2. **alt_credits**
- Stores alternative credit sources (CLEP, DSST, Sophia, Study.com)
- 50 courses will be seeded

### 3. **cross_institution_equivalencies**
- Maps alternative credits to institutional courses
- 50 mappings to TESU courses will be seeded

### 4. **degree_templates**
- Stores complete degree plan structures as JSONB
- 1 TESU BSBA template will be seeded

### 5. **gened_frameworks**
- Defines general education requirement frameworks per institution

### 6. **gened_categories**
- Specific categories within gen-ed frameworks (Written Communication, etc.)

### 7. **institution_credit_limits**
- Stores policy caps and minimums (alt credit max, residency min, etc.)

## Troubleshooting

### If seeding still fails:

1. **Check Supabase Logs**
   - Go to Supabase Dashboard → Logs → Edge Functions
   - Look for `[Optimizer Seeder]` entries
   - The new error handling will show exactly which table/operation failed

2. **Verify Tables Exist**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'alt_credits',
     'cross_institution_equivalencies',
     'degree_templates',
     'gened_frameworks',
     'gened_categories',
     'institution_credit_limits'
   );
   ```

3. **Check TESU Institution**
   ```sql
   SELECT id, name, code FROM institutions WHERE code = 'TESU';
   ```

### Common Issues

**"policy already exists" or "relation already exists"**
- You have old optimizer tables/policies from previous runs
- **Solution:** Run `scripts/optimizer-cleanup.sql` (Step 0) then run setup again

**"TESU institution not found"**
- Run the SQL script again - it will insert TESU if missing

**"relation does not exist"**
- One or more tables weren't created
- Run the complete SQL script again (safe to re-run, now includes DROP statements)

**"column code does not exist"**
- The institutions table update didn't run
- Run the SQL script again

**"Failed to fetch" errors in the app**
- This was caused by edge function deployment delays
- Now fixed with direct client-side seeding (no edge functions needed)

## What Gets Seeded

### Alternative Credits (50 courses)
- **15 CLEP exams** ($95 each, 4-6 weeks)
- **10 DSST exams** ($100 each, 4-5 weeks)
- **15 Sophia courses** ($99/month, 2-3 weeks each)
- **10 Study.com courses** ($199/month, 8 weeks each)

### Equivalencies (50 mappings)
Maps each alternative credit to a TESU course:
- General education requirements (Written Comm, Math, Humanities, etc.)
- Business major courses (Accounting, Economics, Management, etc.)
- Upper-division business electives

### Degree Template (1 template)
TESU BSBA "Cheapest" track:
- 120 total credits
- ~$8,500 estimated cost
- ~18 months estimated duration
- Maximizes alternative credits to minimize cost

## Next Steps

After successful seeding:
1. Check out the optimizer feature pages
2. View the seeded alternative credits
3. Explore degree template optimization
4. Build the credit optimizer UI

## Support

If you continue to have issues:
1. Check the console logs in the preview
2. View Supabase Edge Function logs
3. The enhanced error messages will pinpoint the exact issue
