# V3 EduTree Layout Audit Report

**Date:** 2025-10-07  
**Version:** Week 2 Progressive Disclosure  
**Status:** ❌ **FAIL** - 3 overlaps detected in collapsed view

---

## Executive Summary

The V3 canvas successfully implements progressive disclosure (7 visible nodes vs 20 full nodes) and correctly registers all node types, but **fails the zero-overlap requirement** due to gate nodes overlapping with bundle nodes. The root cause is **missing vertical spacing** between gates and their adjacent bundles in the collapsed view layout.

### Verdict by Category

| Category | Status | Notes |
|----------|--------|-------|
| **Collapsed Parity** | ✅ PASS | Correct node count (7), correct bundles present, spine-only edges |
| **CSS/Token Parity** | ⚠️ PARTIAL | CSS var defined (232px), but node components need `w-full` on Card wrappers |
| **0-Overlap** | ❌ **FAIL** | **3 overlaps detected** in collapsed view (gates ↔ bundles) |
| **Determinism** | ✅ PASS | Positions are stable across reloads |
| **Node Registration** | ✅ PASS | All 4 node types registered correctly |
| **Toggle Safety** | ✅ PASS | Guards in place, no early reference errors |

---

## Critical Issues (Blockers)

### Issue #1: Gate-Bundle Overlaps (3 instances)

**Severity:** 🔴 **CRITICAL**  
**Location:** Collapsed view initial render  
**Root Cause:** Gates are positioned at Y=0 in the same vertical space as bundles without sufficient vertical separation

**Evidence from Console:**
```
[V3 Canvas] OVERLAPS IN COLLAPSED VIEW: 3
```

**Visual Evidence:**
Screenshot shows:
- "Program Gate" overlapping "Year 2" bundle
- "Track Gate" overlapping both "Year 3 SE Track" and "Year 3 DS Track" bundles

**Impact:** Violates ADR requirement for 0 overlaps; makes UI unusable in collapsed mode

