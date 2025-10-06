# EduTree Diagnostic Baseline

**Generated**: 2025-10-06  
**Scope**: EduTreeV2 Architecture, Layout, Data Flow, Components, Hooks, Styling  
**Purpose**: Foundation for design deep-research and Phase 3 Track Focus UI

---

## 1. Architecture Overview

### 1.1 Core Entry Points
- **Page Component**: `src/pages/EduTree/EduTreeV2Page.tsx`
  - Enables feature flags via localStorage (`eduTree`, `mp`)
  - Maps URL params (`track`, `filterMode`) to internal filter modes
  - Sets query params: `eduTreeV2Grid=true`, `eduTreeLayoutMode=manual_v1`
  - Wraps canvas in `ReactFlowProvider`

- **Canvas Component**: `src/pages/EduTree/EduTreeCanvasV2.tsx`
  - Main orchestrator (1823 lines)
  - Defines inline node components (`RequirementNode`, `GateNode`)
  - Integrates data hooks, dimming, layout, validation, and real-time features
  - Handles marketplace integration, course selection, and user plan state

### 1.2 Feature Flags System
```typescript
eduTreeV2Grid: boolean        // Enable Phase 1 grid positioning
eduTreeLayoutMode: 'manual_v1' | 'legacy' | 'grid_v2'
mp: '1'                       // Marketplace features (localStorage or URL)
```

### 1.3 Filter Modes
```typescript
type FilterMode = 
  | 'compare-programs'   // CS vs IT (program-level)
  | 'compare-tracks'     // SE vs DS (track-level)
  | 'compare-any'        // Dynamic dual-selection via URL
  | 'bs_cs' | 'bs_it' | 'bsn'  // Single program
  | 'se' | 'ds'          // Single track
  | null
```

---

## 2. Layout System

### 2.1 Layout Tokens (`src/pages/EduTree/utils/layoutTokens.ts`)

**Core Constants**:
```typescript
COL_W = 280              // Node width
COL_GAP = 200            // Standard gap between years
GRID = 8                 // Grid snap unit
NODE_HEIGHT = 120        // Standard node height
LANE_GAP = 60            // Gap between nodes in same lane

// Phase 0: Region-Aware System
REGION_GUTTER = 24       // Y padding around program regions
TRACK_GUTTER = 16        // Y padding between track corridors
TRACK_COLUMN_OFFSET = 60 // ±X offset for SE/DS lanes (Phase 1)

// Node Sizing
NODE_WIDTH_PX = 180
NODE_BASE_HEIGHT = 120
NODE_MAX_HEIGHT = 250
COL_TOLERANCE = 48       // X bucketing for column groups
```

**Lane Baselines** (Phase 2):
```typescript
LANE_ROWS = {
  Y3_SE_BASE: 160,   // Year 3 SE baseline
  Y3_DS_BASE: 300,   // Year 3 DS baseline
  Y4_SE_BASE: 160,   // Year 4 SE baseline
  Y4_DS_BASE: 300,   // Year 4 DS baseline
}
```

**Lane Y Positions**:
```typescript
LANE_Y_POSITIONS = {
  2: { up: 240, down: 480, center: 360 },
  3: { up: 200, down: 520, center: 360 },
  4: { up: 120, down: 600, center: 360 }
}
```

**Adaptive Lane Positions** (`laneXs(viewW)`):
```typescript
interface LanePositions {
  y1: number       // Year 1 column
  y2: number       // Year 2 column
  y3L: number      // Year 3 left (SE) column
  y3R: number      // Year 3 right (DS) column
  y4L: number      // Year 4 left (SE) column
  y4R: number      // Year 4 right (DS) column
  gatePG: number   // Program gate X
  gateTG: number   // Track gate X
  spread: number   // Track spread amount (160-360px)
}
```

### 2.2 Layout Constants (`src/pages/EduTree/utils/layoutConstants.ts`)

