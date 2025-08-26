
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.52.0";
import { ok, withCircuitBreaker, corsHeaders, supabase } from "../_shared/utils.ts";

console.log('Maya Insight Generator - Starting function initialization');

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
  throw new Error('OPENAI_API_KEY not configured');
}

const oai = new OpenAI({ apiKey: openaiApiKey });
console.log('Maya Insight Generator - OpenAI client initialized');

serve(async (req) => {
  console.log('Maya Insight Generator - Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Maya Insight Generator - Processing request (no auth required)');

  return withCircuitBreaker(async () => {
    console.log('Maya Insight Generator - Starting batch generation');

    // Get demo users and active users (limit to prevent overload)
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, name, role_title, experience_level")
      .limit(10);

    let generatedCount = 0;

    for (const profile of users || []) {
      try {
        // Get user context
        const { data: goals } = await supabase
          .from('career_goals')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('active', true)
          .limit(3);

        const { data: recentActivity } = await supabase
          .from('maya_context_tracking')
          .select('event_type, created_at')
          .eq('user_id', profile.user_id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(10);

        // Skip if no recent activity
        if (!recentActivity || recentActivity.length === 0) {
          continue;
        }

        const contextSummary = {
          profile: profile,
          goals: goals || [],
          recentActivity: recentActivity.length,
          lastActivity: recentActivity[0]?.created_at
        };

        // Generate insights
        console.log(`Generating insights for user ${profile.user_id} with context:`, contextSummary);
        const completion = await oai.chat.completions.create({
          model: "gpt-5-mini-2025-08-07",
          messages: [
            {
              role: "system",
              content: "You generate short, high-signal proactive career insights. Return 1-3 actionable insights separated by newlines."
            },
            {
              role: "user",
              content: `Generate proactive career insights for this user: ${JSON.stringify(contextSummary)}`
            },
          ],
          max_completion_tokens: 300,
        });

        const ideas = (completion.choices?.[0]?.message?.content ?? "")
          .split("\n")
          .filter(line => line.trim().length > 20)
          .slice(0, 3);

        // Persist insights (use 'content' column per schema)
        for (const idea of ideas) {
          await supabase.from("maya_proactive_insights").upsert({
            user_id: profile.user_id,
            title: idea.slice(0, 120),
            content: idea,
            priority: "medium",
            insight_type: "proactive",
            context_data: { 
              source: "generator", 
              generated_at: new Date().toISOString(),
              context_summary: contextSummary 
            },
          }, { 
            onConflict: "user_id,title",
            ignoreDuplicates: true 
          });
        }

        generatedCount++;
        console.log(`Generated insights for user ${profile.user_id}: ${ideas.length} insights`);

      } catch (error) {
        console.error(`Failed to generate insights for user ${profile.user_id}:`, error);
        continue;
      }
    }

    console.log('Maya Insight Generator - Completed:', { generatedFor: generatedCount });

    return { 
      success: true,
      generatedFor: generatedCount,
      timestamp: new Date().toISOString()
    };
  });
});
