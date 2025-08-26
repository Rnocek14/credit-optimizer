import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.52.0";
import { ok, withCircuitBreaker, corsHeaders, supabase } from "../_shared/utils.ts";

console.log('Maya Manual Insights - Starting function initialization');

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
  throw new Error('OPENAI_API_KEY not configured');
}

const oai = new OpenAI({ apiKey: openaiApiKey });
console.log('Maya Manual Insights - OpenAI client initialized');

// Rate limiting helper
async function checkRateLimit(userId: string, functionName: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 3600000); // 1 hour window
  const { data: existing } = await supabase
    .from('maya_rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .gte('window_start', windowStart.toISOString())
    .single();
  
  if (existing && existing.request_count >= 10) { // 10 requests per hour
    return false;
  }
  
  // Update or insert rate limit
  await supabase
    .from('maya_rate_limits')
    .upsert({
      user_id: userId,
      function_name: functionName,
      request_count: (existing?.request_count || 0) + 1,
      window_start: windowStart.toISOString()
    }, {
      onConflict: 'user_id,function_name,window_start'
    });
  
  return true;
}

// AI usage logging helper
async function logAIUsage(userId: string, functionName: string, model: string, tokensIn: number, tokensOut: number, latencyMs: number, success: boolean, errorMessage?: string) {
  await supabase
    .from('ai_model_usage_logs')
    .insert({
      user_id: userId,
      function_name: functionName,
      model: model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms: latencyMs,
      success: success,
      error_message: errorMessage
    });
}

serve(async (req) => {
  console.log('Maya Manual Insights - Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return withCircuitBreaker(async () => {
    console.log('Maya Manual Insights - Starting generation (no auth required)');
    
    // Extract user ID from dev header (since verify_jwt = false)
    const devUserId = req.headers.get('x-dev-user-id');
    const userId = devUserId || '2b458624-d498-4cca-a63d-9341cc20e363'; // Default to demo user
    
    console.log('Maya Manual Insights - Processing for user:', userId);
    
    // Skip rate limiting for now (public function)

    // Get user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, name, role_title, experience_level, career_goals, skills")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      console.log('No profile found for user:', userId);
      return { 
        success: false, 
        error: 'Profile not found',
        insights: []
      };
    }

    const { data: goals } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(3);

    const { data: recentActivity } = await supabase
      .from('maya_context_tracking')
      .select('event_type, created_at, context_data')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    const contextSummary = {
      profile: profile,
      goals: goals || [],
      recentActivity: recentActivity?.length || 0,
      lastActivity: recentActivity?.[0]?.created_at,
      activityTypes: recentActivity?.map(a => a.event_type) || []
    };

    console.log('Context for insights:', contextSummary);

    // Generate personalized insights
    const aiStartTime = Date.now();
        const completion = await oai.chat.completions.create({
          model: "gpt-5-mini-2025-08-07",
      messages: [
        {
          role: "system",
          content: `You are Maya, a proactive career AI coach. Generate 2-4 specific, actionable career insights based on the user's profile and recent activity. Each insight should be:
          - Specific to their career goals and current situation
          - Actionable with clear next steps
          - Encouraging but realistic
          - Tied to market trends when relevant
          
          Format: One insight per line, max 120 characters each.`
        },
        {
          role: "user",
          content: `Generate insights for: ${JSON.stringify(contextSummary)}`
        },
      ],
      max_completion_tokens: 400,
    });
    
    const aiLatency = Date.now() - aiStartTime;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const tokensIn = completion.usage?.prompt_tokens || 0;
    const tokensOut = completion.usage?.completion_tokens || 0;

    const ideas = (completion.choices?.[0]?.message?.content ?? "")
      .split("\n")
      .filter(line => line.trim().length > 20)
      .slice(0, 4);

    console.log('Generated insights:', ideas);

    // Persist insights to database
    const insertedInsights = [];
    for (const idea of ideas) {
      const { data: insight } = await supabase
        .from("maya_proactive_insights")
        .upsert({
          user_id: userId,
          title: idea.slice(0, 120),
          content: idea,
          priority: "medium",
          insight_type: "manual_generation",
          context_data: { 
            source: "manual_generation", 
            generated_at: new Date().toISOString(),
            context_summary: contextSummary,
            user_trigger: true,
            dev_mode: userIsDevMode
          },
        }, { 
          onConflict: "user_id,title",
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (insight) {
        insertedInsights.push(insight);
      }
    }

    console.log(`Maya Manual Insights - Generated ${insertedInsights.length} insights for user ${userId}`);
    
    // Log successful AI usage
    try {
      await logAIUsage(userId, 'maya-manual-insights', 'gpt-5-mini-2025-08-07', tokensIn, tokensOut, aiLatency, true);
    } catch (logError) {
      console.warn('Failed to log AI usage:', logError);
    }

    return { 
      success: true,
      insights: insertedInsights,
      generatedCount: insertedInsights.length,
      timestamp: new Date().toISOString()
    };
  });
});