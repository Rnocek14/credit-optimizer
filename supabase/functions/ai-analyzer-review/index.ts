import { corsHeaders, supabase, openai, authenticateUser } from "../_shared/util.ts";

const SYSTEM_PROMPT = `You are a strict code reviewer. Output ONLY valid JSON:
{"summary":"","issues":[{"severity":"low|medium|high|critical","line":null,"title":"","detail":"","fix":""}], "score":0-100}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const { repoId, path } = await req.json();
    
    if (!repoId || !path) throw new Error("repoId and path are required");

    console.log(`🔍 Starting review for ${path} in repo ${repoId}`);

    // Get file content from chunks
    const { data: chunks, error: chunksError } = await supabase
      .from("ai_analyzer_chunks")
      .select("chunk_content, chunk_index")
      .eq("repo_id", repoId)
      .eq("file_path", path)
      .order("chunk_index");
    
    if (chunksError) throw chunksError;
    if (!chunks || chunks.length === 0) {
      throw new Error("File not found in indexed repository. Please run a scan first.");
    }
    
    const fileContent = chunks.map(chunk => chunk.chunk_content).join("\n");

    // Generate review using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Review file: ${path}\n\n${fileContent}` }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const reviewContent = response.choices[0].message.content;
    let reviewResult;
    
    try {
      reviewResult = JSON.parse(reviewContent || "{}");
    } catch (parseError) {
      console.error("Failed to parse review response:", parseError);
      reviewResult = {
        summary: "Review completed but response format was invalid",
        issues: [],
        score: 70
      };
    }

    // Store job record
    await supabase.from("ai_analyzer_jobs").insert({
      repo_id: repoId,
      user_id: user.id,
      job_type: "review",
      status: "completed",
      results: reviewResult,
      token_usage: response.usage?.total_tokens || 0
    });

    console.log(`✅ Review completed for ${path}`);

    return new Response(JSON.stringify(reviewResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in ai-analyzer-review:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "An unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});