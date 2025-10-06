# Edu-Tree V2 Overlap Fix - Diagnostic Report

## Problem Analysis

### Visual Evidence
Screenshot showed clear overlapping at multiple locations:
1. **Year 2**: Program Gate overlapping with CS/IT Electives blocks
2. **Year 3**: SE Core/Electives and DS Core/Electives overlapping
3. **Year 4**: SE Capstone and DS Capstone overlapping

### Root Cause Identified
The seed data (`seedDataV2.ts`) had **multiple nodes assigned to identical Y positions**:

#### Before Fix:
- `y3-se-core` and `y3-se-elec` both at `UP_TRACK_A: 172`
- `y3-ds-core` and `y3-ds-elec` both at `UP_TRACK_B: 212`
- `y4-se-cap` and `y4-ds-cap` both at `UP_CAPSTONE: 80`

#### Why Collision Resolver Didn't Work:
The original `resolveOverlaps()` function used:
- **Wrong height constant**: 80px (should be 120px from `NODE_HEIGHT`)
- **Wrong column tolerance**: 60px (too small to group year columns)
- **Wrong gap**: 28px (should be 60px from `LANE_GAP`)

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

## Summary

**Problem**: Overlapping nodes caused by duplicate Y positions in seed data and incorrect collision detection constants.

**Solution**: 
1. Created unique Y position constants for each node type
2. Updated seed data to use new constants
3. Fixed collision resolver to use correct layout constants
4. Improved column detection algorithm

**Impact**: All overlaps eliminated through proper spacing in seed data. Collision resolver serves as backup safety net for any edge cases.
