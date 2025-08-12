import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({ user_id: z.string().uuid().optional(), dry_run: z.boolean().optional() });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const json = await req.json().catch(() => ({}));
    Body.safeParse(json); // accept silently in dry-run
    const would_award = [
      { badge: "starter", reason: "Completed onboarding" },
      { badge: "planner", reason: "Generated first roadmap" },
    ];
    return new Response(JSON.stringify({ mode: "dry-run", ok: true, would_award }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ mode: "dry-run", ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
