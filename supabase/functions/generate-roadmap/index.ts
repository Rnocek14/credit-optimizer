import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  goal: z.string().optional(),
  user_skills: z.array(z.string()).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ mode: "dry-run", ok: false, errors: parsed.error.flatten() }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const goal = parsed.data.goal ?? "Frontend Developer";
    const steps = [
      { id: "r1", title: `Clarify target role → ${goal}`, est_hours: 2 },
      { id: "r2", title: "Fill skill gaps: React/TS", est_hours: 20 },
      { id: "r3", title: "Build 2 proof projects", est_hours: 30 },
      { id: "r4", title: "Publish portfolio + apply", est_hours: 8 },
    ];
    const ids = steps.map(s => s.id);
    return new Response(JSON.stringify({
      mode: "dry-run", ok: true, goal,
      steps, fastest_path: ids, lowest_cost_path: ids, highest_roi_path: ids
    }), { headers: { ...cors, "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ mode: "dry-run", ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
