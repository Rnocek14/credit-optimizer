# Growth Layer: Server Adapters (PR-2)

This document describes the new Supabase Edge Functions that implement the growth layer server adapters.

## Endpoints

All endpoints are exposed as Supabase Edge Functions. Call them from the client like:

```ts
const { data, error } = await supabase.functions.invoke('<function-name>', { body });
```

### 1) onboarding-submit (POST, Auth required)
- Function: `onboarding-submit`
- Body:
  - `career_goal`: `'new_job' | 'career_switch' | 'skill_up'`
  - `target_role`: string (2–60)
  - `location`: string (2–60)
- Returns:
  - `{ success, score, score_bucket, insights: string[], referralCode, onboarding_id }`
- Side effects:
  - Inserts into `user_onboarding_responses`
  - Ensures a `referrals` row exists (auto code via trigger)
  - Calls `maya-intelligence-engine` for quick scoring
  - Calls `after_maya_analysis_increment_quota()`

### 2) referral-preview (GET/POST, Public)
- Function: `referral-preview`
- Accepts code via path, query, or body: `code`
- Returns:
  - `{ success, score_bucket, short_insight, preview: true }`
- Notes: Sanitized, no PII.

### 3) referral-event (POST, Public)
- Function: `referral-event`
- Accepts `code` via path/query/body and body `{ type: 'click' | 'signup' }`
- Side effect: Calls RPC `record_referral_event(code, type, ip, ua)`
- Rate limit: 20 requests / 5 minutes / IP (via `edge_invocations`)
- Returns: `{ success, event_type, recorded_at }`

### 4) quota-check (POST, Auth required)
- Function: `quota-check`
- Returns current-period usage for Maya quick analyses:
  - `{ success, limit_reached, remaining, used, limit, reset_date, current_period }`

## Security & Hardening
- CORS enabled on all functions
- Auth required for `onboarding-submit` and `quota-check`
- Public endpoints take minimal inputs; preview is sanitized
- `referral_events` table is readable only by service role (policy)
- Rate limiting backed by `public.edge_invocations` (service-only)

## Telemetry
- `onboarding_submitted` { goal, has_target_role, has_location }
- `instant_diagnosis_generated` { score_bucket, score }
- `referral_event_recorded` { type }
- `quota_checked` { remaining, limit_reached }

## Tables/RPCs used
- `user_onboarding_responses`, `referrals`, `usage_quotas`
- RPC: `after_maya_analysis_increment_quota()`, `record_referral_event(...)`
- Rate limit table: `edge_invocations`

## Notes
- OTP expiry warning remains operational; no impact to these endpoints.
- UI for `/quick-start` will consume these in PR-3.
