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
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // This function is called via database webhook when a new user signs up
    const { type, table, record, old_record } = await req.json();
    
    console.log('Webhook payload:', { type, table, record });

    // Only process INSERT events on the profiles table
    if (type !== 'INSERT' || table !== 'profiles') {
      return new Response(
        JSON.stringify({ message: 'Event not processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = record.id;
    console.log('Processing new user signup:', userId);

    // Get the full profile data to generate roadmap
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    console.log('Profile data:', profile);

    // Prepare profile data for roadmap generation
    const profileData = {
      user_background: {
        experience_level: profile.experience_level,
        current_role: profile.current_role,
        industry: profile.industry,
        skills: profile.skills || [],
        education: profile.education,
        years_experience: profile.years_experience
      },
      goals_and_interests: {
        career_goals: profile.career_goals,
        interests: profile.interests || [],
        preferred_learning_style: profile.learning_style,
        availability: profile.availability
      },
      context: {
        location: profile.location,
        willing_to_relocate: profile.willing_to_relocate,
        salary_expectations: profile.salary_expectations,
        work_preferences: profile.work_preferences
      }
    };

    // Call the roadmap generation function
    console.log('Calling generate-roadmap function...');
    const { data: roadmapResult, error: roadmapError } = await supabase.functions.invoke(
      'generate-roadmap',
      {
        body: {
          user_id: userId,
          profile_data: profileData
        }
      }
    );

    if (roadmapError) {
      console.error('Error generating roadmap:', roadmapError);
      throw roadmapError;
    }

    console.log('Roadmap generation result:', roadmapResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User signup processed and roadmap generated',
        user_id: userId,
        roadmap_result: roadmapResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in signup-automation function:', error);
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