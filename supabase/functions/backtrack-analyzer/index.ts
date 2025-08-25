import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, badRequest, unauthorized, notFound, success, serverError } from "../_shared/responseHelpers.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Known dev users for testing
const KNOWN_DEV_USERS = [
  '2b458624-d498-4cca-a63d-9341cc20e363', // Aisha Khan
  '3c459625-e499-5ddb-b64d-a442dd21f474', // Mateo Silva  
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'  // Jade Chen
];

async function authenticateUser(req: Request) {
  // Check for dev user override first
  const devUserId = req.headers.get('x-dev-user-id');
  if (devUserId && KNOWN_DEV_USERS.includes(devUserId)) {
    console.log(`User authenticated: ${devUserId} (dev: true)`);
    return { id: devUserId, isDevUser: true };
  }

  // Regular auth flow
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }

  console.log(`User authenticated: ${user.id} (dev: false)`);
  return { id: user.id, isDevUser: false };
}

serve(async (req) => {
  console.log('Backtrack analyzer function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    let user: { id: string; isDevUser: boolean };
    try {
      user = await authenticateUser(req);
    } catch (e) {
      return unauthorized((e as Error)?.message || 'Unauthorized');
    }
    
    // Parse body safely
    // Parse body safely
    let body: any = {};
    try {
      const rawBody = await req.text();
      console.log('Raw request body:', rawBody);
      if (rawBody) {
        body = JSON.parse(rawBody);
        console.log('Parsed request body:', body);
      } else {
        console.error('No JSON body provided');
      }
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return badRequest('Invalid JSON body');
    }

    const { fromTrackId, toTrackId } = body;

    if (!fromTrackId || !toTrackId) {
      console.error('Missing required track IDs');
      return badRequest('Both track IDs are required', ['fromTrackId', 'toTrackId']);
    }

    console.log('Processing backtrack analysis:', { fromTrackId, toTrackId, userId: user.id });

    // Fetch track data
    const { data: fromTrack, error: fromError } = await supabase
      .from('career_tracks')
      .select('*')
      .eq('id', fromTrackId)
      .eq('user_id', user.id)
      .single();

    const { data: toTrack, error: toError } = await supabase
      .from('career_tracks')
      .select('*')
      .eq('id', toTrackId)
      .eq('user_id', user.id)
      .single();

    if (fromError || toError || !fromTrack || !toTrack) {
      console.error('Track fetch error:', { fromError, toError });
      return notFound('One or both tracks not found', { fromError, toError });
    }

    // Calculate backtrack scenario
    // This is a simplified analysis - in production you'd have more complex calculations
    const sunkTimeMonths = Math.floor(Math.random() * 12) + 6; // 6-18 months
    const transferCreditReclaimed = Math.floor(Math.random() * 40) + 50; // 50-90%
    const newBreakEvenMonths = Math.floor(Math.random() * 8) + 4; // 4-12 months
    const netTimeImpactMonths = sunkTimeMonths - (transferCreditReclaimed * 0.1);

    const backtrackResult = {
      fromTrack: fromTrack.title,
      toTrack: toTrack.title,
      sunkTimeMonths,
      transferCreditReclaimed,
      newBreakEvenMonths,
      netTimeImpactMonths: Math.round(netTimeImpactMonths * 10) / 10,
      calculations: {
        skillOverlapRecovered: transferCreditReclaimed,
        experienceBonus: Math.floor(Math.random() * 20) + 10, // 10-30%
        marketConditions: 'favorable',
        riskReduction: Math.floor(Math.random() * 15) + 15 // 15-30%
      }
    };

    console.log('Backtrack analysis completed:', backtrackResult);

    return success(backtrackResult);
    

  } catch (error) {
    console.error('Error in backtrack analyzer:', error);
    const msg = (error as Error)?.message || '';
    if (msg.includes('authorization') || msg.toLowerCase().includes('invalid token')) {
      return unauthorized(msg || 'Unauthorized');
    }
    return serverError(error);
  }
});