**CRITICAL**: These are the **old working positions** before Phase 2 refactor:
```typescript
LAYOUT_CONSTANTS = {
  YEAR_COLUMNS: { Y1: 200, Y2: 600, Y3: 1300, Y4: 1700 },
  GATE_POSITIONS: { 
    Y1_TO_Y2: 400,  // Program gate after Y1
    Y2_TO_Y3: 900   // Track gate after Y2
  },
  LANE_ROWS: {
    GATE_Y: 360,
    // Year 2 - Upper lane (CS program)
    UP_ELECTIVES: 132,
    UP_CORE: 252,
    // Year 3 - Upper lane (SE/DS tracks) - with separation
    UP_TRACK_A: 172,      // Y3 SE Core
    UP_TRACK_A_ELEC: 392, // Y3 SE Electives (220px below)
    UP_TRACK_B: 212,      // Y3 DS Core
    UP_TRACK_B_ELEC: 432, // Y3 DS Electives (220px below)
    // Year 4 - Upper lane capstones
    UP_CAPSTONE: 80,      // Y4 SE Capstone
    UP_CAPSTONE_2: 300,   // Y4 DS Capstone (220px below SE)
    // Year 2/4 - Lower lane (IT program)
    DOWN_CORE: 492,
    DOWN_ELECTIVES: 712,
    DOWN_CAPSTONE: 652
  }
}
```

### 2.3 Deterministic Grid (`src/pages/EduTree/utils/deterministicGrid.ts`)

**Track Column Offset Function** (Phase 1):
```typescript
function getTrackColumnX(yearX: number, trackId: TrackId): number {
  if (!trackId) return yearX;                               // core/shared
  if (trackId === 'se') return yearX - TRACK_COLUMN_OFFSET; // SE left
  if (trackId === 'ds') return yearX + TRACK_COLUMN_OFFSET; // DS right
  // Future: deterministic hash-based spread for other tracks
}
```

**Reserved Columns**:
```typescript
getReservedColsByYear(viewW) = {
  1: { shared: lanes.y1 },
  2: { shared: lanes.y2, up: lanes.y2, down: lanes.y2, gate: lanes.gatePG },
  3: { gate: lanes.gateTG, up: lanes.y3L, down: lanes.y3R },
  4: { up: lanes.y4L, down: lanes.y4R }
}
```

### 2.4 Manual Layout Renderer (`src/pages/EduTree/utils/manualLayoutRenderer.ts`)

**Program Regions** (Phase 2):
```typescript
type Corridor = { minY: number; maxY: number };
type ProgramRegion = { 
  minY: number; 
  maxY: number; 
  corridors: Record<string, Corridor> 
};

computeProgramRegions(nodes) => Map<string, ProgramRegion>
```

**Collision Resolver** (Region-Aware):
```typescript
resolveOverlaps(nodes: Node[]): Node[]
  - Groups nodes by (column, programId, trackKey)
  - Sorts by Y position within groups
  - Nudges overlapping nodes vertically
  - Clamps to corridor bounds (minY/maxY)
  - O(n) per group complexity
```

**Validation**:
```typescript
validateNoOverlaps(nodes: Node[])
  - Uses NODE_WIDTH_PX (180) and NODE_MAX_HEIGHT (250)
  - Returns { hasOverlaps, pair: [nodeIdA, nodeIdB] }
```

---

## 3. Data Flow

### 3.1 Data Hook (`src/pages/EduTree/hooks/useEduTreeV2Data.ts`)

**Data Sources**:
1. **Golden Layout Seed** (`GOLDEN_LAYOUT_SEED`)
   - 20 blocks: Y1 shared, Y2 CS/IT, Y3 SE/DS, Y4 capstones, BSN program
   - 16 edges: prerequisite chains, gate branching
   - 2 junctions: program gate (Y2), track gate (Y3)

2. **Live Database Queries**:
   - `edu_courses` table (2min stale time)
   - `requirement_blocks` table (2min stale time)
   - Real-time subscriptions for changes

