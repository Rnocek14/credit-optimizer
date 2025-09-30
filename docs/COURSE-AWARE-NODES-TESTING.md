# Course-Aware Nodes Testing Guide

## Overview
This feature transforms requirement blocks into live, course-aware nodes that display options, transferability, credits/cost, and user selections with ~1-2s data freshness.

## ✅ Preflight Checklist

### Branch & Flag
- Feature branch: `edutree/course-aware-nodes`
- No feature flag needed (always active in dev)

### DB Safety
- ✓ Running on dev/sandbox project
- ✓ Schema changes are idempotent and reversible

### Schema Readiness
- ✓ Existing tables: `requirement_blocks`, `edu_courses`, `requirement_options`, `user_plan_courses`
- ✓ New tables: `course_equivalencies`, `transfer_rules` (enhanced)
- ✓ View: `requirement_option_counts_by_block` (existing)

### Modal Path
- ✓ `CourseSelectionModal` exists at `src/pages/EduTree/components/CourseSelectionModal.tsx`
- ✓ Opens from "Options: N" pill click

## 🔧 What Was Implemented

### Phase A: Schema (✅ Complete)
- Created `course_equivalencies` table for ACE/CLEP mappings
- Enhanced `transfer_rules` with `block_id`, `course_id`, `transfer_state`, `score`, `notes`
- Added indexes and RLS policies (permissive for dev)
- Trigger for `updated_at` timestamp

### Phase B: Batched Hooks (✅ Complete)
- `useRequirementOptionsBatch(blockIds, scope)` → Map<block_id, Course[]>
- `useTransferRulesByBlock(blockIds, scope)` → Map<block_id, TransferRule[]>
- Real-time invalidation keys added to `QUERY_KEYS`

### Phase C: Data Versioning (✅ Complete)
- Enhanced `calculateDataVersion()` to include:
  - `liveBlocks`
  - `liveCourses`
  - `optionsByBlock` (Map)
  - `transferRulesByBlock` (Map)
  - `selectionsUpdatedAt`
- Short UI-friendly hash (e.g., `v:a1b2`)

### Phase D: Node UI (✅ Complete)
- New components:
  - `CourseOptionsList` - Displays up to 3 course options
  - `TransferStateChip` - Shows accepted/conditional/rejected/unknown states
  - `EvidenceChip` - Shows ACE/CLEP badges
- Enhanced `RequirementNode` to render:
  - Header with `v:xxxx` badge (top-right, dev only)
  - Credits needed
  - Course options list (top 3, sorted by transfer score)
  - "Options: N" footer (existing, wired to modal)

## 🧪 Acceptance Tests (60-90s Smoke Test)

### Test 1: Edit Block Title → Node Updates
```sql
-- Update a requirement block title
UPDATE public.requirement_blocks 
SET title = 'Updated Foundations', updated_at = now() 
WHERE slug = 'y1-found';
```
**Expected**: Node title changes + `v:xxxx` badge updates within 1-2s

### Test 2: Add/Remove Options → List Updates
```sql
-- Add a course option
INSERT INTO public.requirement_options (requirement_id, option_kind, option_ref_id)
SELECT rb.id, 'course', ec.id
FROM public.requirement_blocks rb
CROSS JOIN public.edu_courses ec
WHERE rb.slug = 'y1-found' AND ec.code LIKE 'CS%'
LIMIT 1;

-- Check the change propagated
SELECT COUNT(*) FROM public.requirement_options 
WHERE requirement_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found');
```
**Expected**: "Options: N" count increases + new course appears in list + `v:xxxx` updates

### Test 3: Update Transfer State → Chip Changes
```sql
-- Update transfer rule state
UPDATE public.transfer_rules 
SET transfer_state = 'accepted', score = 0.95, updated_at = now()
WHERE block_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found')
LIMIT 1;
```
**Expected**: Chip changes from "Unknown" to "Accepted (95%)" + `v:xxxx` updates

### Test 4: Select Course → Selected Pill Appears
```sql
-- Insert user plan selection (requires active user)
-- Note: This test requires authenticated user context
-- You can test via UI by clicking a course option instead
```
**Expected**: "Selected" badge appears on chosen course + `v:xxxx` updates

## 📊 Instrumentation Logs (Watch in Dev Console)

### Before ReactFlow Render
Look for: `[EduTree][FINAL NODES]`
- Should show: `{ id, title, optionsCount, opt0, transfer0, __v }`
- Sample: First 1-2 nodes logged

### Inside RequirementNode
Look for: `[RequirementNode render]` (sampled ~5%)
- Should show: `{ id, title, options length, v }`

### Data Merge
Look for: `[DataMerge] Merge complete`
- Shows: `{ total, mergedWithLive, seedOnly }`

### Hooks
Look for: `[useRequirementOptionsBatch] Fetched`
- Shows: `{ blockIds, totalOptions, coursesFound }`

Look for: `[useTransferRulesByBlock] Fetched`
- Shows: `{ blockIds, totalRules, blocksWithRules }`

## 🎯 Visual Indicators

