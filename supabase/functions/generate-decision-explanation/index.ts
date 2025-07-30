import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { decisionId, decisionType, rationale, context, executionResult } = await req.json();

    if (!decisionId) {
      throw new Error('Decision ID is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create explanation prompt based on decision type
    const prompt = `As Maya, an AI career advisor, explain this decision in a clear, human-friendly way.

Decision Type: ${decisionType}
Rationale: ${rationale}
Context: ${JSON.stringify(context || {})}
Result: ${JSON.stringify(executionResult || {})}

Please provide:
1. A clear explanation of WHY this decision was made
2. What alternatives were considered (if any)
3. What data or factors influenced this choice
4. How this fits into the user's larger career journey

Keep the explanation concise but insightful. Focus on building user trust and understanding.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are Maya, an intelligent AI career advisor. Explain your decisions clearly and build trust with users by being transparent about your reasoning process.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const explanation = data.choices[0].message.content;

    // Store the explanation in the database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('maya_decisions')
      .update({ 
        decision_context: {
          ...context,
          explanation: explanation,
          explained_at: new Date().toISOString()
        }
      })
      .eq('id', decisionId);

    if (updateError) {
      console.error('Error storing explanation:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      explanation,
      decisionId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-decision-explanation:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});