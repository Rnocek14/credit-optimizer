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

    const { user_id } = await req.json();

    console.log('Generating roadmap for user_id:', user_id);

    // Fetch user profile data from the database
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('User profile not found');
    }

    console.log('Found profile:', profile);

    // Extract goal and skills from Maya's profile
    const goal = profile.career_goals || "Data Analyst";
    const user_skills = profile.skills || [];
    const max_time = profile.time_constraints || "12 months";
    const max_budget = profile.budget_constraints || "budget-conscious";
    const preferred_locations = profile.preferred_locations || [];

    console.log('Extracted data:', { goal, user_skills, max_time, max_budget, preferred_locations });

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

    // Generate roadmaps using OpenAI with a simplified prompt
    const prompt = `Generate a career roadmap to become: "${goal}"

User's current skills: ${user_skills.join(', ') || 'None'}
Time limit: ${max_time || 'Flexible'}
Budget limit: ${max_budget || 'Flexible'}

Create a JSON response with ONE optimized path:

{
  "fastest_path": {
    "total_time": "X months",
    "total_cost": "$X",
    "roi_score": X.X,
    "steps": [
      {
        "title": "Step Name",
        "description": "Brief description (max 100 chars)",
        "skills_needed": ["skill1", "skill2"],
        "skills_already_have": ["existing_skill"],
        "learning_resources": [
          {
            "title": "Resource Name", 
            "provider": "Platform",
            "cost": "$X",
            "duration": "X weeks",
            "reasoning": "Brief reason (max 50 chars)"
          }
        ],
        "estimated_time": "X weeks",
        "estimated_cost": "$X"
      }
    ],
    "reasoning": "Brief explanation (max 200 chars)"
  }
}

REQUIREMENTS:
- Maximum 5 steps total
- Keep descriptions very brief
- Return ONLY valid JSON
- No markdown formatting`;

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
            content: 'You are an expert career path analyst. Generate practical, data-driven roadmaps. Return ONLY valid JSON without any markdown formatting or extra text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        error: errorText
      });
      
      // If rate limited, return a simpler fallback response
      if (openAIResponse.status === 429) {
        console.log('Rate limited, returning fallback roadmap');
        return new Response(JSON.stringify({
          success: true,
          roadmaps: {
            fastest_path: {
              total_time: max_time || "6 months",
              total_cost: max_budget || "$1000",
              roi_score: 7.5,
              steps: [
                {
                  title: "Foundation Building",
                  description: "Build core skills needed for " + goal,
                  skills_needed: user_skills.length > 0 ? [user_skills[0] + " Advanced"] : ["Core Skills"],
                  skills_already_have: user_skills,
                  learning_resources: [{
                    title: "Online Course Platform",
                    provider: "Coursera/Udemy",
                    cost: "$99",
                    duration: "8 weeks",
                    reasoning: "Structured learning path"
                  }],
                  estimated_time: "8 weeks",
                  estimated_cost: "$99"
                }
              ],
              reasoning: "Simplified path due to API limitations"
            }
          },
          metadata: {
            goal,
            user_skills,
            max_time,
            max_budget,
            generated_at: new Date().toISOString(),
            fallback: true
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const generatedContent = openAIData.choices[0].message.content;

    console.log('Generated roadmap content:', generatedContent);

    // Parse the JSON response with robust error handling
    let roadmapData;
    try {
      // Clean the content thoroughly
      let cleanContent = generatedContent.trim();
      
      // Remove various markdown code block formats
      cleanContent = cleanContent.replace(/^```json\s*\n?/, '');
      cleanContent = cleanContent.replace(/^```\s*\n?/, '');
      cleanContent = cleanContent.replace(/\n?\s*```\s*$/, '');
      
      // Remove any leading/trailing whitespace again
      cleanContent = cleanContent.trim();
      
      console.log('Cleaned content length:', cleanContent.length);
      console.log('Cleaned content preview:', cleanContent.substring(0, 200) + '...');
      
      // Try to parse the JSON
      roadmapData = JSON.parse(cleanContent);
      console.log('Successfully parsed JSON with keys:', Object.keys(roadmapData));
      
    } catch (parseError) {
      console.error('JSON parse failed:', parseError.message);
      console.error('Response length:', generatedContent.length);
      
      // If JSON is malformed, provide a fallback response
      console.log('Providing fallback roadmap due to JSON parse error');
      roadmapData = {
        fastest_path: {
          total_time: max_time || "6 months",
          total_cost: max_budget || "$1000", 
          roi_score: 7.8,
          steps: [
            {
              title: "Skill Foundation",
              description: "Master the fundamentals for " + goal,
              skills_needed: ["Python", "Statistics", "Data Analysis"],
              skills_already_have: user_skills,
              learning_resources: [{
                title: "Python for Data Science",
                provider: "DataCamp",
                cost: "$199",
                duration: "10 weeks",
                reasoning: "Comprehensive coverage"
              }],
              estimated_time: "10 weeks",
              estimated_cost: "$199"
            },
            {
              title: "Portfolio Development",
              description: "Build projects to showcase skills",
              skills_needed: ["Project Management", "GitHub"],
              skills_already_have: user_skills,
              learning_resources: [{
                title: "Data Science Projects",
                provider: "Kaggle Learn",
                cost: "$0",
                duration: "6 weeks", 
                reasoning: "Real-world experience"
              }],
              estimated_time: "6 weeks",
              estimated_cost: "$0"
            }
          ],
          reasoning: "Fallback path focusing on essential skills and portfolio"
        }
      };
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