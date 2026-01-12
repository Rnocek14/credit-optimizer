
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
    const planTier: string = quotaRow?.plan_tier ?? 'free';
    const tierExpiresAt: string | null = quotaRow?.tier_expires_at ?? null;

    // Tier configuration - matches src/types/subscriptionTiers.ts
    const TIER_CONFIGS: Record<string, { 
      limit: number; 
      maxAnchors: number;
      features: { canCompare: boolean; canOptimizeMulti: boolean; canExport: boolean };
      requiresTrustTierAB: boolean;
    }> = {
      free: { 
        limit: 5, 
        maxAnchors: 1,
        features: { canCompare: false, canOptimizeMulti: false, canExport: false },
        requiresTrustTierAB: false,
      },
      single_school: { 
        limit: 20, 
        maxAnchors: 1,
        features: { canCompare: false, canOptimizeMulti: false, canExport: true },
        requiresTrustTierAB: false,
      },
      multi_compare: { 
        limit: 50, 
        maxAnchors: 5,
        features: { canCompare: true, canOptimizeMulti: false, canExport: true },
        requiresTrustTierAB: true,
      },
      multi_optimizer: { 
        limit: 100, 
        maxAnchors: -1,
        features: { canCompare: true, canOptimizeMulti: true, canExport: true },
        requiresTrustTierAB: true,
      },
    };

    // Check if tier has expired, fall back to free if so
    const effectiveTier = (tierExpiresAt && new Date(tierExpiresAt) < now) ? 'free' : planTier;
    const tierConfig = TIER_CONFIGS[effectiveTier] ?? TIER_CONFIGS.free;
    const userLimit = tierConfig.limit;

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
        tier: effectiveTier,
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
      current_period: currentPeriod,
      // New tier-specific fields
      tier: effectiveTier,
      tier_expires_at: tierExpiresAt,
      features: tierConfig.features,
      limits: {
        max_anchors: tierConfig.maxAnchors,
        max_analyses_per_month: tierConfig.limit,
      },
      requires_trust_tier_ab: tierConfig.requiresTrustTierAB,
    };
  });
});
