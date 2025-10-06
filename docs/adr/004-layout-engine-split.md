# ADR 004: Split layout engine from data enrichment and UI

**Date:** 2025-10-06  
**Status:** Accepted  
**Context:** Week 1 implementation

## Decision

Pure functions in `engine/*` with no React dependencies, no side effects, and complete framework independence.

## Architecture

```
engine/
├── layoutEngine.ts      - X/Y assignment by year/lanes
├── regionManager.ts     - Program/track corridor calculation
├── collisionResolver.ts - Region-aware vertical nudging
├── overlapValidator.ts  - Overlap detection (dev + tests)
└── index.ts            - Orchestrator
```

## Rationale

### Determinism
- Same input → same output (always)
- Positions are reproducible across sessions
- No hidden state or async operations

### Testability
- Pure functions = easy unit testing
- No mocking React/hooks/context
- Fast test execution (<50ms for 200 nodes)

### Performance
- Profile-friendly (no React overhead)
- Can optimize hot paths independently
- Easy to parallelize if needed

### Maintainability
- Clear separation of concerns
- Engine can be extracted to separate package
- UI consumes engine as black box

## Constraints

**MUST NOT** in `engine/*`:
- Import `react` or `reactflow`
- Use `localStorage`, `window`, or DOM APIs
- Have side effects (console.warn in DEV only, gated)
- Return undefined/null (all positions required)

**MUST** in `engine/*`:
- Accept explicit parameters (no ambient context)
- Return new objects (immutability)
- Use frozen `LAYOUT_TOKENS` only
- Snap all coordinates to grid

## Consequences

### Benefits
- Engine can be reused in non-React contexts
- Easy to add automated layout tests
- Performance profiling is straightforward
- Future: WebWorker/OffscreenCanvas support

### Trade-offs
- Slight verbosity (explicit params everywhere)
- Need adapters to wire into React
- Initial learning curve for contributors

## Validation

ESLint rule enforces no React imports:
```json
{
  "files": ["src/pages/EduTree/v3/engine/**/*.ts"],
  "rules": {
    "no-restricted-imports": ["error", { "paths": ["react", "reactflow"] }]
  }
}
```

## Next Steps (Week 2)

- Add `dataEnricher.ts` (still pure, single pass)
- Add `v2Adapter.ts` to convert seed data → V3Graph
- Keep engine functions untouched (tested ✅)
