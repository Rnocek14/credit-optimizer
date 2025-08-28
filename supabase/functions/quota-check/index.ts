
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, supabase, withCircuitBreaker, requireUser } from '../_shared/utils.ts';
import { trackTelemetryEvent } from '../_shared/telemetry.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return withCircuitBreaker(async () => {
    // Authenticate user
    const { user } = await requireUser(req);

    // Get current month start for reset/period fields
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ensure a current-month quota row exists and is up-to-date (resets usage on month rollover)
    const { data: ensuredQuota, error: ensureErr } = await supabase
      .rpc('ensure_quota_row', { p_user: user.id });

    if (ensureErr) {
      await trackTelemetryEvent({
        task: 'quota_checked',
        function_name: 'quota-check',
        user_id: user.id,
        success: false,
        complexity: { error: ensureErr.message, phase: 'ensure_quota_row' }
      });
      throw ensureErr;
    }

    const quotaRow = ensuredQuota as any;
    const analysesUsed: number = quotaRow?.maya_analyses_used ?? 0;

    // Define quota limits (could be made configurable)
    const FREE_TIER_LIMIT = 5;
    const PRO_TIER_LIMIT = 50;

    // For now, assume free tier. In the future, this could check user's subscription
    const userLimit = FREE_TIER_LIMIT;

    const remaining = Math.max(0, userLimit - analysesUsed);
    const limitReached = analysesUsed >= userLimit;

    // Compute current period and reset date based on current month
    const currentPeriod = monthStart.toISOString();
    const resetDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();

    // Track telemetry
    await trackTelemetryEvent({
      task: 'quota_checked',
      function_name: 'quota-check',
      user_id: user.id,
      success: true,
      complexity: {
        analyses_used: analysesUsed,
        limit: userLimit,
        remaining,
        limit_reached: limitReached,
        ensured_row: true
      }
    });

    return {
      success: true,
      limit_reached: limitReached,
      remaining,
      used: analysesUsed,
      limit: userLimit,
      reset_date: resetDate,
      current_period: currentPeriod
    };
  });
});