3. **Marketplace Data**:
   - `useRequirementOptionsBatch` hook
   - `useTransferRulesByBlock` hook
   - `useUserPlanSelections` hook

**Data Merging**:
```typescript
mergeBlocksWithLiveData(seedBlocks, dbBlocks, dbCourses)
  - Enriches seed with UUIDs, slugs, course metadata
  - Preserves seed positioning (position_x, position_y)
  - Adds marketplace fields (optionsCount, hasAceCredit, hasClep)
```

**Data Version**:
```typescript
dataVersion = calculateDataVersion(blocks, edges, marketplaceData)
  - Stable hash for React Flow key identity
  - Changes trigger re-render when data mutates
```

**Auto-Mode Detection**:
```typescript
effectiveFilterMode = autoDetect(primarySelection, secondarySelection)
  - Waits for URL hydration (isHydrated flag)
  - Maps 'compare-any' to 'compare-programs' or 'compare-tracks'
  - Based on PathHighlightContext selections
```

### 3.2 Blocks to Nodes Conversion

**Node Data Structure**:
```typescript
interface V2NodeData {
  // Core fields
  title: string
  ruleType: 'ALL' | 'K_OF_N' | 'CREDITS'
  levelYear: number
  area: string
  creditsNeeded?: number
  
  // Program/Track membership
  trackId?: string | null
  programId?: string | null
  track_id?: string | null  // Snake_case for dimming compatibility
  program_id?: string | null
  
  // Virtual nodes (gates)
  isVirtual?: boolean
  junctionType?: 'program' | 'track'
  singleRailStraight?: boolean
  
  // Ghost nodes (empty years)
  isEmptyYear?: boolean
  year?: number
  reason?: 'accelerated' | 'no-track' | 'direct-progression'
  nextYear?: number
  programName?: string
  
  // Phase A plan (unused currently)
  phaseAPlan?: { lane: 'up' | 'down' | undefined; col: number; x: number; y: number }
  
  // Marketplace integration
  marketplace?: {
    options: any[]
    optionIds: string[]
    count: number
    resolved: number
    sticky: number
    allow: boolean
    show: boolean
    signature: string
  }
  optionsCount?: number
  hasAceCredit?: boolean
  hasClep?: boolean
  selectedCourse?: { id: string; provider: string; title: string; cost: number }
  
  // Course-aware fields
  options?: any[]           // CourseOption objects with transfer state
  transferRules?: any[]     // Transfer rule objects
  selectedCourseId?: string
  
  // React identity tracking
  __v?: string | number
}
```

**Node Types**:
- `requirement`: Standard requirement nodes
- `gate`: Program/track gate nodes
- `gatePlaceholder`: Placeholder gates (unused in current seed)
- `header`: Program/track header badges
- `emptyYear`: Ghost nodes for skipped years

### 3.3 Edge Conversion

**Edge Kinds**:
```typescript
type EdgeKind = 'gate' | 'prereq' | 'coreq' | 'advisory'
```

**Edge Styling**:
```typescript
'coreq': { strokeWidth: 3, markerStart: ArrowClosed, markerEnd: ArrowClosed }
'advisory': { strokeWidth: 2, strokeDasharray: '6 6', opacity: 0.65 }
'gate': { strokeWidth: 4, markerEnd: ArrowClosed }
'prereq': { strokeWidth: 3, markerEnd: ArrowClosed }
```

**Handle Routing**:
- Gate nodes: `out-se`, `out-ds`, `out` (single-rail fallback)
- Requirement nodes: `in` (target), `out` (source)
- Header nodes: `in` (target), `source` (hidden)

---

## 4. Node Components

### 4.1 RequirementNode (Inline)

**Rendered Elements**:
1. **Title + Metadata**: Year, area, credits
2. **Track Badge**: SE/DS uppercase badge
3. **Course Options List** (`CourseOptionsList`):
   - Top 3 courses with transferability state
   - Truncated for space
