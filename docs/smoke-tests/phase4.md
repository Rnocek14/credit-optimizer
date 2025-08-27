# Phase 4 Smoke Test Checklist

## Overview
This document provides step-by-step manual testing procedures to verify Phase 4 Course Intelligence integration is working correctly across all components.

## Prerequisites
- User must be signed in
- At least one career track created
- Internet connection for external course APIs

---

## Test 1: Explore Page - Course Intelligence Dashboard

### Steps:
1. **Navigate to Explore page**
   - Sign in to the application
   - Click on "Explore" in navigation

### Expected Outcomes:
- ✅ CRI Gauge displays with current score (0-100)
- ✅ CRI Gauge has proper ARIA labels (`aria-label="CRI <value> out of 100"`)
- ✅ Skill Breakdown Bars show skill components with progress
- ✅ Skills are keyboard focusable and have visible labels
- ✅ "Recommended Courses" section loads without errors
- ✅ No JavaScript console errors

### Actions to Test:
2. **Save a course**
   - Click "Save" button on any recommended course
   - Verify toast notification appears
   - Check browser network tab for telemetry event (`explore_reco_action`)

3. **Open a course (safe URL)**
   - Click "Open" button on a course with trusted domain
   - Verify new tab opens with course URL
   - Check network tab for telemetry event

4. **Test URL security**
   - Manually modify a course URL to untrusted domain (if possible in dev tools)
   - Attempt to open - should show security error toast
   - No navigation should occur

---

## Test 2: Plans Page - Learning Management

### Steps:
1. **Navigate to Plans page**
   - Click on "Plans" in navigation

### Expected Outcomes:
- ✅ Current CRI displayed for active track
- ✅ Saved Courses grouped by status (Saved/In Progress/Completed)
- ✅ Projected CRI calculation visible
- ✅ Track selector shows all non-archived tracks

### Actions to Test:
2. **Start a saved course**
   - Find course with "Saved" status
   - Click "Start" button
   - Verify status changes to "In Progress"
   - Check Projected CRI updates

3. **Complete an in-progress course**
   - Find course with "In Progress" status
   - Click "Complete" button
   - Enter completion score (e.g., 85%)
   - Submit completion
   - Verify status changes to "Completed"
   - Check Projected CRI updates (should exclude completed course)

4. **Switch tracks**
   - Select different track from dropdown
   - Verify CRI and course lists update for new track
   - Confirm data isolation (no courses from other tracks visible)

---

## Test 3: Transcript Page - Trust Transcript

### Steps:
1. **Navigate to Transcript page**
   - Click on "Transcript" in navigation

### Expected Outcomes:
- ✅ Trust Transcript header displays
- ✅ Current CRI score shown
- ✅ User profile information visible
- ✅ Completed courses listed with details

### Completed Course Details Should Include:
- ✅ Course title
- ✅ Platform name (badge)
- ✅ Difficulty level (badge)
- ✅ Duration (badge)
- ✅ Instructor name and rating (if available)
- ✅ Completion date
- ✅ Score percentage (if available)
- ✅ CRI contribution points

### Actions to Test:
2. **Export PDF**
   - Click "Export PDF" button
   - Verify browser print dialog opens
   - Check network tab for telemetry event (`transcript_export`)
   - Cancel print dialog (or complete if desired)
   - Verify toast notification appears

3. **Add transcript entry**
   - Fill out "Add New Transcript Entry" form:
     - Title: "Test Course Entry"
     - Description: "Testing manual entry functionality"
     - Grade: "A+"
     - Credits: "3.0"
     - Difficulty: "Intermediate"
     - Skills: "JavaScript, Testing"
   - Submit form
   - Verify entry appears in transcript list
   - Check that CRI score is calculated and displayed

---

## Test 4: Maya Integration - Course Recommendations

### Steps:
1. **Trigger Maya insight**
   - Navigate to a page where Maya insights appear
   - Wait for Maya card to load

### Expected Outcomes:
- ✅ Maya insight card displays
- ✅ Course recommendations hydrate correctly
- ✅ "Save to Plan" buttons functional

### Actions to Test:
2. **Save course from Maya**
   - Click "Save to Plan" on any course recommendation
   - Verify success notification
   - Navigate to Plans page
   - Confirm course appears in saved courses
   - Check network tab for telemetry (`maya_course_save`)

---

## Test 5: Multi-Track Data Isolation

### Steps:
1. **Create/Switch between tracks**
   - Ensure you have at least 2 career tracks
   - Save different courses to each track
   - Switch between tracks using track selector

### Expected Outcomes:
- ✅ CRI scores are track-specific
- ✅ Saved courses are isolated per track
- ✅ Recommendations adapt to track context
- ✅ No data leakage between tracks

---

## Test 6: Error Handling & Recovery

### Steps:
1. **Test network failures**
   - Temporarily disable internet connection
   - Navigate to Explore page
   - Verify error boundaries display properly
   - Re-enable internet and click retry buttons

### Expected Outcomes:
- ✅ Error boundaries catch failures gracefully
- ✅ User-friendly error messages displayed
- ✅ Retry functionality works
- ✅ No application crashes

### Actions to Test:
2. **Test malicious URL prevention**
   - Attempt to open course with untrusted domain
   - Verify security error message
   - Confirm no navigation occurs

---

## Test 7: Accessibility & Performance

### Steps:
1. **Keyboard navigation**
   - Use Tab key to navigate through all interactive elements
   - Test CRI gauges, skill bars, buttons, and forms
   - Verify focus indicators are visible

2. **Screen reader testing** (if available)
   - Use screen reader to verify ARIA labels
   - Test CRI gauge announcements
   - Check skill breakdown accessibility

3. **Performance check**
   - Monitor Network tab for excessive API calls
   - Verify course data caching (repeated requests should use cache)
   - Check console for performance warnings

### Expected Outcomes:
- ✅ All interactive elements keyboard accessible
- ✅ Proper ARIA labels and roles
- ✅ Course data cached for 5 minutes
- ✅ No redundant API calls
- ✅ Fast loading times

---

## Test 8: Telemetry Verification

### Network Tab Events to Verify:
- ✅ `explore_reco_view` - when recommendations load
- ✅ `explore_reco_action` - on save/open course actions
- ✅ `plan_view` - when Plans page loads
- ✅ `plan_action` - on course status changes
- ✅ `resume_view` - when Transcript page loads
- ✅ `transcript_export` - on PDF export
- ✅ `maya_reco_view` - when Maya recommendations render
- ✅ `maya_course_save` - when saving from Maya

---

## Success Criteria Summary

**All tests must pass with the following criteria:**
- ✅ No JavaScript console errors
- ✅ All telemetry events properly logged
- ✅ URL sanitization prevents malicious navigation
- ✅ Error boundaries handle failures gracefully
- ✅ Multi-track data isolation maintained
- ✅ Accessibility standards met
- ✅ Course data properly cached
- ✅ Projected CRI calculations accurate

**Estimated Completion Time: 7 minutes**

---

## Troubleshooting

**If any test fails:**
1. Check browser console for errors
2. Verify network requests in DevTools
3. Confirm user authentication status
4. Check active track selection
5. Verify Supabase RLS policies are working

**Common Issues:**
- Missing telemetry events → Check `trackTelemetryEvent` imports
- Security errors → Verify `sanitizeUrl` implementation
- Data not loading → Check Supabase queries and RLS policies
- CRI calculations wrong → Verify edge function responses