# EduTree V2 - Deep Analysis Findings

## Critical Issues Found

### Issue 1: validateNoOverlaps Uses Wrong Constants ❌

**Location**: `manualLayoutRenderer.ts:1514`

```typescript
// WRONG - Hardcoded values don't match actual nodes
const NODE_WIDTH = 200;   // Actual: 180px (min-w-[180px])
const NODE_HEIGHT = 80;   // Actual: 120px (from layoutTokens.ts)
```

**Impact**: Overlap validation checks for 80px tall nodes when they're actually 120px, causing false negatives.

### Issue 2: Variable Node Heights Not Accounted For ⚠️

**Observation**: Nodes have **dynamic heights** based on content:
- Base node (no courses): ~120px
- Node with 3 course pills: ~180-200px  
- Node with 4-5 course pills: ~220-250px

**Current collision resolver assumes ALL nodes are exactly 120px tall.**

```typescript
// resolveOverlaps() at line 1549
const HEIGHT = NODE_HEIGHT; // 120px - ASSUMES FIXED HEIGHT
const minY = prev.position.y + HEIGHT + MIN_GAP; // Only accounts for 120px
```

**Impact**: Collision resolver can't prevent overlaps when nodes expand with course content.

### Issue 3: Inconsistent Node Width Definitions

**Actual node widths**:
- RequirementNode: `min-w-[180px]` (can grow)
- BlockGroup: `w-[180px] max-w-[180px]` (fixed 180px)
- GateNode: `min-w-[220px]` (can grow)
- TerminalNode: `min-w-[200px]` (can grow)

**validateNoOverlaps uses**: `NODE_WIDTH = 200` (doesn't match any of these)

## Root Cause Analysis

### Why Overlaps Persist

The seed data spacing (220px) assumes:
- Previous node height: 120px
- Gap: 60px
- Total: 180px

But when nodes render with course content:
- Previous node actual height: 180-200px  
- Gap: 60px
- Total: 240-260px

**Gap needed**: 240px minimum, but we only have 220px!

### Why Layout Looks Better Now

The recent fix restored original working positions, which were:
- UP_TRACK_A: 172 → UP_TRACK_A_ELEC: 392 (220px gap)
- UP_TRACK_B: 212 → UP_TRACK_B_ELEC: 432 (220px gap)

220px is BARELY enough for nodes with 3 courses (~200px tall), leaving only 20px visual gap.

## Solutions Required

### 1. Fix validateNoOverlaps Constants (HIGH PRIORITY)

```typescript
export function validateNoOverlaps(nodes: Node[]) {
  // Use centralized constants
  const NODE_WIDTH = 180;  // Match min-w-[180px]
  const NODE_HEIGHT = NODE_HEIGHT; // Import from layoutTokens (120px)
  const MAX_EXPANDED_HEIGHT = 250; // Account for course pills
  // ... rest of function
}
```

### 2. Increase Seed Data Spacing (IMMEDIATE FIX)

Current 220px spacing is insufficient. Need **minimum 250px** to account for:
- Max expanded node height: 220px
- Minimum visual gap: 30px
- Total safe spacing: 250px

### 3. Make Collision Resolver Height-Aware (FUTURE ENHANCEMENT)

```typescript
// Calculate actual rendered height per node
const getNodeHeight = (node: Node) => {
  const courseCount = node.data?.marketplace?.count ?? 0;
  const baseHeight = 120;
  const pillHeight = 30;
  return baseHeight + (Math.min(courseCount, 5) * pillHeight);
};

// Use actual height in collision detection
const minY = prev.position.y + getNodeHeight(prev) + MIN_GAP;
```

## Recommended Action Plan

**Immediate** (fixes current overlaps):
1. Increase all spacing constants from 220px → 260px
2. Fix validateNoOverlaps to use correct NODE_HEIGHT (120px)

**Short-term** (prevents future issues):
3. Add MAX_NODE_HEIGHT constant (250px) to layoutTokens.ts
4. Update collision resolver to use MAX_NODE_HEIGHT instead of NODE_HEIGHT

**Long-term** (proper solution):
5. Implement dynamic height calculation in collision resolver
6. Add visual gap indicators in dev mode
7. Add automated overlap detection tests

## Current State Assessment

**Visual appearance**: Layout looks significantly better after restoring original positions

**Remaining issues**:
- Tight spacing (20-40px gaps) when nodes show 3+ courses
- No protection against nodes with 5+ courses causing overlaps
- Validation function checking wrong dimensions