4. **Marketplace Pills** (`NodeOptionsPill`):
   - Shows course count
   - ACE/CLEP badges
   - Dev diagnostic pill (when options=0)
5. **Selected Course Display**: Title, provider, cost, "Change" button
6. **Course Selection Modal** (`CourseSelectionModal`): Opens on pill/option click

**Styling Classes**:
```typescript
trackClasses = [
  'node', 
  programClass,          // 'cs' | 'it' | 'bsn'
  'track--{trackId}'     // 'track--se' | 'track--ds' | 'track--cs-base' | 'track--it-base' | 'track--bsn-base'
]
```

**Marketplace Feature Flag**:
```typescript
SHOW_MP = ENV.DEGREE_MARKETPLACE || localStorage.mp === '1' || URL.mp === '1' || true
```

### 4.2 GateNode (Inline)

**Rendered Elements**:
1. **Title**: "YEAR X — Program Gate" or "Track Gate"
2. **Subtitle**: Context-aware (e.g., "Specialization Choice (CS)")
3. **Checkpoint Controls** (`CheckpointControls`): Unlocks downstream content
4. **Gate Aggregation Chips**: ACE/CLEP badges (aggregated from downstream nodes)

**Handles**:
- Fork mode: `out-se`, `out-ds` (top/bottom)
- Single-rail mode: `out` (right, centered)
- Target: `in` (left, centered)

### 4.3 HeaderNode (`src/pages/EduTree/nodes/HeaderNode.tsx`)

**Purpose**: Interactive badge for program/track selection  
**Key Extraction**:
```typescript
keyFromId('program-header:bs_cs') => 'program:bs_cs'
keyFromId('track-header:software-engineering') => 'track:se'
keyFromId('track-header:information-technology') => 'program:bs_it' (special case)
```

**Interaction**:
- Click: Toggle lock (legacy) or set primary selection (compare-any mode)
- Shift+Click: Set secondary selection (compare-any mode)
- Hover: Preview highlight
- Keyboard: Enter/Space toggles

**States**:
- `locked`: Selected via toggleLock
- `isActive`: Currently previewing (hover)
- Normal: Inactive

### 4.4 EmptyYearNode (`src/pages/EduTree/components/EmptyYearNode.tsx`)

**Purpose**: Ghost node for skipped academic phases  
**Reasons**:
- `accelerated`: Fast-track programs (e.g., IT skips Y3)
- `no-track`: No specialization in this year
- `direct-progression`: Continues to next phase

**Rendered Elements**:
- Icon: Clock/GraduationCap/Arrow (reason-specific)
- Badges: Phase number, reason label
- Message: Context-aware (e.g., "Skips Specialization → Capstone")
- Sub-message: "Continues to Phase X"
- Tooltip: Detailed explanation

**Styling**:
- Border: Dashed, muted
- Background: Muted/30, opacity 75%
- Transition: Hover opacity 90%

---

## 5. Interaction Hooks

### 5.1 useApplyDimmingV2 (`src/pages/EduTree/hooks/useApplyDimmingV2.ts`)

**Purpose**: Enhanced dimming supporting dual selection (compare-any)  
**Inputs**: `{ nodes, edges }`  
**Outputs**: `{ nodes, edges, mode }`

**Render Modes**:
```typescript
type RenderMode = 'single' | 'dual'
deriveRenderMode(primarySelection, secondarySelection)
```

**Node Highlighting Classes**:
- `hl--primary`: Belongs to primary selection (A)
- `hl--comparison`: Belongs to secondary selection (B)
- `hl--both`: Shared between A and B
- `hl--dim`: Dimmed (opacity 0.25)
- `hl--ghost`: Ghost node (accelerated path)

**Membership Logic**:
```typescript
belongsToSelection(blockish, selection)
  - Foundational nodes (no program_id, no track_id) => belong to ALL
  - Program nodes: match program_id
  - Track nodes: match track_id or program-shared blocks
```

