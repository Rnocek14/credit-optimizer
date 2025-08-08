import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AssignBadgesInput } from "./schema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = AssignBadgesInput.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ mode: 'dry-run', ok: false, errors: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user_id = parsed.data.user_id ?? '00000000-0000-0000-0000-000000000000';

    const would_award = [
      {
        badge: { slug: 'first-steps', name: 'First Steps', emoji: '🚀' },
        reason: `User ${user_id.slice(0, 8)} has met 80% of goals threshold`,
      },
      {
        badge: { slug: 'path-curator', name: 'Path Curator', emoji: '🧭' },
        reason: 'Saved 8/10 courses toward curated path',
      },
    ];

    return new Response(
      JSON.stringify({ mode: 'dry-run', ok: true, would_award }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ mode: 'dry-run', ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
