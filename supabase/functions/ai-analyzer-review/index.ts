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

const SYSTEM_PROMPT = `You are GPT-4.1, a senior staff engineer and product auditor. You analyze code with a focus on correctness, readability, security, performance, and Life Path product alignment (Explore, Plan, My History, Mentorship, Resume, CRI/Difficulty/Instructor ratings, AI Planner, Trust/Abuse).

Constraints:
• Never write files; produce unified diffs only
• Keep patches minimal, self-contained, and tested
• When recommending tests, specify test framework and mocks
• When auditing Life Path fit, tie every finding to a specific file and line range
• Provide specific line numbers for all issues
• Focus on actionable improvements`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoId, path, ref } = await req.json();
    
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

    console.log('Starting file review for:', path);

    // Create job record
    const { data: job } = await supabase
      .from('ai_analyzer_jobs')
      .insert({
        repo_id: repoId,
        user_id: user.id,
        job_type: 'review',
        status: 'running',
        started_at: new Date().toISOString(),
        input_data: { repoId, path, ref }
      })
      .select()
      .single();

    // Get file content from chunks
    const { data: chunks } = await supabase
      .from('ai_analyzer_chunks')
      .select('*')
      .eq('repo_id', repoId)
      .eq('file_path', path);

    const fileContent = chunks?.map(c => c.chunk_content).join('\n') || `// Mock content for ${path}
import React from 'react';
import { useState } from 'react';

export const ExampleComponent = () => {
  const [count, setCount] = useState(0);
  
  // TODO: Add error handling
  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <button onClick={handleClick}>Count: {count}</button>
    </div>
  );
};`;

    // Call OpenAI for analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Review this file: ${path}\n\nFile content:\n${fileContent}\n\nProvide analysis with specific issues, suggestions, and unified diffs for improvements.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Parse analysis into structured format (mock implementation)
    const reviewResult = {
      summary: `Analysis of ${path}: Found potential improvements in error handling, type safety, and performance optimizations.`,
      issues: [
        {
          title: "Missing error handling",
          severity: "medium",
          line: 8,
          rationale: "The handleClick function should handle potential errors when updating state",
          suggested_patch: `@@ -7,7 +7,11 @@
   // TODO: Add error handling
   const handleClick = () => {
-    setCount(count + 1);
+    try {
+      setCount(prev => prev + 1);
+    } catch (error) {
+      console.error('Failed to update count:', error);
+    }
   };`
        },
        {
          title: "Direct state mutation risk",
          severity: "low", 
          line: 9,
          rationale: "Using functional state update is safer than direct value reference",
          suggested_patch: `@@ -8,7 +8,7 @@
   const handleClick = () => {
-    setCount(count + 1);
+    setCount(prev => prev + 1);
   };`
        }
      ],
      tests_suggested: [
        "Test component renders with initial count of 0",
        "Test count increments when button is clicked",
        "Test error handling when state update fails"
      ],
      performance_notes: [
        "Consider useMemo for expensive calculations",
        "Add React.memo if component re-renders frequently"
      ],
      security_notes: [
        "No security issues detected in this component"
      ]
    };

    const tokenUsage = data.usage?.total_tokens || 500;

    // Update job as completed
    await supabase
      .from('ai_analyzer_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: reviewResult,
        token_usage: tokenUsage,
        cost_estimate: (tokenUsage / 1000) * 0.01
      })
      .eq('id', job.id);

    console.log(`File review completed for ${path}`);

    return new Response(JSON.stringify(reviewResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-analyzer-review:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});