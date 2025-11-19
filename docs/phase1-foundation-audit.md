# Phase 1: Foundation Audit Report
**Date:** 2025-11-19  
**Goal:** Understand data structures and identify gaps for real Career → Degree template generation

---

## Executive Summary

✅ **Good News:** The Edu-Tree V5 engine exists and is mostly functional  
⚠️ **Gap:** Data hooks return the wrong shape for career exploration  
🔧 **Fix Required:** Need a career-specific data adapter layer

---

## 1. What `useV5DatabaseData` Currently Returns

### Current Output Structure
```typescript
{
  modulesByYear: {
    1: ModuleData[],
    2: ModuleData[],
    3: ModuleData[],
    4: ModuleData[]
  }
}
```

### What Each `ModuleData` Contains
- `id`, `code`, `title`, `category`, `icon`
- `year`, `credits`
- `marketplaceOptions: MarketplaceOption[]` (enriched with provider data, CRI scores, costs)
- `optionsCount`
- `selected: NodeSelectedSummary` (progress tracking based on basket)

### Data Sources
1. **`program_requirements`** table: year, category, name, description, credits_required
2. **`requirement_options`** table: maps requirements → course IDs
3. **`edu_courses`** + **`marketplace_courses`**: actual course data
4. **`providers`** table: provider metadata (name, type, website, code)
5. **`basket`** from Zustand: user selections for progress calculation

### ✅ This Works Well For:
- Edu-Tree V5 planner UI (module cards, progress tracking)
- Year-by-year view with basket integration

### ❌ This DOES NOT Match `generateDegreeTemplate` Needs

---

## 2. What `generateDegreeTemplate` Expects

### Required Input Structure
```typescript
interface GenerateDegreeTemplateOptions {
  modules: ModuleData[];          // ✅ Have this (from modulesByYear)
  blocks: RequirementBlock[];     // ❌ Missing
  allOptions: MarketplaceOption[]; // ❌ Missing (have them nested in modules)
  basket: BasketItem[];           // ✅ Have this
  constraints: Constraints;       // ✅ Have this
  anchorPolicy?: PartnerPolicy;   // ⚠️ Partially exists
  years?: number;                 // ✅ Can provide
}
```

### Critical Missing Pieces

#### 1. **`blocks: RequirementBlock[]`**
**What it is:** Structural metadata about degree requirements (from `requirement_blocks` table)

**Interface:**
```typescript
interface RequirementBlock {
  id: string;
  slug?: string;
  title: string;
  rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
  k?: number | null;
  credits_needed?: number | null;
  level_year: number;
  area: string;
  parent_block_id?: string | null;
}
```

**Why it's needed:**
- `yearTemplateGenerator` calls `generateYearTemplates` which validates block completion logic
- Determines if a plan satisfies "complete all", "pick K of N", or "earn X credits" rules
- Used for prerequisite gating and validation

**Current status:**
- ❌ Not fetched by `useV5DatabaseData`
- ✅ `requirement_blocks` table exists in DB (seen in Supabase types)
- ✅ Used by legacy Edu-Tree flows

**Fix needed:** Add `.from('requirement_blocks').select('*')` query to data hook

---

#### 2. **`allOptions: MarketplaceOption[]`**
**What it is:** Flat array of ALL courses available (currently nested inside modules)

**Why it's needed:**
- Option scoring and filtering (`scoreOptions` in `optionFilters.ts`)
- Template generator needs to search across all options when auto-filling
- Transfer rule checking needs global option pool

**Current status:**
- ✅ Have the data (enriched in `transformToModuleData`)
- ❌ Wrong shape: nested in `module.marketplaceOptions[]`, not flat array
- ⚠️ Contains some enriched fields not in DB (workload_weekly_hours, providerType)

**Fix needed:** Flatten and dedupe `marketplaceOptions` before passing to engine

---

#### 3. **`anchorPolicy: PartnerPolicy`**
**What it is:** Transfer/residency rules for the anchor school

**Interface:**
```typescript
interface PartnerPolicy {
  partner_name: string;
  max_alt_credits: number;        // ACE/NCCRS transfer cap (e.g. 90 for TESU)
  min_residency_credits: number;  // Credits required at anchor (e.g. 30)
  upper_division_min: number;     // 300/400 level requirement
  notes?: string;
}
```

