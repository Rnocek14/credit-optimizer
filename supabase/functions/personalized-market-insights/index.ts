import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  id: string;
  name: string;
  experience_level: string;
  skills: string[];
  industry: string;
  location: string;
  career_goals: string;
  salary_expectations: number;
}

interface CareerGoal {
  title: string;
  description: string;
  target_role: string;
  target_date: string;
}

interface MarketPreferences {
  preferred_locations: string[];
  preferred_industries: string[];
  salary_range_min: number;
  salary_range_max: number;
  growth_preference: string;
  risk_tolerance: string;
  work_style: string;
  career_stage: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
    }

    console.log('🤖 Generating personalized insights for user:', user_id);

    // Fetch user data
    const [profileResponse, goalsResponse, preferencesResponse, resumeResponse] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user_id).single(),
      supabase.from('career_goals').select('*').eq('user_id', user_id).eq('active', true),
      supabase.from('user_market_preferences').select('*').eq('user_id', user_id).single(),
      supabase.from('ai_resume_drafts').select('*').eq('user_id', user_id).eq('published_to_profile', true).order('created_at', { ascending: false }).limit(1)
    ]);

    const profile = profileResponse.data as UserProfile | null;
    const goals = goalsResponse.data as CareerGoal[] | null;
    const preferences = preferencesResponse.data as MarketPreferences | null;
    const resumeData = resumeResponse.data?.[0];

    // Fetch market trends for context
    const { data: marketTrends } = await supabase
      .from('market_trends')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch career paths for recommendations
    const { data: careerPaths } = await supabase
      .from('career_paths')
      .select('*')
      .limit(50);

    // Fetch locations with good market data
    const { data: locations } = await supabase
      .from('locations')
      .select('*')
      .eq('active', true)
      .limit(30);

    // Generate AI-powered recommendations
    const prompt = `
You are a career advisor AI generating personalized market intelligence recommendations.

User Profile:
- Name: ${profile?.name || 'Unknown'}
- Experience Level: ${profile?.experience_level || 'Not specified'}
- Current Industry: ${profile?.industry || 'Not specified'}
- Location: ${profile?.location || 'Not specified'}
- Skills: ${profile?.skills?.join(', ') || 'Not specified'}
- Career Goals: ${profile?.career_goals || 'Not specified'}
- Salary Expectations: ${profile?.salary_expectations || 'Not specified'}

Career Goals:
${goals?.map(g => `- ${g.title}: ${g.description} (Target: ${g.target_role})`).join('\n') || 'No active goals'}

Market Preferences:
- Preferred Locations: ${preferences?.preferred_locations?.join(', ') || 'Any'}
- Preferred Industries: ${preferences?.preferred_industries?.join(', ') || 'Any'}
- Salary Range: ${preferences?.salary_range_min || 0} - ${preferences?.salary_range_max || 'No max'}
- Growth Preference: ${preferences?.growth_preference || 'Not specified'}
- Risk Tolerance: ${preferences?.risk_tolerance || 'Not specified'}
- Work Style: ${preferences?.work_style || 'Not specified'}
- Career Stage: ${preferences?.career_stage || 'Not specified'}

Recent Resume Data: ${resumeData ? 'Available' : 'No resume on file'}

Current Market Context:
${marketTrends?.slice(0, 10).map(mt => `- ${mt.career_path} in ${mt.location}: ${mt.growth_rate}% growth, ${mt.demand_score}/10 demand`).join('\n')}

Available Career Paths:
${careerPaths?.slice(0, 20).map(cp => `- ${cp.title}: ${cp.average_salary} avg salary, ${cp.growth_outlook}`).join('\n')}

Available Locations:
${locations?.slice(0, 15).map(loc => `- ${loc.label}: ${loc.salary_multiplier}x salary, ${loc.job_market} market`).join('\n')}

Generate exactly 4 personalized recommendations (one of each type) in JSON format:

{
  "recommendations": [
    {
      "type": "career_move",
      "title": "Brief recommendation title",
      "description": "Detailed description of the career opportunity",
      "priority_score": 0-100,
      "confidence_score": 0-100,
      "reasoning": "Why this recommendation makes sense for the user",
      "action_required": "Specific next steps for the user",
      "data": {
        "target_role": "Specific role title",
        "target_industry": "Industry name",
        "estimated_timeline": "3-6 months",
        "skill_gaps": ["skill1", "skill2"],
        "expected_salary_range": "$X - $Y",
        "growth_potential": "High/Medium/Low"
      }
    },
    {
      "type": "location_move",
      "title": "Brief recommendation title",
      "description": "Detailed description of the location opportunity",
      "priority_score": 0-100,
      "confidence_score": 0-100,
      "reasoning": "Why this location makes sense for the user",
      "action_required": "Specific next steps for the user",
      "data": {
        "target_location": "City, State/Country",
        "salary_advantage": "X% higher",
        "cost_of_living_impact": "X% higher/lower",
        "job_market_strength": "Strong/Growing/Stable",
        "visa_requirements": "Details if applicable"
      }
    },
    {
      "type": "skill_development",
      "title": "Brief recommendation title",
      "description": "Detailed description of the skill opportunity",
      "priority_score": 0-100,
      "confidence_score": 0-100,
      "reasoning": "Why this skill development makes sense",
      "action_required": "Specific next steps for the user",
      "data": {
        "target_skills": ["skill1", "skill2"],
        "learning_resources": ["resource1", "resource2"],
        "estimated_time": "X weeks/months",
        "market_demand": "High/Medium/Low",
        "salary_impact": "X% increase potential"
      }
    },
    {
      "type": "market_alert",
      "title": "Brief recommendation title",
      "description": "Detailed description of the market alert",
      "priority_score": 0-100,
      "confidence_score": 0-100,
      "reasoning": "Why this alert would be valuable",
      "action_required": "How to set up and use this alert",
      "data": {
        "alert_criteria": "Specific conditions to monitor",
        "expected_frequency": "Daily/Weekly/Monthly",
        "trigger_conditions": ["condition1", "condition2"],
        "potential_opportunities": "Types of opportunities to expect"
      }
    }
  ]
}

Ensure recommendations are:
1. Highly specific to the user's profile and goals
2. Actionable with clear next steps
3. Based on current market data
4. Realistic and achievable
5. Prioritized by impact and feasibility
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert career advisor and market analyst. Generate personalized, actionable career recommendations based on user data and market trends.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices[0].message.content;

    console.log('🤖 Raw AI response:', aiContent.substring(0, 200) + '...');

    let recommendations;
    try {
      // Clean the AI response to remove markdown formatting
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedResponse = JSON.parse(cleanedContent);
      recommendations = parsedResponse.recommendations;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiContent);
      throw new Error('Invalid AI response format');
    }

    // Store recommendations in database - map to correct table structure
    const recommendationsToInsert = recommendations.map((rec: any) => ({
      user_id,
      career_path: rec.data?.target_role || 'General',
      location: rec.data?.target_location || 'Global',
      recommendation_type: rec.type,
      title: rec.title,
      description: rec.description,
      priority: rec.priority_score > 80 ? 'high' : rec.priority_score > 50 ? 'medium' : 'low',
      impact_score: rec.priority_score,
      effort_required: rec.data?.estimated_timeline || 'Medium',
      timeline: rec.data?.estimated_timeline || '3-6 months',
      action_items: { actions: [rec.action_required], reasoning: rec.reasoning },
      success_indicators: { metrics: rec.data ? Object.keys(rec.data) : [] },
      related_data: rec.data || {},
      active: true
    }));

    // Clear old recommendations and insert new ones
    await supabase
      .from('personalized_recommendations')
      .delete()
      .eq('user_id', user_id)
      .eq('active', true);

    const { data: insertedRecommendations, error: insertError } = await supabase
      .from('personalized_recommendations')
      .insert(recommendationsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting recommendations:', insertError);
      throw new Error(`Failed to store recommendations: ${insertError.message}`);
    }

    console.log('✅ Generated and stored', insertedRecommendations?.length, 'recommendations for user:', user_id);

    return new Response(JSON.stringify({
      success: true,
      recommendations: insertedRecommendations,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in personalized-market-insights function:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});