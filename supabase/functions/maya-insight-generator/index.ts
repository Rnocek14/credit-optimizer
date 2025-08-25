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
    const { userId, insightType = 'daily' } = await req.json();
    
    console.log('Maya Insight Generator - Generating insights:', { userId, insightType });

    // Fetch comprehensive user data
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

    const { data: careerTracks } = await supabase
      .from('career_tracks')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false);

    const { data: recentActivity } = await supabase
      .from('maya_context_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('tracked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('tracked_at', { ascending: false });

    const { data: gamificationData } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Clear expired insights
    await supabase
      .from('maya_proactive_insights')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());

    // Build comprehensive context for AI
    const userContext = {
      profile: userProfile,
      goals: careerGoals,
      tracks: careerTracks,
      recentActivity: recentActivity,
      gamification: gamificationData,
      currentTime: new Date().toISOString(),
      dayOfWeek: new Date().getDay()
    };

    const systemPrompt = `You are Maya, an AI career mentor. Generate personalized daily insights for this user.

User Context: ${JSON.stringify(userContext, null, 2)}

Generate 3-5 insights in the following JSON array format:
[
  {
    "title": "Engaging, personal insight title",
    "content": "Detailed, actionable insight content",
    "insight_type": "recommendation|alert|nudge|prediction",
    "category": "career|learning|market|personal",
    "priority": "low|medium|high|urgent",
    "confidence_score": 0.8,
    "context_data": {
      "triggers": ["what triggered this insight"],
      "next_actions": ["specific actions user can take"],
      "timeline": "when to act"
    },
    "expires_hours": 24
  }
]

Focus on:
- Personalized recommendations based on their career goals
- Learning momentum and streak maintenance
- Market opportunities relevant to their track
- Time-sensitive opportunities or deadlines
- Skill gap analysis and next steps`;

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
          { role: 'user', content: `Generate daily insights for my career development. Consider my current progress, goals, and recent activity patterns.` }
        ],
        max_completion_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const insights = JSON.parse(aiResponse.choices[0].message.content);

    // Store insights in database
    const insightsToStore = Array.isArray(insights) ? insights : insights.insights || [];
    const storedInsights = [];

    for (const insight of insightsToStore) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (insight.expires_hours || 24));

      const { data: storedInsight } = await supabase
        .from('maya_proactive_insights')
        .insert({
          user_id: userId,
          title: insight.title,
          content: insight.content,
          insight_type: insight.insight_type,
          category: insight.category,
          priority: insight.priority,
          confidence_score: insight.confidence_score,
          context_data: insight.context_data,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (storedInsight) {
        storedInsights.push(storedInsight);
      }
    }

    // Track insight generation
    await supabase
      .from('maya_context_tracking')
      .insert({
        user_id: userId,
        context_type: 'insight_generation',
        context_data: {
          insights_generated: storedInsights.length,
          insight_type: insightType,
          categories: storedInsights.map(i => i.category)
        }
      });

    console.log('Maya Insight Generator - Success:', { 
      userId, 
      insightsGenerated: storedInsights.length 
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        insights: storedInsights,
        generated_count: storedInsights.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Maya Insight Generator - Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});