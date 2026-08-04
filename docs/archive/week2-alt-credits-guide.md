# Week 2: Alternative Credits Seed Data

## Overview
This document explains the 50 alternative credits seeded for TESU BSBA coverage.

## Data Breakdown

### By Provider

| Provider | Count | Type | Avg Cost | Avg Duration |
|----------|-------|------|----------|--------------|
| **CLEP** | 15 | Exam | $93 | 2-8 weeks |
| **DSST** | 10 | Exam | $100 | 3-6 weeks |
| **Sophia** | 15 | Course | $99/mo | 2-4 weeks |
| **Study.com** | 10 | Course | $199/mo | 3-5 weeks |

### By Subject Area Coverage

#### General Education (39 credits required)

**Written Communication (6 credits)**
- CLEP: College Composition (6cr)
- CLEP: College Composition Modular (3cr)
- Sophia: English Composition I (3cr)
- Sophia: English Composition II (3cr)

**Oral Communication (3 credits)**
- Sophia: Public Speaking (3cr)

**Quantitative (3 credits)**
- CLEP: College Algebra (3cr)
- CLEP: College Mathematics (6cr)
- DSST: Business Mathematics (3cr)
- Sophia: College Algebra (3cr)
- Sophia: Introduction to Statistics (3cr)

**Humanities (9 credits)**
- CLEP: Humanities (6cr)
- CLEP: American Literature (6cr)
- CLEP: English Literature (6cr)
- DSST: Art of the Western World (3cr)
- Sophia: Introduction to Ethics (3cr)

**Social Sciences (9 credits)**
- CLEP: Introductory Psychology (3cr)
- CLEP: Introductory Sociology (3cr)
- CLEP: History of the United States I (3cr)
- CLEP: History of the United States II (3cr)
- DSST: Introduction to Law Enforcement (3cr)
- DSST: Ethics in America (3cr)
- Sophia: Introduction to Psychology (3cr)
- Sophia: Introduction to Sociology (3cr)
- Sophia: Macroeconomics (3cr)
- Sophia: Microeconomics (3cr)
- Sophia: American Government (3cr)

**Natural Sciences (6 credits)**
- CLEP: Natural Sciences (6cr)
- CLEP: Biology (6cr)
- DSST: Environmental Science (3cr)
- Sophia: Environmental Science (3cr)

**Civic & Global (3 credits)**
- DSST: Ethics in America (3cr)
- Sophia: Introduction to Ethics (3cr)
- Sophia: American Government (3cr)

#### Business Core & Major Requirements

**Lower-Level Business (100-200 level)**
- CLEP: Principles of Management (3cr)
- CLEP: Principles of Marketing (3cr)
- DSST: Introduction to Business (3cr)
- DSST: Organizational Behavior (3cr)
- Sophia: Introduction to Business (3cr)
- Sophia: Business Communication (3cr)
- Sophia: Project Management (3cr)
- Study.com: Business Law I (3cr)
- Study.com: Principles of Management (3cr)
- Study.com: Principles of Marketing (3cr)
- Study.com: Business Statistics (3cr)

**Upper-Level Business (300+ level)**
- DSST: Human Resource Management (3cr)
- DSST: Principles of Finance (3cr)
- Study.com: Financial Accounting (3cr)
- Study.com: Managerial Accounting (3cr)
- Study.com: Operations Management (3cr)
- Study.com: Business Strategy (3cr)
- Study.com: International Business (3cr)
- Study.com: Business Ethics (3cr)

#### Technology/Computing
- DSST: Computing and Information Technology (3cr)

## Cost Analysis

### Most Affordable Path (Using CLEP/DSST + Sophia)
- **CLEP Strategy**: ~15 exams × $93 = $1,395 (45 credits)
- **Sophia Strategy**: 2 months × $99 = $198 (15-18 credits)
- **Total**: ~$1,600 for 60+ credits

### Premium Path (Using Study.com for Upper-Level)
- **Sophia**: 2 months for gen-ed = $198 (18 credits)
- **Study.com**: 4 months for upper-level business = $796 (12+ credits)
- **CLEP**: 5 exams for remaining = $465 (15 credits)
- **Total**: ~$1,460 for 45 credits

### Time Optimization

**Fastest Path (2-4 months)**
1. Month 1-2: Sophia blitz (6-8 courses) = 18-24 credits
2. Month 2-3: CLEP exams (5-8 exams) = 15-24 credits
3. Month 3-4: Study.com upper-level (3-4 courses) = 9-12 credits
4. **Total**: 42-60 credits in 4 months

## Provider Characteristics

### CLEP ($93/exam)
- ✅ Most cost-effective per credit
- ✅ Widely accepted, long track record
- ⚠️ Requires study/prep time
- ⚠️ One shot per exam (must pass first try)
- 📊 Passing score typically 50/80

### DSST ($100/exam)
- ✅ Similar to CLEP, well-recognized
- ✅ Good for niche subjects
- ⚠️ Smaller selection than CLEP
- ⚠️ One attempt policy
- 📊 Passing score typically 400/500

### Sophia ($99/month unlimited)
- ✅ Self-paced, take as many as you can
- ✅ Subscription = unlimited courses
- ✅ "Touchstone" assignments, not exams
- ✅ Generous pass rate
- ⏱️ Most courses completable in 2-4 weeks

### Study.com ($199/month)
- ✅ More rigorous than Sophia
- ✅ Better for upper-level courses
- ⚠️ Higher cost per credit
- ⚠️ Proctored finals required
- ⏱️ Courses take 3-5 weeks typically

## TESU-Specific Notes

### What TESU Loves
- ACE/NCCRS recommended courses (all of these qualify)
- CLEP/DSST (counted toward "alternative credit" but widely accepted)
- Sophia and Study.com (both have official transfer guides)

### TESU Caps (from Week 1)
- Max 40 CLEP credits
- Max 30 DSST credits
- Max 80 total alternative (ACE/NCCRS) credits
- Max 30 per provider (Study.com, StraighterLine, etc.)
- Sophia effectively unlimited (covered by 80 ACE cap)

### Strategy for TESU BSBA
1. Use Sophia for gen-ed (fast, cheap, no caps)
2. Use CLEP for additional gen-ed (up to 40 cr)
3. Use Study.com for upper-level business (up to 30 cr)
4. Fill gaps with TESU courses (residency requirement)

## Next Steps

After seeding these 50 alt credits:
1. Create equivalency mappings to TESU courses
2. Build the complete TESU BSBA template
3. Test the optimizer with this data

## Run the Seed

```sql
-- Copy contents of scripts/seed-alt-credits-tesu-bsba.sql
-- Paste into Supabase SQL Editor
-- Execute
```

## Verification

Check that all 50 credits were inserted:

```sql
SELECT COUNT(*) FROM public.alt_credits;
-- Should return: 50
```

View by provider:

```sql
SELECT source_code, COUNT(*) 
FROM public.alt_credits 
GROUP BY source_code;
-- CLEP: 15
-- DSST: 10
-- SOPHIA: 15
-- STUDY_COM: 10
```
