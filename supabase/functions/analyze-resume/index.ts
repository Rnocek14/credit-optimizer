import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user profile and career data
    const [profileResult, tracksResult, stepsResult] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id', userId).single(),
      supabaseClient.from('career_tracks').select('*').eq('user_id', userId),
      supabaseClient.from('roadmap_steps').select('*').eq('user_id', userId).order('order_index')
    ]);

    if (profileResult.error) {
      throw new Error(`Profile fetch failed: ${profileResult.error.message}`);
    }

    const profile = profileResult.data;
    const tracks = tracksResult.data || [];
    const steps = stepsResult.data || [];

    // Build comprehensive analysis data
    const analysisData = {
      profile: {
        name: profile.name,
        role_title: profile.role_title,
        experience_level: profile.experience_level,
        years_experience: profile.years_experience,
        industry: profile.industry,
        skills: profile.skills || [],
        education: profile.education,
        career_goals: profile.career_goals,
        interests: profile.interests || [],
        work_preferences: profile.work_preferences,
        location: profile.location,
        salary_expectations: profile.salary_expectations
      },
      tracks: tracks.map(track => ({
        title: track.title,
        description: track.description,
        reasoning: track.reasoning,
        time_to_proficiency: track.time_to_proficiency,
        growth_potential: track.growth_potential
      })),
      learning_evidence: {
        total_steps: steps.length,
        completed_steps: steps.filter(s => s.completed).length,
        verified_steps: steps.filter(s => s.mentor_verified).length,
        portfolio_projects: steps.filter(s => 
          s.success_metrics?.toLowerCase().includes('project') || 
          s.success_metrics?.toLowerCase().includes('portfolio')
        ).length,
        certifications: steps.filter(s => 
          s.success_metrics?.toLowerCase().includes('exam') || 
          s.success_metrics?.toLowerCase().includes('certificate')
        ).length,
        external_links: steps.filter(s => s.external_links?.length > 0).length,
        avg_cri_score: steps.filter(s => s.cri_score).length > 0 
          ? Math.round((steps.filter(s => s.cri_score).reduce((sum, s) => sum + s.cri_score, 0) / steps.filter(s => s.cri_score).length) * 10) / 10 
          : null
      }
    };

    // Generate AI analysis using OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a professional career analyst reviewing a candidate's resume and learning portfolio. 
            Analyze the provided data and create a concise professional summary with specific actionable insights.
            
            Your response should be in JSON format with this structure:
            {
              "summary": "3-4 sentence professional summary highlighting key strengths and readiness",
              "taglines": ["array", "of", "3-5", "specific", "status/readiness", "indicators"],
              "strengths": ["key", "strength", "areas"],
              "gaps": ["areas", "for", "improvement"],
              "overall_score": 85 // 0-100 career readiness score
            }
            
            Focus on:
            - Technical skill development and evidence
            - Professional readiness for target roles
            - Learning trajectory and growth potential
            - Portfolio strength and verification status
            - Specific gaps or recommendations`
          },
          {
            role: 'user',
            content: `Please analyze this career profile and learning portfolio:\n\n${JSON.stringify(analysisData, null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API failed: ${openAIResponse.statusText}`);
    }

    const aiResult = await openAIResponse.json();
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    // Store the analysis in the database
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        resume_review_summary: JSON.stringify(analysis),
        ai_reviewed_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to save analysis:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-resume function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});