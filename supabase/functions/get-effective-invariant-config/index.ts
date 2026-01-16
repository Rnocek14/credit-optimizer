/**
 * Get Effective Invariant Config
 * 
 * Admin-only endpoint that returns the computed effective invariant config
 * for an institution + template status. Requires authenticated admin user.
 * 
 * Query params:
 * - institution_code: string (required)
 * - template_status: 'active' | 'pending_review' | undefined (optional)
 * 
 * Returns: { baseConfig, effectiveConfig, requestedStatus }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchInstitutionOverridesBase,
  computeEffectiveThreshold,
  type EffectiveInvariantConfig,
} from '../_shared/institutionOverrides.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // ============================================
    // AUTH: Require authenticated admin user
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: responseHeaders }
      );
    }

    // Initialize Supabase with user's auth context (NOT service role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: responseHeaders }
      );
    }

    const userId = claimsData.claims.sub;

    // Check admin role (using user_roles table pattern)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Error checking admin role:', roleError.message);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }),
        { status: 500, headers: responseHeaders }
      );
    }

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: responseHeaders }
      );
    }

    // ============================================
    // PARSE REQUEST
    // ============================================
    const url = new URL(req.url);
    const institutionCode = url.searchParams.get('institution_code');
    const templateStatus = url.searchParams.get('template_status') || undefined;

    if (!institutionCode) {
      return new Response(
        JSON.stringify({ error: 'institution_code is required' }),
        { status: 400, headers: responseHeaders }
      );
    }

    // ============================================
    // FETCH & COMPUTE (using service role for DB access)
    // ============================================
    // Use service role client for the actual data fetch (RLS may block anon)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    ) as any;

    // Fetch base config (merged with defaults, no status adjustment)
    const baseConfig = await fetchInstitutionOverridesBase(serviceClient, institutionCode);

    // Compute effective config with status adjustment
    const effectiveConfig: EffectiveInvariantConfig = {
      ...baseConfig,
      unknownCreditsWarnThreshold: computeEffectiveThreshold(baseConfig, templateStatus),
    };

    // ============================================
    // RESPONSE: Clear "Stored vs Effective" structure
    // ============================================
    const response = {
      // Base config as stored (no status adjustment)
      baseConfig: {
        unknownCreditsWarnThreshold: baseConfig.unknownCreditsWarnThreshold,
        unknownCreditsActiveHardZero: baseConfig.unknownCreditsActiveHardZero,
        allowMissingCapsInDraft: baseConfig.allowMissingCapsInDraft,
        pendingReviewThresholdMultiplier: baseConfig.pendingReviewThresholdMultiplier,
        hasOverrides: baseConfig.hasOverrides,
        sourceInstitution: baseConfig.sourceInstitution,
      },
      // Effective config with status-specific adjustments
      effectiveConfig: {
        unknownCreditsWarnThreshold: effectiveConfig.unknownCreditsWarnThreshold,
        unknownCreditsActiveHardZero: effectiveConfig.unknownCreditsActiveHardZero,
        allowMissingCapsInDraft: effectiveConfig.allowMissingCapsInDraft,
      },
      // Request context
      requestedStatus: templateStatus || null,
      institutionCode,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    console.error('Error fetching effective config:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch effective config',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: responseHeaders }
    );
  }
});
