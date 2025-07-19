import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user data for resume generation
    console.log('Fetching user data for resume generation...');

    // Get transcript entries where use_in_resume = true
    const { data: transcripts, error: transcriptsError } = await supabaseClient
      .from('transcripts')
      .select('*')
      .eq('user_id', user_id)
      .eq('use_in_resume', true);

    if (transcriptsError) {
      console.error('Error fetching transcripts:', transcriptsError);
      throw transcriptsError;
    }

    // Get saved courses with CRI score > 60
    const { data: savedCourses, error: coursesError } = await supabaseClient
      .from('saved_courses')
      .select(`
        *,
        recommended_courses!inner(*)
      `)
      .eq('user_id', user_id)
      .gte('recommended_courses.skill_tags', 60); // This might need adjustment based on actual schema

    if (coursesError) {
      console.error('Error fetching saved courses:', coursesError);
    }

    // Get user's latest career goal
    const { data: careerGoals, error: goalsError } = await supabaseClient
      .from('career_goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (goalsError) {
      console.error('Error fetching career goals:', goalsError);
    }

    // Get mentor feedback (optional)
    const { data: mentorFeedback, error: feedbackError } = await supabaseClient
      .from('mentor_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (feedbackError) {
      console.error('Error fetching mentor feedback:', feedbackError);
    }

    // Prepare data for GPT
    const resumeData = {
      transcripts: transcripts || [],
      courses: savedCourses || [],
      careerGoal: careerGoals?.[0] || null,
      mentorFeedback: mentorFeedback || []
    };

    console.log('Resume data prepared:', resumeData);

    // Generate resume with GPT-4o-mini
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a professional resume advisor. Turn this user's learning history into a job-aligned resume draft. 

Analyze the provided data and create a compelling resume structure. Focus on:
- Quantifiable achievements and learning outcomes
- Skills that align with the user's career goals
- Converting learning experiences into professional bullet points
- Grouping skills by relevant categories

Respond in JSON format with exactly this structure:
{
  "summary": "2-3 sentence professional bio highlighting key strengths",
  "bullets": [
    "Achievement-focused bullet point with specific skills/outcomes",
    "Another bullet point emphasizing learning and growth"
  ],
  "skills": {
    "Technical": ["skill1", "skill2"],
    "Professional": ["skill1", "skill2"],
    "Industry": ["skill1", "skill2"]
  }
}`;

    const userPrompt = `Generate a resume draft based on this learning data:

TRANSCRIPTS (completed learning):
${JSON.stringify(resumeData.transcripts, null, 2)}

COURSES (saved/completed):
${JSON.stringify(resumeData.courses, null, 2)}

CAREER GOAL:
${JSON.stringify(resumeData.careerGoal, null, 2)}

MENTOR FEEDBACK:
${JSON.stringify(resumeData.mentorFeedback, null, 2)}

Create a professional resume draft that positions this learner for their target role.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const gptData = await response.json();
    console.log('GPT response:', gptData);

    if (!gptData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    let resumeContent;
    try {
      resumeContent = JSON.parse(gptData.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      throw new Error('Failed to parse resume content from AI');
    }

    // Calculate CRI average
    const allCriScores = resumeData.transcripts
      .map(t => t.cri_score)
      .filter(score => score !== null && score !== undefined);
    
    const criAverage = allCriScores.length > 0 
      ? allCriScores.reduce((sum, score) => sum + score, 0) / allCriScores.length 
      : 0;

    // Calculate readiness score (based on data completeness and CRI)
    const readinessScore = Math.min(100, 
      (resumeData.transcripts.length * 15) + 
      (resumeData.courses.length * 10) + 
      (resumeData.careerGoal ? 25 : 0) + 
      (criAverage * 0.5)
    );

    return new Response(JSON.stringify({
      content: resumeContent,
      criAverage: Math.round(criAverage * 100) / 100,
      readinessScore: Math.round(readinessScore * 100) / 100,
      dataUsed: {
        transcriptCount: resumeData.transcripts.length,
        courseCount: resumeData.courses.length,
        hasCareerGoal: !!resumeData.careerGoal,
        feedbackCount: resumeData.mentorFeedback.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-resume-draft function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});