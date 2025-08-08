import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GenerateRoadmapInput } from "./schema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = GenerateRoadmapInput.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ mode: 'dry-run', ok: false, errors: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { goal = 'Product Manager', user_skills = ['SQL', 'Excel'] } = parsed.data;

    const steps = [
      { title: 'Foundations', description: `Core skills for ${goal}`, estimated_time: '4 weeks', estimated_cost: '$0' },
      { title: 'Analytics', description: 'Quant skills + SQL practice', estimated_time: '6 weeks', estimated_cost: '$99' },
      { title: 'Projects', description: 'Build portfolio artifacts', estimated_time: '6 weeks', estimated_cost: '$0' },
    ];

    const fastest_path = { total_time: '4 months', total_cost: '$199', roi_score: 8.3 };
    const lowest_cost_path = { total_time: '5 months', total_cost: '$0', roi_score: 7.4 };
    const highest_roi_path = { total_time: '6 months', total_cost: '$149', roi_score: 8.9 };

    return new Response(
      JSON.stringify({ mode: 'dry-run', ok: true, goal, user_skills, steps, fastest_path, lowest_cost_path, highest_roi_path }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ mode: 'dry-run', ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