**Current Implementation:**
- ✅ `getAnchorPolicyFromConstraints` helper exists
- ⚠️ Expects `constraints.target_school` to be either:
  - An object with nested `policy` (currently unused)
  - A string (falls back to generic defaults: 60 max_alt, 30 residency)

**Known Anchor Policies (from research docs):**
- **TESU:** max_alt: 113, residency: 30 (very transfer-friendly)
- **WGU:** Subscription model, competency-based (non-standard)
- **UMGC:** max_alt: 90, residency: 30
- **EXCU:** max_alt: 90, residency: 30

**Current status:**
- ❌ No hardcoded policy constants file
- ❌ No `partner_policies` or `anchor_policy_packs` table in DB
- ✅ Logic for applying policies exists in `yearPlanner.ts`

**Fix needed:**
- Create `src/pages/EduTree/v5/data/anchorPolicies.ts` with hardcoded policies
- Later: move to DB table for admin editing

---

## 3. Existing Anchor Policy System Analysis

### Where Policies Are Used

#### In `yearPlanner.ts` (buildYearPlan):
```typescript
// 1. Transfer cap enforcement
if (preset.strategy === 'transfer-maximizer' && anchorPolicy) {
  effectiveAceLimit = Math.min(
    effectiveAceLimit, 
    anchorPolicy.max_alt_credits - 6  // Safety margin
  );
}

// 2. Residency requirement enforcement
if (preset.strategy === 'residency-closer' && anchorPolicy) {
  if (residencyEarned < anchorPolicy.min_residency_credits) {
    // Force university courses
    selectedOption = scored.filter(o => o.providerType === 'university')[0];
  }
}

// 3. Validation
plan.warnings = validateAnchorPolicies(plan, anchorPolicy, totals);
```

#### In `anchorPolicyAdapter.ts`:
```typescript
export function getAnchorPolicyFromConstraints(
  constraints: Constraints
): PartnerPolicy | undefined {
  const targetSchool = constraints.target_school;
  
  // Week 1.5: Extract from constraints if object
  if (typeof targetSchool === 'object' && school?.policy) {
    return {
      partner_name: school.name,
      max_alt_credits: Number(school.policy.max_alt_credits ?? 60),
      min_residency_credits: Number(school.policy.min_residency_credits ?? 30),
      upper_division_min: Number(school.policy.upper_division_min ?? 0),
    };
  }
  
  // Fallback: generic defaults
  if (typeof targetSchool === 'string') {
    return {
      partner_name: targetSchool,
      max_alt_credits: 60,  // ⚠️ Too conservative for TESU
      min_residency_credits: 30,
      upper_division_min: 0,
    };
  }
}
```

### Policy Impact on Templates

**Transfer-Max Strategy:**
- Prioritizes ACE/MOOC courses until 6 credits below cap
- Requires accurate `max_alt_credits` to work

**Residency-Closer Strategy:**
- Forces university courses when residency requirement not met
- Requires accurate `min_residency_credits` to work

**Balanced Strategy:**
- Uses policies for validation only
- Less sensitive to exact numbers

---

## 4. Testing `generateDegreeTemplate` with Minimal Data

### Minimum Viable Data Set

To generate a single degree template for **TESU BS CS**, we need:

1. **Modules** (✅ have): ~32 requirements from `program_requirements` where `program_id = 'bs_cs'`
2. **Blocks** (❌ missing): ~8 blocks (GE, Math, CS Core, Capstone, Electives, Free Electives)
3. **AllOptions** (⚠️ have but wrong shape): ~200-400 marketplace options
4. **Basket** (✅ have): Empty array OK for fresh plan
5. **Constraints** (✅ have): 
   ```typescript
   {
     target_school: 'TESU',
     max_ace_credits: 90
   }
   ```
6. **AnchorPolicy** (⚠️ can provide):
   ```typescript
   {
     partner_name: 'TESU',
     max_alt_credits: 113,
     min_residency_credits: 30,
     upper_division_min: 18
   }
   ```

### What Would Break Without Blocks

