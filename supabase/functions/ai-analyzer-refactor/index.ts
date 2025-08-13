import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.67.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { repoId, path, goals } = await req.json();
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) throw new Error("Unauthorized");
    if (!repoId || !path) throw new Error("repoId and path are required");

    // Get file content from chunks
    const { data: chunks } = await supabase.from("ai_analyzer_chunks")
      .select("chunk_content").eq("repo_id", repoId).eq("file_path", path).order("chunk_index");
    
    if (!chunks?.length) throw new Error("File not found in indexed repository");
    
    const fileContent = chunks.map(c => c.chunk_content).join("\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: "Return JSON with: plan[], diffs[], risks[], benefits[], testing_strategy[]" },
        { role: "user", content: `Refactor this file: ${path}\n\n${fileContent}\n\nGoals: ${goals?.join(", ") || "General improvements"}` }
      ],
      temperature: 0.1, max_tokens: 2500
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    await supabase.from("ai_analyzer_jobs").insert({
      repo_id: repoId, user_id: user.id, job_type: "refactor", status: "completed",
      results: result, token_usage: response.usage?.total_tokens || 0
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});