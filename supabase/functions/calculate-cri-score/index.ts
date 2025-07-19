import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, difficulty, skillTags } = await req.json();
    
    console.log('Calculating CRI score for:', { title, description, difficulty, skillTags });

    // Create a comprehensive prompt for CRI score calculation
    const prompt = `
    Analyze the career relevance impact (CRI) of this learning experience:
    
    Course/Learning: ${title}
    Description: ${description || 'No description provided'}
    Difficulty Level: ${difficulty || 'Not specified'}
    Skills Covered: ${skillTags?.join(', ') || 'No skills specified'}
    
    Rate this learning experience on career relevance and impact using these criteria:
    - Industry demand for these skills (0-25 points)
    - Practical applicability in modern jobs (0-25 points) 
    - Skill transferability across roles (0-25 points)
    - Future-proofing and growth potential (0-25 points)
    
    Consider factors like:
    - How in-demand are these skills in 2024/2025?
    - Does this translate to real job opportunities?
    - Is this skill growing or declining in relevance?
    - How widely applicable is this across different companies/industries?
    
    Return ONLY a number from 0-100 representing the Career Relevance Impact (CRI) score. Higher scores mean more career impact.
    `;

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
            content: 'You are a career counselor and skills assessor. Analyze learning experiences and provide accurate career relevance scores. Always respond with just a number between 0-100.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const scoreText = data.choices[0].message.content.trim();
    
    console.log('OpenAI response:', scoreText);
    
    // Extract number from response (in case GPT returns text with the number)
    const scoreMatch = scoreText.match(/\d+/);
    const criScore = scoreMatch ? parseInt(scoreMatch[0]) : 50; // Default to 50 if parsing fails
    
    // Ensure score is within valid range
    const validatedScore = Math.max(0, Math.min(100, criScore));
    
    console.log('Final CRI score:', validatedScore);

    return new Response(JSON.stringify({ criScore: validatedScore }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in calculate-cri-score function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      criScore: 50 // Fallback score
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});