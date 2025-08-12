import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  plan_id: z.string().uuid().optional(),
  action: z.enum(["approve","reject","preview"]).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const json = await req.json().catch(() => ({}));
    Body.safeParse(json);
    const diff = {
      added_steps: [{ id: "a1", title: "Add React Hooks module" }],
      removed_steps: [{ id: "r1", title: "Remove deprecated course" }],
      notes: "Demo-only diff; no DB writes.",
      action: json?.action ?? "preview",
    };
    return new Response(JSON.stringify({ mode: "dry-run", ok: true, diff }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ mode: "dry-run", ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
