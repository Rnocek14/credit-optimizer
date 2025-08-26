
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.52.0?target=deno";
import { ok, withCircuitBreaker, corsHeaders, supabase } from "../_shared/utils.ts";

console.log('Maya Insight Generator - Starting function initialization');

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
  throw new Error('OPENAI_API_KEY not configured');
}

const oai = new OpenAI({ apiKey: openaiApiKey });
console.log('Maya Insight Generator - OpenAI client initialized');

// Parse insights from AI output with robust fallbacks
function parseInsights(rawText: string, maxCount: number): string[] {
  if (!rawText?.trim()) return [];
  
  try {
    // Try JSON parsing first
    const parsed = JSON.parse(rawText.trim());
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return parsed.slice(0, maxCount);
    }
  } catch (e) {
    // JSON parsing failed, continue to fallbacks
  }
  
  // Fallback: try various delimiters
  const delimiters = [
    /\n/g,                           // newlines
    /^\s*\d+[.)]\s+/gm,             // numbered lists
    /^\s*[-*•]\s+/gm,               // bullet points
  ];
  
  for (const delimiter of delimiters) {
    const lines = rawText.split(delimiter)
      .map(line => line.trim().replace(/^\d+[.)]\s*|^[-*•]\s*/, '').trim())
      .filter(line => line.length >= 8)
      .slice(0, maxCount);
    
    if (lines.length > 0) {
      return [...new Set(lines)]; // deduplicate
    }
  }
  
  // Last resort: return the whole text if it's reasonable length
  return rawText.trim().length >= 8 && rawText.trim().length <= 300 ? [rawText.trim()] : [];
}

serve(async (req) => {
  console.log('Maya Insight Generator - Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Maya Insight Generator - Processing request (no auth required)');

  return withCircuitBreaker(async () => {
    console.log('Maya Insight Generator - Starting batch generation');

    // Check for dev user filter
    const devUserId = req.headers.get('x-dev-user-id');
    const knownDevUsers = ['2b458624-d498-4cca-a63d-9341cc20e363', '3c459625-e499-5ddb-b64d-a442dd21f474', '4d56a736-f5aa-6eec-c75e-b553ee32e585'];

    // Get users to process (filter to dev user if specified, or known dev users only)
    let userQuery = supabase.from("profiles").select("user_id, name, role_title, experience_level");
    
    if (devUserId) {
      userQuery = userQuery.eq('user_id', devUserId);
    } else {
      userQuery = userQuery.in('user_id', knownDevUsers);
    }
    
    const { data: users } = await userQuery.limit(10);

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

        // Skip if no recent activity (unless in dev mode)
        const isDevMode = devUserId || knownDevUsers.includes(profile.user_id);
        if (!isDevMode && (!recentActivity || recentActivity.length === 0)) {
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
        
        let ideas = [];
        let insightsGenerated = 0;
        
        try {
          const completion = await oai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are Maya, a proactive career AI coach. Generate 2-3 specific, actionable career insights. Return ONLY a JSON array of strings, no additional text or formatting."
              },
              {
                role: "user",
                content: `Generate proactive career insights for: ${JSON.stringify(contextSummary)}`
              },
            ],
            max_tokens: 300,
            temperature: 0.7,
          });

          const rawOutput = completion.choices?.[0]?.message?.content ?? "";
          console.log(`OpenAI raw output (${rawOutput.length} chars):`, rawOutput.slice(0, 300));
          
          ideas = parseInsights(rawOutput, 3);
          console.log(`OpenAI generated ${ideas.length} ideas for user ${profile.user_id}:`, ideas.map(i => i.slice(0, 60)));
        } catch (aiError) {
          console.error(`OpenAI call failed for user ${profile.user_id}:`, aiError);
          
          // In dev mode, insert a synthetic insight for testing
          if (isDevMode) {
            const ts = new Date().toISOString();
            const randomSuffix = Math.random().toString(36).substring(7);
            ideas = [`Debug: OpenAI failed, synthetic insight (${ts}-${randomSuffix})`];
          }
        }

        // Dev mode fallback: ensure at least one insight for testing
        if (isDevMode && ideas.length === 0) {
          const ts = new Date().toISOString();
          const randomSuffix = Math.random().toString(36).substring(7);
          ideas = [`Debug: Parser found no insights; pipeline working (${ts}-${randomSuffix})`];
          console.log(`Dev fallback applied for user ${profile.user_id}`);
        }

        // Persist insights (use 'content' column per schema)
        for (const idea of ideas) {
          try {
            const timestamp = new Date().toISOString().split('.')[0];
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const uniqueTitle = `${idea.slice(0, 90)} - ${timestamp}-${randomSuffix}`;
            
            const { data: insertedInsight } = await supabase.from("maya_proactive_insights").insert({
              user_id: profile.user_id,
              title: uniqueTitle,
              content: idea,
              priority: "medium",
              insight_type: "proactive",
              context_data: { 
                source: "generator", 
                generated_at: new Date().toISOString(),
                context_summary: contextSummary,
                tokens_in: completion.usage?.prompt_tokens || 0,
                tokens_out: completion.usage?.completion_tokens || 0
              },
            }).select();
            
            if (insertedInsight && insertedInsight.length > 0) {
              insightsGenerated++;
            }
          } catch (insertError) {
            console.error(`Failed to insert insight for user ${profile.user_id}:`, insertError);
          }
        }

        // Only increment count if we actually generated insights
        if (insightsGenerated > 0) {
          generatedCount++;
        }
        
        console.log(`Generated insights for user ${profile.user_id}: ${insightsGenerated} insights inserted`);

      } catch (error) {
        console.error(`Failed to generate insights for user ${profile.user_id}:`, error);
        continue;
      }
    }

    console.log('Maya Insight Generator - Completed:', { generatedFor: generatedCount });

    return { 
      success: true,
      generatedFor: generatedCount,
      totalUsers: (users || []).length,
      timestamp: new Date().toISOString(),
      scope: devUserId ? 'single_user' : 'dev_users'
    };
  });
});
