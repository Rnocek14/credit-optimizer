import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ mode: "dry-run", ok: false, error: "Use GET" }), {
        status: 405, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const items = [
      { course_id: "c-101", title: "React for Beginners", confidence: 0.86, marketAlignment: 0.82, skillGapCoverage: 0.90 },
      { course_id: "c-202", title: "TypeScript Deep Dive", confidence: 0.90, marketAlignment: 0.78, skillGapCoverage: 0.88 },
      { course_id: "c-303", title: "System Design Basics", confidence: 0.80, marketAlignment: 0.85, skillGapCoverage: 0.75 },
    ];
    return new Response(JSON.stringify({ mode: "dry-run", ok: true, items }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ mode: "dry-run", ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
