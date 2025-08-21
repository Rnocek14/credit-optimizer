import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { badRequest, unauthorized, notFound, forbidden, serverError, success } from '../_shared/responseHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Known dev users for safe authentication bypass
const KNOWN_DEV_USERS = [
  '2b458624-d498-4cca-a63d-9341cc20e363', // Aisha Khan
  '3c459625-e499-5ddb-b64d-a442dd21f474', // Mateo Silva
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'  // Jade Chen
];

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const devUserId = req.headers.get('x-dev-user-id');
  
  // Try normal JWT authentication first
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user?.id) {
      return { user, isDevUser: false };
    }
  }
  
  // Allow dev user override for whitelisted users
  if (devUserId && KNOWN_DEV_USERS.includes(devUserId)) {
    return { 
      user: { id: devUserId, email: `dev-${devUserId}@demo.com` }, 
      isDevUser: true 
    };
  }
  
  throw new Error('Authentication required - invalid or missing credentials');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-auth, x-dev-user-id',
    }});
  }

  try {
    console.log('Calculate career switch function called');
    
    // Authenticate user (supports both JWT and dev user override)
    let user, isDevUser;
    try {
      const auth = await authenticateUser(req);
      user = auth.user;
      isDevUser = auth.isDevUser;
    } catch (e) {
      return unauthorized('Authentication required - invalid or missing credentials');
    }
    
    console.log(`User authenticated: ${user.id} (dev: ${isDevUser})`);

    // Parse and validate request body with robust handling
    let body: any;
    try {
      body = await req.json(); // preferred method for proper JSON
    } catch {
      const rawBody = await req.text();
      console.log('Raw request body:', rawBody);
      if (!rawBody) return badRequest('No JSON body provided');
      try { 
        body = JSON.parse(rawBody); 
      } catch { 
        return badRequest('Invalid JSON body'); 
      }
    }

    console.log('Parsed request body:', body);

    // Handle ping requests for debugging
    if (body?.action === 'ping') {
      return success({ ok: true, userId: user.id, ts: Date.now() });
    }

    const { fromTrackId, toTrackId, locationId } = body;
    const missing = ['fromTrackId', 'toTrackId'].filter(k => !body?.[k]);
    if (missing.length) return badRequest('Both track IDs are required', missing);

    console.log(`Calculating career switch for user ${user.id}: ${fromTrackId} -> ${toTrackId}`);

    // Verify track ownership with better error handling
    const { data: tracks, error: tracksError } = await supabase
      .from('career_tracks')
      .select('*')
      .in('id', [fromTrackId, toTrackId]);

    if (tracksError) {
      console.error('Database error fetching tracks:', tracksError);
      return serverError(tracksError);
    }
    
    if (!tracks || tracks.length !== 2) {
      return notFound('One or both tracks not found', { 
        fromTrackId, 
        toTrackId, 
        foundIds: tracks?.map(t => t.id) || [] 
      });
    }

    const unauthorizedTrack = tracks.find(t => t.user_id !== user.id);
    if (unauthorizedTrack) {
      return forbidden('Track does not belong to current user', { 
        offendingId: unauthorizedTrack.id,
        offendingTitle: unauthorizedTrack.title 
      });
    }

    const fromTrack = tracks.find(t => t.id === fromTrackId);
    const toTrack = tracks.find(t => t.id === toTrackId);

    // Get skills for both tracks
    console.log('Fetching skills for tracks');
    
    const [fromSkillsResult, toSkillsResult] = await Promise.all([
      supabase.from('track_skills').select('skill_node_id').eq('track_id', fromTrackId),
      supabase.from('track_skills').select('skill_node_id').eq('track_id', toTrackId)
    ]);

    const { data: fromSkills, error: fromSkillsError } = fromSkillsResult;
    const { data: toSkills, error: toSkillsError } = toSkillsResult;

    if (fromSkillsError) {
      console.error('Error fetching from-track skills:', fromSkillsError);
      throw new Error(`Failed to fetch skills for source track: ${fromSkillsError.message}`);
    }

    if (toSkillsError) {
      console.error('Error fetching to-track skills:', toSkillsError);
      throw new Error(`Failed to fetch skills for target track: ${toSkillsError.message}`);
    }

    console.log('Skills fetched:', { fromSkills: fromSkills?.length, toSkills: toSkills?.length });

    const fromSkillIds = new Set(fromSkills?.map(s => s.skill_node_id) || []);
    const toSkillIds = new Set(toSkills?.map(s => s.skill_node_id) || []);

    // Calculate skill overlap - handle empty skill sets gracefully
    const sharedSkills = [...fromSkillIds].filter(id => toSkillIds.has(id));
    const skillOverlap = toSkillIds.size > 0 ? sharedSkills.length / toSkillIds.size : 0;
    const transferCreditPct = skillOverlap * 100;
    
    // Log skill analysis for debugging
    console.log(`Skill analysis: From=${fromSkillIds.size}, To=${toSkillIds.size}, Shared=${sharedSkills.length}, Overlap=${Math.round(skillOverlap * 100)}%`);

    // Load tunable constants from app_config with safe defaults
    let BASE_TRANSITION_HOURS = 2000;
    let BASE_DIRECT_COST = 15000;
    let FRICTION_BASE = 5000;
    let OPPORTUNITY_COST = 50000;
    let DEFAULT_CURRENT_SALARY = 75000;
    let DEFAULT_TARGET_SALARY = 90000;

    const { data: cfg } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'switching')
      .maybeSingle();

    if (cfg?.config_value) {
      const c = cfg.config_value;
      BASE_TRANSITION_HOURS = Number(c.BASE_TRANSITION_HOURS) || BASE_TRANSITION_HOURS;
      BASE_DIRECT_COST = Number(c.BASE_DIRECT_COST) || BASE_DIRECT_COST;
      FRICTION_BASE = Number(c.FRICTION_BASE) || FRICTION_BASE;
      OPPORTUNITY_COST = Number(c.OPPORTUNITY_COST) || OPPORTUNITY_COST;
      DEFAULT_CURRENT_SALARY = Number(c.DEFAULT_CURRENT_SALARY) || DEFAULT_CURRENT_SALARY;
      DEFAULT_TARGET_SALARY = Number(c.DEFAULT_TARGET_SALARY) || DEFAULT_TARGET_SALARY;
    }

    // Resolve roles and region to look up salaries
    const region = locationId || 'US-CHI';
    const fromRole = fromTrack?.title || fromTrack?.track_name || 'Software Engineer';
    const toRole = toTrack?.title || toTrack?.track_name || 'Software Engineer';

    // Fetch salaries (midpoints) for roles in region
    const [{ data: salFrom }, { data: salTo }] = await Promise.all([
      supabase.from('salary_benchmarks').select('salary_mid').eq('role', fromRole).eq('region', region).maybeSingle(),
      supabase.from('salary_benchmarks').select('salary_mid').eq('role', toRole).eq('region', region).maybeSingle(),
    ]);

    const currentSalary = salFrom?.salary_mid || DEFAULT_CURRENT_SALARY;
    const targetSalary = salTo?.salary_mid || DEFAULT_TARGET_SALARY;

    // Time calculations based on overlap
    const baseTimeHours = BASE_TRANSITION_HOURS;
    const timeSaved = Math.floor(baseTimeHours * skillOverlap);
    const timeGainedHours = timeSaved;
    const lostTimeHours = Math.max(0, baseTimeHours - timeSaved);

    // Cost calculations (deterministic, no randomness)
    const directCost = BASE_DIRECT_COST * (1 - skillOverlap * 0.5);
    const frictionCost = FRICTION_BASE * (1 - skillOverlap);
    const opportunityCost = OPPORTUNITY_COST;
    const switchCost = directCost + frictionCost;

    // ROI calculations
    const salaryDiff = targetSalary - currentSalary;
    const salaryUplift3yr = salaryDiff * 3;
    const roi3yr = salaryUplift3yr - switchCost - opportunityCost;
    const breakEvenMonths = salaryDiff > 0 ? Math.ceil(switchCost / (salaryDiff / 12)) : 0;


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
        base_cost: BASE_DIRECT_COST,
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

    return success({
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
    });

  } catch (error) {
    console.error('Error in calculate-career-switch:', error);
    return serverError(error);
  }
});