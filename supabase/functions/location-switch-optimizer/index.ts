import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

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

// Fetch and compute locations from DB, optionally filtered by locationIds
// Removed inline LOCATION_DATA; use salary_benchmarks + col_index deterministically

    const { fromTrackId, toTrackId, locationIds, topN = 5 } = await req.json();

    if (!fromTrackId || !toTrackId) {
      throw new Error('Missing required track IDs');
    }

    // Default regions if none provided
    const regions: string[] = Array.isArray(locationIds) && locationIds.length > 0
      ? locationIds
      : ['US-CHI','US-AUS','UK-LON'];

    // Fetch tracks to derive roles for salary lookups
    const { data: tracks, error: tracksError } = await supabase
      .from('career_tracks')
      .select('id, title, track_name')
      .in('id', [fromTrackId, toTrackId])
      .eq('user_id', user.id);

    if (tracksError || !tracks || tracks.length !== 2) {
      throw new Error('Failed to fetch career tracks');
    }

    const fromTrack = tracks.find(t => t.id === fromTrackId)!;
    const toTrack = tracks.find(t => t.id === toTrackId)!;
    const fromRole = fromTrack.title || fromTrack.track_name || 'Software Engineer';
    const toRole = toTrack.title || toTrack.track_name || 'Software Engineer';

    // Load config defaults
    let DEFAULT_CURRENT_SALARY = 75000;
    let DEFAULT_TARGET_SALARY = 90000;
    let BASELINE_COST = 50000;
    let SWITCH_COST = 20000;

    const { data: cfg } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key','switching')
      .maybeSingle();
    if (cfg?.config_value) {
      DEFAULT_CURRENT_SALARY = Number(cfg.config_value.DEFAULT_CURRENT_SALARY) || DEFAULT_CURRENT_SALARY;
      DEFAULT_TARGET_SALARY = Number(cfg.config_value.DEFAULT_TARGET_SALARY) || DEFAULT_TARGET_SALARY;
      BASELINE_COST = Number(cfg.config_value.OPPORTUNITY_COST) ? Number(cfg.config_value.OPPORTUNITY_COST) : BASELINE_COST;
      // keep switch cost from config if defined
      SWITCH_COST = Number(cfg.config_value.FRICTION_BASE) ? Number(cfg.config_value.FRICTION_BASE) : SWITCH_COST;
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

    const salFromMap = new Map(salFrom?.map(r => [r.region, r.salary_mid]) || []);
    const salToMap = new Map(salTo?.map(r => [r.region, { mid: r.salary_mid, demand: Number(r.demand_multiplier || 1) }]) || []);

    const baselineRegion = 'US-AUS';

    const locationAnalysis = (colRows || []).map(loc => {
      const currentSalary = salFromMap.get(loc.region) || DEFAULT_CURRENT_SALARY;
      const toData = salToMap.get(loc.region) || { mid: DEFAULT_TARGET_SALARY, demand: 1 };
      const targetSalary = toData.mid;
      const demandMultiplier = toData.demand;

      const colMultiplier = Number(loc.col_index) / 100; // normalize
      const annualCOL = BASELINE_COST * colMultiplier;

      const currentNetIncome = currentSalary - annualCOL;
      const targetNetIncome = targetSalary - annualCOL;
      const netIncomeGain = targetNetIncome - currentNetIncome;

      const monthlyGain = netIncomeGain / 12;
      const breakEvenMonths = monthlyGain > 0 ? Math.ceil(SWITCH_COST / monthlyGain) : null;

      const lqi = (targetNetIncome * demandMultiplier) / (colMultiplier + 1);

      const baselineTo = salToMap.get(baselineRegion) || { mid: DEFAULT_TARGET_SALARY, demand: 1 };
      const baselineCol = (colRows || []).find(r => r.region === baselineRegion)?.col_index || 100;
      const baselineCOL = BASELINE_COST * (Number(baselineCol) / 100);
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
    });

    const rankedLocations = locationAnalysis
      .sort((a, b) => b.lqi - a.lqi)
      .slice(0, topN);


    console.log('Location optimization completed successfully');

    return new Response(JSON.stringify({
      fromTrack: fromTrack?.title,
      toTrack: toTrack?.title,
      rankedLocations,
      assumptions: {
        currentBaseSalary,
        targetBaseSalary,
        baselineCost,
        switchCost
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in location-switch-optimizer:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});