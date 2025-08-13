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

function chunkText(content: string, targetSize = 1600, overlap = 200): string[] {
  const chunks: string[] = [];
  let position = 0;
  
  while (position < content.length) {
    const end = Math.min(position + targetSize, content.length);
    chunks.push(content.slice(position, end));
    
    position = end - overlap;
    if (position <= 0) position = end;
    if (position >= content.length) break;
  }
  
  return chunks;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  
  const languageMap: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript", 
    jsx: "JavaScript",
    json: "JSON",
    md: "Markdown",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    py: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    go: "Go",
    rs: "Rust",
    php: "PHP",
    rb: "Ruby",
    sql: "SQL"
  };
  
  return languageMap[ext] || "Text";
}

function extractSymbols(content: string, language: string): string[] {
  const symbols: string[] = [];
  
  try {
    if (language === "TypeScript" || language === "JavaScript") {
      // Extract functions, classes, interfaces
      const functionMatches = content.match(/(?:function|const|let|var)\s+(\w+)|class\s+(\w+)|interface\s+(\w+)|type\s+(\w+)/g);
      if (functionMatches) {
        functionMatches.forEach(match => {
          const name = match.replace(/^(function|const|let|var|class|interface|type)\s+/, '').split(/[\s=(/]/)[0];
          if (name && name.length > 2) symbols.push(name);
        });
      }
    }
  } catch (error) {
    console.log("Symbol extraction failed:", error);
  }
  
  return [...new Set(symbols)].slice(0, 10); // Limit and dedupe
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoId, files } = await req.json();

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

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error("No files provided. Send { files: [{path, content}] } from the client.");
    }

    console.log(`📊 Starting indexing for repo ${repoId} with ${files.length} files`);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("ai_analyzer_jobs")
      .insert({
        repo_id: repoId,
        user_id: user.id,
        job_type: "index",
        status: "running",
        started_at: new Date().toISOString(),
        input_data: { repoId, fileCount: files.length }
      })
      .select()
      .single();

    if (jobError) throw jobError;

    let totalChunks = 0;
    const languageBreakdown: Record<string, number> = {};
    let totalTokenUsage = 0;

    // Process each file
    for (const file of files) {
      const language = detectLanguage(file.path);
      languageBreakdown[language] = (languageBreakdown[language] || 0) + 1;

      const chunks = chunkText(file.content);
      const symbols = extractSymbols(file.content, language);

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
          // Create embedding with OpenAI
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: chunkContent,
            dimensions: 1536
          });

          const embedding = embeddingResponse.data[0].embedding;
          totalTokenUsage += embeddingResponse.usage?.total_tokens || 0;

          // Store chunk in database
          const { error: chunkError } = await supabase
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
              embedding: embedding
            });

          if (chunkError) {
            console.error("Chunk insert error:", chunkError);
            throw chunkError;
          }

          totalChunks++;
        } catch (embeddingError) {
          console.error("Embedding error for chunk:", embeddingError);
          throw embeddingError;
        }
      }
    }

    // Update/create repo record
    const { error: repoError } = await supabase
      .from("ai_analyzer_repos")
      .upsert({
        id: repoId,
        user_id: user.id,
        name: "Current Repository", 
        repo_type: "local",
        indexed_at: new Date().toISOString(),
        file_count: files.length,
        language_breakdown: languageBreakdown
      });

    if (repoError) throw repoError;

    // Complete job
    const costEstimate = (totalTokenUsage / 1_000_000) * 0.13; // text-embedding-3-large pricing
    
    const { error: jobUpdateError } = await supabase
      .from("ai_analyzer_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results: {
          filesIndexed: files.length,
          chunks: totalChunks,
          languages: Object.keys(languageBreakdown),
          languageBreakdown
        },
        token_usage: totalTokenUsage,
        cost_estimate: costEstimate
      })
      .eq("id", job.id);

    if (jobUpdateError) throw jobUpdateError;

    console.log(`✅ Indexing completed: ${files.length} files, ${totalChunks} chunks, ${totalTokenUsage} tokens`);

    return new Response(JSON.stringify({
      success: true,
      filesIndexed: files.length,
      chunks: totalChunks,
      languages: Object.keys(languageBreakdown),
      languageBreakdown,
      tokenUsage: totalTokenUsage,
      costEstimate
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("AI Analyzer Index Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "An error occurred during indexing",
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});