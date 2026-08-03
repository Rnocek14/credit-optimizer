# Smart Recommendations Integration Guide

This document explains how to integrate the smart recommendation re-ranker into the exploration mode template selection flow.

## Overview

The smart re-ranker applies learned weights to template features (cost, weeks, CRI delta, transfer acceptance, provider type) to improve recommendation quality. It's designed to be A/B tested behind the `V5_SMART_RECS` feature flag.

## Architecture

```
User -> Exploration Mode (Bucket B) -> Load Templates -> Validate -> Re-Rank (Smart Weights) -> Display
                                                              ↑
                                                        Smart Weights from DB
```

## Integration Steps

### 1. Load Smart Weights

```typescript
import { loadActiveWeights } from '@/lib/analytics/explorationApi';
import { reRankTemplates } from '@/lib/analytics/reRankTemplates';
import { supabase } from '@/integrations/supabase/client';

// In your component or hook
const weights = await loadActiveWeights(supabase);
```

### 2. Apply Re-Ranking (Conditional on Feature Flag)

```typescript
import { isExplorationEnabled, getCurrentBucket } from '@/utils/abTesting';
import { getClientSessionId } from '@/utils/telemetrySampling';

// Check if smart recs should be enabled
const userId = getClientSessionId();
const bucket = getCurrentBucket(userId);
const smartRecsEnabled = localStorage.getItem('V5_SMART_RECS') === 'true';

// After fetching and validating templates
let templates = [...validatedTemplates];

if (bucket === 'B' && smartRecsEnabled) {
  const weights = await loadActiveWeights(supabase);
  templates = reRankTemplates(templates, weights);
}

// Display templates in the new order
```

### 3. Log Smart Ranking Events

```typescript
import { logEvent } from '@/lib/analytics';

// When re-ranking is applied
logEvent('smart_recs_applied', {
  bucket,
  moduleId,
  templatesCount: templates.length,
  weightsVersion: weights.version, // if available
  topTemplateScore: templates[0]?.smartScore
});

// When user selects a template
logEvent('template_selected', {
  bucket,
  templateId: selected.id,
  smartScore: selected.smartScore,
  originalRank: originalIndex,
  newRank: smartIndex,
  wasReRanked: smartRecsEnabled
});
```

## Feature Flag Management

### Enable Smart Recs for Testing

```javascript
// Browser console
localStorage.setItem('V5_SMART_RECS', 'true')
```

### Disable Smart Recs

```javascript
localStorage.removeItem('V5_SMART_RECS')
// or
localStorage.setItem('V5_SMART_RECS', 'false')
```

## Weight Management

### Viewing Current Active Weights

```sql
SELECT * FROM smart_rank_weights WHERE active = TRUE;
```

### Updating Weights (Admin)

```sql
-- Deactivate current
UPDATE smart_rank_weights SET active = FALSE WHERE active = TRUE;

-- Insert new weights
INSERT INTO smart_rank_weights (
  version, active, notes,
  bias, w_cost, w_weeks, w_cri, w_transfer_ok,
  w_provider_ace, w_provider_clep, w_provider_nccrs, w_provider_other,
  w_exploratory_bonus, activated_at
)
VALUES (
  3, TRUE, 'Tuned from 14d telemetry - ridge regression fit',
  0.05, -0.25, -0.12, 0.28, 0.35,
  0.15, 0.08, 0.06, 0.00,
  0.08, now()
);
```

### Training Weights from Telemetry (Future)

```python
# Pseudo-code for weight training
import pandas as pd
from sklearn.linear_model import Ridge

# Load telemetry: features + binary outcome (was_applied)
df = load_exploration_telemetry(days=14)

X = df[['cost_norm', 'weeks_norm', 'cri_norm', 'transfer_ok', 
        'provider_ace', 'provider_clep', 'provider_nccrs']]
y = df['was_applied']

# Fit ridge regression
model = Ridge(alpha=0.1)
model.fit(X, y)

# Extract weights
weights = {
    'bias': model.intercept_,
    'w_cost': model.coef_[0],
    'w_weeks': model.coef_[1],
    # ... etc
}

# Insert into database as new active weights
```

## Testing Strategy

### A/B Test Design

- **Control (A)**: Standard ranking (validation score only)
- **Treatment (B)**: Smart re-ranking when `V5_SMART_RECS=true`

### Key Metrics

- **Primary**: Apply rate (explored → applied)
- **Secondary**: 
  - Time to apply (speed)
  - Cost/weeks of selected templates
  - CRI improvement
  - Satisfaction (qualitative feedback)

### Statistical Power

- Minimum sample size: 200 explorations per bucket
- Significance level: p < 0.05
- Minimum detectable effect: 5% lift in apply rate

## Monitoring

### Dashboard Queries

```sql
-- Smart recs apply rate (last 7 days)
SELECT 
  COUNT(*) FILTER (WHERE event = 'template_selected' 
                   AND props->>'wasReRanked' = 'true') AS smart_applied,
  COUNT(*) FILTER (WHERE event = 'smart_recs_applied') AS smart_shown,
  ROUND(100.0 * 
    COUNT(*) FILTER (WHERE event = 'template_selected' 
                     AND props->>'wasReRanked' = 'true')
    / NULLIF(COUNT(*) FILTER (WHERE event = 'smart_recs_applied'), 0)
  , 1) AS apply_rate
FROM analytics_events
WHERE ts >= now() - interval '7 days'
  AND props->>'bucket' = 'B';
```

### Alert Thresholds

- Apply rate < 10%: Investigate weights
- Error rate > 1%: Check weight loading/fallback logic
- Rank change > 5 positions: Validate feature normalization

## Troubleshooting

### Weights Not Loading

1. Check SQL function exists: `SELECT get_active_re_rank_weights();`
2. Verify active row: `SELECT * FROM smart_rank_weights WHERE active = TRUE;`
3. Check console for fallback warnings
4. Ensure RLS policies allow anon access (if applicable)

### Re-Ranking Not Applied

1. Verify feature flag: `localStorage.getItem('V5_SMART_RECS')`
2. Check bucket assignment: `getCurrentBucket(userId)`
3. Verify templates have required fields (validation.impact.*)
4. Check console for errors in `reRankTemplates`

### Unexpected Rankings

1. Review feature normalization (min/max ranges)
2. Check for null/undefined feature values (defaults to 0.5)
3. Validate weight magnitudes (large weights dominate)
4. Test with known good/bad templates

## Next Steps

1. ✅ Run `docs/exploration-analytics-slices.sql` in Supabase
2. ✅ Integrate re-ranker into template selection flow
3. 📊 Monitor baseline apply rates for 3-7 days
4. 🚀 Enable `V5_SMART_RECS` for bucket B
5. 📈 Compare metrics after 200+ samples per bucket
6. 🎯 Tune weights based on significance results
7. 🌐 Roll out to 100% if lift is significant and stable

## References

- [Exploration API SDK](../src/lib/analytics/explorationApi.ts)
- [Re-Ranker Implementation](../src/lib/analytics/reRankTemplates.ts)
- [A/B Testing Framework](../src/utils/abTesting.ts)
- [Statistical Significance](../src/utils/statisticalSignificance.ts)
