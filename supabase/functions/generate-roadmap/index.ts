import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { goal, user_skills = [], max_time, max_budget, preferred_locations = [] } = await req.json();

    console.log('Generating roadmap for:', { goal, user_skills, max_time, max_budget, preferred_locations });

    // 1. Find matching career steps for the goal
    const { data: careerSteps, error: stepsError } = await supabaseClient
      .from('career_steps')
      .select(`
        *,
        career_paths!inner(*)
      `)
      .or(`title.ilike.%${goal}%,description.ilike.%${goal}%`)
      .eq('is_terminal', true);

    if (stepsError) {
      console.error('Error fetching career steps:', stepsError);
      throw stepsError;
    }

    // 2. Get all career steps and their prerequisites for path building
    const { data: allSteps, error: allStepsError } = await supabaseClient
      .from('career_steps')
      .select('*')
      .order('step_order');

    if (allStepsError) {
      console.error('Error fetching all steps:', allStepsError);
      throw allStepsError;
    }

    // 3. Get skills and their mappings
    const { data: skills, error: skillsError } = await supabaseClient
      .from('skills')
      .select('*');

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
      throw skillsError;
    }

    // 4. Get step-skill mappings
    const { data: stepSkills, error: stepSkillsError } = await supabaseClient
      .from('career_step_skills')
      .select(`
        *,
        skills(*),
        career_steps(*)
      `);

    if (stepSkillsError) {
      console.error('Error fetching step-skill mappings:', stepSkillsError);
      throw stepSkillsError;
    }

    // 5. Get courses
    const { data: courses, error: coursesError } = await supabaseClient
      .from('recommended_courses')
      .select('*')
      .eq('active', true);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      throw coursesError;
    }

    // 6. Get location multipliers for ROI calculations
    const { data: locationMultipliers, error: locationError } = await supabaseClient
      .from('career_location_multipliers')
      .select(`
        *,
        locations(*)
      `);

    if (locationError) {
      console.error('Error fetching location data:', locationError);
      throw locationError;
    }

    // Prepare data for OpenAI
    const contextData = {
      goal,
      user_skills,
      max_time,
      max_budget,
      preferred_locations,
      career_steps: careerSteps,
      all_steps: allSteps,
      skills,
      step_skills: stepSkills,
      courses,
      location_multipliers: locationMultipliers
    };

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate roadmaps using OpenAI
    const prompt = `You are Life Path's AI Roadmap Planner.

Generate 3 distinct roadmap plans to help the user reach their goal: "${goal}"

User's current skills: ${user_skills.join(', ')}
Time constraint: ${max_time || 'No limit'}
Budget constraint: ${max_budget || 'No limit'}  
Preferred locations: ${preferred_locations.join(', ') || 'Any'}

### Available Data:
Career Steps: ${JSON.stringify(careerSteps, null, 2)}
All Steps: ${JSON.stringify(allSteps?.slice(0, 20), null, 2)} (truncated)
Skills: ${JSON.stringify(skills?.slice(0, 30), null, 2)} (truncated)
Step-Skill Mappings: ${JSON.stringify(stepSkills?.slice(0, 20), null, 2)} (truncated)
Courses: ${JSON.stringify(courses?.slice(0, 15), null, 2)} (truncated)

### Process:
1. Find career steps that match the goal "${goal}"
2. Build prerequisite chain using prerequisites[] arrays
3. Map required skills for each step
4. Find learning resources (courses) for missing skills
5. Calculate time/cost estimates
6. Generate 3 optimized paths

### Output Format (JSON only):
{
  "fastest_path": {
    "total_time": "X months",
    "total_cost": "$X",
    "roi_score": X.X,
    "steps": [
      {
        "title": "Step Name",
        "description": "What this step involves",
        "skills_needed": ["skill1", "skill2"],
        "skills_already_have": ["existing_skill"],
        "learning_resources": [
          {
            "title": "Course/Resource Name", 
            "provider": "Platform",
            "cost": "$X",
            "duration": "X weeks",
            "reasoning": "Why this resource"
          }
        ],
        "estimated_time": "X weeks",
        "estimated_cost": "$X"
      }
    ],
    "reasoning": "Why this is the fastest path"
  },
  "lowest_cost_path": {
    "total_time": "X months", 
    "total_cost": "$X",
    "roi_score": X.X,
    "steps": [...],
    "reasoning": "Why this is the lowest cost"
  },
  "highest_roi_path": {
    "total_time": "X months",
    "total_cost": "$X", 
    "roi_score": X.X,
    "steps": [...],
    "reasoning": "Why this has highest ROI"
  }
}

Focus on practical, actionable steps. Use actual data from the provided schemas.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert career path analyst. Generate practical, data-driven roadmaps. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openAIData = await openAIResponse.json();
    const generatedContent = openAIData.choices[0].message.content;

    console.log('Generated roadmap content:', generatedContent);

    // Parse the JSON response, handling markdown code blocks
    let roadmapData;
    try {
      // Remove markdown code blocks if present
      let cleanContent = generatedContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      roadmapData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', generatedContent);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(JSON.stringify({
      success: true,
      roadmaps: roadmapData,
      metadata: {
        goal,
        user_skills,
        max_time,
        max_budget,
        preferred_locations,
        generated_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-roadmap function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});