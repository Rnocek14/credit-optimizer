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

const LIFEPATH_AUDIT_PROMPT = `You are an expert Life Path platform architecture auditor. Analyze the provided codebase and score each pillar (0-10). Return ONLY valid JSON:

{
  "scorecard": {
    "explore": 0-10,
    "plan": 0-10,
    "history": 0-10,
    "mentorship": 0-10,
    "resume": 0-10,
    "cri_difficulty": 0-10,
    "ai_planner": 0-10,
    "trust_fairness": 0-10,
    "multi_track": 0-10
  },
  "gaps": [
    {
      "area": "Area name",
      "impact": "low|med|high", 
      "why": "Why this is a gap",
      "fix": "How to fix it"
    }
  ],
  "quick_wins": [
    "Quick improvement 1",
    "Quick improvement 2"
  ],
  "architecture_recs": [
    "Architecture recommendation 1",
    "Architecture recommendation 2"
  ],
  "ux_recs": [
    "UX improvement 1", 
    "UX improvement 2"
  ]
}

Life Path Pillars:
1. EXPLORE: Career discovery, market data, industry insights
2. PLAN: Roadmap creation, goal setting, milestone tracking
3. HISTORY: Transcript management, progress tracking, achievements
4. MENTORSHIP: Instructor ratings, feedback systems, social features
5. RESUME: Profile building, export features, showcase capabilities
6. CRI_DIFFICULTY: Complexity analysis, instructor difficulty ratings
7. AI_PLANNER: Intelligent recommendations, substitutions, automation
8. TRUST_FAIRNESS: Bias prevention, transparency, ethical AI
9. MULTI_TRACK: Multiple career paths, parallel planning

Be specific about missing components and provide actionable recommendations.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoId } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    if (!repoId) {
      throw new Error("repoId is required");
    }

    console.log(`🏗️ Starting Life Path audit for repo ${repoId}`);

    // Get representative chunks from the codebase
    const { data: chunks, error: chunksError } = await supabase
      .from("ai_analyzer_chunks")
      .select("file_path, chunk_content, symbols, language")
      .eq("repo_id", repoId)
      .limit(100);

    if (chunksError) throw chunksError;

    if (!chunks || chunks.length === 0) {
      throw new Error("No indexed content found. Please index the repository first.");
    }

    // Create codebase summary
    const codebaseSummary = chunks.map(chunk => 
      `File: ${chunk.file_path} (${chunk.language})\n` +
      `Symbols: ${(chunk.symbols || []).join(", ")}\n` +
      `Content: ${chunk.chunk_content.slice(0, 400)}...\n`
    ).join("\n---\n");

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("ai_analyzer_jobs")
      .insert({
        repo_id: repoId,
        user_id: user.id,
        job_type: "lifepath_audit",
        status: "running",
        started_at: new Date().toISOString(),
        input_data: { repoId, chunksAnalyzed: chunks.length }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Send to OpenAI for audit
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: LIFEPATH_AUDIT_PROMPT },
        { 
          role: "user", 
          content: `Audit this Life Path codebase for architecture compliance:\n\n${codebaseSummary}\n\nOutput strict JSON only.`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    const responseText = response.choices[0].message.content || "";
    let auditResult;

    try {
      auditResult = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`AI model did not return valid JSON. Response: ${responseText.slice(0, 200)}...`);
    }

    // Store audit in dedicated table
    const { error: auditError } = await supabase
      .from("ai_analyzer_audits")
      .insert({
        repo_id: repoId,
        user_id: user.id,
        audit_type: "lifepath",
        scorecard: auditResult.scorecard,
        gaps: auditResult.gaps,
        quick_wins: auditResult.quick_wins,
        architecture_recs: auditResult.architecture_recs,
        ux_recs: auditResult.ux_recs
      });

    if (auditError) throw auditError;

    // Update job with results
    const { error: jobUpdateError } = await supabase
      .from("ai_analyzer_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results: auditResult,
        token_usage: response.usage?.total_tokens || 0,
        cost_estimate: ((response.usage?.total_tokens || 0) / 1_000_000) * 0.03
      })
      .eq("id", job.id);

    if (jobUpdateError) throw jobUpdateError;

    console.log(`✅ Life Path audit completed for repo ${repoId}`);

    return new Response(JSON.stringify(auditResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("AI Analyzer Life Path Audit Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred during Life Path audit",
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});