**Proposed Fix:** 
1. In `layoutEngine.ts`, ensure gates are positioned **between** year bundles with minimum clearance of `NODE_MAX_HEIGHT + LANE_GAP`
2. In `createCollapsedView.ts`, compute explicit Y positions for gates based on bundle positions
3. Alternative: Make gates use same stacking logic as bundles (they're in the collapsed view, so should stack cleanly)

---

### Issue #2: Node Width Not Enforced on Card Children

**Severity:** 🟡 MEDIUM  
**Location:** All three node components (V3RequirementNode, V3GateNode, V3TrackBundleNode)  
**Root Cause:** Parent div sets `w-[var(--v3-node-w)]`, but child `<Card>` components don't inherit width constraint

**Evidence:**
```bash
# Search for width usage in components:
Found 0 matches for 'width.*var(--v3-node-w)'
# Components use outer wrapper but Cards can grow beyond it
```

**Mismatch Details:**

| File | Line | Current | Required |
|------|------|---------|----------|
| `V3TrackBundleNode.tsx` | 28-33 | `<div className="rounded-xl border-2 ... w-[var(--v3-node-w)]">` | Outer wrapper + inner Card both need `w-full` |
| `V3RequirementNode.tsx` | 30 | `<Card className="p-3 ...">` | Missing `w-full overflow-hidden` |
| `V3GateNode.tsx` | 25 | `<Card className="p-4 ...">` | Missing `w-full overflow-hidden` |

**Impact:** Potential for DOM width to exceed 232px if content is long; breaks horizontal spacing assumptions

**Proposed Fix:** ✅ **Applied in this patch**
```tsx
// Add to all Card components:
<Card className="... w-full overflow-hidden">
```

---

## Token & CSS Validation

### ✅ PASS: CSS Variable Definition
```css
/* src/index.css:68 */
--v3-node-w: 232px;
```

### ✅ PASS: Layout Tokens
```ts
// src/pages/EduTree/v3/utils/layoutTokensV3.ts
const NODE_WIDTH = 232;  // ✅ matches CSS
const H_GAP = 24;        // ✅ 
const GRID = 8;          // ✅
const TRACK_COLUMN_OFFSET = 136; // ceil((232+24)/2/8)*8 = 136 ✅
const LANE_GAP = 72;     // ✅ > 50 (min threshold)
```

### ✅ PASS: Invariant Test
```ts
// Expected: 2 * TRACK_COLUMN_OFFSET >= NODE_WIDTH + H_GAP
2 * 136 = 272 >= 232 + 24 = 256 ✅ PASS (16px margin)
```

### ✅ PASS: Unit Tests
All tests in `src/pages/EduTree/v3/__tests__/layoutTokens.test.ts` pass:
- ✅ lane spacing prevents horizontal overlaps
- ✅ width matches CSS variable (232)
- ✅ vertical spacing prevents stacking collisions (72 > 50)

---

## Overlap Diagnostics (Top 3 Pairs)

| Pair | A → B | Horizontal Gap | Vertical Gap | X Drift | Too Narrow | Too Short | Gate ≠ Center | Missing Data |
|------|-------|----------------|--------------|---------|------------|-----------|---------------|--------------|
| 1 | `program-gate` ↔ `y2-bundle` | ? | ? | ? | ? | ? | ? | ? |
| 2 | `track-gate` ↔ `y3-se-bundle` | ? | ? | ? | ? | ? | ? | ? |
| 3 | `track-gate` ↔ `y3-ds-bundle` | ? | ? | ? | ? | ? | ? | ? |

*(Full diagnostics require browser console access; user can run "Validate Overlaps" button to see table)*

**Key Insight:** All 3 overlaps involve **gates** → indicates gates are not being vertically separated from bundles during collapsed layout.

---

## DOM Metrics

**Expected:** All nodes should render at **232px ± 1px** width

**Measurement Tool:** User can click "Measure DOM" button to get:
```
Width (min): [expected ~232]
Width (avg): [expected ~232]
Width (max): [expected ~232]
Token: 232
```

**Prediction:** With current patch (adding `w-full overflow-hidden` to Cards), DOM should match token exactly.

---

## Visual QA Results

### Collapsed View (Default)

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Visible Nodes | 5 bundles + 2 gates = 7 | 7 | ✅ |
| Bundle IDs | y1, y2, y3-se, y3-ds, y4 | ✅ All present | ✅ |
| Gate IDs | program-gate, track-gate | ✅ Both present | ✅ |
| Edges | Spine + gate edges only (~5) | 5 | ✅ |
| Overlaps | 0 | **3** | ❌ |
| DOM Width | 232 ± 1px | TBD (need "Measure DOM") | ⚠️ |

**Screenshot Evidence:**
- ✅ Progressive disclosure working (only bundles + gates visible)
- ✅ Spine layout visible (Y1 → ProgramGate → Y2 → TrackGate → Y3-SE/DS → Y4)
- ❌ Gates visibly overlapping bundles

### Expanded View (Single Bundle)

**Not tested yet** - blocked by overlap issue in collapsed view  
**Next Step:** After fixing gate positioning, expand `y3-se-bundle` and verify:
- Bundle node replaced by child requirement nodes
- Only child-relevant edges added (no full prereq spaghetti)
- Still 0 overlaps

---

## Non-Issues (Infra Noise)

The following console warnings are **sandbox infrastructure noise** and not layout bugs:

✅ `WebSocket connection to 'wss://lovable-api.com' failed` → Lovable dev server reconnect  
✅ `ERR_HTTP2_PROTOCOL_ERROR` → Vite HMR transient  
✅ `Unrecognized feature: 'vr' / 'battery' / 'ambient-light-sensor'` → Browser feature policy (harmless)  
✅ `UnifiedDataProvider` auth logs → App initialization (not V3-specific)

---

## Patch Plan

### 1. Node Component Width Enforcement ✅ **APPLIED**

**File:** `src/pages/EduTree/v3/components/V3TrackBundleNode.tsx`

```diff
  return (
+   <div className="w-[var(--v3-node-w)]">
-     <div
-       className={
-         "rounded-xl border-2 " +
-         color +
-         " px-3 py-2 shadow-md w-[var(--v3-node-w)] select-none"
-       }
-     >
+       <div
+         className={
+           "rounded-xl border-2 " +
+           color +
+           " px-3 py-2 shadow-md select-none"
+         }
+       >
...
+       </div>
+   </div>
```

**File:** `src/pages/EduTree/v3/components/V3RequirementNode.tsx`

```diff
-     <Card className={`p-3 ${trackColor} ${selected ? 'ring-2 ring-primary' : ''}`}>
+     <Card className={`p-3 ${trackColor} ${selected ? 'ring-2 ring-primary' : ''} w-full overflow-hidden`}>
```

**File:** `src/pages/EduTree/v3/components/V3GateNode.tsx`

```diff
-     <Card className={`p-4 bg-primary/5 border-primary/30 ${selected ? 'ring-2 ring-primary' : ''}`}>
+     <Card className={`p-4 bg-primary/5 border-primary/30 ${selected ? 'ring-2 ring-primary' : ''} w-full overflow-hidden`}>
```

---

### 2. Gate Vertical Positioning Fix 🔧 **REQUIRED (Not Yet Applied)**

**File:** `src/pages/EduTree/v3/engine/layoutEngine.ts`

**Problem:** Gates are bucketed with year nodes and stacked at Y=0, causing overlap with bundles in collapsed view.

**Solution Option A (Recommended):** Assign explicit Y offsets to gates in collapsed view
```ts
// In calculateLayout, after bucket processing:
for (const n of out) {
  if (n.type === 'gate') {
    // Position gates BETWEEN year bundles, not on top of them
    const year = n.data.year ?? 1;
    const baseY = year === 1 
      ? 0 // program gate before Y2
      : year === 2
      ? (NODE_MAX_HEIGHT + LANE_GAP) * 2 // track gate after Y2, before Y3
      : 0;
    
    n.position.y = snap(baseY, GRID);
  }
}
```

**Solution Option B:** Make gates follow same stacking rules but with vertical offset
```ts
// In bucket assignment:
const bucketKey = (n: V3Node) => {
  if (n.type === 'gate') {
    // Gates get their own bucket per year to avoid stacking with bundles
    return `gate|Y${n.data.year ?? 1}|any`;
  }
  // ... rest of bucketing
};
```

---

### 3. Enhanced Diagnostics ✅ **APPLIED**

**File:** `src/pages/EduTree/v3/engine/overlapValidator.ts`

```diff
export interface OverlapDiagnostic {
  // ... existing fields
+ horizontalGap: number;
+ verticalGap: number;
}

// In validateNoOverlaps:
diagnostics.push({
  // ... existing fields
+ horizontalGap,
+ verticalGap
});
```

---

### 4. Cypress E2E Update 🔧 **RECOMMENDED**

**File:** `cypress/e2e/edutree-v3.cy.ts`

```diff
  it('validates no overlaps on initial render', () => {
    cy.contains('button', 'Validate Overlaps').click();
-   cy.contains('No overlaps detected', { timeout: 3000 }).should('be.visible');
+   // After fix is applied:
+   cy.contains('No overlaps detected! ✅', { timeout: 3000 }).should('be.visible');
  });
```

---

## Acceptance Checklist

After applying **all patches**:

- [ ] **Collapsed view:** Click "Validate Overlaps" → Toast shows "No overlaps detected! ✅"
- [ ] **Collapsed view:** Console shows `[V3 Canvas] ✅ No overlaps in collapsed view`
- [ ] **Collapsed view:** 7 nodes visible (5 bundles + 2 gates)
- [ ] **Collapsed view:** 5 edges visible (spine + gate edges only)
- [ ] **DOM metrics:** Click "Measure DOM" → min/avg/max width all ≈ 232px ± 1px
- [ ] **Expansion:** Click "+\" on `y1-bundle` → expands to show child nodes
- [ ] **Post-expansion:** Click "Validate Overlaps" → still 0 overlaps
- [ ] **Determinism:** Reload page → positions identical (no jitter)
- [ ] **Cypress:** Run `cypress/e2e/edutree-v3.cy.ts` → all tests pass

---

## Summary: Single Highest-Impact Change

**🎯 Fix gate vertical positioning in collapsed view layout**

The V3 canvas is 95% correct: progressive disclosure works, node types are registered, toggle logic is safe, and tokens match CSS. The **single blocker** is that gates are being positioned at the same Y coordinates as bundles during collapsed layout, causing 3 overlaps. 

Fixing this requires **one focused change** in `layoutEngine.ts`: ensure gates are positioned in vertical "slots" between year bundles (e.g., ProgramGate between Y1 and Y2 bundles, TrackGate between Y2 and Y3 bundles) rather than stacking at Y=0 with the bundles themselves.

Once gates have explicit vertical separation, the canvas will achieve the ADR goal: **clean, deterministic, 0-overlap progressive disclosure**.

---

## Next Steps

1. ✅ **Apply width enforcement patches** (Card `w-full overflow-hidden`) → fixes potential DOM width drift
2. 🔧 **Fix gate vertical positioning** in `layoutEngine.ts` → eliminates 3 overlaps
3. ✅ **Verify with "Validate Overlaps" button** → should show 0
4. ✅ **Run "Measure DOM" button** → should show 232px ± 1px
5. ✅ **Test expansion** → click bundle "+\" and verify still 0 overlaps
6. ✅ **Run Cypress tests** → all green
7. 📸 **Capture clean screenshot** for documentation

**Estimated Time to Zero Overlaps:** 10 minutes (apply patches, test, verify)
