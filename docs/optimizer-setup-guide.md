# Optimizer Database Setup - Week 1

## Overview
This guide walks you through creating the 5 core database tables for the degree optimizer and seeding TESU BSBA policy data.

## Tables Created
1. **institution_credit_limits** - Policy caps & minimums (residency, transfer, alt credit)
2. **alt_credits** - Catalog of alternative credits (CLEP, DSST, Sophia, Study.com)
3. **cross_institution_equivalencies** - Maps alt credits to institutional courses
4. **gened_categories** - General education requirements per institution
5. **degree_templates** - Complete degree plan templates with term-by-term structure

## Setup Instructions

### Option 1: Run SQL Directly (Recommended)
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `scripts/optimizer-tables-setup.sql`
4. Paste and run the SQL
5. Verify tables were created using the verification queries at the bottom

### Option 2: Use the Migration Component
1. Run the app
2. Navigate to the optimizer setup page
3. Click the "Create Optimizer Tables" button
4. The component will guide you through the process

## What Gets Seeded

### TESU Institution
- Code: `TESU`
- Name: Thomas Edison State University
- Type: University
- Reputation: 85/100

### TESU Credit Limits (11 policies)
- Total credits: 120
- Residency minimum: 15 credits
- Upper division minimum: 30 credits (300/400 level)
- Max transfer: 113 credits
- Max alt credit (ACE/NCCRS): 80 credits
- Min RA credit: 40 credits
- CLEP maximum: 40 credits
- DSST maximum: 30 credits
- Study.com maximum: 30 credits
- Sophia maximum: 90 credits
- StraighterLine maximum: 30 credits

### TESU Gen-Ed Categories (7 areas)
1. **Written Communication** - 6 credits (English Composition I & II)
2. **Oral Communication** - 3 credits (Public Speaking)
3. **Quantitative Literacy** - 3 credits (College Algebra+)
4. **Humanities** - 9 credits (Literature, Philosophy, Arts)
5. **Social Sciences** - 9 credits (Psychology, Sociology, Economics, History)
6. **Natural Sciences** - 6 credits (Biology, Chemistry, Physics)
7. **Civic & Global Engagement** - 3 credits (Diversity, Ethics, Global Awareness)

**Total Gen-Ed:** 39 credits

## Verification

After running the setup, verify everything is correct:

```sql
-- Check table row counts
SELECT 
  'institution_credit_limits' as table_name, 
  COUNT(*) as row_count 
FROM public.institution_credit_limits
UNION ALL
SELECT 'gened_categories', COUNT(*) FROM public.gened_categories;

-- Should show:
-- institution_credit_limits: 11 rows
-- gened_categories: 7 rows
```

## Next Steps (Week 2)

Once tables are created and TESU data is seeded:
1. Seed ~50 alt credits (CLEP, DSST, Sophia, Study.com courses)
2. Create ~50 equivalency mappings (alt credit → TESU courses)
3. Build one complete TESU BSBA "cheapest" degree template

## Schema Reference

### institution_credit_limits
```typescript
{
  id: UUID,
  institution_id: UUID,
  limit_type: 'total_credits' | 'total_transfer' | 'alt_credit_max' | 
              'min_residency' | 'upper_division_min' | 'clep_max' | 
              'dsst_max' | 'per_provider_max',
  credit_value: INTEGER,
  provider_code: TEXT | null,  // For per_provider_max
  notes: TEXT
}
```

### gened_categories
```typescript
{
  id: UUID,
  institution_id: UUID,
  category_code: TEXT,         // 'WRITTEN_COMM', 'QUANTITATIVE', etc.
  category_name: TEXT,
  credits_required: INTEGER,
  min_grade: TEXT | null,
  description: TEXT,
  display_order: INTEGER
}
```

### alt_credits
```typescript
{
  id: UUID,
  source_code: 'CLEP' | 'DSST' | 'SOPHIA' | 'STUDY_COM' | etc,
  identifier: TEXT,            // Course code
  title: TEXT,
  credits_typical: INTEGER,
  level: 100 | 200 | 300 | 400,
  subject_area: TEXT,
  cost_usd: NUMERIC,
  duration_estimate_weeks: INTEGER,
  exam_based: BOOLEAN
}
```

### cross_institution_equivalencies
```typescript
{
  id: UUID,
  alt_credit_id: UUID,
  institution_id: UUID,
  institutional_course_code: TEXT,
  credits_awarded: INTEGER,
  gened_category_code: TEXT,   // Links to gened_categories
  confidence: NUMERIC(3,2),    // 0.0-1.0
  source_documentation: TEXT,   // URL to transfer guide
  last_verified_date: DATE
}
```

### degree_templates
```typescript
{
  id: TEXT,                    // 'tesu-bsba-cheapest-2025'
  institution_id: UUID,
  institution_code: TEXT,
  program_code: TEXT,          // 'BSBA', 'BSCS'
  track_type: 'cheapest' | 'fastest' | 'alt_max' | 'standard',
  total_credits: INTEGER,
  template_data: JSONB,        // Full term-by-term structure
  catalog_year: TEXT
}
```

## Support

If you encounter any issues:
1. Check that the `institutions` table exists and has TESU already
2. Verify RLS policies are enabled
3. Check browser console for detailed error messages
4. Ensure you're running the SQL with sufficient privileges (service role)
