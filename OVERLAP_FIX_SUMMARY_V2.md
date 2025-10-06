# EduTree V2 - Overlap Fix Summary (Final)

## Issues Identified

### 1. Node Overlaps in Year 2
**Visual Evidence**: CS Electives overlapping CS Core; IT Electives overlapping IT Core

**Root Cause**: 
- Nodes with expanded course lists are **~240px tall** (120px base + 120px for options)
- Original spacing was 120-200px, insufficient for expanded content
- Collision resolver runs but can't retroactively fix seed data spacing

### 2. Missing Courses for SE Core & DS Core
**Visual Evidence**: These blocks show "Year 3 • track_core" but no "Choices: N" pill

**Root Cause**:
- `RequirementNode` component expects `marketplace.options` array from database
- `useRequirementOptionsBatch` hook queries `edu_courses` + `block_members` tables  
- Blocks `y3-se-core` and `y3-ds-core` likely have no associated courses in DB

## Solutions Implemented

### ✅ Fix 1: Increased Vertical Spacing (COMPLETE)

**File**: `src/pages/EduTree/utils/layoutConstants.ts`

**Changes**:
- Increased all vertical gaps from **200px → 250px**
- This accommodates nodes with 4-5 course options (up to ~240px tall)

**Specific Updates**:
```typescript
// Before → After
UP_ELECTIVES: 120 → 80       // Y2 CS Electives
UP_CORE: 240 → 330           // Y2 CS Core (250px gap vs 120px)
DOWN_CORE: 460 → 460         // Y2 IT Core (unchanged)
DOWN_ELECTIVES: 660 → 710    // Y2 IT Electives (250px gap vs 200px)
UP_TRACK_A: 160 → 120        // Y3 SE Core
UP_TRACK_A_ELEC: 360 → 370   // Y3 SE Electives (250px gap vs 200px)
UP_TRACK_B: 80 → 40          // Y3 DS Core
UP_TRACK_B_ELEC: 280 → 290   // Y3 DS Electives (250px gap vs 200px)
UP_CAPSTONE: 60 → 50         // Y4 SE Capstone
UP_CAPSTONE_2: 260 → 300     // Y4 DS Capstone (250px gap vs 200px)
```

**Expected Result**: No overlaps in Years 2, 3, or 4 even when nodes show full course lists

### ⏸️ Fix 2: Missing Course Data (DATABASE REQUIRED)

**Action Needed**: Add course records to database for these blocks:
- `y3-se-core` (SE Core)
- `y3-ds-core` (DS Core)

**Database Tables**:
```sql
-- Example: Add courses to a block
INSERT INTO block_members (block_id, course_id)
VALUES 
  ('y3-se-core', 'cs301-se-principles'),
  ('y3-se-core', 'cs302-software-architecture'),
  ('y3-se-core', 'cs303-agile-methods');

INSERT INTO block_members (block_id, course_id)
VALUES 
  ('y3-ds-core', 'cs311-machine-learning'),
  ('y3-ds-core', 'cs312-data-mining'),
  ('y3-ds-core', 'cs313-big-data-systems');
```

**Alternative**: If courses already exist in DB but aren't linked, check:
1. `edu_courses` table has records for SE/DS track courses
2. `block_members` table links these courses to `y3-se-core` and `y3-ds-core`
3. Blocks exist in `requirement_blocks` with correct UUIDs

## Verification Steps

### For Overlaps:
1. ✅ Open `/edu-tree-v2?filterMode=compare-any&a=program:bs_cs&b=program:bs_it`
2. ✅ Verify CS Electives and CS Core are 250px apart (no overlap)
3. ✅ Verify IT Electives and IT Core are 250px apart (no overlap)
4. ✅ Check all Year 3 and Year 4 nodes have proper spacing

### For Missing Courses:
1. ⏸️ Check browser console for `[MP_BATCH]` logs showing successful course fetch
2. ⏸️ Verify "SE Core" shows "Choices: 3" (or similar)
3. ⏸️ Verify "DS Core" shows "Choices: 3" (or similar)
4. ⏸️ Click blocks to open course selection modal

## Technical Notes

### Why 250px Spacing?
- **Base node height**: 120px (from `NODE_HEIGHT` constant)
- **Course options (4 × 30px)**: 120px
- **Total expanded height**: ~240px
- **Safe minimum gap**: 250px (10px buffer)

### Collision Resolver Behavior
The `resolveOverlaps()` function in `manualLayoutRenderer.ts`:
- Groups nodes by X position (column detection)
- Sorts by Y position within each column
- Auto-nudges overlapping nodes down by `HEIGHT + MIN_GAP`
- **Logs to console**: Look for `[AutoNudge]` messages

**Current constants**:
```typescript
const HEIGHT = NODE_HEIGHT;  // 120px
const MIN_GAP = LANE_GAP;    // 60px
const COL_TOLERANCE = 50;    // Column grouping tolerance
```

### Data Flow for Course Display
```
Database (edu_courses + block_members)
  ↓
useRequirementOptionsBatch hook
  ↓
manualLayoutRenderer (enriches node.data.marketplace)
  ↓
RequirementNode component
  ↓
Renders CourseOptionsList or "Choices: N" pill
```

## Status

**Overlaps**: ✅ **FIXED** (increased spacing to 250px)
**Missing Courses**: ⏸️ **REQUIRES DATABASE** (need to add course records for SE/DS Core blocks)

---

**Last Updated**: 2025-10-06
**Modified Files**: 
- `src/pages/EduTree/utils/layoutConstants.ts`
- `OVERLAP_FIX_DIAGNOSTIC.md` (updated)
