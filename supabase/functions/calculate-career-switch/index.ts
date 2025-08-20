import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user?.id) {
      throw new Error('Invalid user');
    }

    const { fromTrackId, toTrackId, locationId } = await req.json();

    if (!fromTrackId || !toTrackId) {
      throw new Error('Missing required track IDs');
    }

    console.log(`Calculating career switch for user ${user.id}: ${fromTrackId} -> ${toTrackId}`);

    // Get track details
    const { data: tracks, error: tracksError } = await supabase
      .from('career_tracks')
      .select('*')
      .in('id', [fromTrackId, toTrackId])
      .eq('user_id', user.id);

    if (tracksError || !tracks || tracks.length !== 2) {
      throw new Error('Failed to fetch tracks or tracks not found');
    }

    const fromTrack = tracks.find(t => t.id === fromTrackId);
    const toTrack = tracks.find(t => t.id === toTrackId);

    // Get skills for both tracks
    const { data: fromSkills, error: fromSkillsError } = await supabase
      .from('track_skills')
      .select('skill_node_id')
      .eq('track_id', fromTrackId);

    const { data: toSkills, error: toSkillsError } = await supabase
      .from('track_skills')
      .select('skill_node_id')
      .eq('track_id', toTrackId);

    if (fromSkillsError || toSkillsError) {
      throw new Error('Failed to fetch track skills');
    }

    const fromSkillIds = new Set(fromSkills?.map(s => s.skill_node_id) || []);
    const toSkillIds = new Set(toSkills?.map(s => s.skill_node_id) || []);

    // Calculate skill overlap
    const sharedSkills = [...fromSkillIds].filter(id => toSkillIds.has(id));
    const skillOverlap = toSkillIds.size > 0 ? sharedSkills.length / toSkillIds.size : 0;
    const transferCreditPct = skillOverlap * 100;

    // Calculate time and cost estimates
    const baseTimeHours = 2000; // Base time for career transition
    const timeSaved = Math.floor(baseTimeHours * skillOverlap);
    const timeGainedHours = timeSaved;
    const lostTimeHours = Math.max(0, baseTimeHours - timeSaved);

    // Cost calculations
    const baseCost = 15000; // Base transition cost
    const directCost = baseCost * (1 - skillOverlap * 0.5);
    const opportunityCost = 50000; // Average opportunity cost
    const frictionCost = 5000 * (1 - skillOverlap);
    const switchCost = directCost + frictionCost;

    // ROI calculations
    const currentSalary = 75000; // Default current salary
    const targetSalary = 90000; // Default target salary
    const salaryDiff = targetSalary - currentSalary;
    const salaryUplift3yr = salaryDiff * 3;
    const roi3yr = salaryUplift3yr - switchCost - opportunityCost;
    const breakEvenMonths = switchCost > 0 ? Math.ceil(switchCost / (salaryDiff / 12)) : 0;

    // CRI delta (simplified)
    const criDelta = (toTrack?.roi_score || 0) - (fromTrack?.roi_score || 0);

    const switchData = {
      user_id: user.id,
      from_track_id: fromTrackId,
      to_track_id: toTrackId,
      location_id: locationId,
      skill_overlap: skillOverlap,
      transfer_credit_pct: transferCreditPct,
      time_gained_hours: timeGainedHours,
      lost_time_hours: lostTimeHours,
      direct_cost: directCost,
      opportunity_cost: opportunityCost,
      friction_cost: frictionCost,
      switch_cost: switchCost,
      salary_uplift_3yr: salaryUplift3yr,
      roi_3yr: roi3yr,
      break_even_months: breakEvenMonths,
      cri_delta: criDelta,
      assumptions: {
        base_transition_time_hours: baseTimeHours,
        base_cost: baseCost,
        current_salary: currentSalary,
        target_salary: targetSalary,
        opportunity_cost: opportunityCost
      },
      status: 'calculated'
    };

    // Insert the switch calculation
    const { data: insertedSwitch, error: insertError } = await supabase
      .from('career_switches')
      .insert(switchData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save switch calculation');
    }

    console.log('Career switch calculated successfully:', insertedSwitch.id);

    return new Response(JSON.stringify({
      switchId: insertedSwitch.id,
      metrics: {
        skillOverlap: Math.round(skillOverlap * 100),
        transferCredit: Math.round(transferCreditPct),
        timeGained: timeGainedHours,
        timeLost: lostTimeHours,
        switchCost: Math.round(switchCost),
        roi3yr: Math.round(roi3yr),
        breakEvenMonths: breakEvenMonths,
        criDelta: Math.round(criDelta * 10) / 10
      },
      tracks: {
        from: fromTrack?.title,
        to: toTrack?.title
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-career-switch:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});