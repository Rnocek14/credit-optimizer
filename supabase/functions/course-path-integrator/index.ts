import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CourseIntegratorInput } from "./schema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = CourseIntegratorInput.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ mode: 'dry-run', ok: false, errors: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { plan_id = crypto.randomUUID(), course_id = 'demo-course', action = 'approve' } = parsed.data;

    const diff = {
      added_steps: [
        { id: 'step-1', title: `Integrate ${course_id}`, position: 2 },
        { id: 'step-2', title: `Align ${course_id} with plan`, position: 3 },
      ],
      removed_steps: [],
      reordered: [{ id: 'existing-1', from: 4, to: 5 }],
    };

    return new Response(
      JSON.stringify({ mode: 'dry-run', ok: true, plan_id, action, diff }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ mode: 'dry-run', ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
