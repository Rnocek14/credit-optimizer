# Phase 2 Implementation: Career → Degree Comparison

## ✅ What's Been Implemented

### 1. Data Foundation (Phase 1)
- ✅ `career_path_programs` join table (migration SQL ready)
- ✅ TypeScript types (`CareerPathProgram`)
- ✅ Query hook (`useCareerPathPrograms`)
- ✅ Seed data for 3 careers × multiple programs

### 2. Degree Template Generator (Phase 2)
- ✅ `degreeTemplateGenerator.ts` - Core engine
- ✅ Wraps `generateYearTemplates()` for each year (1-4)
- ✅ Aggregates totals: cost, time, credits, CRI
- ✅ Supports optimization modes: cheapest, fastest, balanced

### 3. Career Detail UI (Phase 2)
- ✅ `CareerDetailPage` - Full page component
- ✅ Career info header with salary snapshot
- ✅ Degree comparison cards with ROI metrics
- ✅ `DegreeTemplateModal` - 4-year plan viewer
- ✅ `useCareerDegreeOptions` hook - Data fetching & ROI
- ✅ Route: `/explore/careers/:careerPathId`

## 🔄 Current State: Mock Data

The UI is fully functional but uses **mock degree templates** to demonstrate the concept:
- Mock cost estimates (TESU: $8,200, WGU: $9,500, etc.)
- Mock durations (WGU: 2.5 years, others: 3 years)
- Real ROI calculations based on career salary data

## 📋 Next Steps: Phase 2.5 (Full Data Integration)

To connect real degree template generation, wire the following into `useCareerDegreeOptions.ts`:

### Required Data Sources:
1. **Modules** - Use `useV5DatabaseData()` or fetch `program_requirements`
2. **Blocks** - Fetch `requirement_blocks` for the program
3. **Options** - Fetch `marketplace_courses` + `requirement_options`
4. **Basket** - Use `usePlanBasket()` current basket state
5. **Constraints** - User's current constraints (target school, max transfer, etc.)
6. **Anchor Policy** - Transfer rules for the anchor school

### Code Change Location:
`src/hooks/useCareerDegreeOptions.ts` - Lines ~96-135

Replace the mock template block with:
```typescript
const template = await generateDegreeTemplate(
  mapping.program_id,
  mapping.anchor_school,
  'balanced',
  {
    modules: realModulesData,
    blocks: realBlocksData,
    allOptions: realMarketplaceOptions,
    basket: currentBasket,
    constraints: userConstraints,
    anchorPolicy: anchorTransferRules,
  }
);
```

## 🧪 Testing the Current Implementation

1. **Run the migration:**
   ```bash
   # In Supabase SQL Editor, run:
   scripts/migrations/create_career_path_programs.sql
   ```

2. **Verify seed data:**
   ```sql
   SELECT cp.title, cpp.program_id, cpp.anchor_school, cpp.strength
   FROM career_path_programs cpp
   JOIN career_paths cp ON cp.id = cpp.career_path_id;
   ```

3. **Test the UI:**
   - Navigate to `/explore/careers/:careerPathId`
   - Should see career info + degree comparison cards
   - Click "View plan" to see the template modal

## 📂 File Structure

```
src/
├── pages/
│   ├── EduTree/v5/engine/
│   │   └── degreeTemplateGenerator.ts     # Phase 2 engine
│   └── CareerDetailPage.tsx               # Phase 2 UI
├── hooks/
│   ├── useCareerPathPrograms.ts           # Phase 1 data hook
│   └── useCareerDegreeOptions.ts          # Phase 2 data hook
├── components/careers/
│   └── DegreeTemplateModal.tsx            # Phase 2 modal
└── types/
    └── career.ts                          # Phase 1 types

scripts/migrations/
└── create_career_path_programs.sql        # Phase 1 migration
```

## 🎯 Success Criteria

- [x] Career detail page loads without errors
- [x] Degree comparison cards display cost/time/ROI
- [x] Modal opens with 4-year plan view
- [ ] Real degree templates generate (Phase 2.5)
- [ ] Transfer badges show in templates (Phase 2.5)
- [ ] Multiple optimization tabs work (Phase 3)

## 🚀 Phase 3 Preview

Once Phase 2.5 is complete, Phase 3 will add:
- Cheapest / Fastest / Balanced tabs in the modal
- "Apply to My Plan" button integration
- Caching for generated templates
- Career list page with search/filter
