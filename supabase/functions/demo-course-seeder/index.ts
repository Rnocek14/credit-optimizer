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
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Starting demo course seeding...');
    
    // Check if we already have courses
    const { data: existingCourses, error: checkError } = await supabase
      .from('course_discovery_queue')
      .select('id')
      .limit(1);
      
    if (existingCourses && existingCourses.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Demo courses already seeded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

        const courses = courseraResponse.data?.courses || [];
        
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

            // Process through AI pipeline
            const pipelineResponse = await supabase.functions.invoke('course-intelligence-pipeline', {
              body: {
                action: 'discoverCourses',
                keywords: query,
                skillGaps: course.skill_tags,
                careerPath: query.includes('data') ? 'data_scientist' : 
                          query.includes('web') ? 'software_engineer' :
                          query.includes('product') ? 'product_manager' : 'general'
              }
            });

            if (pipelineResponse.error) {
              console.error('Error processing through pipeline:', pipelineResponse.error);
            }

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

  const mentorId = '2b458624-d498-4cca-a63d-9341cc20e363'; // Aisha Khan

  for (const course of courses.slice(0, 3)) {
    try {
      await supabase
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
        });
    } catch (error) {
      console.error('Error creating mentor curation:', error);
    }
  }
}