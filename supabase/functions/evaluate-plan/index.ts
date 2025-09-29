import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { planId } = await req.json();

    if (!planId) {
      throw new Error('planId is required');
    }

    // Fetch plan with program info
    const { data: plan, error: planError } = await supabase
      .from('user_plans')
      .select('program_id')
      .eq('id', planId)
      .single();

    if (planError) throw planError;

    // Fetch program requirements
    const { data: requirements, error: reqError } = await supabase
      .from('program_requirements')
      .select('*')
      .eq('program_id', plan.program_id);

    if (reqError) throw reqError;

    // Fetch user's selected courses
    const { data: planCourses, error: coursesError } = await supabase
      .from('user_plan_courses')
      .select(`
        requirement_id,
        course:marketplace_courses(credits, cost_usd, level),
        requirement:program_requirements!user_plan_courses_requirement_id_fkey(category, credits_required)
      `)
      .eq('plan_id', planId);

    if (coursesError) throw coursesError;

    // Fetch transfer rules
    const { data: transferRules, error: rulesError } = await supabase
      .from('transfer_rules')
      .select('*')
      .eq('program_id', plan.program_id)
      .maybeSingle();

    if (rulesError) throw rulesError;

    // Calculate totals
    let credits_total = 0;
    let estimated_cost = 0;
    let upper_division_credits = 0;
    const credits_by_category: Record<string, number> = {};

    for (const pc of planCourses || []) {
      const credits = pc.course?.credits || 0;
      const cost = pc.course?.cost_usd || 0;
      const level = pc.course?.level || 100;
      const category = pc.requirement?.category || 'other';

      credits_total += credits;
      estimated_cost += cost;
      
      if (level >= 300) {
        upper_division_credits += credits;
      }

      credits_by_category[category] = (credits_by_category[category] || 0) + credits;
    }

    // Calculate residency progress
    const residency_required = transferRules?.residency_credits_min || 30;
    const transfer_cap = transferRules?.transfer_credits_max || 90;
    const transfer_used = Math.min(credits_total, transfer_cap);
    const residency_progress = Math.max(0, credits_total - transfer_used);

    // Generate warnings
    const warnings: string[] = [];

    if (transfer_used > transfer_cap) {
      warnings.push(`Transfer limit exceeded: ${transfer_used}/${transfer_cap} credits`);
    }

    if (residency_progress < residency_required) {
      warnings.push(`Residency requirement not met: ${residency_progress}/${residency_required} credits`);
    }

    if (transferRules?.upper_division_residency_min && upper_division_credits < transferRules.upper_division_residency_min) {
      warnings.push(`Upper division residency not met: ${upper_division_credits}/${transferRules.upper_division_residency_min} credits`);
    }

    // Check category requirements
    for (const req of requirements || []) {
      const earned = credits_by_category[req.category] || 0;
      if (earned < req.credits_required) {
        warnings.push(`${req.category}: ${earned}/${req.credits_required} credits (${req.credits_required - earned} needed)`);
      }
    }

    const result = {
      credits_total,
      credits_by_category,
      transfer_used,
      transfer_cap,
      residency_progress,
      residency_required,
      upper_division_credits,
      estimated_cost,
      warnings,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error evaluating plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
