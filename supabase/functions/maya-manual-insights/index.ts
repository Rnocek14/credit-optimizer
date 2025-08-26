
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.52.0?target=deno";
import { ok, withCircuitBreaker, corsHeaders, supabase } from "../_shared/utils.ts";

console.log('Maya Manual Insights - Starting function initialization');

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
if (!openaiApiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
  throw new Error('OPENAI_API_KEY not configured');
}

const oai = new OpenAI({ apiKey: openaiApiKey });
console.log('Maya Manual Insights - OpenAI client initialized');

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
    const knownDevUsers = ['2b458624-d498-4cca-a63d-9341cc20e363', '3c459625-e499-5ddb-b64d-a442dd21f474', '4d56a736-f5aa-6eec-c75e-b553ee32e585'];
    const userIsDevMode = Boolean(devUserId) || knownDevUsers.includes(userId);
    
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
    let aiLatency = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    let completionText = "";
    try {
      const completion = await oai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Maya, a proactive career AI coach. Generate 2-4 specific, actionable career insights based on the user's profile and recent activity. Each insight should be:
            - Specific to their career goals and current situation
            - Actionable with clear next steps
            - Encouraging but realistic
            - Tied to market trends when relevant
            
            Return ONLY a JSON array of 2-4 strings. No additional text or formatting.`
          },
          {
            role: "user",
            content: `Generate insights for: ${JSON.stringify(contextSummary)}`
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });
      
      aiLatency = Date.now() - aiStartTime;
      tokensIn = completion.usage?.prompt_tokens || 0;
      tokensOut = completion.usage?.completion_tokens || 0;
      completionText = completion.choices?.[0]?.message?.content ?? "";
    } catch (aiError) {
      console.error('OpenAI call failed:', aiError);
      aiLatency = Date.now() - aiStartTime;
      
      // Log failed AI usage
      try {
        await logAIUsage(userId, 'maya-manual-insights', 'gpt-4o-mini', 0, 0, aiLatency, false, (aiError as Error).message);
      } catch (logError) {
        console.warn('Failed to log AI usage:', logError);
      }
      
      // In dev mode, insert a synthetic insight for testing
      if (userIsDevMode) {
        const ts = new Date().toISOString();
        const randomSuffix = Math.random().toString(36).substring(7);
        const syntheticInsight = `Debug: OpenAI call failed, pipeline active (${ts}-${randomSuffix})`;
        const { data: insight } = await supabase
          .from("maya_proactive_insights")
          .insert({
            user_id: userId,
            title: syntheticInsight.slice(0, 120),
            content: syntheticInsight,
            priority: "low",
            insight_type: "debug_fallback",
            context_data: { 
              source: "debug_fallback", 
              generated_at: new Date().toISOString(),
              error_message: (aiError as Error).message,
              dev_mode: true
            },
          })
          .select()
          .single();
          
        return { 
          success: true,
          insights: insight ? [insight] : [],
          generatedCount: insight ? 1 : 0,
          timestamp: new Date().toISOString(),
          fallbackUsed: true
        };
      }
      
      return { 
        success: false,
        error: 'OpenAI generation failed',
        insights: [],
        generatedCount: 0
      };
    }
    
    console.log(`OpenAI raw output (${completionText.length} chars):`, completionText.slice(0, 300));
    
    let ideas = parseInsights(completionText, 4);
    console.log(`Parsed ${ideas.length} insights:`, ideas.map(i => i.slice(0, 60)));
    
    // Dev mode fallback: ensure at least one insight for testing
    if (userIsDevMode && ideas.length === 0) {
      const ts = new Date().toISOString();
      const randomSuffix = Math.random().toString(36).substring(7);
      ideas = [`Debug: Parser found no insights; pipeline working (${ts}-${randomSuffix})`];
      console.log('Dev fallback applied - empty parse');
    }

    // Persist insights to database
    const insertedInsights = [];
    for (const idea of ideas) {
      try {
        const uniqueTitle = `${idea.slice(0, 100)} - ${new Date().toISOString().split('.')[0]}`;
        const { data: insight } = await supabase
          .from("maya_proactive_insights")
          .insert({
            user_id: userId,
            title: uniqueTitle,
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
          })
          .select()
          .single();
        
        if (insight) {
          insertedInsights.push(insight);
        }
      } catch (insertError) {
        console.error(`Failed to insert insight for user ${userId}:`, insertError);
      }
    }

    console.log(`Maya Manual Insights - Generated ${insertedInsights.length} insights for user ${userId}`);
    
    // Log successful AI usage
    try {
      await logAIUsage(userId, 'maya-manual-insights', 'gpt-4o-mini', tokensIn, tokensOut, aiLatency, true);
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
