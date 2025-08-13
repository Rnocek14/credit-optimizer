import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.67.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the provided code and return ONLY valid JSON in this exact format:

{
  "summary": "Brief overview of the code quality and main findings",
  "issues": [
    {
      "title": "Issue title",
      "severity": "low|medium|high",
      "line": 42,
      "rationale": "Explanation of why this is an issue",
      "suggested_patch": "unified diff format patch to fix the issue"
    }
  ],
  "tests_suggested": [
    "Test description 1",
    "Test description 2"
  ],
  "performance_notes": [
    "Performance improvement suggestion 1",
    "Performance improvement suggestion 2"
  ],
  "security_notes": [
    "Security concern 1",
    "Security recommendation 2"
  ]
}

Focus on:
- Code quality and maintainability
- Security vulnerabilities  
- Performance issues
- Best practice violations
- TypeScript/React specific improvements
- Potential bugs or edge cases

All patches must be in unified diff format. Be specific with line numbers where possible.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoId, path } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    if (!repoId || !path) {
      throw new Error("repoId and path are required");
    }

    console.log(`🔍 Starting review for ${path} in repo ${repoId}`);

    // Get file chunks from database
    const { data: chunks, error: chunksError } = await supabase
      .from("ai_analyzer_chunks")
      .select("chunk_content, chunk_index")
      .eq("repo_id", repoId)
      .eq("file_path", path)
      .order("chunk_index");

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      throw new Error("File not found in indexed repository. Please index the repository first.");
    }

    // Rebuild file content from chunks
    const fileContent = chunks.map(chunk => chunk.chunk_content).join("\n");

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("ai_analyzer_jobs")
      .insert({
        repo_id: repoId,
        user_id: user.id,
        job_type: "review",
        status: "running",
        started_at: new Date().toISOString(),
        input_data: { repoId, path }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Send to OpenAI for review
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `File: ${path}\n\nContent:\n${fileContent}\n\nReview this code and output strict JSON only.`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const responseText = response.choices[0].message.content || "";
    let reviewResult;

    try {
      reviewResult = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`AI model did not return valid JSON. Response: ${responseText.slice(0, 200)}...`);
    }

    // Update job with results
    const { error: jobUpdateError } = await supabase
      .from("ai_analyzer_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results: reviewResult,
        token_usage: response.usage?.total_tokens || 0,
        cost_estimate: ((response.usage?.total_tokens || 0) / 1_000_000) * 0.03 // gpt-4.1 pricing estimate
      })
      .eq("id", job.id);

    if (jobUpdateError) throw jobUpdateError;

    console.log(`✅ Review completed for ${path}`);

    return new Response(JSON.stringify(reviewResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("AI Analyzer Review Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred during code review",
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});