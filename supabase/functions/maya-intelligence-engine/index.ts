import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.52.0";
import { ok, fail, safeJson, requireUser, withCircuitBreaker, rateLimit, corsHeaders } from "../_shared/utils.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const oai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return withCircuitBreaker(async () => {
    const { prompt, context = {}, persist = true } = await safeJson(req);
    const { user, supabase } = await requireUser(req);

    await rateLimit(user.id, "maya_chat", 60, 20); // 20/min per user

    console.log('Maya Intelligence Engine - Processing request:', { userId: user.id, prompt });

    // Enrich with user profile, active track, recent actions
    const { data: profile } = await supabase
      .from("profiles")
      .select("id,name,role_title,experience_level,industry")
      .eq("id", user.id)
      .single();

    const { data: careerGoals } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(3);

    const { data: recentContext } = await supabase
      .from('maya_context_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const systemPrompt = `You are Maya, an AI career intelligence assistant specializing in personalized career guidance.

User Context:
- Profile: ${JSON.stringify(profile)}
- Active Goals: ${JSON.stringify(careerGoals)}
- Recent Activity: ${JSON.stringify(recentContext)}
- Additional Context: ${JSON.stringify(context)}

Guidelines:
- Be concise, actionable, and specific to the user's goals
- Provide clear next steps the app can render
- Include confidence scores and reasoning factors
- Focus on practical career advice

Return your response as a helpful career guidance message.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];

    const completion = await oai.chat.completions.create({
      model: "gpt-5-mini-2025-08-07",
      messages,
      max_completion_tokens: 500,
    });

    const response = completion.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    // Extract insights (simple heuristics for now)
    const insights = {
      decisionConfidence: 0.8,
      primaryFactors: ["user_goals", "experience_level", "market_trends"],
      kind: "chat_response",
    };

    // Persist insight if requested
    if (persist) {
      await supabase.from("maya_proactive_insights").insert({
        user_id: user.id,
        title: "Maya chat guidance",
        body: response,
        priority: "medium",
        kind: "chat",
        meta: { context, insights, prompt: prompt.slice(0, 200) },
      });
    }

    console.log('Maya Intelligence Engine - Success:', { userId: user.id, responseLength: response.length });

    return {
      response,
      timestamp: new Date().toISOString(),
      insights,
      success: true
    };
  });
});