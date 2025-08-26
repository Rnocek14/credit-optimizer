
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.52.0";
import { ok, withCircuitBreaker, corsHeaders, supabase } from "../_shared/utils.ts";

const oai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Enforce cron/auth protection: require CRON_SECRET via header (x-cron-secret) or Bearer token
  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  const authHeader = req.headers.get('authorization') ?? '';
  const providedBearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!cronSecret || !(headerSecret === cronSecret || providedBearer === cronSecret)) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

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
          model: "gpt-4o-mini",
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
          max_tokens: 300,
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
            kind: "proactive",
            meta: { 
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
