import { corsHeaders, supabase, openai, authenticateUser } from "../_shared/util.ts";

const SYSTEM_PROMPT = `You are a senior code reviewer. Analyze the provided code and return a JSON response with the following structure:
{
  "summary": "Brief overview of the code and overall assessment",
  "issues": [
    {
      "title": "Issue title",
      "severity": "low|medium|high",
      "line": 15,
      "rationale": "Why this is an issue",
      "suggested_patch": "Code diff or replacement suggestion"
    }
  ],
  "tests_suggested": ["Test suggestion 1", "Test suggestion 2"],
  "performance_notes": ["Performance note 1", "Performance note 2"],
  "security_notes": ["Security note 1", "Security note 2"]
}

Focus on:
- Code quality, maintainability, and best practices
- Performance optimization opportunities
- Security vulnerabilities
- Missing error handling
- TypeScript/React specific improvements
- Accessibility issues

Return ONLY valid JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const { repoId, path } = await req.json();
    
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
    
    const prompt = `Review the following code file: ${path}

${fileContent}

Provide a thorough code review focusing on quality, security, performance, and best practices.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    await supabase.from("ai_analyzer_jobs").insert({
      repo_id: repoId,
      user_id: user.id,
      job_type: "review",
      status: "completed",
      results: result,
      token_usage: response.usage?.total_tokens || 0
    });

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error('Error in ai-analyzer-review:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});