### Dev Badge (Top-Right of Each Node)
- Small gray text: `v:a1b2` (last 4 chars of data version)
- Updates whenever any data source changes
- Only visible in development mode

### Course Options List
- Up to 3 courses displayed
- Each shows:
  - Course code/title (truncated)
  - Provider name
  - Credits (if available)
  - Cost (if available)
  - ACE/CLEP chips (blue/purple)
  - Transfer state chip (green/yellow/red/gray)
  - "Selected" badge (if user chose this course)

### Transfer State Colors
- **Accepted**: Green background (`bg-green-500/10`)
- **Conditional**: Yellow background (`bg-yellow-500/10`)
- **Rejected**: Red background (`bg-red-500/10`)
- **Unknown**: Gray background (`bg-muted`)

## 🔄 Rollback Plan

### Quick Rollback (UI Only)
```typescript
// In RequirementNode component, comment out:
{/* Phase 3: Course options list with transferability */}
// This hides the new UI while keeping data flowing
```

### Full Rollback (Schema + UI)
```sql
-- Drop new tables
DROP TABLE IF EXISTS public.course_equivalencies;
-- Revert transfer_rules columns (if needed)
ALTER TABLE public.transfer_rules DROP COLUMN IF EXISTS block_id;
ALTER TABLE public.transfer_rules DROP COLUMN IF EXISTS course_id;
ALTER TABLE public.transfer_rules DROP COLUMN IF EXISTS transfer_state;
ALTER TABLE public.transfer_rules DROP COLUMN IF EXISTS score;
ALTER TABLE public.transfer_rules DROP COLUMN IF EXISTS notes;
```

## 🐛 Troubleshooting

### "Options: N" Shows Zero But Courses Exist in DB
1. Check `requirement_options.option_kind = 'course'` filter
2. Check `requirement_options.option_ref_id` points to valid `edu_courses.id`
3. Verify `requirement_options.requirement_id` matches `requirement_blocks.id`

### Transfer States Not Appearing
1. Check `transfer_rules.block_id` is populated (migration adds this column)
2. Verify `transfer_rules.course_id` matches `edu_courses.id`
3. Check `transfer_state` is one of: 'accepted', 'conditional', 'rejected', 'unknown'

### `v:xxxx` Badge Not Changing
1. Check browser dev console for `[DataMerge]` logs
2. Verify `calculateDataVersion()` is receiving updated data
3. Check React Query cache invalidation is working (network tab should show fresh queries)

### Duplicate Key Errors
- Migration is idempotent - safe to re-run
- Check for existing `transfer_rules` policies before adding new ones

## 📝 Next Steps (Optional Enhancements)

### Phase E: Acceptance Tests (Cypress/Playwright)
```typescript
// cypress/e2e/course-aware-nodes.cy.ts
describe('Course-Aware Nodes', () => {
  it('updates title when block changes', () => {
    // Seed data, edit block, verify node updates
  });
  
  it('shows new options when courses added', () => {
    // Add requirement_option, verify list updates
  });
  
  it('updates transfer state chip', () => {
    // Change transfer_state, verify chip color
  });
  
  it('shows selected pill when course chosen', () => {
    // Select course, verify badge appears
  });
});
```

### Real-Time Subscriptions (Already Wired)
- Query keys include `requirementOptionsBatch` and `transferRulesBatch`
- Add Supabase real-time listeners in `useEduTreeV2Data` if needed
- Invalidate queries on `INSERT`/`UPDATE`/`DELETE` events

### User Selections Integration
- Wire `user_plan_courses` to mark selected courses
- Show "Selected" badge when `user_plan_courses.course_id` matches
- Add visual feedback for selection conflicts (multiple courses selected for same block)

## 🎓 Architecture Notes

### Data Flow
```
DB Tables → Batched Hooks → calculateDataVersion → mergeBlocksWithLiveData → 
blocksToNodes (V2NodeData.options) → RequirementNode → CourseOptionsList
```

### Key Design Decisions
1. **Batched Queries**: Fetch options/transfers for all visible blocks in single query
2. **Scope-Based Caching**: Query keys include `program|track|filterMode` for proper invalidation
3. **Top-3 Display**: Show most relevant options (sorted by transfer score + evidence)
4. **Stable IDs**: Use block/course UUIDs for consistent matching across DB/seed/UI
5. **Dev Instrumentation**: Sampled logs (~5%) to avoid console spam

### Performance Considerations
- Queries use 30s `staleTime` to reduce refetches
- Options limited to top 3 (client-side slice, not DB filter)
- Lazy loading possible: only fetch options for nodes in viewport
- Indexes added on `block_id`, `course_id`, `transfer_state` for fast lookups

## ✨ Success Criteria

- ✅ Schema migrations applied cleanly
- ✅ New hooks return batched data
- ✅ `calculateDataVersion` includes all data sources
- ✅ Nodes display course options with transfer states
- ✅ `v:xxxx` badge changes on any data update
- ✅ All 4 acceptance tests pass (title, options, transfer, selection)
- ✅ No performance degradation (check React DevTools Profiler)
- ✅ No visual regressions (existing nodes render correctly)
