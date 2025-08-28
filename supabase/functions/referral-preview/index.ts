// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, supabase, withCircuitBreaker } from '../_shared/utils.ts';
import { validateReferralCode, getScoreBucket, generateShortInsight } from '../_shared/validation.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
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

    // Path format: /referral-preview/:code/preview or /referral-preview/:code
    if (pathParts.length >= 2) {
      referralCode = pathParts[pathParts.length - 1] === 'preview'
        ? pathParts[pathParts.length - 2]
        : pathParts[pathParts.length - 1];
    }

    // Try query param
    if (!referralCode) {
      referralCode = url.searchParams.get('code') || '';
    }

    // Try body for POST
    if (!referralCode && req.method === 'POST') {
      const txt = await req.text();
      try {
        const b = JSON.parse(txt || '{}');
        referralCode = b.code || '';
      } catch { /* ignore */ }
    }

    if (!referralCode || !validateReferralCode(referralCode)) {
      throw new Error('Invalid referral code format');
    }

    // Find referral and get user's latest onboarding response
    const { data: referralData, error: referralError } = await supabase
      .from('referrals')
      .select('user_id')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (referralError || !referralData) {
      throw new Error('Referral code not found');
    }

    // Get the user's most recent onboarding response for insights
    const { data: onboardingData } = await supabase
      .from('user_onboarding_responses')
      .select('career_goal, response_data')
      .eq('user_id', (referralData as any).user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Generate a safe preview without PII
    let score_bucket = 'moderate';
    let short_insight = 'Discover your career readiness score and get personalized insights.';

    if (onboardingData) {
      // Extract score from response_data if available, otherwise use default
      const responseData = (onboardingData as any).response_data as any;
      const score = Number(responseData?.score) || 65; // Default score
      
      score_bucket = getScoreBucket(score);
      short_insight = generateShortInsight(score, (onboardingData as any).career_goal || 'new_job');
    }

    // Return sanitized preview (no PII)
    return {
      success: true,
      score_bucket,
      short_insight: short_insight.slice(0, 140), // Limit length for privacy
      preview: true
    };
  });
});