**Shared Node Detection**:
```typescript
isSharedBetween(blockish, primarySel, secondarySel)
  - Global shared (no program/track) => always shared
  - Track vs Track (same program) => program-shared blocks
  - Program vs Program => global only
  - Track vs Program => global only
```

**Edge Highlighting Classes**:
- `edge--primary`: Both endpoints belong to A
- `edge--comparison`: Both endpoints belong to B
- `edge--both`: Connects shared nodes
- `edge--dim`: Dimmed (opacity 0.25)

**Suffix Support** (via `useSuffixCompare`):
```typescript
reachableSet: Set<string>  // Nodes reachable from suffix start
  - Only highlights nodes/edges within reachableSet
  - Dims everything outside suffix
```

### 5.2 useEduTreeV2Data Hook (Already Documented in Section 3.1)

### 5.3 usePathHighlight Context

**Provider**: `PathHighlightProvider` (in `ctx/PathHighlightContext`)  
**Purpose**: Global state for program/track selection and highlighting

**Selection Structure**:
```typescript
type Selection = 
  | { kind: 'program', id: string }  // e.g., { kind: 'program', id: 'bs_cs' }
  | { kind: 'track', id: string }    // e.g., { kind: 'track', id: 'se' }
```

**State**:
```typescript
{
  primarySelection: Selection | null
  secondarySelection: Selection | null
  isHydrated: boolean  // URL sync complete
  
  // Legacy hover/lock state (deprecated in compare-any mode)
  activeKey: string | null
  hoveredKey: string | null
  lockedKey: string | null
}
```

**Actions**:
```typescript
setPrimarySelection(sel: Selection)
setSecondarySelection(sel: Selection)
clearPrimarySelection()
clearSecondarySelection()
preview(key: string)          // Hover preview
clearPreview()
toggleLock(key: string)       // Click lock (legacy)
```

### 5.4 useSuffixCompare Hook

**Purpose**: Year-level filtering (e.g., "Start from Year 3")  
**Output**: `{ reachableSet: Set<string> | null }`  
**Integration**: Applied in `useApplyDimmingV2` to dim nodes outside suffix

---

## 6. Styling Tokens

### 6.1 Track Overlay Styles (`src/pages/EduTree/styles/trackOverlay.css`)

**Color Tokens** (OKLCH):
```css
--track-primary: oklch(0.60 0.15 142)           /* Green */
--track-primary-bg: oklch(0.95 0.02 142)
--track-primary-border: oklch(0.60 0.15 142 / 0.3)

--track-comparison: oklch(0.70 0.18 25)         /* Orange */
--track-comparison-bg: oklch(0.95 0.02 25)
--track-comparison-border: oklch(0.70 0.18 25 / 0.3)

--track-shared: oklch(0.70 0.20 280)            /* Purple */
--track-shared-bg: oklch(0.95 0.02 280)
--track-shared-border: oklch(0.70 0.20 280 / 0.3)

--track-dim: oklch(0.50 0.02 220)
--track-dim-bg: oklch(0.90 0.02 220)

--track-ghost: oklch(0.65 0.18 190)             /* Teal */
--track-ghost-bg: oklch(0.95 0.02 190)
--track-ghost-border: oklch(0.65 0.18 190 / 0.4)
```

**Program-Specific Tints**:
```css
--cs-base-bg: oklch(0.96 0.02 210)      /* CS shared courses */
--cs-se-bg: oklch(0.96 0.02 142)        /* SE track */
--cs-ds-bg: oklch(0.96 0.02 270)        /* DS track */
--it-base-bg: oklch(0.96 0.02 25)       /* IT program */
--bsn-base-bg: oklch(0.96 0.02 340)     /* BSN program */
```

