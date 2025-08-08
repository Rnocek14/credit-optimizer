import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    let code: string | undefined;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      code = url.searchParams.get('code') || undefined;
    } else {
      const json = await req.json().catch(() => ({}));
      code = json?.code;
    }

    const valid = Boolean(code);
    const certificate = valid ? {
      user: 'Demo',
      workflow_id: 'demo-wf',
      issued_at: new Date().toISOString(),
    } : null;

    return new Response(JSON.stringify({ mode: 'dry-run', ok: true, valid, certificate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ mode: 'dry-run', ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
