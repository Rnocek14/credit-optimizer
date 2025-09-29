import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeId, userId } = await req.json();
    
    if (!resumeId || !userId) {
      throw new Error('Resume ID and User ID are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get resume draft
    const { data: resume, error: resumeError } = await supabase
      .from('ai_resume_drafts')
      .select('*')
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single();

    if (resumeError || !resume) {
      throw new Error('Resume not found');
    }

    // Get user context for scoring
    const userContext = await fetchUserContext(supabase, userId);
    
    // Calculate CRI score using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const scoringResult = await calculateCRIWithAI(openAIApiKey, resume.content, userContext);
    
    // Update resume with scoring results
    const { data: updatedResume, error: updateError } = await supabase
      .from('ai_resume_drafts')
      .update({
        submitted_for_cri: true,
        cri_average: scoringResult.criScore,
        readiness_score: scoringResult.readinessScore,
        cri_feedback: scoringResult.feedback,
        improvement_suggestions: scoringResult.suggestions,
        scored_at: new Date().toISOString()
      })
      .eq('id', resumeId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award XP for submitting resume for scoring
    await supabase.rpc('award_xp', {
      user_id_param: userId,
      xp_amount_param: 75,
      action_type_param: 'resume_cri_submitted',
      reason_param: 'Submitted resume for CRI scoring',
      source_id_param: resumeId
    });

    // Award bonus XP for high scores
    if (scoringResult.criScore >= 85) {
      await supabase.rpc('award_xp', {
        user_id_param: userId,
        xp_amount_param: 100,
        action_type_param: 'high_cri_score',
        reason_param: `Achieved exceptional CRI score: ${scoringResult.criScore}`,
        source_id_param: resumeId
      });
    }

    return new Response(
      JSON.stringify({ 
        resume: updatedResume,
        scoring: scoringResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in calculate-cri-score function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchUserContext(supabase: any, userId: string) {
  try {
    // Get user profile and goals for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: goals } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    const { data: level } = await supabase
      .rpc('get_user_level', { user_id_param: userId });

    return {
      profile: profile || {},
      goals: goals || [],
      level: level?.[0] || { current_level: 1, total_xp: 0 }
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return { profile: {}, goals: [], level: { current_level: 1, total_xp: 0 } };
  }
}

async function calculateCRIWithAI(apiKey: string, resumeContent: any, context: any) {
  const { profile, goals } = context;
  
  const systemPrompt = `You are a professional resume evaluator and career readiness expert. Analyze the provided resume and calculate two scores:

1. CRI (Career Readiness Index) Score (0-100): Overall professional readiness
2. Readiness Score (0-100%): How ready they are for their target role

Evaluation Criteria:
- Technical skills alignment with target role
- Experience relevance and progression  
- Education and certifications
- Project portfolio quality
- Professional summary effectiveness
- ATS optimization and formatting
- Industry keyword usage
- Quantified achievements and impact

User Profile Context:
- Target Role: ${goals[0]?.target_role || profile.role_title || 'Professional role'}
- Experience Level: ${profile.experience_level || 'Entry Level'}
- Industry: ${profile.industry || 'Technology'}
- Current Level: ${context.level?.current_level || 1}

Resume Content:
${JSON.stringify(resumeContent, null, 2)}

Return your analysis in this exact JSON format:
{
  "criScore": 85,
  "readinessScore": 78,
  "feedback": {
    "strengths": [
      "Strong technical skills alignment",
      "Well-quantified achievements",
      "Clear career progression"
    ],
    "improvements": [
      "Add more industry-specific keywords",
      "Include more leadership examples",
      "Strengthen professional summary"
    ],
    "atsOptimization": [
      "Use standard section headers",
      "Include relevant technical keywords",
      "Optimize for target role requirements"
    ]
  },
  "suggestions": [
    "Add specific metrics to project descriptions (e.g., '25% performance improvement')",
    "Include more certifications relevant to your target role",
    "Expand professional summary to highlight leadership experience",
    "Add technical skills section with current industry tools"
  ],
  "breakdown": {
    "technicalSkills": 85,
    "experience": 75,
    "education": 80,
    "projects": 70,
    "summary": 65,
    "atsOptimization": 90
  }
}

Be constructive and specific in your feedback. Provide actionable suggestions for improvement.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please analyze this resume and provide detailed CRI scoring and feedback.' }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  try {
    return JSON.parse(aiResponse);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    // Fallback scoring
    return {
      criScore: 75,
      readinessScore: 70,
      feedback: {
        strengths: ['Resume submitted for analysis'],
        improvements: ['Continue developing professional experience'],
        atsOptimization: ['Ensure resume follows standard formatting']
      },
      suggestions: [
        'Continue adding relevant experience',
        'Expand technical skills section',
        'Include quantified achievements',
        'Obtain industry-relevant certifications'
      ],
      breakdown: {
        technicalSkills: 75,
        experience: 70,
        education: 75,
        projects: 70,
        summary: 70,
        atsOptimization: 75
      }
    };
  }
}