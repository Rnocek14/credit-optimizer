import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoId } = await req.json();
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get auth user
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const startTime = Date.now();
    
    // Update job status to running
    const { data: job } = await supabase
      .from('ai_analyzer_jobs')
      .insert({
        repo_id: repoId,
        user_id: user.id,
        job_type: 'index',
        status: 'running',
        started_at: new Date().toISOString(),
        input_data: { repoId }
      })
      .select()
      .single();

    console.log('Starting repository indexing for:', repoId);

    // Simulate file discovery and processing
    // In a real implementation, this would:
    // 1. Walk the repository files
    // 2. Filter by ignore patterns
    // 3. Chunk files semantically
    // 4. Generate embeddings
    // 5. Store in database

    const mockFiles = [
      'src/App.tsx',
      'src/components/Navigation.tsx',
      'src/pages/Dashboard.tsx',
      'src/hooks/useAuth.ts',
      'package.json',
      'README.md'
    ];

    const languageBreakdown = {
      'TypeScript': 4,
      'JSON': 1,
      'Markdown': 1
    };

    // Mock chunking and embedding generation
    let totalChunks = 0;
    let tokenUsage = 0;

    for (const filePath of mockFiles) {
      const fileContent = `// Mock content for ${filePath}\n// This would contain actual file content`;
      const contentHash = btoa(fileContent).slice(0, 16);
      
      // Simulate chunking (1-3 chunks per file)
      const chunksPerFile = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < chunksPerFile; i++) {
        // Generate mock embedding using OpenAI (in real implementation)
        const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
        
        // Store chunk in database
        await supabase
          .from('ai_analyzer_chunks')
          .insert({
            repo_id: repoId,
            file_path: filePath,
            content_hash: contentHash,
            chunk_content: fileContent,
            embedding_data: { vector: mockEmbedding },
            language: filePath.endsWith('.tsx') || filePath.endsWith('.ts') ? 'TypeScript' : 
                     filePath.endsWith('.json') ? 'JSON' : 'Markdown',
            chunk_index: i,
            total_chunks: chunksPerFile,
            symbols: filePath.includes('component') ? ['Component', 'JSX'] : 
                    filePath.includes('hook') ? ['Hook', 'useState'] : []
          });
        
        totalChunks++;
        tokenUsage += Math.floor(Math.random() * 200) + 100;
      }
    }

    // Update repository record
    await supabase
      .from('ai_analyzer_repos')
      .upsert({
        id: repoId,
        user_id: user.id,
        name: 'Current Repository',
        repo_type: 'local',
        indexed_at: new Date().toISOString(),
        file_count: mockFiles.length,
        language_breakdown: languageBreakdown
      });

    const durationMs = Date.now() - startTime;

    // Update job as completed
    await supabase
      .from('ai_analyzer_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: {
          filesIndexed: mockFiles.length,
          chunks: totalChunks,
          languages: Object.keys(languageBreakdown),
          durationMs
        },
        token_usage: tokenUsage,
        cost_estimate: (tokenUsage / 1000) * 0.002 // Rough OpenAI pricing
      })
      .eq('id', job.id);

    console.log(`Indexing completed: ${mockFiles.length} files, ${totalChunks} chunks, ${durationMs}ms`);

    return new Response(JSON.stringify({
      filesIndexed: mockFiles.length,
      chunks: totalChunks,
      languages: Object.keys(languageBreakdown),
      durationMs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-analyzer-index:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});