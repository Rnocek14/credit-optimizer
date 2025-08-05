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

  // Get the approved course details
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
    .eq('course_intelligence_pipeline.mentor_validation_status', 'validated')
    .single();

  if (courseError || !courseData) {
    throw new Error(`Course not found or not validated: ${courseError?.message}`);
  }

  // Find relevant learning paths based on skills and career alignment
  const courseSkills = courseData.discovery_data.skill_tags || [];
  const aiAnalysis = courseData.course_intelligence_pipeline[0].ai_analysis;
  
  // Get learning paths that could benefit from this course
  const { data: candidatePaths, error: pathsError } = await supabase
    .from('maya_learning_paths')
    .select('*')
    .or(`target_career.ilike.%${aiAnalysis.targetCareer || ''}%`)
    .gte('ai_confidence', 60)
    .order('ai_confidence', { ascending: false })
    .limit(10);

  if (pathsError) {
    throw new Error(`Failed to find candidate paths: ${pathsError.message}`);
  }

  const integratedPaths = [];
  const pathPreview = [];

  // Analyze and integrate course into suitable paths
  for (const path of candidatePaths || []) {
    const integrationAnalysis = analyzePathIntegration(courseData, path, aiAnalysis);
    
    if (integrationAnalysis.shouldIntegrate) {
      // Update the course sequence
      const updatedSequence = await insertCourseIntoSequence(
        path.course_sequence, 
        courseData, 
        integrationAnalysis.suggestedPosition
      );

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

      if (!updateError) {
        integratedPaths.push(updatedPath);
      }
    }

    pathPreview.push({
      pathId: path.id,
      pathName: path.path_name,
      currentSequenceLength: path.course_sequence?.length || 0,
      integrationAnalysis,
      willIntegrate: integrationAnalysis.shouldIntegrate
    });
  }

  // Log the integration event
  await supabase.from('mentor_path_integrations').insert({
    mentor_id: mentorId,
    course_id: courseId,
    integration_data: {
      pathsConsidered: candidatePaths?.length || 0,
      pathsIntegrated: integratedPaths.length,
      integrationMethod: 'ai_guided',
      timestamp: new Date().toISOString()
    }
  });

  return new Response(
    JSON.stringify({
      integratedPaths: integratedPaths.length,
      pathPreview,
      totalPathsAnalyzed: candidatePaths?.length || 0,
      courseData: {
        title: courseData.discovery_data.title,
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
  const courseSkills = courseData.discovery_data.skill_tags || [];
  const pathCareer = path.target_career.toLowerCase();
  const courseTitle = courseData.discovery_data.title.toLowerCase();
  
  // Skill alignment score
  const skillAlignment = calculateSkillAlignment(courseSkills, pathCareer);
  
  // Career relevance score
  const careerRelevance = calculateCareerRelevance(courseTitle, pathCareer, aiAnalysis);
  
  // Difficulty progression score
  const difficultyFit = calculateDifficultyFit(courseData.discovery_data.difficulty, path.skill_level);
  
  // Overall integration score
  const integrationScore = (skillAlignment * 0.4) + (careerRelevance * 0.4) + (difficultyFit * 0.2);
  
  return {
    shouldIntegrate: integrationScore > 65,
    integrationScore: Math.round(integrationScore),
    impactScore: Math.round(integrationScore * 1.2), // Slightly higher impact score
    suggestedPosition: determineCoursePosition(courseData, path),
    reasoning: generateIntegrationReasoning(skillAlignment, careerRelevance, difficultyFit),
    skillAlignment: Math.round(skillAlignment),
    careerRelevance: Math.round(careerRelevance),
    difficultyFit: Math.round(difficultyFit)
  };
}

function calculateSkillAlignment(courseSkills: string[], pathCareer: string): number {
  const careerKeywords = getCareerKeywords(pathCareer);
  const skillMatches = courseSkills.filter(skill => 
    careerKeywords.some(keyword => skill.toLowerCase().includes(keyword.toLowerCase()))
  );
  return Math.min((skillMatches.length / Math.max(courseSkills.length, 1)) * 100, 100);
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

function generateIntegrationReasoning(skillAlignment: number, careerRelevance: number, difficultyFit: number): string {
  const reasons = [];
  
  if (skillAlignment > 80) reasons.push("Strong skill alignment with career path");
  else if (skillAlignment > 60) reasons.push("Good skill alignment");
  else reasons.push("Moderate skill alignment");
  
  if (careerRelevance > 80) reasons.push("highly relevant to target career");
  else if (careerRelevance > 60) reasons.push("relevant to career goals");
  else reasons.push("some career relevance");
  
  if (difficultyFit > 80) reasons.push("perfect difficulty level");
  else if (difficultyFit > 60) reasons.push("appropriate difficulty");
  else reasons.push("difficulty may not be optimal");
  
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
    title: courseData.discovery_data.title,
    platform: courseData.source_platform,
    url: courseData.course_url,
    difficulty: courseData.discovery_data.difficulty,
    duration_hours: courseData.discovery_data.duration_hours,
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