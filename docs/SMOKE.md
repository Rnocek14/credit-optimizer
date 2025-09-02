# Multi-Track Career Planning Engine - Smoke Test Guide

## Quick Start URLs

Test the complete system with these exact URLs:

### 1. Full Debug Mode
```
/today?alt_courses=true&skill_fallback=true&alt_debug=1
```
**Expected:** 
- `[flags]` log shows all flags
- Alternative Learning card visible
- Debug banner shows flags
- Health telemetry events fire

### 2. Alternative Courses Enabled
```
/today?alt_courses=true
```
**Expected:**
- Alternative Learning card appears
- Course catalog loads
- Add/Remove functionality works

### 3. Skill Fallback Testing
```
/today?skill_fallback=true
```
**Expected:** 
- Skill tree uses fallback tags
- Compatible with alt courses

## Core Workflow Tests

### Track Management Flow
1. **Create Track**
   - Go to `/build`
   - Click "Create Track" 
   - **Verify:** `activeTrackId` set in `useActiveTrackStore`
   - **Verify:** Track persists on page reload
   - **Verify:** Auto-navigation to `/build?track=<id>`

2. **Track Selection**
   - Multiple tracks: selector shows all
   - Single track: auto-selected
   - **Verify:** Only one store manages `activeTrackId`

3. **Archive Active Track**
   - Archive the currently active track
   - **Verify:** `activeTrackId` cleared safely
   - **Verify:** Auto-selects remaining track if exactly one exists

### Alternative Courses Flow  
1. **Paste Course URL**
   ```
   Real course URL examples:
   - https://www.youtube.com/watch?v=dQw4w9WgXcQ
   - https://www.udemy.com/course/javascript-basics/
   ```
   
2. **Course Resolution**
   - **Verify:** alt-resolve edge function runs
   - **Verify:** Course preview shows (title, skills, CRI, difficulty)
   - **Verify:** Provider normalized to lowercase
   
3. **Add to Track**  
   - Click "Add to Track"
   - **Verify:** Course tagged to `user_alt_course_usage`
   - **Verify:** RLS authentication passes for dev users
   - **Verify:** Success toast appears
   
4. **Remove from Track**
   - Click "Remove from Track"  
   - **Verify:** Record deleted from `user_alt_course_usage`
   - **Verify:** Success toast appears

### Data Alignment Tests
1. **Resume Export**
   - Go to `/resume` 
   - **Verify:** Shows only active track's goals/skills/proofs
   - **Verify:** Track selector works

2. **Transcript View**
   - Go to `/history` or `/transcripts`
   - **Verify:** Filtered by active track  
   - **Verify:** Tagged courses appear

3. **Multi-Track Switching**
   - Switch between tracks
   - **Verify:** All data views update consistently
   - **Verify:** Single source of truth maintained

## Edge Function Tests

### Alt-Resolve Function
```bash
# Test edge function directly (if deployed)
curl -X POST https://vzpissitddpunkpythsb.supabase.co/functions/v1/alt-resolve \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Expected Response:**
```json
{
  "success": true,
  "course": {
    "id": "...",
    "title": "...",
    "provider": "youtube",
    "skills": [...],
    "cri_score": 75
  },
  "cached": false
}
```

### Graceful Fallback
1. If function not deployed:
   - **Verify:** User sees helpful error message  
   - **Verify:** App doesn't crash
   - **Verify:** Fallback UI suggests manual course entry

## Authentication & RLS Tests

### Dev User Authentication
1. **Dev Users Work:**
   - Aisha Khan (id: 2b458624-d498-4cca-a63d-9341cc20e363)
   - Mateo Silva (id: 3c459625-e499-5ddb-b64d-a442dd21f474)  
   - Jade Chen (id: 4d56a736-f5aa-6eec-c75e-b553ee32e585)

2. **RLS Policies Pass:**
   - Create tracks
   - Tag/untag courses  
   - View own data only

### Production Safety
1. **No Dev Auth in Production:**
   - Dev users blocked when `NODE_ENV === 'production'`
   - Real auth required

## Error Scenarios

### Track Not Found
1. Visit `/build?track=invalid-id`
   - **Verify:** Shows "Track not found" state
   - **Verify:** Provides recovery options

### No Active Track  
1. Clear active track, visit `/today?alt_courses=true`
   - **Verify:** Shows track selector
   - **Verify:** Alt courses hidden until track selected

### RLS Failures
1. If RLS blocks user:
   - **Verify:** Clear error message
   - **Verify:** Suggests sign-in or track creation

## Performance Checks

### Console Logs
- **Single** `[flags]` log per session (not per component mount)
- No duplicate auth calls
- No infinite query loops

### Network Requests  
- React Query caches properly
- Alt-resolve caches course lookups
- No redundant database calls

### UI Responsiveness
- Track switching feels instant  
- Course preview loads quickly
- No layout shift during loading

## Verification Checklist

- [ ] Feature flags work with both underscore and hyphen syntax  
- [ ] Single source of truth for `activeTrackId`
- [ ] Alt courses visible only with flag + active track
- [ ] Course paste → preview → add → usage list works end-to-end
- [ ] RLS allows dev users to manage their tracks and courses
- [ ] Track archive clears active track safely  
- [ ] Resume/transcript data filtered by active track
- [ ] Edge function deployed and reachable
- [ ] Graceful fallbacks when edge function unavailable
- [ ] Auth works for both real and dev users
- [ ] No duplicate logs or infinite loops
- [ ] All critical flows have proper error handling

## Debug Commands

### Check Store State
```javascript
// In browser console:
useActiveTrackStore.getState()  // Current active track
usePathStore.getState()         // Path store (should not have activeTrackId)
```

### Check Feature Flags
```javascript
// In browser console:
getFeatureFlags()              // Current flag values
```

### Check RLS Policies
```sql
-- In Supabase SQL editor:
SELECT * FROM pg_policies WHERE tablename IN ('career_tracks', 'user_alt_course_usage');
```

## Success Criteria

✅ **PASS:** All checklist items working  
❌ **FAIL:** Any critical workflow broken  
⚠️ **WARNING:** Non-critical issues that need follow-up

---

*Last updated: Auto-generated by Deep Scan + Auto-Fix Master*