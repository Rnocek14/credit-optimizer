
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating skill recommendations for user:', user_id);

    // Get user's profile and goals
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const { data: goals } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true);

    // Get user's current skills and progress
    const { data: userSkills } = await supabase
      .from('user_skill_progress')
      .select(`
        *,
        skills (
          id,
          name,
          category,
          xp_value,
          difficulty_level
        )
      `)
      .eq('user_id', user_id);

    // Get user's transcripts and courses
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('skill_tags, title, description')
      .eq('user_id', user_id);

    const { data: savedCourses } = await supabase
      .from('saved_courses')
      .select(`
        recommended_courses (
          title,
          skill_tags,
          description
        )
      `)
      .eq('user_id', user_id);

    // Get all available skills
    const { data: allSkills } = await supabase
      .from('skills')
      .select('*')
      .order('name');

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create context for AI recommendations
    const context = {
      profile: profile || {},
      goals: goals || [],
      currentSkills: userSkills || [],
      transcripts: transcripts || [],
      savedCourses: savedCourses || [],
      availableSkills: allSkills || []
    };

    const prompt = `
Based on this user's profile and learning history, recommend the top 5 skills they should focus on next.

User Context:
- Profile: ${JSON.stringify(context.profile)}
- Career Goals: ${JSON.stringify(context.goals)}
- Current Skills: ${JSON.stringify(context.currentSkills)}
- Completed Courses: ${JSON.stringify(context.transcripts)}
- Saved Courses: ${JSON.stringify(context.savedCourses)}

Available Skills to Choose From:
${JSON.stringify(context.availableSkills.map(s => ({ id: s.id, name: s.name, category: s.category, difficulty: s.difficulty_level })))}

Please respond with a JSON array of exactly 5 skill recommendations in this format:
[
  {
    "skill_id": "skill_uuid",
    "skill_name": "Skill Name",
    "category": "Technical|Soft Skills|Career|Tools",
    "priority": "high|medium|low",
    "reasoning": "Why this skill is recommended for this user",
    "estimated_time": "Time estimate to master this skill",
    "prerequisites": ["list of prerequisite skills if any"]
  }
]

Focus on:
1. Skills that align with their career goals
2. Skills that build on their current knowledge
3. Skills that are in demand in their industry
4. Skills that fill gaps in their current skill set
5. Skills that match their experience level
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a career development expert and skills advisor. Provide practical, actionable skill recommendations based on the user\'s context.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const recommendations = JSON.parse(openaiData.choices[0].message.content);

    console.log('Generated recommendations:', recommendations);

    return new Response(JSON.stringify({ 
      recommendations,
      generated_at: new Date().toISOString(),
      user_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating skill recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      recommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