**Node Highlight Classes**:
```css
.hl--primary {
  outline: 2px solid var(--track-primary-border);
  background-color: var(--track-primary-bg);
  box-shadow: 0 0 0 1px var(--track-primary-bg),
              0 2px 8px oklch(0.60 0.15 142 / 0.2);
}

.hl--comparison {
  outline: 2px dashed var(--track-comparison-border);
  background-color: var(--track-comparison-bg);
}

.hl--both {
  outline: 3px solid var(--track-shared-border);
  background-color: var(--track-shared-bg);
  box-shadow: 0 4px 12px oklch(0.70 0.20 280 / 0.3);
}

.hl--ghost {
  outline: 2px dashed var(--track-ghost-border);
  background-color: var(--track-ghost-bg);
}
```

**Track-Specific Node Tints**:
```css
.node.cs.track--cs-base { background-color: var(--cs-base-bg) !important; }
.node.cs.track--se { background-color: var(--cs-se-bg) !important; }
.node.cs.track--ds { background-color: var(--cs-ds-bg) !important; }
.node.it.track--it-base { background-color: var(--it-base-bg) !important; }
.node.bsn.track--bsn-base { background-color: var(--bsn-base-bg) !important; }
```

**Edge Highlight Classes**:
```css
.edge--primary .react-flow__edge-path {
  stroke: var(--track-primary);
  stroke-width: 3px;
}

.edge--comparison .react-flow__edge-path {
  stroke: var(--track-comparison);
  stroke-width: 3px;
}

.edge--both .react-flow__edge-path {
  stroke: var(--track-shared);
  stroke-width: 5px;
}
```

### 6.2 Lane Colors (`src/pages/EduTree/utils/layoutTokens.ts`)

```typescript
LANE_COLORS = {
  se: {
    primary: 'hsl(var(--primary))',
    bg: 'rgba(var(--primary), 0.03)',
    border: 'rgba(var(--primary), 0.1)',
    accent: 'rgba(var(--primary), 0.15)'
  },
  ds: {
    primary: 'hsl(var(--secondary))',
    bg: 'rgba(var(--secondary), 0.03)',
    border: 'rgba(var(--secondary), 0.1)',
    accent: 'rgba(var(--secondary), 0.15)'
  }
}
```

---

## 7. Render Conditions

### 7.1 Node Visibility

**Ghost Nodes** (GUARD B in `manualLayoutRenderer.ts`):
```typescript
// Filter ghost nodes to only show for selected programs
if (selectedPrograms && selectedPrograms.length > 0) {
  safeBlocks = blocks.filter(b => {
    if (!b.is_empty_year) return true;  // Keep non-ghosts
    if (!b.program_id) return false;     // Drop orphan ghosts
    return selectedPrograms.includes(b.program_id);  // Keep selected program ghosts
  });
}
```

**Header Nodes**:
- Hidden when `node.hidden === true`
- Edges to hidden headers are filtered out (dimming layer)

### 7.2 Edge Visibility

**Handle Validation** (ULTRA-DEFENSIVE):
```typescript
// Filter edges with toxic handles at dimming layer
const hasToxicSource = (
  sourceHandle !== undefined && (
    sourceHandle === null ||
    sourceHandle === 'null' ||
    sourceHandle === 'undefined' ||
    typeof sourceHandle !== 'string' ||
    sourceHandle.trim() === '' ||
    /null|undefined|NaN/i.test(sourceHandle)
  )
);
// Same for targetHandle
```

**Self-Loop Filter**:
```typescript
if (edge.source === edge.target) return false;
```

**Hidden Header Filter**:
```typescript
const targetNode = nodes.find(n => n.id === edge.target);
if (targetNode?.data?.is_header && targetNode?.hidden === true) {
  return false;
}
```

### 7.3 Marketplace Feature Visibility

**Pills**:
```typescript
allowPills = SHOW_MP && (count > 0)
```

**Course Selection Modal**:
```typescript
open = SHOW_MP && modalOpen && requirementId
```

