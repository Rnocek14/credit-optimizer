import { corsHeaders, supabase, openai, chunkText, detectLanguage, extractSymbols, authenticateUser } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await authenticateUser(req);
    const { repoId, files } = await req.json();
    
    if (!repoId) throw new Error("repoId is required");
    if (!Array.isArray(files) || files.length === 0) throw new Error("files array is required");

    console.log(`📊 Starting indexing for repo ${repoId} with ${files.length} files`);

    // Create a job record to track progress
    const { data: job, error: jobError } = await supabase
      .from("ai_analyzer_jobs")
      .insert({
        repo_id: repoId,
        user_id: user.id,
        job_type: "index",
        status: "running",
        started_at: new Date().toISOString(),
        input_data: { fileCount: files.length }
      })
      .select()
      .single();
    
    if (jobError) throw jobError;

    let totalTokens = 0;
    let totalChunks = 0;
    const languageBreakdown: Record<string, number> = {};

    // Process each file
    for (const file of files) {
      const language = detectLanguage(file.path);
      languageBreakdown[language] = (languageBreakdown[language] || 0) + 1;
      
      // Extract symbols (functions, classes, etc.)
      const symbols = extractSymbols(file.content, language);
      
      // Chunk the file content
      const chunks = chunkText(file.content);
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small", // 1536 dimensions
          input: chunkContent
        });
        
        const embedding = embeddingResponse.data[0].embedding;
        totalTokens += embeddingResponse.usage?.total_tokens || 0;
        
        // Store chunk with embedding in vector column
        const { error: insertError } = await supabase
          .from("ai_analyzer_chunks")
          .insert({
            repo_id: repoId,
            file_path: file.path,
            content_hash: btoa(file.content).slice(0, 16),
            chunk_index: i,
            total_chunks: chunks.length,
            language,
            symbols,
            chunk_content: chunkContent,
            embedding: embedding as unknown as string // pgvector handles the conversion
          });
        
        if (insertError) throw insertError;
        totalChunks++;
      }
    }

    // Update repository information
    const { error: repoUpdateError } = await supabase
      .from("ai_analyzer_repos")
      .upsert({
        id: repoId,
        user_id: user.id,
        name: "Local Workspace",
        repo_type: "local",
        indexed_at: new Date().toISOString(),
        file_count: files.length,
        language_breakdown: languageBreakdown
      });
    
    if (repoUpdateError) throw repoUpdateError;

    // Calculate cost estimate
    const costEstimate = (totalTokens / 1_000_000) * 0.02; // text-embedding-3-small pricing

    // Mark job as completed
    const { error: jobUpdateError } = await supabase
      .from("ai_analyzer_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results: {
          filesIndexed: files.length,
          chunks: totalChunks,
          languageBreakdown
        },
        token_usage: totalTokens,
        cost_estimate: costEstimate
      })
      .eq("id", job.id);
    
    if (jobUpdateError) throw jobUpdateError;

    console.log(`✅ Indexing completed: ${files.length} files, ${totalChunks} chunks, ${totalTokens} tokens`);

    return new Response(JSON.stringify({
      success: true,
      filesIndexed: files.length,
      chunks: totalChunks,
      languageBreakdown,
      tokenUsage: totalTokens,
      costEstimate
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in ai-analyzer-index:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "An unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});