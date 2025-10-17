# ADR 009: V4 Year-First Layout, Tier-Based Later

**Status**: Accepted  
**Date**: 2025-10-17  
**Decision Makers**: Development Team

## Context

EduTree V4 implements a spine-first horizontal layout with year/semester organization. During development, we considered whether to implement tier-based layout (as exists in V3) for non-temporal learning paths like bootcamps, micro-credentials, and transfer-heavy journeys.

**Key considerations**:
- V4 serves institutional users (academic advisors, registrars, students in traditional programs)
- Year/semester structure matches mental models of traditional degree planning
- Tier-based layout supports decentralized, modular learning paths better
- V3 already has working `layoutByTier()` implementation

## Decision

**We will perfect V4's year-based layout FIRST, then add tier-based layout when user demand emerges.**

### Phase 1: Polish Year Layout (Current - Implemented)
✅ Remove floating semester labels (embedded in course nodes instead)  
✅ Add inline semester badges to course nodes  
✅ Fix CLEP/transfer credit positioning within year columns  
✅ Adjust year column alignment for better visual flow  
✅ Add `tier?: number` to data model (non-breaking future prep)  
✅ Visual refinements (spacing, separators, edge styling)

### Phase 2: Prepare for Tier Layout (Future)
- Port `layoutByTier()` from V3 to V4 when needed
- Add layout mode toggle (Timeline vs Pathway view)
- Auto-detect best layout based on node metadata
- Document when to use each layout mode

## Rationale

### Why Year-Based First
1. **User Needs**: Current users are institutional (universities, colleges)
2. **Mental Models**: Year/semester matches how academic planning works
3. **Trust Building**: Perfect institutional use cases before expanding to decentralized paths
4. **Polish Focus**: Layout issues (spacing, alignment, labels) are solvable within year-based architecture

### Why Not Tier-Based Yet
1. **No User Demand**: Current content (CS programs, degree plans) is calendar-based
2. **Premature Complexity**: Adding dual layout modes before validating year layout works introduces risk
3. **V3 Already Exists**: Users needing tier-based layout can use V3 (which is stable and proven)
4. **Data Model Ready**: Adding `tier?: number` now makes future port low-friction

## When to Implement Tier Layout

**Implement tier-based layout when:**
- Users request non-temporal paths (bootcamps, self-paced learning)
- Transfer-heavy plans become common (CC → multiple universities)
- Skill-first journeys need to be visualized (learn Python → build project → get job)
- Employer-integrated tracks emerge (apprenticeships, micro-credentials)

**Estimated effort**: 90 minutes to port V3's tier layout to V4

## Consequences

### Positive
✅ Faster iteration on year-based layout polish  
✅ Institutional trust built through familiar interface  
✅ Avoids premature architectural complexity  
✅ Data model supports both layouts when ready  
✅ V3 tier layout remains available for non-traditional users

### Negative
⚠️ Non-traditional learners must use V3 for now  
⚠️ Adding tier layout later requires additional QA  
⚠️ Dual layout modes may confuse users if not designed carefully

## Implementation Notes

### Data Model (Already Updated)
```typescript
interface PlanNodeData {
  year?: number;        // For year-based layout
  semester?: 'fall' | 'spring';
  tier?: number;        // For tier-based layout (future)
  // ... other fields
}
```

### Layout Engine Structure
```typescript
// v4/engine/layoutEngine.ts
export function hybridSpineLayout(nodes) { /* year-based */ }
export function layoutByTier(nodes) { /* tier-based - future */ }

// Future: Auto-detect best layout
function detectLayoutMode(nodes): 'year' | 'tier' {
  if (nodes.every(n => n.data.year && n.data.semester)) return 'year';
  if (nodes.some(n => n.data.tier !== undefined)) return 'tier';
  return 'year'; // safe default
}
```

### Visual Improvements Made
- Semester badges on course nodes (top-right corner with 🍂/🌸 emoji)
- CLEP/transfer credits positioned within semester columns
- Year column left-aligned for better visual flow
- External nodes offset slightly left (-30px) to distinguish from main courses
- Semester separators with subtle gradient
- Edge opacity refinements for better clarity

## Related Documents
- V4 Research Submission #3: Spine-First Architecture
- MapTree Executive Summary 10-6-2025: Hybrid Adaptive Graph
- Life Path Modular Degree Report: Cross-institutional pathways

## Review Date
**Q2 2026** - Assess if tier-based layout demand has emerged
