# Next Steps - Technical Debt & Enhancements

## Completed ✅

### Critical Issues Fixed
- **Store consolidation:** Removed `activeTrackId` from `usePathStore`, consolidated to `useActiveTrackStore`
- **Auth migration:** Replaced `supabase.auth.getUser()` with `getCurrentUser()` in critical hooks
- **Feature flag cleanup:** Consolidated duplicate logging to single session-based log
- **RLS policies:** Added dev user policies for `career_tracks` and `course_progress_track_usage`
- **UI improvements:** Added debug banners gated by `?alt_debug=1`

### Components Updated
- `src/hooks/useTrackTranscript.ts` - Auth migration complete
- `src/lib/featureFlags.ts` - Consolidated logging  
- `src/components/TodayDashboard.tsx` - Removed duplicate logs, added debug gate
- `src/components/AlternativeCoursesList.tsx` - Removed duplicate logs
- `src/components/HubNavigation.tsx` - Fixed to use `useActiveTrackStore`
- `src/hooks/useTrackParamSync.ts` - Fixed to use `useActiveTrackStore`  
- `src/pages/Build.tsx` - Fixed to use `useActiveTrackStore`
- `src/stores/usePathStore.ts` - Removed conflicting `activeTrackId`

## Low Priority Technical Debt 🔧

### 1. Complete Auth Migration (Medium)
**Status:** 85% complete, 93 files still using `supabase.auth.getUser()`

**Remaining files to migrate:**
```
src/components/AdminCourseReview.tsx
src/components/EnhancedMarketAlertSystem.tsx  
src/components/MarketAlertSystem.tsx
src/components/SaveButton.tsx
src/hooks/useCourseProgress.ts
src/hooks/useTeaching.ts
... (and ~50 others)
```

**Migration pattern:**
```typescript
// Before:
const { data: { user } } = await supabase.auth.getUser();

// After:  
const user = await getCurrentUser();
```

### 2. PathStore Cleanup (Low)
**Status:** Store marked as deprecated but still functional

**Clean up tasks:**
- Remove `lastOpenedTrackId` logic entirely  
- Simplify PathStore interface
- Update components still using deprecated methods

### 3. Enhanced Error Boundaries (Low)
**Status:** Basic error handling in place

**Improvements needed:**
- Add error boundaries around `<AlternativeCoursesList />`
- Add error boundaries around track selection components
- Improve error recovery UX

### 4. Performance Optimizations (Low)
**Status:** Functional but could be optimized

**Opportunities:**
- Memoize expensive React Query selectors
- Add React.memo to prevent unnecessary re-renders
- Optimize bundle size by lazy loading more components

## Optional Enhancements 🚀

### 1. Alternative Courses UI Polish (Low)
- Add skeleton loading states during course resolution
- Improve empty state messaging  
- Add bulk operations (tag multiple courses)
- Add course category filtering

### 2. Advanced Track Management (Low)
- Track templates/presets
- Track sharing between users
- Track analytics and insights
- Bulk track operations

### 3. Enhanced Debug Tools (Low)
- Admin panel for viewing RLS policy status
- Debug panel for React Query cache inspection
- Performance monitoring dashboard
- User impersonation for debugging

### 4. Test Coverage (Low)
**Current:** Basic smoke tests
**Needed:** 
- Unit tests for critical hooks (`useActiveTrackStore`, `useTrackTranscript`)
- Integration tests for track creation/switching flows  
- E2E tests for alternative courses workflow

### 5. Documentation Updates (Low)
- API documentation for edge functions
- Component architecture diagrams
- Troubleshooting guide for common issues
- Deployment guide for new environments

## Security Considerations 🔒

### 1. RLS Policy Review (Medium)
**Status:** Dev policies added, need comprehensive review

**Action items:**
- Audit all RLS policies for least-privilege access
- Test edge cases (archived tracks, shared tracks)
- Validate admin vs user permissions  
- Test with real user accounts

### 2. Edge Function Security (Medium)
**Status:** Basic CORS and auth in place

**Improvements:**
- Rate limiting for alt-resolve function
- Input validation and sanitization
- Monitoring and alerting for abuse
- Secret rotation strategy

### 3. Client-Side Security (Low)
**Status:** No secrets exposed, good practices followed

**Monitoring:**
- Regular dependency security scans
- CSP headers review
- XSS prevention audit

## Monitoring & Observability 📊

### 1. Error Tracking (Medium)
- Implement Sentry or similar for error tracking
- Add custom error boundaries with reporting
- Monitor edge function failures
- Track RLS policy violations

### 2. Performance Monitoring (Low)  
- Core Web Vitals tracking
- React Query performance metrics
- Edge function latency monitoring
- Database query performance

### 3. User Analytics (Low)
- Track feature adoption (alternative courses, track switching)
- Monitor user journey completion rates
- A/B test new UI improvements
- Identify drop-off points

## Estimated Effort 📈

| Category | Priority | Effort | Impact |
|----------|----------|--------|--------|
| Complete auth migration | Medium | 2-3 days | High |
| RLS policy review | Medium | 1 day | High |
| Error boundaries | Low | 1 day | Medium |
| UI polish | Low | 3-5 days | Medium |
| Test coverage | Low | 5-7 days | High |
| Documentation | Low | 2-3 days | Medium |

## Decision Framework 🎯

**Do Next:**
1. Items marked "Medium" priority
2. High impact, low effort items
3. Items blocking future features

**Do Later:**
1. Items marked "Low" priority  
2. Nice-to-have enhancements
3. Items requiring significant architectural changes

**Don't Do:**
1. Items that break existing functionality
2. Over-engineering for edge cases
3. Features without clear user value

---

*Generated by: Deep Scan + Auto-Fix Master*  
*Status: System operational, technical debt managed*