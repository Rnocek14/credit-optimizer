import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ mode: 'dry-run', ok: false, error: 'Use GET' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items = [
    { course_id: 'c-101', title: 'SQL for Analysts', confidence: 0.91, marketAlignment: 0.88, skillGapCoverage: 0.76 },
    { course_id: 'c-202', title: 'Intro to PM', confidence: 0.89, marketAlignment: 0.85, skillGapCoverage: 0.72 },
  ];

  return new Response(JSON.stringify({ mode: 'dry-run', ok: true, items }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
