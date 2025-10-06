# Edu-Tree V2 Overlap Fix - Diagnostic Report (v2)

## Problem Analysis - Second Iteration

### Visual Evidence (Updated Screenshot)
New screenshot revealed persistent overlaps despite first fix:
1. **Year 2**: CS Electives overlapping with CS Core; IT Electives overlapping with IT Core
2. **Year 3**: Nodes properly spaced (first fix successful)  
3. **Missing courses**: SE Core and DS Core show no course options ("Choices: 2" not appearing)

### Root Cause - Revised Diagnosis

#### Problem 1: Insufficient Vertical Spacing
The first fix added 120-200px spacing, but nodes with **expanded course lists** are taller than expected:
- Standard node: ~120px height
- **Node with 3-4 course options**: ~200-250px height (course pills add ~30px each)
- Original spacing (120-200px) wasn't enough for expanded content

#### Problem 2: Missing Marketplace Data  
SE Core (`y3-se-core`) and DS Core (`y3-ds-core`) blocks show no courses because:
- The `RequirementNode` component expects `marketplace.options` array from database
- `useRequirementOptionsBatch` hook queries `edu_courses` and `block_members` tables
- These specific blocks may not have associated courses in the database yet

These mismatched constants meant the collision detector couldn't properly:
1. Identify nodes in the same column
2. Calculate correct spacing between nodes
3. Apply appropriate nudging

## Solution Implemented

### 1. Fixed Layout Constants (`layoutConstants.ts`)
Created unique Y positions for each node type:

```typescript
LANE_ROWS: {
  GATE_Y: 360,
  // Upper lane (CS/SE/DS tracks) - sequential with proper spacing
  UP_CAPSTONE: 60,      // Y4 SE Capstone
  UP_CAPSTONE_2: 260,   // Y4 DS Capstone (NEW - 200px lower)
  UP_ELECTIVES: 120,    // Y2 CS Electives
  UP_TRACK_A: 160,      // Y3 SE Core
  UP_TRACK_A_ELEC: 360, // Y3 SE Electives (NEW - 200px lower)
  UP_TRACK_B: 80,       // Y3 DS Core  
  UP_TRACK_B_ELEC: 280, // Y3 DS Electives (NEW - 200px lower)
  UP_CORE: 240,         // Y2 CS Core
  // Lower lane (IT track) - sequential
  DOWN_CORE: 460,       // Y2 IT Core
  DOWN_ELECTIVES: 660,  // Y2 IT Electives
  DOWN_CAPSTONE: 560    // Y4 IT Capstone
}
```

### 2. Updated Seed Data (`seedDataV2.ts`)
Applied new constants to problematic nodes:

- `y3-se-elec`: Changed to `UP_TRACK_A_ELEC` (360px)
- `y3-ds-elec`: Changed to `UP_TRACK_B_ELEC` (280px)
- `y4-ds-cap`: Changed to `UP_CAPSTONE_2` (260px)

### 3. Improved Collision Resolver (`manualLayoutRenderer.ts`)
Enhanced the `resolveOverlaps()` function:

```typescript
const HEIGHT = NODE_HEIGHT;    // 120px - correct value
const MIN_GAP = LANE_GAP;      // 60px - correct value
const COL_TOLERANCE = 50;      // Tighter tolerance for better column detection
```

**New column grouping logic**:
- Uses exact X position matching first
- Falls back to tolerance-based grouping (within 50px)
- Creates separate columns for nodes with different X positions
- Properly detects and logs column processing

## Verification

### Expected Results:
✅ No overlaps in Year 2 (CS/IT blocks properly spaced)
✅ No overlaps in Year 3 (SE/DS core and electives vertically separated by 200px)
✅ No overlaps in Year 4 (SE/DS capstones vertically separated by 200px)
✅ Collision resolver properly detects and logs any remaining issues

### Debug Logging:
- `[AutoNudge] Processing column:` logs show column detection
- `[AutoNudge] Nudging node:` logs show any automatic corrections applied
- `[ManualLayout] Applying collision resolver` confirms the function runs


## Solution Implemented - Second Iteration

### 1. Increased Vertical Spacing (`layoutConstants.ts`)
**Changed from 200px to 250px separation** to accommodate expanded nodes with course lists:

```typescript
LANE_ROWS: {
  GATE_Y: 360,
  // Upper lane - 250px spacing for expanded course lists
  UP_ELECTIVES: 80,     // Y2 CS Electives
  UP_CORE: 330,         // Y2 CS Core (250px gap)
  UP_TRACK_A: 120,      // Y3 SE Core
  UP_TRACK_A_ELEC: 370, // Y3 SE Electives (250px gap)
  UP_TRACK_B: 40,       // Y3 DS Core
  UP_TRACK_B_ELEC: 290, // Y3 DS Electives (250px gap)
  UP_CAPSTONE: 50,      // Y4 SE Capstone
  UP_CAPSTONE_2: 300,   // Y4 DS Capstone (250px gap)
  // Lower lane - 250px spacing
  DOWN_CORE: 460,       // Y2 IT Core
  DOWN_ELECTIVES: 710,  // Y2 IT Electives (250px gap)
  DOWN_CAPSTONE: 580    // Y4 IT Capstone
}
```

**Rationale**: 
- Base node height: 120px
- Course options list: ~120px (4 courses × 30px)
- Total expanded height: ~240px
- **Minimum safe gap: 250px** (provides 10px buffer)

### 2. Missing Courses - Action Required
**SE Core and DS Core need course data added to database**:

The `RequirementNode` component flow:
1. `useRequirementOptionsBatch` hook queries database for course options
2. Returns `marketplace.options` array for each block
3. Component shows "Choices: N" pill only if `marketplace.count > 0`

**Database tables involved**:
- `edu_courses` - Course definitions
- `block_members` - Links blocks to courses  
- `requirement_blocks` - Block metadata

**To fix**: Add course records for `y3-se-core` and `y3-ds-core` in the database.


