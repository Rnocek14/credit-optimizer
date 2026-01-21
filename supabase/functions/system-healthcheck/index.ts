import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth gate: require x-cron-secret if OPS_CRON_SECRET is configured
    const opsSecret = Deno.env.get("OPS_CRON_SECRET");
    if (opsSecret) {
      const provided = req.headers.get("x-cron-secret");
      if (!provided || provided !== opsSecret) {
        return json(401, { error: "unauthorized" });
      }
    }

    // Create service role client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, { error: "missing_supabase_config" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Query operational health dashboard (single row view)
    const { data, error } = await supabase
      .from("operational_health_dashboard")
      .select("*")
      .single();

    if (error) {
      console.error("Dashboard query error:", error.message);
      return json(500, {
        error: "dashboard_query_failed",
        detail: error.message,
        checked_by: "system-healthcheck",
        checked_at: new Date().toISOString(),
      });
    }

    // Determine HTTP status based on gate
    const isGreen = data?.overall_gate === "GREEN";
    const httpStatus = isGreen ? 200 : 500;

    return json(httpStatus, {
      ...data,
      checked_by: "system-healthcheck",
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json(500, {
      error: "unexpected_error",
      detail: err instanceof Error ? err.message : String(err),
      checked_by: "system-healthcheck",
      checked_at: new Date().toISOString(),
    });
  }
});
