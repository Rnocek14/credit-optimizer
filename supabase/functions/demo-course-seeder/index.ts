import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const courseraApiKey = Deno.env.get('COURSERA_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Admin role check for dev seeding function
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extract JWT token and validate user role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow demo users for testing purposes
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', { 
      user_uuid: user.id 
    });
    
    // Allow admin or known demo users
    const isDemoUser = ['2b458624-d498-4cca-a63d-9341cc20e363', '3c459625-e499-5ddb-b64d-a442dd21f474', '4d56a736-f5aa-6eec-c75e-b553ee32e585'].includes(user.id);
    
    if (roleError || (userRole !== 'admin' && !isDemoUser)) {
      console.warn(`SECURITY: Non-admin user ${user.email} attempted to access demo-course-seeder`, {
        userId: user.id,
        userRole,
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SECURITY: Admin ${user.email} authorized for demo course seeding`);
    
    console.log('Starting demo course seeding...');
    
    // Always allow re-seeding by removing the early exit check
    // This ensures data consistency between course_discovery_queue and course_intelligence_pipeline

    // High-demand career paths for course discovery
    const searchQueries = [
      'python programming',
      'data science',
      'machine learning',
      'web development',
      'react javascript',
      'product management',
      'digital marketing',
      'artificial intelligence',
      'cloud computing',
      'cybersecurity'
    ];

    let totalProcessed = 0;
    
    for (const query of searchQueries) {
      try {
        console.log(`Fetching courses for: ${query}`);
        
        // Fetch courses from Coursera API
        const courseraResponse = await supabase.functions.invoke('coursera-api', {
          body: { 
            action: 'search',
            query,
            limit: 3 // Limit per query to get variety
          }
        });

        if (courseraResponse.error) {
          console.error(`Error fetching courses for ${query}:`, courseraResponse.error);
          continue;
        }

        // Fix: Access the data correctly from the API response
        const courses = courseraResponse.data?.data || [];
        
        for (const course of courses) {
          try {
            // Insert into discovery queue
            const { data: queueItem, error: insertError } = await supabase
              .from('course_discovery_queue')
              .insert({
                course_url: course.url || `https://coursera.org/course/${course.id}`,
                source_platform: 'coursera',
                discovery_method: 'demo_seeding',
                discovery_data: {
                  title: course.title,
                  description: course.description,
                  difficulty: course.difficulty,
                  duration_hours: course.duration_hours,
                  cost: course.cost,
                  has_projects: course.has_projects,
                  skill_tags: course.skill_tags,
                  instructor_rating: course.instructor_rating,
                  language: course.language
                },
                priority_score: Math.random() * 40 + 60 // 60-100 for demo
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting course:', insertError);
              continue;
            }

            // Create pipeline entry for this course
            await supabase
              .from('course_intelligence_pipeline')
              .insert({
                course_id: queueItem.id,
                pipeline_stage: 'discovered',
                confidence_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
                ai_analysis: {
                  keywords: query,
                  skillGaps: course.skill_tags || [],
                  careerPath: query.includes('data') ? 'data_scientist' : 
                            query.includes('web') ? 'software_engineer' :
                            query.includes('product') ? 'product_manager' : 'general',
                  analyzedAt: new Date().toISOString()
                },
                cri_predictions: {
                  expectedScore: Math.random() * 20 + 70, // 70-90
                  confidenceLevel: 'high'
                },
                market_alignment_score: Math.random() * 0.3 + 0.7
              });

            totalProcessed++;
            console.log(`Processed course: ${course.title}`);
            
          } catch (courseError) {
            console.error('Error processing individual course:', courseError);
          }
        }
        
        // Add delay between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (queryError) {
        console.error(`Error processing query ${query}:`, queryError);
      }
    }

    // Create sample learning paths
    await createSampleLearningPaths(supabase);

    // Create sample mentor curations
    await createSampleMentorCurations(supabase);

    console.log(`Demo seeding completed. Processed ${totalProcessed} courses.`);

    return new Response(
      JSON.stringify({ 
        message: 'Demo seeding completed successfully',
        coursesProcessed: totalProcessed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in demo seeding:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createSampleLearningPaths(supabase: any) {
  const samplePaths = [
    {
      path_name: "Full-Stack Web Developer",
      path_description: "Complete path from frontend to backend development with modern frameworks",
      target_career: "software_engineer",
      skill_level: "beginner",
      estimated_duration_weeks: 24,
      average_outcome_score: 85.2,
      completion_rate: 78.5,
      market_demand_score: 92.0,
      ai_confidence: 94.3
    },
    {
      path_name: "Data Science Specialist", 
      path_description: "Master data analysis, machine learning, and statistical modeling",
      target_career: "data_scientist",
      skill_level: "intermediate",
      estimated_duration_weeks: 32,
      average_outcome_score: 88.7,
      completion_rate: 72.1,
      market_demand_score: 95.5,
      ai_confidence: 91.8
    },
    {
      path_name: "AI/ML Engineer",
      path_description: "Advanced machine learning and artificial intelligence implementation",
      target_career: "ai_engineer",
      skill_level: "advanced", 
      estimated_duration_weeks: 40,
      average_outcome_score: 91.3,
      completion_rate: 68.9,
      market_demand_score: 97.2,
      ai_confidence: 89.6
    }
  ];

  for (const path of samplePaths) {
    try {
      await supabase
        .from('maya_learning_paths')
        .insert(path);
    } catch (error) {
      console.error('Error creating learning path:', error);
    }
  }
}

async function createSampleMentorCurations(supabase: any) {
  // Get some high-confidence courses for mentor curation
  const { data: courses } = await supabase
    .from('course_intelligence_pipeline')
    .select('course_id')
    .gte('confidence_score', 0.7)
    .limit(5);

  if (!courses || courses.length === 0) return;

  // Verify mentor exists in profiles table
  const { data: mentor, error: mentorError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', '2b458624-d498-4cca-a63d-9341cc20e363')
    .single();

  if (mentorError || !mentor) {
    console.log('Mentor not found in profiles, skipping mentor curations:', mentorError);
    return;
  }

  const mentorId = mentor.user_id;
  console.log('Found mentor profile:', mentorId);

  for (const course of courses.slice(0, 3)) {
    try {
      console.log(`Attempting to create mentor curation for course: ${course.course_id}`);
      const { data: curation, error: curationError } = await supabase
        .from('mentor_course_curations')
        .insert({
          mentor_id: mentorId,
          course_id: course.course_id,
          endorsement_level: 'highly_recommended',
          expertise_score: Math.random() * 20 + 80, // 80-100
          mentor_notes: 'Excellent course with practical projects and industry-relevant content.',
          skill_tags_added: ['practical', 'industry_standard'],
          roi_assessment: Math.random() * 20 + 80,
          outcome_prediction: 'High probability of career advancement and skill acquisition.'
        })
        .select()
        .single();
      
      if (curationError) {
        console.error('Error creating mentor curation:', curationError);
      } else {
        console.log(`Successfully created mentor curation for course: ${course.course_id}`);
      }
    } catch (error) {
      console.error('Unexpected error creating mentor curation:', error);
    }
  }
}