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

    console.log('🔗 Course-Path Integrator:', action, data);

    switch (action) {
      case 'integrate_approved_course':
        return await integrateApprovedCourse(supabase, data);
      case 'get_path_impact_preview':
        return await getPathImpactPreview(supabase, data);
      case 'update_learning_path_sequence':
        return await updateLearningPathSequence(supabase, data);
      case 'validate_learning_paths':
        return await validateLearningPaths(supabase, data);
      case 'get_mentor_path_dashboard':
        return await getMentorPathDashboard(supabase, data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Course-Path Integrator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function integrateApprovedCourse(supabase: any, data: any) {
  const { courseId, mentorId, curationData } = data;
  
  console.log('🎯 Integrating approved course into learning paths:', courseId);

  // Get the approved course details with enhanced data fetching
  const { data: courseData, error: courseError } = await supabase
    .from('course_discovery_queue')
    .select(`
      *,
      course_intelligence_pipeline!inner (
        id,
        ai_analysis,
        confidence_score,
        mentor_validation_status
      )
    `)
    .eq('id', courseId)
    .eq('course_intelligence_pipeline.mentor_validation_status', 'approved')
    .single();

  if (courseError || !courseData) {
    console.error('❌ Course fetch error:', courseError);
    throw new Error(`Course not found or not validated: ${courseError?.message}`);
  }

  console.log('✅ Course data retrieved:', {
    title: courseData.discovery_data?.title,
    platform: courseData.source_platform,
    skillTags: courseData.discovery_data?.skill_tags
  });

  // Enhanced course skill extraction
  const courseSkills = courseData.discovery_data?.skill_tags || 
                      courseData.discovery_data?.skillTags || 
                      courseData.discovery_data?.tags || [];
  const aiAnalysis = courseData.course_intelligence_pipeline[0]?.ai_analysis || {};
  const courseTitle = courseData.discovery_data?.title || courseData.discovery_data?.name || '';
  
  console.log('📊 Course analysis data:', { courseSkills, aiAnalysis, courseTitle });
  
  // Enhanced learning path candidate selection with broader criteria
  const { data: allPaths, error: pathsError } = await supabase
    .from('maya_learning_paths')
    .select('*')
    .gte('ai_confidence', 40)  // Lowered threshold
    .order('ai_confidence', { ascending: false })
    .limit(25);  // Increased limit

  if (pathsError) {
    console.error('❌ Paths fetch error:', pathsError);
    throw new Error(`Failed to find candidate paths: ${pathsError.message}`);
  }

  console.log(`📋 Found ${allPaths?.length || 0} total learning paths for analysis`);

  // Enhanced filtering with multiple criteria
  const candidatePaths = (allPaths || []).filter(path => {
    const pathCareer = (path.target_career || '').toLowerCase();
    const pathSkills = path.skill_focus?.toLowerCase() || '';
    const courseTitleLower = courseTitle.toLowerCase();
    
    // Multiple matching criteria (OR logic for broader inclusion)
    const careerMatch = aiAnalysis.targetCareer && 
      pathCareer.includes(aiAnalysis.targetCareer.toLowerCase());
    
    const skillMatch = courseSkills.some(skill => 
      pathCareer.includes(skill.toLowerCase()) || 
      pathSkills.includes(skill.toLowerCase())
    );
    
    const titleMatch = getCareerKeywords(pathCareer).some(keyword =>
      courseTitleLower.includes(keyword.toLowerCase())
    );
    
    const platformMatch = courseData.source_platform && 
      (pathCareer.includes('tech') || pathCareer.includes('software') || 
       pathCareer.includes('data') || pathCareer.includes('development'));
    
    return careerMatch || skillMatch || titleMatch || platformMatch;
  });

  console.log(`🎯 Filtered to ${candidatePaths.length} candidate paths for integration`);

  const integratedPaths = [];
  const pathPreview = [];

  // Analyze and integrate course into suitable paths
  for (const path of candidatePaths) {
    console.log(`🔍 Analyzing path: ${path.path_name} (${path.target_career})`);
    
    const integrationAnalysis = analyzePathIntegration(courseData, path, aiAnalysis);
    
    console.log(`📈 Integration analysis for ${path.path_name}:`, {
      shouldIntegrate: integrationAnalysis.shouldIntegrate,
      score: integrationAnalysis.integrationScore,
      skillAlignment: integrationAnalysis.skillAlignment,
      careerRelevance: integrationAnalysis.careerRelevance
    });
    
    if (integrationAnalysis.shouldIntegrate) {
      try {
        // Update the course sequence with enhanced course data
        const updatedSequence = await insertCourseIntoSequence(
          path.course_sequence, 
          courseData, 
          integrationAnalysis.suggestedPosition
        );

        console.log(`🔧 Updating course sequence for ${path.path_name}:`, {
          originalLength: path.course_sequence?.length || 0,
          newLength: updatedSequence.length,
          position: integrationAnalysis.suggestedPosition
        });

        // Update the learning path
        const { data: updatedPath, error: updateError } = await supabase
          .from('maya_learning_paths')
          .update({
            course_sequence: updatedSequence,
            updated_at: new Date().toISOString(),
            mentor_endorsements: [
              ...(path.mentor_endorsements || []),
              {
                mentor_id: mentorId,
                course_id: courseId,
                endorsement_type: 'course_integration',
                timestamp: new Date().toISOString(),
                impact_score: integrationAnalysis.impactScore
              }
            ]
          })
          .eq('id', path.id)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Failed to update path ${path.path_name}:`, updateError);
        } else {
          console.log(`✅ Successfully integrated course into ${path.path_name}`);
          integratedPaths.push(updatedPath);
        }
      } catch (error) {
        console.error(`❌ Error integrating into ${path.path_name}:`, error);
      }
    }

    pathPreview.push({
      pathId: path.id,
      pathName: path.path_name,
      targetCareer: path.target_career,
      currentSequenceLength: path.course_sequence?.length || 0,
      integrationAnalysis,
      willIntegrate: integrationAnalysis.shouldIntegrate
    });
  }

  console.log(`🎉 Integration complete: ${integratedPaths.length} paths updated`);

  // Log the integration event
  try {
    await supabase.from('mentor_path_integrations').insert({
      mentor_id: mentorId,
      course_id: courseId,
      integration_data: {
        pathsConsidered: candidatePaths.length,
        pathsIntegrated: integratedPaths.length,
        integrationMethod: 'ai_guided_enhanced',
        timestamp: new Date().toISOString(),
        courseTitle: courseTitle,
        coursePlatform: courseData.source_platform
      }
    });
  } catch (logError) {
    console.error('❌ Failed to log integration event:', logError);
  }

  return new Response(
    JSON.stringify({
      success: true,
      integratedPaths: integratedPaths.length,
      pathPreview,
      totalPathsAnalyzed: candidatePaths.length,
      courseData: {
        title: courseTitle,
        platform: courseData.source_platform,
        skills: courseSkills
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getPathImpactPreview(supabase: any, data: any) {
  const { courseId, mentorId } = data;
  
  console.log('👀 Getting path impact preview for course:', courseId);

  // Similar logic to integrateApprovedCourse but without making changes
  const { data: courseData, error: courseError } = await supabase
    .from('course_discovery_queue')
    .select(`
      *,
      course_intelligence_pipeline!inner (
        ai_analysis,
        confidence_score
      )
    `)
    .eq('id', courseId)
    .single();

  if (courseError) {
    throw new Error(`Course not found: ${courseError.message}`);
  }

  const aiAnalysis = courseData.course_intelligence_pipeline[0].ai_analysis;
  
  // Find potential learning paths
  const { data: paths, error: pathsError } = await supabase
    .from('maya_learning_paths')
    .select('id, path_name, target_career, skill_level, course_sequence, ai_confidence')
    .gte('ai_confidence', 50)
    .order('ai_confidence', { ascending: false })
    .limit(15);

  if (pathsError) {
    throw new Error(`Failed to find paths: ${pathsError.message}`);
  }

  const impactPreview = [];
  let totalLearnerImpact = 0;

  for (const path of paths || []) {
    const integrationAnalysis = analyzePathIntegration(courseData, path, aiAnalysis);
    
    // Estimate learner impact (mock data for now)
    const estimatedLearners = Math.floor(Math.random() * 100) + 20;
    
    impactPreview.push({
      pathId: path.id,
      pathName: path.path_name,
      targetCareer: path.target_career,
      skillLevel: path.skill_level,
      currentConfidence: path.ai_confidence,
      integrationAnalysis,
      estimatedLearnerImpact: integrationAnalysis.shouldIntegrate ? estimatedLearners : 0,
      impactType: integrationAnalysis.shouldIntegrate ? 'positive' : 'neutral'
    });

    if (integrationAnalysis.shouldIntegrate) {
      totalLearnerImpact += estimatedLearners;
    }
  }

  return new Response(
    JSON.stringify({
      courseTitle: courseData.discovery_data.title,
      totalPotentialPaths: impactPreview.filter(p => p.integrationAnalysis.shouldIntegrate).length,
      totalLearnerImpact,
      impactPreview: impactPreview.slice(0, 10), // Limit for UI
      recommendations: generateIntegrationRecommendations(impactPreview)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateLearningPathSequence(supabase: any, data: any) {
  const { pathId, newSequence, mentorId } = data;
  
  console.log('🔄 Updating learning path sequence:', pathId);

  const { data: updatedPath, error: updateError } = await supabase
    .from('maya_learning_paths')
    .update({
      course_sequence: newSequence,
      updated_at: new Date().toISOString()
    })
    .eq('id', pathId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update path: ${updateError.message}`);
  }

  // Log the manual curation
  await supabase.from('mentor_path_curations').insert({
    mentor_id: mentorId,
    path_id: pathId,
    curation_type: 'sequence_update',
    changes_made: {
      sequenceUpdated: true,
      newSequenceLength: newSequence.length,
      timestamp: new Date().toISOString()
    }
  });

  return new Response(
    JSON.stringify({ updatedPath, success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function validateLearningPaths(supabase: any, data: any) {
  const { mentorId } = data;
  
  console.log('✅ Validating learning paths');

  // Get paths that need validation
  const { data: paths, error: pathsError } = await supabase
    .from('maya_learning_paths')
    .select('*')
    .is('mentor_validation_status', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (pathsError) {
    throw new Error(`Failed to get paths: ${pathsError.message}`);
  }

  const validationResults = [];

  for (const path of paths || []) {
    const validation = await validatePathStructure(path);
    validationResults.push({
      pathId: path.id,
      pathName: path.path_name,
      validation,
      needsAttention: validation.issues.length > 0
    });
  }

  return new Response(
    JSON.stringify({
      totalPaths: validationResults.length,
      pathsNeedingAttention: validationResults.filter(r => r.needsAttention).length,
      validationResults
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getMentorPathDashboard(supabase: any, data: any) {
  const { mentorId } = data;
  
  console.log('📊 Getting mentor path dashboard for:', mentorId);

  // Get mentor's curation stats
  const { data: curatedCourses, error: curationError } = await supabase
    .from('mentor_course_curations')
    .select('*')
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  // Get path integration stats
  const { data: pathIntegrations, error: integrationError } = await supabase
    .from('mentor_path_integrations')
    .select('*')
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  const stats = {
    totalCoursesCurated: curatedCourses?.length || 0,
    approvedCourses: curatedCourses?.filter(c => c.endorsement_level === 'strong' || c.endorsement_level === 'moderate').length || 0,
    pathIntegrations: pathIntegrations?.length || 0,
    recentActivity: [
      ...((curatedCourses || []).slice(0, 5).map(c => ({
        type: 'course_curation',
        title: `Curated course: ${c.course_id}`,
        timestamp: c.created_at,
        status: c.endorsement_level
      }))),
      ...((pathIntegrations || []).slice(0, 5).map(i => ({
        type: 'path_integration',
        title: `Integrated course into ${i.integration_data.pathsIntegrated} paths`,
        timestamp: i.created_at,
        status: 'completed'
      })))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
  };

  return new Response(
    JSON.stringify({ stats }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper Functions

function analyzePathIntegration(courseData: any, path: any, aiAnalysis: any) {
  // Enhanced skill extraction with multiple fallbacks
  const courseSkills = courseData.discovery_data?.skill_tags || 
                      courseData.discovery_data?.skillTags || 
                      courseData.discovery_data?.tags || [];
  const pathCareer = (path.target_career || '').toLowerCase();
  const courseTitle = (courseData.discovery_data?.title || courseData.discovery_data?.name || '').toLowerCase();
  
  // Enhanced skill alignment score
  const skillAlignment = calculateSkillAlignment(courseSkills, pathCareer, courseTitle);
  
  // Enhanced career relevance score
  const careerRelevance = calculateCareerRelevance(courseTitle, pathCareer, aiAnalysis);
  
  // Enhanced difficulty fit score
  const difficultyFit = calculateDifficultyFit(courseData.discovery_data?.difficulty, path.skill_level);
  
  // Platform bonus for tech-related paths
  const platformBonus = calculatePlatformBonus(courseData.source_platform, pathCareer);
  
  // Overall integration score with enhanced weighting
  const integrationScore = (skillAlignment * 0.35) + (careerRelevance * 0.35) + (difficultyFit * 0.2) + (platformBonus * 0.1);
  
  // Lower threshold for better integration
  const shouldIntegrate = integrationScore > 50; // Lowered from 65
  
  return {
    shouldIntegrate,
    integrationScore: Math.round(integrationScore),
    impactScore: Math.round(integrationScore * 1.2),
    suggestedPosition: determineCoursePosition(courseData, path),
    reasoning: generateIntegrationReasoning(skillAlignment, careerRelevance, difficultyFit, platformBonus),
    skillAlignment: Math.round(skillAlignment),
    careerRelevance: Math.round(careerRelevance),
    difficultyFit: Math.round(difficultyFit),
    platformBonus: Math.round(platformBonus)
  };
}

function calculateSkillAlignment(courseSkills: string[], pathCareer: string, courseTitle: string): number {
  const careerKeywords = getCareerKeywords(pathCareer);
  
  // Enhanced skill matching with title fallback
  const skillMatches = courseSkills.filter(skill => 
    careerKeywords.some(keyword => skill.toLowerCase().includes(keyword.toLowerCase()))
  );
  
  // Title-based skill inference if no skill matches
  const titleKeywordMatches = careerKeywords.filter(keyword =>
    courseTitle.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const skillScore = courseSkills.length > 0 ? 
    (skillMatches.length / courseSkills.length) * 100 : 0;
  
  const titleScore = titleKeywordMatches.length > 0 ? 
    (titleKeywordMatches.length / careerKeywords.length) * 70 : 0; // Title gets 70% weight
  
  // Combine scores with fallback logic
  const finalScore = Math.max(skillScore, titleScore);
  
  return Math.min(finalScore, 100);
}

function calculateCareerRelevance(courseTitle: string, pathCareer: string, aiAnalysis: any): number {
  const careerKeywords = getCareerKeywords(pathCareer);
  const titleMatches = careerKeywords.filter(keyword => 
    courseTitle.includes(keyword.toLowerCase())
  );
  
  const titleScore = (titleMatches.length / careerKeywords.length) * 100;
  const aiScore = aiAnalysis?.careerImpact || 50;
  
  return (titleScore + aiScore) / 2;
}

function calculateDifficultyFit(courseDifficulty: string, pathSkillLevel: string): number {
  const difficultyMap: Record<string, number> = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3
  };
  
  const skillLevelMap: Record<string, number> = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3
  };
  
  const courseDiff = difficultyMap[courseDifficulty?.toLowerCase()] || 2;
  const pathLevel = skillLevelMap[pathSkillLevel?.toLowerCase()] || 2;
  
  const difference = Math.abs(courseDiff - pathLevel);
  return Math.max(100 - (difference * 30), 20);
}

function determineCoursePosition(courseData: any, path: any): number {
  const courseSequence = path.course_sequence || [];
  const courseDifficulty = courseData.discovery_data.difficulty?.toLowerCase();
  
  if (courseDifficulty === 'beginner') return 0;
  if (courseDifficulty === 'advanced') return courseSequence.length;
  
  // For intermediate courses, place in the middle
  return Math.floor(courseSequence.length / 2);
}

function getCareerKeywords(career: string): string[] {
  const careerKeywordMap: Record<string, string[]> = {
    'software engineer': ['programming', 'coding', 'development', 'software', 'javascript', 'python', 'react'],
    'data scientist': ['data', 'analytics', 'python', 'machine learning', 'statistics', 'sql'],
    'product manager': ['product', 'management', 'strategy', 'analytics', 'user experience'],
    'designer': ['design', 'ui', 'ux', 'user experience', 'figma', 'adobe'],
    'marketing': ['marketing', 'digital marketing', 'seo', 'content', 'social media']
  };
  
  const lowerCareer = career.toLowerCase();
  for (const [key, keywords] of Object.entries(careerKeywordMap)) {
    if (lowerCareer.includes(key)) {
      return keywords;
    }
  }
  
  return [career.toLowerCase()];
}

function calculatePlatformBonus(platform: string, pathCareer: string): number {
  const techPlatforms = ['coursera', 'udacity', 'pluralsight', 'codecademy', 'edx'];
  const techCareers = ['software', 'data', 'tech', 'development', 'programming', 'engineering'];
  
  const isPlatformTech = techPlatforms.some(p => platform?.toLowerCase().includes(p));
  const isCareerTech = techCareers.some(c => pathCareer.includes(c));
  
  if (isPlatformTech && isCareerTech) return 20;
  if (isPlatformTech || isCareerTech) return 10;
  return 0;
}

function generateIntegrationReasoning(skillAlignment: number, careerRelevance: number, difficultyFit: number, platformBonus: number = 0): string {
  const reasons = [];
  
  if (skillAlignment > 80) reasons.push("Strong skill alignment with career path");
  else if (skillAlignment > 60) reasons.push("Good skill alignment");
  else if (skillAlignment > 30) reasons.push("Moderate skill alignment");
  else reasons.push("Limited skill alignment");
  
  if (careerRelevance > 80) reasons.push("highly relevant to target career");
  else if (careerRelevance > 60) reasons.push("relevant to career goals");
  else if (careerRelevance > 30) reasons.push("some career relevance");
  else reasons.push("minimal career relevance");
  
  if (difficultyFit > 80) reasons.push("perfect difficulty level");
  else if (difficultyFit > 60) reasons.push("appropriate difficulty");
  else reasons.push("difficulty may not be optimal");
  
  if (platformBonus > 15) reasons.push("excellent platform match");
  else if (platformBonus > 5) reasons.push("good platform alignment");
  
  return reasons.join(", ");
}

function generateIntegrationRecommendations(impactPreview: any[]): string[] {
  const recommendations = [];
  const highImpactPaths = impactPreview.filter(p => p.integrationAnalysis.shouldIntegrate && p.integrationAnalysis.integrationScore > 80);
  
  if (highImpactPaths.length > 0) {
    recommendations.push(`Strongly recommend integrating into ${highImpactPaths.length} high-impact learning paths`);
  }
  
  const skillGaps = impactPreview.filter(p => p.integrationAnalysis.skillAlignment < 50);
  if (skillGaps.length > 3) {
    recommendations.push("Consider adding more specific skill tags to improve path matching");
  }
  
  return recommendations;
}

async function insertCourseIntoSequence(currentSequence: any, courseData: any, position: number): Promise<any> {
  const sequence = Array.isArray(currentSequence) ? [...currentSequence] : [];
  
  const courseEntry = {
    course_id: courseData.id,
    title: courseData.discovery_data?.title || courseData.discovery_data?.name || `Course from ${courseData.source_platform}`,
    platform: courseData.source_platform || 'Unknown Platform',
    url: courseData.course_url,
    difficulty: courseData.discovery_data?.difficulty || 'intermediate',
    duration_hours: courseData.discovery_data?.duration_hours || courseData.discovery_data?.estimatedDuration || 10,
    description: courseData.discovery_data?.description || courseData.discovery_data?.summary || '',
    instructor: courseData.discovery_data?.instructor || '',
    skill_tags: courseData.discovery_data?.skill_tags || courseData.discovery_data?.skillTags || [],
    added_by_mentor: true,
    added_at: new Date().toISOString()
  };
  
  sequence.splice(position, 0, courseEntry);
  return sequence;
}

async function validatePathStructure(path: any) {
  const issues = [];
  const suggestions = [];
  
  // Check if course sequence exists and has content
  if (!path.course_sequence || path.course_sequence.length === 0) {
    issues.push("No courses in learning path");
    suggestions.push("Add courses to create a complete learning journey");
  }
  
  // Check difficulty progression
  if (path.course_sequence && path.course_sequence.length > 1) {
    const difficulties = path.course_sequence.map((c: any) => c.difficulty);
    // Add validation logic for difficulty progression
  }
  
  // Check estimated duration
  if (!path.estimated_duration_weeks || path.estimated_duration_weeks === 0) {
    issues.push("Missing estimated duration");
    suggestions.push("Add realistic time estimates for completion");
  }
  
  // Check AI confidence
  if (!path.ai_confidence || path.ai_confidence < 70) {
    issues.push("Low AI confidence score");
    suggestions.push("Review and validate path structure to improve confidence");
  }
  
  return {
    isValid: issues.length === 0,
    score: Math.max(100 - (issues.length * 20), 0),
    issues,
    suggestions
  };
}