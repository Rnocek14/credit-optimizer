import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { user_id: profile_id, profile_data } = await req.json();
    console.log('Generating roadmap for profile ID:', profile_id);
    console.log('Function redeployed with OpenAI API key configured');

    // Create the comprehensive prompt for GPT-4
    const prompt = `You are a professional career advisor AI. Generate a personalized career development roadmap based on the following user profile data:

${JSON.stringify(profile_data, null, 2)}

Create a comprehensive roadmap with the following structure:

1. CAREER TRACKS (3-5 potential career paths):
   - Each track should be relevant to their background, interests, and goals
   - Include track name, description, and why it's suitable for them
   - Consider their current experience level and growth potential

2. ROADMAP STEPS (8-12 concrete, actionable steps):
   - Mix of short-term (1-3 months), medium-term (3-12 months), and long-term (1-3 years) goals
   - Include specific skills to develop, certifications to pursue, projects to build
   - Prioritize steps that build upon each other logically
   - Make steps specific and measurable when possible

Return your response as a valid JSON object with this exact structure:
{
  "career_tracks": [
    {
      "title": "Career Track Name",
      "description": "Detailed description of this career path",
      "reasoning": "Why this is suitable for the user",
      "growth_potential": "Expected growth and opportunities",
      "time_to_proficiency": "Estimated time to become proficient"
    }
  ],
  "roadmap_steps": [
    {
      "title": "Step Title",
      "description": "Detailed description of what to do",
      "category": "skill_development|certification|project|networking|experience",
      "timeline": "short_term|medium_term|long_term",
      "priority": "high|medium|low",
      "estimated_duration": "Time estimate (e.g., '2-4 weeks')",
      "prerequisites": ["List of prerequisites if any"],
      "success_metrics": "How to measure completion/success"
    }
  ]
}

Make sure the JSON is valid and well-formatted. Focus on practical, actionable advice that will genuinely help the user advance their career.`;

    // Call OpenAI API
    console.log('Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: "You are an expert career roadmap generator. You MUST respond with pure, valid JSON only. Do NOT include any explanation, markdown formatting (like ```json), or extra text. Just return a JSON object with two keys: 'career_tracks' and 'roadmap_steps'."
          },
          {
            role: "user",
            content: `${prompt}\n\nIMPORTANT: Your response must be valid JSON ONLY. Do not include any markdown, no explanation, no wrapping text — just the JSON object exactly.`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;
    
    console.log("Raw GPT content:", generatedContent);

    // Parse the JSON response
    let roadmapData;
    try {
      roadmapData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse GPT response as JSON:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the structure
    if (!roadmapData.career_tracks || !roadmapData.roadmap_steps) {
      throw new Error('Invalid roadmap data structure');
    }

    console.log('Parsed roadmap data:', roadmapData);

    // Insert career tracks
    const careerTracksToInsert = roadmapData.career_tracks.map((track: any) => ({
      user_id: profile_id,
      title: track.title,
      description: track.description,
      reasoning: track.reasoning,
      growth_potential: track.growth_potential,
      time_to_proficiency: track.time_to_proficiency
    }));

    const { data: careerTracks, error: careerTracksError } = await supabase
      .from('career_tracks')
      .insert(careerTracksToInsert)
      .select();

    if (careerTracksError) {
      console.error('Error inserting career tracks:', careerTracksError);
      throw careerTracksError;
    }

    console.log('Inserted career tracks:', careerTracks);

    // Insert roadmap steps
    const roadmapStepsToInsert = roadmapData.roadmap_steps.map((step: any, index: number) => ({
      user_id: profile_id,
      title: step.title,
      description: step.description,
      category: step.category,
      timeline: step.timeline,
      priority: step.priority,
      estimated_duration: step.estimated_duration,
      prerequisites: step.prerequisites || [],
      success_metrics: step.success_metrics,
      order_index: index + 1
    }));

    const { data: roadmapSteps, error: roadmapStepsError } = await supabase
      .from('roadmap_steps')
      .insert(roadmapStepsToInsert)
      .select();

    if (roadmapStepsError) {
      console.error('Error inserting roadmap steps:', roadmapStepsError);
      throw roadmapStepsError;
    }

    console.log('Inserted roadmap steps:', roadmapSteps);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Roadmap generated successfully',
        career_tracks: careerTracks,
        roadmap_steps: roadmapSteps
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-roadmap function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});