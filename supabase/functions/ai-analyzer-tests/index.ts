import { corsHeaders, supabase, openai, authenticateUser } from "../_shared/util.ts";

const SYSTEM_PROMPT = `Return JSON ONLY: {"tests":[{"filename":"","content":""}], "coverage":[], "testing_strategy":[], "mocks_needed":[]}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const { repoId, path, framework = "vitest" } = await req.json();
    
    if (!repoId || !path) throw new Error("repoId and path are required");

    // Get file content from chunks
    const { data: chunks, error } = await supabase
      .from("ai_analyzer_chunks")
      .select("chunk_content, chunk_index")
      .eq("repo_id", repoId)
      .eq("file_path", path)
      .order("chunk_index");
    
    if (error) throw error;
    if (!chunks?.length) throw new Error("File not found in indexed repository");
    
    const fileContent = chunks.map(c => c.chunk_content).join("\n");
    
    const prompt = `Generate ${framework} tests for file: ${path}
Code:
${fileContent}
Output STRICT JSON as per schema.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    await supabase.from("ai_analyzer_jobs").insert({
      repo_id: repoId,
      user_id: user.id,
      job_type: "tests",
      status: "completed",
      results: result,
      token_usage: response.usage?.total_tokens || 0
    });

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});