**Selected Course Display**:
```typescript
visible = SHOW_MP && selectedCourse
```

---

## 8. Modal Components

### 8.1 CourseSelectionModal (`src/pages/EduTree/components/CourseSelectionModal.tsx`)

**Purpose**: Browse and select courses to fulfill a requirement  
**Inputs**:
- `requirementId`: Block ID to fetch options for
- `requirementTitle`: Display title
- `planId`: User plan to add selection to
- `open`: Modal visibility state
- `onOpenChange`: Callback to close modal

**Features**:
1. **Filters** (5 controls):
   - Max Cost (input)
   - Max Duration (select: ≤8w, ≤12w, ≤16w)
   - Confidence (select: excellent, good, fair)
   - Provider Type (select: university, mooc, bootcamp, testing_center)
   - Modality (select: online, in_person, hybrid)

2. **Course Cards** (`MarketplaceCourseCard`):
   - Grid layout (1-3 columns responsive)
   - Shows: provider, title, cost, duration, confidence, modality
   - Actions: "Add to Plan", "Compare" toggle

3. **Comparison Bar**:
   - Shows selected count (max 3)
   - "Clear" button

4. **Route Summary** (sticky footer):
   - Credits, avg cost, avg duration, total options

**Data Hook**:
```typescript
useRequirementOptions(requirementId, filters, { enabled: open })
```

**Mutations**:
```typescript
useAddCourseToPlan().mutate({ planId, requirementId, courseId, providerId })
```

### 8.2 NodeOptionsPill (`src/pages/EduTree/components/NodeOptionsPill.tsx`)

**Purpose**: Single source of truth for course count display  
**Inputs**:
- `count`: Legacy prop (fallback)
- `show`: Legacy prop (fallback)
- `data`: Node data with marketplace object
- `nodeId`: For diagnostics
- `dataVersion`: For signature healing
- `onClick`: Opens modal

**Marketplace Object Structure**:
```typescript
marketplace = {
  options: CourseOption[]     // Full course objects (primary)
  optionIds: string[]         // Course IDs only
  count: number               // Capacity (how many to pick)
  choices: number             // Available choices (derived)
  resolved: number            // Last good value
  sticky: number              // Sticky cache
  allow: boolean              // Feature flag
  show: boolean               // Visibility
  signature: string           // Data version signature
}
```

**Visibility Logic**:
```typescript
show = marketplace.show && marketplace.allow && choices > 0
```

**Display**:
```typescript
"Choices: {n}"              // n = choices (not capacity)
"(pick up to {capacity})"   // If capacity !== choices
```

---

## 9. Current State Snapshot

### 9.1 Phase Status

**Phase 0**: ✅ Foundation tokens defined  
**Phase 1**: ✅ Track offsets applied (`±60px`)  
**Phase 2**: ✅ Region-aware collision resolver implemented  
**Phase 3**: ⏳ Track Focus UI (pending)

### 9.2 Known Issues

1. **Visual Balance**: Year 3 tracks still feel "squeezed" under gate despite ±60px offset
2. **Vertical Crowding**: No corridor-based vertical separation yet (Phase 2 incomplete)
3. **Console Warnings**: 
   - Filtered edges with undefined handles (GUARD warnings expected)
   - Ghost node filtering logs (GUARD B active)
4. **Marketplace Pills**: Count vs choices confusion (Phase 2 fix applied but needs validation)

### 9.3 Active Guards

- **GUARD B**: Ghost node filtering for selected programs only
- **ULTRA-DEFENSIVE**: Handle validation in dimming layer
- **Signature Healing**: `normalizeOrRebuildSig` at read time

---

## 10. File Index

