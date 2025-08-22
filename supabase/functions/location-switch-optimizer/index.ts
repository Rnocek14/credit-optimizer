import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { badRequest, unauthorized, notFound, forbidden, serverError, success } from '../_shared/responseHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-auth, x-dev-user-id',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const KNOWN_DEV_USERS = [
  '2b458624-d498-4cca-a63d-9341cc20e363', // Aisha Khan
  '3c459625-e499-5ddb-b64d-a442dd21f474', // Mateo Silva
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'  // Jade Chen
];

async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const devUserId = req.headers.get('x-dev-user-id');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user?.id) return { user, isDevUser: false };
  }
  if (devUserId && KNOWN_DEV_USERS.includes(devUserId)) {
    return { user: { id: devUserId, email: `dev-${devUserId}@demo.com` }, isDevUser: true };
  }
  throw new Error('Authentication required');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
    }});
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Location switch optimizer function called`);
    console.log(`[${requestId}] Request headers:`, Object.fromEntries(req.headers.entries()));
    
    // Authenticate user
    let user, isDevUser;
    try {
      const auth = await authenticateUser(req);
      user = auth.user;
      isDevUser = auth.isDevUser;
      console.log(`[${requestId}] User authenticated: ${user.id} (dev: ${isDevUser})`);
    } catch (e) {
      console.error(`[${requestId}] Authentication failed:`, e.message);
      return unauthorized('Authentication required');
    }

    // Enhanced body parsing with multiple safety checks
    let body: any;
    try {
      const rawBody = await req.text();
      console.log(`[${requestId}] Raw request body: "${rawBody}" (length: ${rawBody?.length || 0})`);
      
      // Multiple checks for empty body conditions
      if (!rawBody || rawBody.trim() === '' || rawBody === 'null' || rawBody === 'undefined') {
        console.error(`[${requestId}] Empty/null body detected - rawBody: "${rawBody}"`);
        return badRequest('No JSON body provided', ['fromTrackId', 'toTrackId']);
      }
      
      // Check for minimum viable JSON
      if (rawBody.length < 2) {
        console.error(`[${requestId}] Body too short: ${rawBody.length} characters`);
        return badRequest('Request body too short', ['fromTrackId', 'toTrackId']);
      }
      
      body = JSON.parse(rawBody); 
      console.log(`[${requestId}] Body parsed successfully:`, { 
        keys: Object.keys(body || {}),
        type: typeof body,
        hasFromTrack: !!body?.fromTrackId,
        hasToTrack: !!body?.toTrackId
      });
      
      // Validate parsed body is an object
      if (!body || typeof body !== 'object') {
        console.error(`[${requestId}] Body is not an object: ${typeof body}`);
        return badRequest('Request body must be a JSON object', ['fromTrackId', 'toTrackId']);
      }
      
    } catch (parseError) { 
      console.error(`[${requestId}] JSON parsing failed:`, parseError.message, `Raw: "${rawBody}"`);
      return badRequest('Invalid JSON body');
    }

    // Handle ping requests for debugging
    if (body?.action === 'ping') {
      console.log(`[${requestId}] Ping request received`);
      return success({ ok: true, userId: user.id, ts: Date.now(), requestId });
    }

    const { fromTrackId, toTrackId, locationIds, topN = 5 } = body;
    console.log(`[${requestId}] Extracted parameters:`, { fromTrackId, toTrackId, locationIds, topN });
    
    const missing = ['fromTrackId', 'toTrackId'].filter(k => !body?.[k]);
    if (missing.length) {
      console.error(`[${requestId}] Missing required fields:`, missing);
      return badRequest('Both track IDs are required', missing);
    }

    // Default regions if none provided
    const regions: string[] = Array.isArray(locationIds) && locationIds.length > 0
      ? locationIds
      : ['US-CHI', 'US-AUS', 'UK-LON'];

    // Verify track ownership with better error messages
    const { data: tracks, error: tracksError } = await supabase
      .from('career_tracks')
      .select('id, title, track_name, user_id')
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

    const fromTrack = tracks.find(t => t.id === fromTrackId)!;
    const toTrack = tracks.find(t => t.id === toTrackId)!;
    const fromRole = fromTrack.title || fromTrack.track_name || 'Software Engineer';
    const toRole = toTrack.title || toTrack.track_name || 'Software Engineer';

    // Load config defaults
    let currentBaseSalary = 75000;
    let targetBaseSalary = 90000;
    let baselineCost = 50000;
    let switchCost = 20000;

    const { data: cfg } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'switching')
      .maybeSingle();

    if (cfg?.config_value) {
      currentBaseSalary = Number(cfg.config_value.DEFAULT_CURRENT_SALARY) || currentBaseSalary;
      targetBaseSalary = Number(cfg.config_value.DEFAULT_TARGET_SALARY) || targetBaseSalary;
      baselineCost = Number(cfg.config_value.OPPORTUNITY_COST) || baselineCost;
      switchCost = Number(cfg.config_value.FRICTION_BASE) || switchCost;
    }

    // Fetch COL and salaries for regions
    const { data: colRows, error: colErr } = await supabase
      .from('col_index')
      .select('region, city, country, col_index, visa_required')
      .in('region', regions);
    if (colErr) throw new Error('Failed to fetch COL data');

    const { data: salFrom, error: salFromErr } = await supabase
      .from('salary_benchmarks')
      .select('region, salary_mid')
      .eq('role', fromRole)
      .in('region', regions);
    if (salFromErr) throw new Error('Failed to fetch salary for current role');

    const { data: salTo, error: salToErr } = await supabase
      .from('salary_benchmarks')
      .select('region, salary_mid, demand_multiplier')
      .eq('role', toRole)
      .in('region', regions);
    if (salToErr) throw new Error('Failed to fetch salary for target role');

    const salFromMap = new Map((salFrom || []).map(r => [r.region, r.salary_mid]));
    const salToMap = new Map((salTo || []).map(r => [r.region, { mid: r.salary_mid, demand: Number(r.demand_multiplier || 1) }]));

    const baselineRegion = 'US-AUS';

    const rankedLocations = (colRows || [])
      .map((loc) => {
        const currentSalary = salFromMap.get(loc.region) || currentBaseSalary;
        const toData = salToMap.get(loc.region) || { mid: targetBaseSalary, demand: 1 };
        const targetSalary = toData.mid;
        const demandMultiplier = toData.demand;

        const colMultiplier = Number(loc.col_index) / 100; // normalize
        const annualCOL = baselineCost * colMultiplier;

        const currentNetIncome = currentSalary - annualCOL;
        const targetNetIncome = targetSalary - annualCOL;
        const netIncomeGain = targetNetIncome - currentNetIncome;

        const monthlyGain = netIncomeGain / 12;
        const breakEvenMonths = monthlyGain > 0 ? Math.ceil(switchCost / monthlyGain) : null;

        const lqi = (targetNetIncome * demandMultiplier) / (colMultiplier + 1);

        const baselineTo = salToMap.get(baselineRegion) || { mid: targetBaseSalary, demand: 1 };
        const baselineCol = (colRows || []).find(r => r.region === baselineRegion)?.col_index || 100;
        const baselineCOL = baselineCost * (Number(baselineCol) / 100);
        const baselineNetIncome = (baselineTo.mid - baselineCOL);
        const deltaROI = targetNetIncome - baselineNetIncome;

        return {
          city: loc.city,
          country: loc.country,
          currentSalary: Math.round(currentSalary),
          targetSalary: Math.round(targetSalary),
          costOfLiving: Math.round(annualCOL),
          netIncome: Math.round(targetNetIncome),
          breakEvenMonths,
          lqi: Math.round(lqi),
          deltaROI: Math.round(deltaROI),
          demandScore: Math.round(demandMultiplier * 100),
          visaRequired: !!loc.visa_required,
          salaryMultiplier: 1, // legacy field
          colIndex: Number(loc.col_index)
        };
      })
      .sort((a, b) => b.lqi - a.lqi)
      .slice(0, topN);

    console.log(`[${requestId}] Location optimization completed successfully`);

    const responseData = {
      fromTrack: fromTrack?.title,
      toTrack: toTrack?.title,
      rankedLocations,
      assumptions: {
        currentBaseSalary,
        targetBaseSalary,
        baselineCost,
        switchCost
      },
      requestId
    };
    
    console.log(`[${requestId}] Response data:`, { 
      fromTrack: responseData.fromTrack,
      toTrack: responseData.toTrack,
      locationCount: rankedLocations.length,
      assumptions: responseData.assumptions
    });
    
    return success(responseData);

  } catch (error) {
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error in location-switch-optimizer:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return serverError({ message: error.message, errorId });
  }
});
