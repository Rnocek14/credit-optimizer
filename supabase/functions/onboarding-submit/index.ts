// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, supabase, withCircuitBreaker, requireUser } from '../_shared/utils.ts';
import { OnboardingSubmitSchema, sanitizeInput, getScoreBucket, generateShortInsight } from '../_shared/validation.ts';
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
    
    // Parse and validate request body
    const requestText = await req.text();
    let body;
    try {
      body = JSON.parse(requestText);
    } catch {
      throw new Error('Invalid JSON in request body');
    }

    const validationResult = OnboardingSubmitSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const { career_goal, target_role, location } = validationResult.data;

    // Sanitize inputs
    const sanitizedTargetRole = sanitizeInput(target_role);
    const sanitizedLocation = sanitizeInput(location);

    // Insert onboarding response
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('user_onboarding_responses')
      .insert({
        user_id: user.id,
        career_goal,
        target_role: sanitizedTargetRole,
        location: sanitizedLocation,
        response_data: {
          career_goal,
          target_role: sanitizedTargetRole,
          location: sanitizedLocation,
          submitted_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (onboardingError) {
      console.error('Onboarding insert error:', onboardingError);
      throw new Error('Failed to save onboarding response');
    }

    // Call Maya intelligence engine for scoring
    let mayaScore = 65; // Default fallback score
    let insights = [
      generateShortInsight(mayaScore, career_goal),
      "Focus on building relevant skills for your target role.",
      "Consider creating projects that demonstrate your capabilities."
    ];

    try {
      const { data: mayaData, error: mayaError } = await supabase.functions.invoke(
        'maya-intelligence-engine',
        {
          body: {
            prompt: `Analyze career readiness for: Goal: ${career_goal}, Target Role: ${sanitizedTargetRole}, Location: ${sanitizedLocation}`,
            context: {
              career_goal,
              target_role: sanitizedTargetRole,
              location: sanitizedLocation,
              analysis_type: 'onboarding_diagnosis'
            },
            persist: false // Don't persist this quick analysis
          }
        }
      );

      if (!mayaError && mayaData?.insights) {
        // Extract score and insights from Maya response
        const confidence = mayaData.insights?.confidence || 65;
        mayaScore = Math.round(confidence);
        
        if (mayaData.guidance) {
          insights = [
            generateShortInsight(mayaScore, career_goal),
            mayaData.guidance.slice(0, 120) + '...',
            "Get a full analysis to see detailed recommendations."
          ];
        }
      }
    } catch (error) {
      console.error('Maya analysis failed, using fallback:', error);
    }

    // Ensure user has a referral code
    let referralCode = '';
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    if (existingReferral) {
      referralCode = existingReferral.referral_code;
    } else {
      // Create new referral record (trigger will generate code)
      const { data: newReferral, error: referralError } = await supabase
        .from('referrals')
        .insert({
          user_id: user.id,
          clicks: 0,
          signups: 0
        })
        .select('referral_code')
        .single();

      if (referralError) {
        console.error('Failed to create referral:', referralError);
        // Continue without referral code rather than fail
      } else {
        referralCode = newReferral.referral_code;
      }
    }

    // Increment quota
    try {
      await supabase.rpc('after_maya_analysis_increment_quota');
    } catch (error) {
      console.error('Failed to increment quota:', error);
    }

    // Track telemetry
    await trackTelemetryEvent({
      task: 'onboarding_submitted',
      function_name: 'onboarding-submit',
      user_id: user.id,
      success: true,
      complexity: {
        goal: career_goal,
        has_target_role: !!sanitizedTargetRole,
        has_location: !!sanitizedLocation,
        maya_analysis: !!mayaData
      }
    });

    await trackTelemetryEvent({
      task: 'instant_diagnosis_generated',
      function_name: 'onboarding-submit',
      user_id: user.id,
      success: true,
      complexity: {
        score_bucket: getScoreBucket(mayaScore),
        score: mayaScore
      }
    });

    // Return response
    return {
      success: true,
      score: mayaScore,
      score_bucket: getScoreBucket(mayaScore),
      insights,
      referralCode,
      onboarding_id: onboardingData.id
    };
  });
});