### Core Files (Critical Path)
```
src/pages/EduTree/
├── EduTreeV2Page.tsx                 # Entry point
├── EduTreeCanvasV2.tsx               # Main canvas (1823 lines)
├── index.tsx                         # Re-export
│
├── data/
│   ├── seedDataV2.ts                 # Golden layout seed (886 lines)
│   ├── programMetadata.ts            # Program definitions
│   └── validation.ts                 # Data model validators
│
├── utils/
│   ├── layoutTokens.ts               # Layout constants (195 lines)
│   ├── layoutConstants.ts            # Old working positions (31 lines)
│   ├── deterministicGrid.ts          # Track offsets (191 lines)
│   ├── manualLayoutRenderer.ts       # Position mapper + resolver (1676 lines)
│   ├── laneNormalize.ts              # Ghost node injection
│   ├── gateAggregation.ts            # Gate marketplace rollup
│   ├── dataMerge.ts                  # Seed + DB merge
│   ├── signature.ts                  # Data version signatures
│   └── debug.ts                      # Trace logging
│
├── hooks/
│   ├── useEduTreeV2Data.ts           # Main data hook (911 lines)
│   ├── useApplyDimmingV2.ts          # Dimming logic (481 lines)
│   ├── useRequirementOptionsBatch.ts # Marketplace data
│   ├── useTransferRulesByBlock.ts    # Transfer rules
│   ├── useUserPlanSelections.ts      # User selections
│   ├── useSuffixCompare.ts           # Year filtering
│   └── useBlockIndex.ts              # Key resolution
│
├── nodes/
│   └── HeaderNode.tsx                # Program/track badges
│
├── components/
│   ├── EmptyYearNode.tsx             # Ghost nodes
│   ├── NodeOptionsPill.tsx           # Course count pill
│   ├── CourseSelectionModal.tsx      # Course browser
│   ├── CourseOptionsList.tsx         # Node-level list
│   ├── MarketplaceCourseCard.tsx     # Course card
│   ├── CheckpointControls.tsx        # Gate unlocks
│   ├── ComparePicker.tsx             # Dropdown selection
│   ├── ComparisonLegend.tsx          # Overlay legend
│   └── ... (30+ other components)
│
├── ctx/
│   └── PathHighlightContext.tsx      # Selection state
│
└── styles/
    ├── trackOverlay.css              # Highlight styles (250 lines)
    ├── gateAggregation.css           # Gate chip styles
    └── reactFlowFix.css              # ReactFlow overrides
```

### Supporting Files
```
src/hooks/
├── useBatchRequirementOptions.ts     # Batch course fetch
├── useRequirementOptions.ts          # Single requirement fetch
├── useUserPlan.ts                    # User plan CRUD
└── useAddCourseToPlan.ts             # Plan mutations

src/lib/
├── featureFlags.ts                   # Feature flag hook
└── queryKeys.ts                      # React Query keys

cypress/e2e/
├── visual_v2_implementation.cy.ts    # V2 tiers + routing
├── visual_v2_validation.cy.ts        # Post-fix validation
├── visual_v2_surgical.cy.ts          # Quality gates
├── visual_v2_smoke.cy.ts             # Smoke tests
└── skilltree3_visual_scan.cy.ts      # Regression checks
```

---

## 11. Next Steps (Phase 3: Track Focus UI)

### 11.1 Goals
1. **Visual Corridors**: Add visible region bands for programs and track lanes
2. **Interactive Focus**: Click track header to "zoom" into that track's corridor
3. **Dim Peers**: Fade other tracks while focusing on one
4. **Responsive Layout**: Adapt corridor heights based on content

### 11.2 Technical Approach
1. Add `<LaneCorridor>` overlay components to Canvas
2. Compute corridor bounds from `computeProgramRegions`
3. Extend `PathHighlightContext` with `focusedTrack` state
4. Add "Focus" button to track headers
5. Animate corridor expansion/collapse

### 11.3 Research Questions
- How to handle IT program (no tracks)?
- Should BSN program get its own corridor?
- Corridor visibility: always-on or toggle?
- Focus mode: exclusive or additive?

---

**End of Diagnostic Baseline**
