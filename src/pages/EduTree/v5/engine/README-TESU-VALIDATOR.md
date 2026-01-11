# TESU Policy Validator

## Overview

The `validateTESUPolicies()` function enforces Thomas Edison State University (TESU) specific requirements that go beyond generic degree planning constraints. This validator is integrated into the Plan Audit Panel and provides real-time feedback on policy compliance.

## Validated Policies

### 1. Residency Requirement
**Rule**: Minimum 15 credits must be earned directly from TESU
- **Database Source**: `institution_credit_limits.limit_type = 'min_residency'`
- **Basket Filter**: `providerType === 'university' && providerCode === 'TESU'`
- **Severity**: Error
- **Fix Suggestion**: Replace alternative credits with TESU courses

### 2. Upper-Division Requirement
**Rule**: Minimum 30 credits at 300/400 level
- **Database Source**: `institution_credit_limits.limit_type = 'upper_division_min'`
- **Basket Filter**: `level >= 300`
- **Severity**: Error
- **Fix Suggestion**: Add more 300/400 level courses

### 3. Per-Provider Caps (Legacy / Requires Provenance)

> ⚠️ **IMPORTANT**: Per-provider caps are **only enforced when explicitly verified with provenance**.
> The authoritative policy source is `institution_policy_packs.policy_data`.
> These legacy values exist in `institution_credit_limits` but should NOT be used
> without `provenance_verified_at` confirmation.

**Rule**: Each alternative credit provider has a maximum transfer limit

| Provider | Limit Type | Legacy Cap | Status |
|----------|-----------|-------------|--------|
| CLEP | `clep_max` | 40 credits | ⚠️ Verify before enforcing |
| DSST | `dsst_max` | 30 credits | ⚠️ Verify before enforcing |
| Sophia Learning | `sophia_max` | 90 credits | ⚠️ Verify before enforcing |
| Study.com | `study_com_max` | 30 credits | ⚠️ Verify before enforcing |

- **Basket Filter**: `providerCode === [PROVIDER]`
- **Severity**: Error (only when provenance-verified)
- **Fix Suggestion**: Remove excess credits from provider or replace with other providers

### 4. Total Transfer Cap
**Rule**: Maximum 113 credits can be transferred (non-TESU credits)
- **Database Source**: `institution_credit_limits.limit_type = 'total_transfer'`
- **Basket Filter**: `providerType !== 'university' || providerCode !== 'TESU'`
- **Severity**: Error
- **Fix Suggestion**: Replace transfer credits with TESU courses

### 5. General Education Requirements
**Rule**: All gen-ed categories must be satisfied with minimum required credits

TESU BSBA Gen-Ed Categories:
- Written Communication (6 credits)
- Quantitative (3 credits)
- Humanities (6 credits)
- Social Science (6 credits)
- Natural Science (6 credits)
- Oral Communication (3 credits)
- Civic & Global (3 credits)

- **Database Source**: `gened_categories` table
- **Credit Tracking**: Via `cross_institution_equivalencies.gened_category_code`
- **Severity**: Error
- **Fix Suggestion**: Add courses in [category name] category

## Usage

### In React Components

```typescript
import { validateTESUPolicies } from '../engine/constraints';
import { useInstitutionLimits } from '@/hooks/useInstitutionLimits';
import { useGenEdCategories } from '@/hooks/useGenEdCategories';
import { useAltCreditEquivalenciesForInstitution } from '@/hooks/useAltCreditEquivalencies';

function MyComponent() {
  const { data: limits } = useInstitutionLimits('TESU');
  const { data: genEdCategories } = useGenEdCategories('TESU');
  const { data: equivalencies } = useAltCreditEquivalenciesForInstitution('TESU');
  const basket = usePlanBasket(s => s.items);

  const violations = useMemo(() => {
    if (!limits || !genEdCategories) return [];
    return validateTESUPolicies(basket, limits, genEdCategories, equivalencies);
  }, [basket, limits, genEdCategories, equivalencies]);

  // Display violations...
}
```

### In Optimizer/Engine Code

```typescript
import { validateTESUPolicies } from './constraints';

function optimizePlan(basket, limits, genEdCategories, equivalencies) {
  // ... optimization logic ...
  
  // Check policy compliance
  const violations = validateTESUPolicies(
    basket,
    limits,
    genEdCategories,
    equivalencies
  );
  
  // Filter out plans with errors
  const hasErrors = violations.some(v => v.severity === 'error');
  if (hasErrors) {
    // Handle invalid plan
  }
}
```

## Violation Object Structure

```typescript
interface Violation {
  type: 'residency' | 'upper_division' | 'provider_cap' | 'total_transfer' | 'gened_incomplete';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedCourses: string[];
  suggestedFix?: string;
  metadata?: {
    current?: number;
    required?: number;
    limit?: number;
    provider?: string;
    category?: string;
  };
}
```

## Implementation Notes

### Gen-Ed Category Lookup
The validator uses two strategies to determine gen-ed categories for basket items:

1. **Via Equivalencies**: Matches `providerCode` and `courseId` against `equivalencies` array
2. **Via requirementArea**: Uses `item.requirementArea` field if it matches a gen-ed category code

This dual approach ensures backward compatibility with different basket item structures.

### Provider Code Matching
Provider codes are matched case-insensitively:
- CLEP, Clep, clep → CLEP
- SOPHIA, sophia → SOPHIA
- STUDY_COM, study_com → STUDY_COM

### Level Parsing
Upper-division detection uses the `level` field on basket items:
```typescript
const upperDivCredits = basket
  .filter(i => (i.level ?? 0) >= 300)
  .reduce((sum, i) => sum + i.credits, 0);
```

## Testing

To test the validator:

1. **Empty Basket**: Should return violations for all gen-ed categories
2. **Over-limit CLEP**: Add 45 CLEP credits, expect provider_cap violation
3. **No Residency**: Select only alternative credits, expect residency violation
4. **No Upper-Division**: Select only 100/200 level courses, expect upper_division violation
5. **Missing Gen-Ed**: Omit Written Communication courses, expect gened_incomplete violation

## Future Enhancements

- [ ] Add confidence score warnings for low-confidence equivalencies (< 0.8)
- [ ] Support other institutions (COSC, Excelsior, WGU)
- [ ] Add prerequisite chain validation
- [ ] Check minimum grade requirements for gen-ed courses
- [ ] Validate course-level restrictions (e.g., "max 2 courses from same provider in major")

## Truth & Trust Layer Integration

This validator is part of the **verified-only truth model**:

1. **Policy Packs are authoritative** - `institution_policy_packs` holds verified data
2. **Provenance required** - Each cap requires `provenance_url` and `provenance_verified_at`
3. **Staleness gating** - Packs older than 180 days trigger SEV1 warnings
4. **Bucket mode awareness** - Enforcement differs for `separate` vs `combined` modes

For more details, see:
- `docs/TRUTH_TRUST_LAYER_SPEC.md`
- `docs/ops-dashboard-queries.sql`
- `src/pages/EduTree/v5/engine/integrityScanner.ts`
