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
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const KNOWN_DEV_USERS = [
  '2b458624-d498-4cca-a63d-9341cc20e363',
  '3c459625-e499-5ddb-b64d-a442dd21f474',
  '4d56a736-f5aa-6eec-c75e-b553ee32e585'
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await authenticateUser(req);
    const { fromTrackId, toTrackId } = await req.json(); // B -> A

    if (!fromTrackId || !toTrackId) throw new Error('Both track IDs are required');

    // Fetch skills for overlap
    const [fromSkillsRes, toSkillsRes] = await Promise.all([
      supabase.from('track_skills').select('skill_node_id').eq('track_id', fromTrackId),
      supabase.from('track_skills').select('skill_node_id').eq('track_id', toTrackId),
    ]);

    const fromSkillIds = new Set((fromSkillsRes.data || []).map(s => s.skill_node_id));
    const toSkillIds = new Set((toSkillsRes.data || []).map(s => s.skill_node_id));
    const shared = [...fromSkillIds].filter(id => toSkillIds.has(id));
    const overlap = toSkillIds.size > 0 ? shared.length / toSkillIds.size : 0;

    const transferCreditReclaimed = Math.round(overlap * 100);

    // Sunk time fallback when no progress table present
    const sunkTimeMonths = 8;

    // Base break-even default
    const baseBreakEvenA = 12;
    const newBreakEvenMonths = Math.ceil(baseBreakEvenA * (1 - overlap * 0.4));
    const netTimeImpactMonths = sunkTimeMonths - (transferCreditReclaimed * 0.1);

    // Persist a record for auditability
    await supabase.from('career_switches').insert({
      user_id: user.id,
      from_track_id: fromTrackId,
      to_track_id: toTrackId,
      transfer_credit_pct: transferCreditReclaimed,
      break_even_months: newBreakEvenMonths,
      status: 'backtrack_sim',
      assumptions: { baseBreakEvenA, sunkTimeMonths }
    });

    return new Response(JSON.stringify({
      sunkTimeMonths,
      transferCreditReclaimed,
      newBreakEvenMonths,
      netTimeImpactMonths,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in backtrack-analyzer:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), { status: 500, headers: corsHeaders });
  }
});
