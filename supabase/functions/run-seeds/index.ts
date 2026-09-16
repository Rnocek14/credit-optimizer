import { requireAdminOrCron } from '../_shared/requireAdminOrCron.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authorization: admin user or CRON_SECRET (2026-09-15 audit).
  const denied = await requireAdminOrCron(req, corsHeaders);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'seed';

    if (action === "ping") {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "pong", 
        timestamp: new Date().toISOString() 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      message: "Use dedicated seed functions for seeding data",
      availableFunctions: [
        "seed-data-2025",
        "seed-v5-marketplace", 
        "optimizer-seed-tesu",
        "optimizer-seed-cosc",
        "optimizer-seed-excelsior",
        "optimizer-seed-wgu"
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
