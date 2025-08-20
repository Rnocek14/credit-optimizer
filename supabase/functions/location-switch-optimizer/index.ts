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

// Sample location data for demonstration
const LOCATION_DATA = [
  {
    city: 'San Francisco, CA',
    country: 'USA',
    salaryMultiplier: 1.4,
    colIndex: 1.6,
    demandMultiplier: 1.3,
    visaRequired: false
  },
  {
    city: 'New York, NY',
    country: 'USA',
    salaryMultiplier: 1.3,
    colIndex: 1.5,
    demandMultiplier: 1.2,
    visaRequired: false
  },
  {
    city: 'Austin, TX',
    country: 'USA',
    salaryMultiplier: 1.1,
    colIndex: 1.1,
    demandMultiplier: 1.1,
    visaRequired: false
  },
  {
    city: 'Toronto, ON',
    country: 'Canada',
    salaryMultiplier: 0.9,
    colIndex: 1.2,
    demandMultiplier: 1.0,
    visaRequired: true
  },
  {
    city: 'London, UK',
    country: 'United Kingdom',
    salaryMultiplier: 1.0,
    colIndex: 1.3,
    demandMultiplier: 0.9,
    visaRequired: true
  },
  {
    city: 'Berlin, Germany',
    country: 'Germany',
    salaryMultiplier: 0.8,
    colIndex: 1.0,
    demandMultiplier: 0.8,
    visaRequired: true
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Location switch optimizer function called');
    
    // Authenticate user
    const { user, isDevUser } = await authenticateUser(req);
    console.log(`User authenticated: ${user.id} (dev: ${isDevUser})`);

    const { fromTrackId, toTrackId, topN = 5 } = await req.json();

    if (!fromTrackId || !toTrackId) {
      throw new Error('Missing required track IDs');
    }

    console.log(`Optimizing location switch for user ${user.id}: ${fromTrackId} -> ${toTrackId}`);

    // Get tracks to determine salary ranges
    const { data: tracks, error: tracksError } = await supabase
      .from('career_tracks')
      .select('*')
      .in('id', [fromTrackId, toTrackId])
      .eq('user_id', user.id);

    if (tracksError || !tracks || tracks.length !== 2) {
      throw new Error('Failed to fetch career tracks');
    }

    const fromTrack = tracks.find(t => t.id === fromTrackId);
    const toTrack = tracks.find(t => t.id === toTrackId);

    // Base salary assumptions (could be made configurable)
    const currentBaseSalary = 75000;
    const targetBaseSalary = 90000;
    const baselineCost = 50000; // Annual cost of living baseline
    const switchCost = 20000; // Default switch cost

    // Calculate location metrics
    const locationAnalysis = LOCATION_DATA.map(location => {
      // Calculate adjusted salaries
      const currentSalary = currentBaseSalary * location.salaryMultiplier;
      const targetSalary = targetBaseSalary * location.salaryMultiplier;
      
      // Calculate cost of living
      const annualCOL = baselineCost * location.colIndex;
      
      // Net income calculation
      const currentNetIncome = currentSalary - annualCOL;
      const targetNetIncome = targetSalary - annualCOL;
      const netIncomeGain = targetNetIncome - currentNetIncome;
      
      // Break-even calculation
      const monthlyGain = netIncomeGain / 12;
      const breakEvenMonths = monthlyGain > 0 ? Math.ceil(switchCost / monthlyGain) : Infinity;
      
      // LQI (Location Quality Index) = adjusted income * demand / (COL + 1)
      const lqi = (targetNetIncome * location.demandMultiplier) / (location.colIndex + 1);
      
      // ROI delta compared to baseline location (Austin as reference)
      const baselineLocation = LOCATION_DATA.find(l => l.city === 'Austin, TX')!;
      const baselineTargetSalary = targetBaseSalary * baselineLocation.salaryMultiplier;
      const baselineCOL = baselineCost * baselineLocation.colIndex;
      const baselineNetIncome = baselineTargetSalary - baselineCOL;
      const deltaROI = targetNetIncome - baselineNetIncome;

      return {
        city: location.city,
        country: location.country,
        currentSalary: Math.round(currentSalary),
        targetSalary: Math.round(targetSalary),
        costOfLiving: Math.round(annualCOL),
        netIncome: Math.round(targetNetIncome),
        breakEvenMonths: breakEvenMonths === Infinity ? null : breakEvenMonths,
        lqi: Math.round(lqi),
        deltaROI: Math.round(deltaROI),
        demandScore: Math.round(location.demandMultiplier * 100),
        visaRequired: location.visaRequired,
        salaryMultiplier: location.salaryMultiplier,
        colIndex: location.colIndex
      };
    });

    // Sort by LQI score (descending) and take top N
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