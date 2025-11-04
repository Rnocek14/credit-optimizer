# QA Testing Guide — Exploration Mode A/B Test

This document covers the testing strategy for the Exploration Mode A/B test, including how to run tests, force bucket assignments, and seed test data.

## Overview

The QA suite includes:
- **Cypress E2E tests**: Browser-based tests for user flows and A/B assignment
- **Vitest unit tests**: Fast unit tests for core utilities and state management
- **Manual testing aids**: LocalStorage overrides and test data seeding

## Running Tests

### E2E Tests (Cypress)

```bash
# Interactive mode (recommended for development)
pnpm cypress open

# Headless mode (CI/CD)
pnpm cypress run

# Run specific spec
pnpm cypress run --spec "cypress/e2e/exploration_mode.cy.ts"
```

### Unit Tests (Vitest)

```bash
# Watch mode (recommended for development)
pnpm test

# Run once
pnpm test run

# With coverage
pnpm test run --coverage

# Run specific test file
pnpm test src/utils/__tests__/abTesting.test.ts
```

## Manual Testing — A/B Bucket Assignment

### Force Bucket A (Exploration OFF)

1. Open DevTools Console
2. Run: `localStorage.setItem('v5_exploration_mode', 'false')`
3. Reload the page
4. Exploration banner should NOT appear on satisfied modules

### Force Bucket B (Exploration ON)

1. Open DevTools Console
2. Run: `localStorage.setItem('v5_exploration_mode', 'true')`
3. Reload the page
4. Exploration banner SHOULD appear on satisfied modules

### Clear Override (Use Natural A/B Assignment)

```js
localStorage.removeItem('v5_exploration_mode')
```

Your bucket will be determined by a stable hash of your user ID or session ID.

## Creating Test Data

### Seed a "Satisfied Module" Quickly

For local development, you need a module that:
1. Has requirements
2. All requirements are satisfied
3. Has template alternatives available

**Quick setup:**

1. Navigate to `/edu-tree-v5`
2. Open browser console and run:
   ```js
   // Force bucket B to see exploration mode
   localStorage.setItem('v5_exploration_mode', 'true')
   
   // Add courses to satisfy a module
   // (Adjust based on your actual data structure)
   const store = window.usePlanStore.getState()
   store.addCourseToSemester('1-fall', 'CS101', 3)
   ```
3. Reload the page
4. Look for modules with a "satisfied" badge
5. Open the templates panel for that module

## Key Test Scenarios

### 1. A/B Assignment
- [x] Users are assigned to A or B deterministically (stable across sessions)
- [x] Override via localStorage works correctly
- [x] Assignment is logged once per session
- [x] Bucket information is included in telemetry events

### 2. Exploration Flow (Bucket B)
- [x] Banner appears on satisfied modules
- [x] Templates load correctly
- [x] Preview dialog shows template details
- [x] Apply button replaces only the target module
- [x] `was_exploratory` flag is set correctly in telemetry

### 3. Control Experience (Bucket A)
- [x] No exploration banner shown
- [x] Standard template behavior remains unchanged
- [x] No exploratory telemetry flags

### 4. Clear Year
- [x] Clears only the target year (fall, spring, summer)
- [x] Other years remain untouched
- [x] Button is disabled after clear
- [x] Focus returns to year heading (a11y)
- [x] Template queries are invalidated
- [x] Legacy summer keys are handled without errors

## Debugging Tips

### Check Current Bucket Assignment

```js
// In browser console
import { getABBucket } from '@/utils/abTesting'
import { getClientSessionId } from '@/utils/telemetrySampling'

const userId = getClientSessionId()
console.log('User:', userId)
console.log('Bucket:', getABBucket(userId))
```

### View Stored Plan Data

```js
// Check current plan store state
const store = window.usePlanStore?.getState?.()
console.log('Selections:', store?.selections)
console.log('Semesters:', store?.semesters)
```

### Clear All Local Storage

```js
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-deployment checks

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: pnpm cypress run --browser chrome

- name: Run Unit Tests
  run: pnpm test run --coverage
```

## Test Coverage Goals

- **A/B utilities**: 100% (deterministic assignment, overrides, tracking)
- **Plan store**: 90%+ (focus on clearYear and state mutations)
- **E2E critical paths**: 80%+ (exploration flow, clear year, bucket forcing)

## Adding New Tests

### When to Add E2E Tests
- New user-facing features in the exploration flow
- Critical path regressions
- Cross-component integration scenarios

### When to Add Unit Tests
- New utility functions
- State management logic
- Complex calculations or transformations

## Known Limitations

1. **Cypress cannot access auth-protected pages**: Tests run in isolation without real user sessions
2. **No backend mocking in E2E**: Tests assume static data or localStorage state
3. **Telemetry validation**: E2E tests verify console logs, not actual analytics events

## Next Steps

After QA is stable:
1. Monitor analytics dashboard for 24-72 hours
2. If Bucket B shows lift, consider ramping exposure (80/20)
3. Add smart recommendation logic based on telemetry patterns
4. Extend tests for recommendation accuracy

## Questions?

Check the main project README or ask in #engineering-qa.
