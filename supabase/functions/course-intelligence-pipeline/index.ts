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
    const { action, data = {} } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    console.log('🤖 Course Intelligence Pipeline:', action, data);

    switch (action) {
      case 'discover_courses':
        return await discoverCourses(supabase, data);
      case 'analyze_course':
        return await analyzeCourse(supabase, data);
      case 'generate_learning_path':
        return await generateLearningPath(supabase, data);
      case 'get_mentor_curation_queue':
        return await getMentorCurationQueue(supabase, data);
      case 'submit_mentor_curation':
        return await submitMentorCuration(supabase, data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Course Intelligence Pipeline error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function discoverCourses(supabase: any, data: any) {
  const { platform, keywords, skillGaps = [], careerPath } = data;
  
  console.log('🔍 Discovering courses for:', { platform, keywords, skillGaps, careerPath });

  // Get external courses using existing API
  const { data: courseraData, error: courseraError } = await supabase.functions.invoke('coursera-api', {
    body: {
      action: 'search',
      filters: {
        query: keywords,
        skills: skillGaps.slice(0, 3), // Limit to top 3 skills
        difficulty: 'intermediate'
      }
    }
  });

  if (courseraError) {
    console.error('Coursera API error:', courseraError);
    return new Response(
      JSON.stringify({ error: 'Failed to discover courses' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const courses = courseraData?.courses || [];
  console.log(`📚 Found ${courses.length} courses from Coursera`);

  // Process each course through the intelligence pipeline
  const processedCourses = [];
  
  for (const course of courses.slice(0, 5)) { // Limit to 5 courses for now
    try {
      // Add to discovery queue
      const { data: queueEntry, error: queueError } = await supabase
        .from('course_discovery_queue')
        .insert({
          source_platform: 'coursera',
          course_url: course.url || '',
          discovery_method: 'api',
          processing_status: 'queued',
          discovery_data: course,
          priority_score: calculatePriorityScore(course, skillGaps)
        })
        .select()
        .single();

      if (queueError) {
        console.error('Queue insertion error:', queueError);
        continue;
      }

      // Analyze course with AI
      const analysis = await analyzeWithMaya(course, { skillGaps, careerPath });
      
      // Add to intelligence pipeline
      const { data: pipelineEntry, error: pipelineError } = await supabase
        .from('course_intelligence_pipeline')
        .insert({
          course_id: queueEntry.id,
          pipeline_stage: 'analysis',
          ai_analysis: analysis,
          cri_predictions: analysis.criPredictions || {},
          market_alignment_score: analysis.marketAlignment || 0,
          confidence_score: analysis.confidence || 0
        });

      if (pipelineError) {
        console.error('Pipeline insertion error:', pipelineError);
        continue;
      }

      processedCourses.push({
        ...course,
        queueId: queueEntry.id,
        analysis,
        priorityScore: calculatePriorityScore(course, skillGaps)
      });

    } catch (error) {
      console.error('Error processing course:', course.title, error);
    }
  }

  return new Response(
    JSON.stringify({
      discoveredCourses: processedCourses,
      totalFound: courses.length,
      processed: processedCourses.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function analyzeCourse(supabase: any, data: any) {
  const { courseId, userId, context = {} } = data;
  
  console.log('🧠 Analyzing course:', courseId);

  // Get course from discovery queue
  const { data: course, error: courseError } = await supabase
    .from('course_discovery_queue')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError) {
    throw new Error(`Course not found: ${courseError.message}`);
  }

  // Enhanced analysis with Maya
  const analysis = await analyzeWithMaya(course.discovery_data, context);
  
  // Update pipeline with analysis
  const { error: updateError } = await supabase
    .from('course_intelligence_pipeline')
    .update({
      pipeline_stage: 'validation',
      ai_analysis: analysis,
      cri_predictions: analysis.criPredictions || {},
      market_alignment_score: analysis.marketAlignment || 0,
      confidence_score: analysis.confidence || 0,
      updated_at: new Date().toISOString()
    })
    .eq('course_id', courseId);

  if (updateError) {
    throw new Error(`Failed to update pipeline: ${updateError.message}`);
  }

  return new Response(
    JSON.stringify({ analysis, courseId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateLearningPath(supabase: any, data: any) {
  const { targetCareer, skillLevel, userId, courseIds = [] } = data;
  
  console.log('🛤️ Generating learning path for:', targetCareer, skillLevel);

  // Get market data for the career
  const { data: marketData } = await supabase.functions.invoke('market-trend-analyzer', {
    body: {
      careerPath: targetCareer,
      location: 'United States'
    }
  });

  // Analyze course sequence with Maya
  const pathAnalysis = await analyzePathWithMaya(targetCareer, skillLevel, courseIds, marketData);
  
  // Create learning path
  const { data: learningPath, error: pathError } = await supabase
    .from('maya_learning_paths')
    .insert({
      path_name: pathAnalysis.pathName,
      path_description: pathAnalysis.description,
      target_career: targetCareer,
      skill_level: skillLevel,
      estimated_duration_weeks: pathAnalysis.estimatedWeeks || 12,
      course_sequence: courseIds,
      market_demand_score: marketData?.demandScore || 0,
      ai_confidence: pathAnalysis.confidence || 0,
      maya_reasoning: pathAnalysis.reasoning,
      created_by: userId
    })
    .select()
    .single();

  if (pathError) {
    throw new Error(`Failed to create learning path: ${pathError.message}`);
  }

  return new Response(
    JSON.stringify({ learningPath, pathAnalysis }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getMentorCurationQueue(supabase: any, data: any) {
  const { mentorId, limit = 10 } = data;
  
  console.log('📋 Getting mentor curation queue for:', mentorId);

  try {
    // First get courses already validated by this mentor
    const { data: existingValidations } = await supabase
      .from('mentor_course_curations')
      .select('course_id')
      .eq('mentor_id', mentorId);
    
    const validatedCourseIds = existingValidations?.map(v => v.course_id) || [];

    // Get courses pending validation with enhanced metadata, excluding already validated ones
    const { data: queueData, error: queueError } = await supabase
      .from('course_intelligence_pipeline')
      .select(`
        id,
        course_id,
        pipeline_stage,
        ai_analysis,
        confidence_score,
        mentor_validation_status,
        course_discovery_queue!inner (
          id,
          source_platform,
          course_url,
          discovery_data
        )
      `)
      .eq('mentor_validation_status', 'pending')
      .in('pipeline_stage', ['analysis', 'mentor_review', 'validation'])
      .not('course_id', 'in', `(${validatedCourseIds.join(',') || 'null'})`)
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (queueError) {
      console.error('🚨 Queue query error:', queueError);
      throw queueError;
    }

    console.log('✅ Raw queue data:', queueData?.length, 'items');

    // Transform and enrich the data for UI display
    const enrichedCourses = (queueData || []).map(item => ({
      id: item.id,
      course_id: item.course_id,
      pipeline_stage: item.pipeline_stage,
      ai_analysis: item.ai_analysis || {},
      confidence_score: item.confidence_score || 0,
      mentor_validation_status: item.mentor_validation_status,
      course_discovery_queue: {
        id: item.course_discovery_queue.id,
        source_platform: item.course_discovery_queue.source_platform,
        course_url: item.course_discovery_queue.course_url,
        discovery_data: {
          title: item.course_discovery_queue.discovery_data?.title || 
                 item.course_discovery_queue.discovery_data?.name || 
                 `Course from ${item.course_discovery_queue.source_platform}`,
          description: item.course_discovery_queue.discovery_data?.description || 
                      item.course_discovery_queue.discovery_data?.summary || 
                      'No description available',
          instructor: item.course_discovery_queue.discovery_data?.instructor || '',
          difficulty: item.course_discovery_queue.discovery_data?.difficulty || 'intermediate',
          duration_hours: item.course_discovery_queue.discovery_data?.duration_hours || 
                         item.course_discovery_queue.discovery_data?.estimatedDuration || 10,
          skill_tags: item.course_discovery_queue.discovery_data?.skill_tags || 
                     item.course_discovery_queue.discovery_data?.skillTags || [],
          category: item.course_discovery_queue.discovery_data?.category || 'General',
          rating: item.course_discovery_queue.discovery_data?.rating || 0,
          enrollments: item.course_discovery_queue.discovery_data?.enrollments || 0,
          ...item.course_discovery_queue.discovery_data
        }
      }
    }));

    return new Response(
      JSON.stringify({
        courses: enrichedCourses,
        total: enrichedCourses.length,
        mentorId,
        limit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🚨 Failed to get mentor curation queue:', error);
    throw error;
  }
}

async function submitMentorCuration(supabase: any, data: any) {
  const { 
    mentorId, 
    courseId, 
    endorsementLevel, 
    expertiseScore, 
    mentorNotes,
    skillTagsAdded = [],
    roiAssessment,
    outcomePreduction 
  } = data;
  
  console.log('✅ Submitting mentor curation:', { mentorId, courseId, endorsementLevel });

  // Check for existing validation first
  const { data: existingCuration } = await supabase
    .from('mentor_course_curations')
    .select('id, endorsement_level')
    .eq('mentor_id', mentorId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existingCuration) {
    console.log('⚠️ Mentor has already validated this course:', existingCuration.endorsement_level);
    return new Response(
      JSON.stringify({ 
        curation: existingCuration, 
        validationStatus: existingCuration.endorsement_level === 'rejected' ? 'rejected' : 'validated',
        message: 'Course already validated by this mentor'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // UPSERT mentor curation to handle any race conditions
  const { data: curation, error: curationError } = await supabase
    .from('mentor_course_curations')
    .upsert({
      mentor_id: mentorId,
      course_id: courseId,
      curation_type: 'validation',
      expertise_score: expertiseScore || 0,
      endorsement_level: endorsementLevel,
      mentor_notes: mentorNotes,
      skill_tags_added: skillTagsAdded,
      roi_assessment: roiAssessment || 0,
      outcome_prediction: outcomePreduction
    }, {
      onConflict: 'mentor_id,course_id'
    })
    .select()
    .single();

  if (curationError) {
    console.error('🚨 Curation upsert error:', curationError);
    throw new Error(`Failed to create curation: ${curationError.message}`);
  }

  // Update pipeline validation status
  const validationStatus = endorsementLevel === 'strong' || endorsementLevel === 'moderate' 
    ? 'validated' 
    : 'rejected';

  const { error: updateError } = await supabase
    .from('course_intelligence_pipeline')
    .update({
      mentor_validation_status: validationStatus,
      validated_by: mentorId,
      pipeline_stage: validationStatus === 'validated' ? 'curation' : 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('course_id', courseId);

  if (updateError) {
    throw new Error(`Failed to update validation: ${updateError.message}`);
  }

  return new Response(
    JSON.stringify({ curation, validationStatus }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper Functions

function calculatePriorityScore(course: any, skillGaps: string[]): number {
  let score = 0;
  
  // Skill alignment (40% weight)
  const skillAlignment = skillGaps.filter(skill => 
    course.skill_tags?.some((tag: string) => 
      tag.toLowerCase().includes(skill.toLowerCase())
    )
  ).length / Math.max(skillGaps.length, 1);
  score += skillAlignment * 40;
  
  // Difficulty appropriateness (20% weight)
  if (course.difficulty === 'intermediate') score += 20;
  else if (course.difficulty === 'beginner') score += 15;
  else if (course.difficulty === 'advanced') score += 10;
  
  // Platform credibility (20% weight)
  const platformScore = getPlatformScore(course.platform);
  score += platformScore * 20;
  
  // Duration appropriateness (10% weight)
  if (course.duration_hours >= 20 && course.duration_hours <= 60) score += 10;
  else if (course.duration_hours >= 10) score += 7;
  
  // Project-based learning (10% weight)
  if (course.has_projects) score += 10;
  
  return Math.min(score, 100);
}

function getPlatformScore(platform: string): number {
  const platformScores: Record<string, number> = {
    'coursera': 0.9,
    'edx': 0.85,
    'udacity': 0.8,
    'pluralsight': 0.75,
    'udemy': 0.6
  };
  
  const platformKey = Object.keys(platformScores).find(key => 
    platform.toLowerCase().includes(key)
  );
  
  return platformScores[platformKey || 'default'] || 0.5;
}

async function analyzeWithMaya(course: any, context: any): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('⚠️ No OpenAI API key, using mock analysis');
    return getMockAnalysis(course, context);
  }

  try {
    const prompt = `
Analyze this course for career impact and alignment:

Course: ${course.title}
Platform: ${course.platform}
Description: ${course.description || 'No description'}
Skills: ${course.skill_tags?.join(', ') || 'No skills listed'}
Difficulty: ${course.difficulty || 'Unknown'}

Context:
- Skill Gaps: ${context.skillGaps?.join(', ') || 'None specified'}
- Career Path: ${context.careerPath || 'Not specified'}

Provide analysis as JSON with:
{
  "marketAlignment": number (0-100),
  "skillGapCoverage": number (0-100),
  "careerImpact": number (0-100),
  "criPredictions": {
    "difficultyScore": number,
    "skillCoverage": number,
    "projectRigor": number,
    "outcomeConversion": number,
    "overall": number
  },
  "confidence": number (0-100),
  "reasoning": "detailed explanation",
  "recommendations": ["suggestion1", "suggestion2"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Maya, an AI career intelligence system. Analyze courses for career impact and provide JSON responses.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      }),
    });

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    
    console.log('🧠 Maya analysis completed:', analysis.confidence);
    return analysis;

  } catch (error) {
    console.error('Maya analysis error:', error);
    return getMockAnalysis(course, context);
  }
}

async function analyzePathWithMaya(targetCareer: string, skillLevel: string, courseIds: string[], marketData: any): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    return {
      pathName: `${targetCareer} Learning Path (${skillLevel})`,
      description: `Curated learning path to become a ${targetCareer}`,
      estimatedWeeks: 16,
      confidence: 75,
      reasoning: 'Path generated using market analysis and course sequencing algorithms'
    };
  }

  // For now, return mock data - in production this would call OpenAI
  return {
    pathName: `AI-Curated ${targetCareer} Path`,
    description: `Intelligent learning sequence optimized for ${skillLevel} learners targeting ${targetCareer} roles`,
    estimatedWeeks: 12,
    confidence: 88,
    reasoning: `This path combines market demand analysis with skill progression theory to maximize career transition success for ${targetCareer} roles.`
  };
}

function getMockAnalysis(course: any, context: any): any {
  const skillGaps = context.skillGaps || [];
  const skillAlignment = skillGaps.filter((skill: string) => 
    course.skill_tags?.some((tag: string) => 
      tag.toLowerCase().includes(skill.toLowerCase())
    )
  ).length / Math.max(skillGaps.length, 1);

  return {
    marketAlignment: Math.round(60 + (skillAlignment * 30)),
    skillGapCoverage: Math.round(skillAlignment * 100),
    careerImpact: Math.round(65 + (skillAlignment * 25)),
    criPredictions: {
      difficultyScore: course.difficulty === 'intermediate' ? 70 : 60,
      skillCoverage: Math.round(skillAlignment * 100),
      projectRigor: course.has_projects ? 80 : 50,
      outcomeConversion: 70,
      overall: Math.round(65 + (skillAlignment * 20))
    },
    confidence: Math.round(70 + (skillAlignment * 20)),
    reasoning: `Course shows ${skillAlignment > 0.5 ? 'strong' : 'moderate'} alignment with specified skill gaps and career objectives.`,
    recommendations: [
      'Consider supplementing with hands-on projects',
      'Pair with industry-specific case studies'
    ]
  };
}