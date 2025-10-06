# ADR 003: Isolate EduTree V3 in its own namespace

**Date:** 2025-10-06  
**Status:** Accepted  
**Context:** Week 1 implementation

## Decision

Create `/pages/EduTree/v3/` behind a feature flag (`flags.eduTreeV3`); keep V2 intact and production-stable.

## Rationale

- **Safe iteration:** V3 development doesn't risk breaking V2 production code
- **A/B testing:** Can test V3 with subset of users while V2 remains default
- **Clean rollback:** Simple localStorage toggle to disable V3 if issues arise
- **Parallel development:** V2 bug fixes can proceed independently

## Consequences

### Benefits
- Zero risk to existing V2 users
- Freedom to experiment with new architecture
- Clear migration path (V3 becomes default after GA)

### Trade-offs
- Temporary code duplication (types, tokens)
- Two active codebases to maintain during transition
- Need to keep feature flag discipline

## Implementation

- Route: `/edu-tree-v3`
- Flag: `localStorage.setItem('flags.eduTreeV3', 'true')`
- Namespace: `src/pages/EduTree/v3/`
- V2 remains at: `src/pages/EduTree/` (untouched)
