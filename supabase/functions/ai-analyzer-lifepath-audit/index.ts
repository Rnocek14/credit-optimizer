import { corsHeaders, supabase, openai, authenticateUser } from "../_shared/util.ts";

const LIFEPATH_AUDIT_PROMPT = `You are an expert Life Path platform architect. Audit the provided codebase and return JSON ONLY:

{
  "scorecard": {
    "explore": 8.5,
    "plan": 7.2,
    "history": 6.8,
    "mentorship": 9.1,
    "resume": 7.5,
    "cri_difficulty": 8.0,
    "ai_planner": 8.8,
    "trust_fairness": 7.9,
    "multi_track": 6.5
  },
  "gaps": [
    {
      "area": "Career exploration features",
      "impact": "high",
      "why": "Missing interactive career path visualization",
      "fix": "Implement dynamic career graph with user interaction"
    }
  ],
  "quick_wins": ["Add loading states", "Improve error messages"],
  "architecture_recs": ["Implement state management", "Add caching layer"],
  "ux_recs": ["Add onboarding flow", "Improve mobile responsiveness"]
}

Life Path Pillars (score 0-10):
- Explore: Career discovery, skill mapping, market intelligence
- Plan: Roadmap creation, milestone tracking, adaptive planning
- History: Progress tracking, achievement records, learning history
- Mentorship: Expert guidance, peer collaboration, feedback loops
- Resume: Profile building, skill validation, career readiness
- CRI/Difficulty: Challenge rating, skill assessment, growth metrics
- AI Planner: Intelligent recommendations, automated workflows
- Trust & Fairness: Transparency, bias detection, ethical AI
- Multi-Track: Parallel paths, career pivoting, flexibility

Return strict JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const { repoId } = await req.json();
    
    if (!repoId) throw new Error("repoId is required");

    // Get all indexed code chunks for this repository
    const { data: chunks, error } = await supabase
      .from("ai_analyzer_chunks")
      .select("file_path, chunk_content, language")
      .eq("repo_id", repoId)
      .limit(50); // Limit to prevent token overflow
    
    if (error) throw error;
    if (!chunks?.length) throw new Error("No indexed files found for this repository");
    
    // Create codebase summary
    const codebaseSummary = chunks.reduce((acc, chunk) => {
      const fileType = chunk.language || 'Unknown';
      if (!acc[fileType]) acc[fileType] = [];
      acc[fileType].push(`${chunk.file_path}: ${chunk.chunk_content.substring(0, 200)}...`);
      return acc;
    }, {} as Record<string, string[]>);

    // Record job as running
    const { data: jobData } = await supabase.from("ai_analyzer_jobs").insert({
      repo_id: repoId,
      user_id: user.id,
      job_type: "lifepath_audit",
      status: "running",
      input_data: { file_count: chunks.length }
    }).select().single();

    const prompt = `Audit this codebase against Life Path platform architecture:

File Summary:
${Object.entries(codebaseSummary).map(([type, files]) => 
  `${type} Files (${files.length}):\n${files.slice(0, 3).join('\n')}`
).join('\n\n')}

Total Files: ${chunks.length}

Provide Life Path architectural audit with scores and recommendations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: LIFEPATH_AUDIT_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2500
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Store audit results
    await supabase.from("ai_analyzer_audits").insert({
      repo_id: repoId,
      user_id: user.id,
      audit_type: "lifepath",
      scorecard: result.scorecard || {},
      gaps: result.gaps || [],
      quick_wins: result.quick_wins || [],
      architecture_recs: result.architecture_recs || [],
      ux_recs: result.ux_recs || []
    });

    // Update job status
    await supabase.from("ai_analyzer_jobs")
      .update({ 
        status: "completed", 
        results: result,
        token_usage: response.usage?.total_tokens || 0 
      })
      .eq("id", jobData.id);

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error('AI Analyzer Life Path Audit Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});