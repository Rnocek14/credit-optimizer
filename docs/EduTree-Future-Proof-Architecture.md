# EduTree Future-Proof Architecture

## Overview
The EduTree highlighting system has been refactored to be completely generic and future-proof for adding new degrees and tracks without code changes.

## Key Architectural Changes

### 1. Dynamic Track-to-Program Mapping
**Location**: `src/pages/EduTree/hooks/useApplyDimming.ts`

```typescript
// Build track-to-program mapping dynamically from nodes
const trackToProgram = useMemo(() => {
  const map = new Map<string, string>();
  for (const node of nodes) {
    const blockish = extractBlockish(node);
    if (blockish?.track_id && blockish?.program_id) {
      map.set(blockish.track_id, blockish.program_id);
    }
  }
  return map;
}, [nodes]);
```

**Benefits**:
- No hard-coded program IDs (removed `bs_cs` hardcoding)
- Works automatically with any program/track combination
- Built from actual node data, ensuring consistency

### 2. Generic Shared Logic
**Before** (hard-coded):
```typescript
const isProgramShared = !nodeTrack && nodeProgram === 'bs_cs' && 
                       (activeTrack === 'se' || activeTrack === 'ds');
```

**After** (generic):
```typescript
const activeProgram = activeTrack ? trackToProgram.get(activeTrack) ?? null
                                  : (kind === 'program' ? val : null);
const isProgramShared = !nodeTrack && !!activeProgram && nodeProgram === activeProgram;
```

### 3. Program Headers Support
**Location**: `src/pages/EduTree/utils/manualLayoutRenderer.ts`

Program headers are automatically created for `compare-programs` mode:
- `program-header:bs_cs` → "BS Computer Science"  
- `program-header:bs_it` → "BS Information Technology"

### 4. Enhanced Debug Controls
**Location**: `src/pages/EduTree/dev/HighlightDiagnostics.tsx`

Added program-level controls:
- Preview buttons: "CS Program", "IT Program"
- Lock buttons: "🔒CS", "🔒IT"
- Works alongside existing track controls

## Data Hierarchy Patterns

### Program/Track/Block Relationship
```
Program (e.g., bs_cs, bs_it)
├── Tracks (e.g., se, ds) [only for CS program]
│   └── Track-specific blocks (track_id: 'se'|'ds', program_id: 'bs_cs')
├── Program-shared blocks (track_id: null, program_id: 'bs_cs'|'bs_it')
└── Globally-shared blocks (track_id: null, program_id: null) [Y1 blocks]
```

### Highlighting Rules
1. **Track highlighting** (`track:se`):
   - Primary: Blocks with `track_id: 'se'`
   - Shared: Globally shared + program shared within CS
   - Dimmed: All other blocks (including IT program blocks)

2. **Program highlighting** (`program:bs_it`):
   - Primary: Blocks with `program_id: 'bs_it'`
   - Shared: Globally shared blocks (Y1)
   - Dimmed: All other program blocks

## Adding New Degrees - Guidelines

### 1. Data Structure Requirements
Ensure all blocks have consistent metadata:
```typescript
interface BlockMetadata {
  program_id: string;        // Required: 'bs_cs', 'bs_it', 'bs_new'
  track_id?: string | null;  // Optional: track code if applicable
}
```

### 2. Naming Conventions
- **Programs**: `bs_[abbreviation]` (e.g., `bs_cs`, `bs_it`, `bs_eng`)
- **Tracks**: Short codes (e.g., `se`, `ds`, `ai`, `web`)
- **Headers**: 
  - Program: `program-header:[program_id]`
  - Track: `track-header:[track_code]`

### 3. Header Creation Pattern
Add new program to `createHeaderNodes()` function:
```typescript
if (filterMode === 'compare-programs') {
  return [
    // existing headers...
    {
      id: 'program-header:bs_new',
      data: { 
        label: 'BS New Program',
        program_id: 'bs_new',
        track_id: null
      }
    }
  ];
}
```

### 4. Debug Controls Pattern  
Add new controls to `HighlightDiagnostics.tsx`:
```typescript
<button onClick={() => ctx?.preview('program:bs_new')}>
  New Program
</button>
<button onClick={() => ctx?.toggleLock('program:bs_new')}>
  🔒New
</button>
```

## Filter Modes

### compare-tracks
- **Purpose**: Compare SE vs DS tracks within CS program
- **Headers**: Track headers (`track-header:se`, `track-header:ds`)
- **Shared Logic**: Global + CS program shared blocks

### compare-programs  
- **Purpose**: Compare entire degree programs (CS vs IT)
- **Headers**: Program headers (`program-header:bs_cs`, `program-header:bs_it`)
- **Shared Logic**: Only globally shared blocks

### Single Modes
- **track:[code]**: Highlight single track (e.g., `se`, `ds`)
- **program:[id]**: Highlight single program (e.g., `bs_cs`, `bs_it`)

## Current Limitations & Future Work

### Dual Data Systems
- **V2 Seed Data**: Used for layout and highlighting
- **Supabase Data**: Used for course content
- **Recommendation**: Consolidate to single source of truth

### Course Content
- IT blocks currently lack course data (`blockMembers`)
- Need to populate IT courses for full functionality
- Course highlighting inherits from parent block membership

### Extensibility Validation
- Add automated tests for new program/track additions
- Validate metadata consistency across data sources
- Ensure header creation works for arbitrary program counts

## Testing Checklist

When adding new degrees:
1. ✅ All blocks have consistent `program_id`/`track_id`
2. ✅ Headers render correctly in compare modes
3. ✅ Highlighting logic works without hard-coded references
4. ✅ Debug controls include new program/track options
5. ✅ Shared blocks behave correctly across all modes
6. ✅ Course data populated (if showing course content)

## Architecture Benefits

- **Zero Code Changes**: New programs work automatically
- **Consistent Behavior**: Same highlighting rules for all degrees
- **Performance**: Dynamic mapping cached with useMemo
- **Maintainability**: No scattered hard-coded program IDs
- **Testability**: Generic logic easier to unit test
