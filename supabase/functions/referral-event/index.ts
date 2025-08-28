// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, supabase, withCircuitBreaker } from '../_shared/utils.ts';
import { ReferralEventSchema, validateReferralCode, getClientIP, getUserAgent } from '../_shared/validation.ts';
import { trackTelemetryEvent, checkRateLimit, recordInvocation } from '../_shared/telemetry.ts';

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
    // Extract referral code from URL path, query, or body
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    let referralCode = '';

    if (pathParts.length >= 2) {
      referralCode = pathParts[pathParts.length - 1] === 'event'
        ? pathParts[pathParts.length - 2]
        : pathParts[pathParts.length - 1];
    }

    if (!referralCode) {
      referralCode = url.searchParams.get('code') || '';
    }

    const requestText = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(requestText || '{}');
    } catch {
      // ignore, will validate below
    }

    if (!referralCode) {
      referralCode = body.code || '';
    }

    if (!referralCode || !validateReferralCode(referralCode)) {
      throw new Error('Invalid referral code format');
    }

    const validationResult = ReferralEventSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const { type } = validationResult.data;

    // Get client info for rate limiting and logging
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);
    const rateLimitKey = `referral_event_${clientIP}`;

    // Rate limiting: 20 requests per 5 minutes per IP
    const withinRateLimit = await checkRateLimit(rateLimitKey, 5, 20);
    if (!withinRateLimit) {
      throw new Error('Rate limit exceeded: 20 requests per 5 minutes');
    }

    // Verify referral code exists
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('user_id')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (referralError || !referralData) {
      throw new Error('Referral code not found');
    }

    // Record the referral event using the RPC function
    const { error: eventError } = await supabase.rpc('record_referral_event', {
      p_code: referralCode,
      p_type: type,
      p_ip: clientIP,
      p_ua: userAgent
    });

    if (eventError) {
      console.error('Failed to record referral event:', eventError);
      throw new Error('Failed to record referral event');
    }

    // Record invocation for rate limiting
    await recordInvocation(rateLimitKey, {
      referral_code: referralCode,
      event_type: type,
      client_ip: clientIP
    });

    // Track telemetry (no user_id since this is public)
    await trackTelemetryEvent({
      task: 'referral_event_recorded',
      function_name: 'referral-event',
      success: true,
      complexity: {
        type,
        referral_code: referralCode.slice(0, 4) + '****', // Partially masked for privacy
        has_user_agent: !!userAgent
      }
    });

    return {
      success: true,
      event_type: type,
      recorded_at: new Date().toISOString()
    };
  });
});