```typescript
// In yearTemplateGenerator.ts → generateYearTemplates
for (const module of modules) {
  const relevantBlocks = blocks.filter(
    b => b.level_year === year && b.area === module.category
  );
  
  // ❌ This fails if blocks = []
  const blockProgress = relevantBlocks.map(block => 
    computeBlockProgress(block, module, basket)
  );
}
```

**Result:** Templates generate but miss validation, block gating, and prerequisite logic

### What Would Break Without AllOptions

```typescript
// In optionFilters.ts → scoreOptions
const scored = scoreOptions(allOptions, weights, constraints);

// ❌ This fails if allOptions = [] or wrong shape
```

**Result:** No auto-fill, empty templates

---

## 5. Program Requirements Table Analysis

### Schema (from Supabase types)
```typescript
program_requirements: {
  Row: {
    category: string;
    created_at: string | null;
    credits_required: number;
    description: string | null;
    id: string;
    max_select: number | null;
    min_select: number | null;
    name: string;
    program_id: string;
    year: number;
  }
}
```

### Sample Query Result (Expected for `bs_cs`)
```javascript
[
  {
    id: "uuid1",
    program_id: "bs_cs",
    year: 1,
    category: "General Education",
    name: "English Composition I",
    credits_required: 3,
    description: null
  },
  {
    id: "uuid2", 
    program_id: "bs_cs",
    year: 1,
    category: "General Education",
    name: "College Mathematics",
    credits_required: 3,
    description: null
  },
  // ... ~30 more requirements
]
```

### Data Quality Checklist

✅ **Table exists**  
✅ **Has year assignments** (critical for year planner)  
✅ **Has category** (maps to requirement blocks)  
⚠️ **Has options via `requirement_options`** (need to verify coverage)  
❌ **No block_id foreign key** (blocks stored separately)

**Test needed:** Run query to check if `bs_cs` has complete data:
```sql
SELECT year, category, COUNT(*) as req_count, SUM(credits_required) as total_credits
FROM program_requirements
WHERE program_id = 'bs_cs'
GROUP BY year, category
ORDER BY year, category;
```

**Expected:** ~30 requirements, ~120 credits total

---

## 6. Data Gap Summary

| Component | Current Status | Fix Difficulty | Blocker? |
|-----------|---------------|----------------|----------|
| `modules` | ✅ Have | None | No |
| `blocks` | ❌ Not fetched | Easy (add query) | Yes |
| `allOptions` | ⚠️ Wrong shape | Easy (flatten) | Yes |
| `basket` | ✅ Have | None | No |
| `constraints` | ✅ Have | None | No |
| `anchorPolicy` | ⚠️ Exists but generic | Medium (add constants) | Partial |
| `program_requirements` | ✅ Exists in DB | Unknown (need test) | Maybe |

---

## 7. Recommended Next Steps

### Phase 1.5: Validation Tests (30 minutes)

