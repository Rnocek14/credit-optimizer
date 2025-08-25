import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, contextData, requestType } = await req.json();
    
    console.log('Maya Intelligence Engine - Processing request:', { userId, requestType });

    // Get user context from database
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: careerGoals } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    const { data: recentContext } = await supabase
      .from('maya_context_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('tracked_at', { ascending: false })
      .limit(10);

    // Build AI context
    const aiContext = {
      user: userProfile,
      goals: careerGoals,
      recentActivity: recentContext,
      contextData,
      timestamp: new Date().toISOString()
    };

    // Generate AI reasoning based on request type
    const systemPrompt = `You are Maya, an AI career mentor with deep understanding of professional development. Analyze the user's context and provide personalized guidance.

Context: ${JSON.stringify(aiContext, null, 2)}

Request Type: ${requestType}

Provide a response in the following JSON format:
{
  "reasoning": "Your detailed reasoning process",
  "recommendation": "Clear, actionable recommendation",
  "confidence": 0.8,
  "category": "career|learning|market|personal",
  "priority": "low|medium|high|urgent",
  "context_factors": ["key factors that influenced your decision"],
  "next_steps": ["specific action items"],
  "timeline": "suggested timeframe"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze my current situation and provide guidance for: ${requestType}` }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const mayaResponse = JSON.parse(aiResponse.choices[0].message.content);

    // Log the interaction for learning
    await supabase
      .from('maya_context_tracking')
      .insert({
        user_id: userId,
        context_type: 'ai_reasoning',
        context_data: {
          request_type: requestType,
          response: mayaResponse,
          confidence: mayaResponse.confidence
        }
      });

    console.log('Maya Intelligence Engine - Success:', { userId, confidence: mayaResponse.confidence });

    return new Response(JSON.stringify({
      success: true,
      data: mayaResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Maya Intelligence Engine - Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      fallback: {
        reasoning: "Unable to generate personalized reasoning at this time",
        recommendation: "Continue with your current learning path and check back later",
        confidence: 0.5,
        category: "general",
        priority: "medium"
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});