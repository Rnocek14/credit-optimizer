# Credit Optimizer Testing Guide

## Overview

The Credit Optimizer feature analyzes users' degree plans and suggests cost-saving course swaps while maintaining compliance with degree requirements.

## Feature Flag

Toggle credit optimizer on/off in `EduTreeV5Page.tsx`:
```typescript
const ENABLE_CREDIT_OPTIMIZER = true; // Set to false to disable
```

## Test Scenarios

### 1. Banner Should NOT Show

**Scenario A: Empty Plan**
- Navigate to `/edu-tree-v5`
- Don't add any courses
- Expected: No credit optimizer banner

**Scenario B: Small Savings (Below Threshold)**
- Add courses with savings < $1000 AND < 3 months
- Expected: No credit optimizer banner

**Scenario C: No Cheaper Alternatives**
- Add only the cheapest marketplace options
- Expected: No credit optimizer banner

**Scenario D: Feature Flag Disabled**
- Set `ENABLE_CREDIT_OPTIMIZER = false`
- Add courses with potential savings
- Expected: No credit optimizer banner

### 2. Banner SHOULD Show

**Scenario: Significant Savings Available**
- Add expensive courses (e.g., university credits)
- Ensure cheaper alternatives exist (e.g., Sophia, Study.com)
- Savings should be ≥ $1000 OR ≥ 3 months
- Expected: Amber banner appears with savings summary

### 3. Banner Interactions

**Dismiss Button:**
- Click "Dismiss" on banner
- Expected: Banner disappears and doesn't reappear this session

**Show Me Button:**
- Click "Show me" on banner
- Expected: Modal opens with detailed breakdown

### 4. Modal Display

**Content Verification:**
- Check current vs optimized plan costs/months
- Verify savings calculation
- Review top 5 course swaps
- Confirm "Keep my plan" and "Apply these changes" buttons present
- Verify disclaimer text at bottom

**Swap Details:**
- Each swap shows: requirement label, old course, new course, savings
- Provider names displayed correctly
- Cost savings per swap shown

### 5. Apply Optimization

**Happy Path:**
- Open modal
- Click "Apply these changes"
- Expected:
  - Button shows "Applying..." during operation
  - Courses swap in basket (check module cards)
  - Success toast appears
  - Modal closes
  - Banner doesn't reappear
  - Plan totals update correctly

**Module-Specific Removal:**
- Add same course to multiple modules
- Apply optimization that swaps course in ONE module
- Expected: Only that module's course is replaced, other module unchanged

### 6. Edge Cases

**No Marketplace Options:**
- If marketplace data is missing
- Expected: Graceful handling, no crash

**Invalid Course IDs:**
- If a swap references non-existent course
- Expected: Skip that swap, show warning in console, continue with others

**Multiple Quick Clicks:**
- Click "Apply these changes" multiple times quickly
- Expected: Button disabled during processing, no duplicate operations

### 7. Analytics Tracking

Check browser console for telemetry events:

**Expected Events:**
- `credit_optimizer_banner_shown` - when banner appears
- `credit_optimizer_banner_dismissed` - when user dismisses banner
- `credit_optimizer_modal_opened` - when modal opens
- `credit_optimizer_modal_closed` - when user clicks "Keep my plan"
- `credit_optimizer_applied` - when user applies changes
- `credit_optimizer_apply_error` - if application fails

**Event Data to Verify:**
- cost_saved, months_saved, swaps_count included in events

### 8. Visual/UX Testing

**Banner Design:**
- Amber background, clear message
- 💡 emoji present
- Responsive layout (test mobile)
- Buttons properly styled

**Modal Design:**
- Centered overlay, blurred background
- Summary card with clear before/after
- Green savings text
- Scrollable swap list if > 5 items
- Proper dark mode support

**Accessibility:**
- Modal can be closed with X button
- Proper focus management
- Buttons have clear labels

### 9. Performance

**Large Plans:**
- Add 20+ courses to plan
- Expected: Optimizer completes analysis quickly (< 2 seconds)
- No UI freezing

**Frequent Updates:**
- Add/remove courses rapidly
- Expected: Optimizer doesn't trigger excessive re-calculations

## Test Data Setup

### Quick Setup for Testing:

1. **Navigate to planner:** `/edu-tree-v5`
2. **Add expensive courses** from modules
3. **Verify marketplace has cheaper alternatives**
4. **Wait for banner** (should appear automatically)

### Example Test Plan:

```javascript
// In browser console (if needed):
window.localStorage.setItem('v5.useDatabase', 'false'); // Use fixtures
window.location.reload();

// Then manually add courses or use auto-fill
```

## Known Limitations

1. **Policy Compliance:** Currently shows optimistic message. Real validation coming in future version.
2. **Deduplication:** One swap per module maximum (intentional for v1).
3. **Time Savings:** Estimated heuristically, not calculated from detailed scheduling.

## Debugging

### Enable Debug Logging:
Check console for `[Credit Optimizer]` prefixed logs:
- Analysis start/end
- Swap generation
- Application process

### Common Issues:

**Banner not showing:**
- Check `ENABLE_CREDIT_OPTIMIZER` flag
- Verify basket has courses
- Check savings meet threshold
- Look for errors in console

**Apply fails:**
- Check marketplace options data structure
- Verify course IDs match
- Look for telemetry error events

**Wrong courses removed:**
- Check module IDs in swaps
- Verify basket item structure
- Console log swap details

## Success Criteria

✅ Banner appears when savings ≥ $1000 or ≥ 3 months  
✅ Modal shows accurate before/after comparison  
✅ Apply successfully replaces courses  
✅ Analytics events fire correctly  
✅ No console errors during normal operation  
✅ Feature flag works for enable/disable  
✅ Module-specific course removal works correctly  
✅ UI responsive on mobile and desktop  

## Next Steps After QA

1. Monitor analytics for user engagement
2. Gather feedback on suggested swaps accuracy
3. Implement real policy validation
4. Add more sophisticated optimization algorithms
5. Consider A/B testing different thresholds
