import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const json = await req.json().catch(() => ({}));
    const demo = Boolean(json?.demo);
    const skills = demo ? ["React","TypeScript","GraphQL","Node.js"] : ["Communication","Leadership"];
    return new Response(JSON.stringify({ mode: "dry-run", ok: true, skills }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ mode: "dry-run", ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