1. **Test program data completeness:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT 
     year, 
     category, 
     COUNT(*) as reqs, 
     SUM(credits_required) as credits
   FROM program_requirements 
   WHERE program_id = 'bs_cs'
   GROUP BY year, category
   ORDER BY year, category;
   ```
   Expected: 4 years, 120+ credits

2. **Test requirement blocks exist:**
   ```sql
   SELECT * FROM requirement_blocks 
   WHERE area = 'Computer Science' OR area = 'General Education'
   LIMIT 10;
   ```
   Expected: Multiple blocks with rule_type, level_year

3. **Test marketplace options coverage:**
   ```sql
   SELECT COUNT(DISTINCT ro.requirement_id) as covered_reqs,
          COUNT(DISTINCT pr.id) as total_reqs
   FROM program_requirements pr
   LEFT JOIN requirement_options ro ON ro.requirement_id = pr.id
   WHERE pr.program_id = 'bs_cs';
   ```
   Expected: covered_reqs ≈ total_reqs (>90% coverage)

### Phase 2: Create Adapter Layer (2-3 hours)

#### File: `src/hooks/useCareerV5Data.ts`
**Purpose:** Career-specific data hook that returns `generateDegreeTemplate` compatible shape

```typescript
export function useCareerV5Data(
  careerPathId: string,
  programId: string,
  anchorSchool: string
) {
  // Fetch program requirements
  // Fetch requirement_blocks for this program's areas
  // Fetch all marketplace options (flattened)
  // Get anchor policy from constants
  // Return: { modules, blocks, allOptions, anchorPolicy, isReady }
}
```

#### File: `src/pages/EduTree/v5/data/anchorPolicies.ts`
**Purpose:** Hardcoded anchor policies (DB migration later)

```typescript
export const ANCHOR_POLICIES: Record<string, PartnerPolicy> = {
  'TESU': {
    partner_name: 'Thomas Edison State University',
    max_alt_credits: 113,
    min_residency_credits: 30,
    upper_division_min: 18,
    notes: 'Highly transfer-friendly, accepts ACE/NCCRS'
  },
  'WGU': {
    partner_name: 'Western Governors University',
    max_alt_credits: 78,
    min_residency_credits: 42,
    upper_division_min: 0,
    notes: 'Competency-based, subscription model'
  },
  'UMGC': {
    partner_name: 'University of Maryland Global Campus',
    max_alt_credits: 90,
    min_residency_credits: 30,
    upper_division_min: 15,
    notes: 'Military-friendly, standard semester system'
  }
};
```

#### File: `src/pages/EduTree/v5/engine/buildDegreeTemplateContext.ts`
**Purpose:** Adapter function (per GPT's plan)

```typescript
export function buildDegreeTemplateContextForMapping(
  eduTree: CareerV5Data, // Our new hook's output
  mapping: CareerPathProgram,
  opts?: { years?: number; optimization?: DegreeOptimizationMode }
): GenerateDegreeTemplateOptions & { years: number } {
  // Map eduTree data → engine format
  // Merge mapping (anchor_school, program_id) into constraints
  // Attach anchor policy from constants
}
```

### Phase 3: Integration Test (1 hour)

1. Create test page: `/explore/test-template-gen`
2. Hardcode: `careerPathId`, `programId='bs_cs'`, `anchorSchool='TESU'`
3. Call `useCareerV5Data` → `generateDegreeTemplate`
4. Log results and errors
5. Iterate until one complete 4-year template generates

---

## 8. Success Criteria

✅ Phase 1 Complete When:
- [ ] SQL validation queries run and show adequate data
- [ ] This audit document reviewed and agreed upon

✅ Phase 2 Complete When:
- [ ] `useCareerV5Data` hook returns correct shape
- [ ] `anchorPolicies.ts` has 3+ anchor schools
- [ ] `buildDegreeTemplateContext` adapter exists

✅ Phase 3 Complete When:
- [ ] `generateDegreeTemplate('bs_cs', 'TESU', 'balanced', {...})` succeeds
- [ ] Returns 4 YearTemplates with realistic costs/durations
- [ ] No hard crashes (warnings/fallbacks OK)

---

## 9. Risk Assessment

### High Risk
- ❌ **`requirement_blocks` table missing or incomplete** → Cannot validate plan structure
- ❌ **`program_requirements` for `bs_cs` incomplete** → Cannot build degree plan

### Medium Risk
- ⚠️ **Marketplace options coverage <80%** → Templates have gaps
- ⚠️ **Anchor policies inaccurate** → Wrong cost/time estimates

### Low Risk
- ℹ️ **Module data shape mismatch** → Easy to adapt
- ℹ️ **Performance with large option sets** → Can optimize later

---

## Appendix: Key File Locations

- **Data Hook:** `src/pages/EduTree/v5/hooks/useV5DatabaseData.ts`
- **Template Generator:** `src/pages/EduTree/v5/engine/degreeTemplateGenerator.ts`
- **Year Planner:** `src/pages/EduTree/v5/engine/yearPlanner.ts`
- **Anchor Policy Adapter:** `src/pages/EduTree/v5/utils/anchorPolicyAdapter.ts`
- **Transform Util:** `src/pages/EduTree/v5/utils/transformDbToV5.ts`
- **Constraints Type:** `src/pages/EduTree/v5/state/usePlanBasket.ts`
- **DB Types:** `src/integrations/supabase/types.ts`
