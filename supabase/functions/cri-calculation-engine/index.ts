import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRIRequest {
  userId: string;
  action: 'calculate_cri' | 'update_progress' | 'get_breakdown';
  trackId?: string;
  progressData?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, action, trackId, progressData }: CRIRequest = await req.json();

    console.log(`CRI calculation: ${action} for user ${userId}`);

    switch (action) {
      case 'calculate_cri':
        return await calculateCRI(supabaseClient, userId, trackId);
      
      case 'update_progress':
        return await updateProgress(supabaseClient, userId, progressData);
      
      case 'get_breakdown':
        return await getCRIBreakdown(supabaseClient, userId, trackId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in cri-calculation-engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function calculateCRI(supabase: any, userId: string, trackId?: string) {
  // Get user's career data
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: skills } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId);

  const { data: courseProgress } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', userId);

  const { data: goals } = await supabase
    .from('career_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  const { data: resumes } = await supabase
    .from('ai_resume_drafts')
    .select('*')
    .eq('user_id', userId)
    .eq('published_to_profile', true);

  // Calculate CRI components
  const skillsScore = calculateSkillsScore(skills);
  const experienceScore = calculateExperienceScore(userProfile, resumes);
  const educationScore = calculateEducationScore(courseProgress);
  const portfolioScore = calculatePortfolioScore(userProfile, resumes);
  const marketReadinessScore = calculateMarketReadinessScore(goals, skills);

  // Weighted CRI calculation
  const weights = {
    skills: 0.3,
    experience: 0.25,
    education: 0.2,
    portfolio: 0.15,
    marketReadiness: 0.1
  };

  const criScore = Math.round(
    skillsScore * weights.skills +
    experienceScore * weights.experience +
    educationScore * weights.education +
    portfolioScore * weights.portfolio +
    marketReadinessScore * weights.marketReadiness
  );

  // Generate insights and recommendations
  const insights = generateCRIInsights(criScore, {
    skills: skillsScore,
    experience: experienceScore,
    education: educationScore,
    portfolio: portfolioScore,
    marketReadiness: marketReadinessScore
  });

  // Store CRI calculation in user_cri_scores table
  const { data: criRecord, error: insertError } = await supabase
    .from('user_cri_scores')
    .upsert({
      user_id: userId,
      target_job_id: null, // Will be set when user selects target job
      current_cri_score: criScore,
      required_cri_score: criScore + 20, // Target 20 points higher
      skill_completion_percentage: skillsScore,
      step_completion_percentage: 0, // Placeholder
      project_completion_percentage: portfolioScore,
      certification_completion_percentage: educationScore,
      experience_score: experienceScore,
      experience_years: 0, // Extract from profile if available
      readiness_level: getCRILevel(criScore),
      estimated_time_to_ready: '3-6 months', // Based on gap
      next_priority_items: insights,
      blocking_factors: [],
      last_calculated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error storing CRI calculation:', insertError);
    // Continue execution even if storage fails
  }

  return new Response(
    JSON.stringify({
      criScore,
      level: getCRILevel(criScore),
      components: {
        skills: skillsScore,
        experience: experienceScore,
        education: educationScore,
        portfolio: portfolioScore,
        marketReadiness: marketReadinessScore
      },
      insights,
      recommendations: generateRecommendations(criScore, insights),
      calculationId: criRecord?.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateProgress(supabase: any, userId: string, progressData: any) {
  const { itemType, itemId, status, metadata } = progressData;

  // Update relevant progress table
  let updateResult;
  
  switch (itemType) {
    case 'skill':
      updateResult = await supabase
        .from('user_skills')
        .upsert({
          user_id: userId,
          skill_id: itemId,
          proficiency_level: status === 'completed' ? 'advanced' : 'intermediate',
          updated_at: new Date().toISOString()
        });
      break;
      
    case 'course':
      updateResult = await supabase
        .from('course_progress')
        .upsert({
          user_id: userId,
          course_id: itemId,
          status: status,
          progress_percentage: status === 'completed' ? 100 : metadata?.progress || 0,
          updated_at: new Date().toISOString()
        });
      break;
      
    case 'goal':
      updateResult = await supabase
        .from('career_goals')
        .update({
          current_progress: metadata?.progress || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
      break;
  }

  // Trigger CRI recalculation
  const criResult = await calculateCRI(supabase, userId);
  
  return new Response(
    JSON.stringify({
      success: true,
      progressUpdated: true,
      newCRIScore: JSON.parse(await criResult.text()).criScore
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getCRIBreakdown(supabase: any, userId: string, trackId?: string) {
  console.log(`Getting CRI breakdown for user: ${userId}`);
  
  // Get latest CRI calculation from user_cri_scores
  const { data: latestCRI, error: fetchError } = await supabase
    .from('user_cri_scores')
    .select('*')
    .eq('user_id', userId)
    .order('last_calculated', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching CRI data:', fetchError);
    throw fetchError;
  }

  if (!latestCRI) {
    console.log('No CRI data found, calculating fresh CRI...');
    // Calculate fresh CRI if none exists
    return await calculateCRI(supabase, userId, trackId);
  }

  console.log('Found existing CRI data:', latestCRI);

  // Get historical CRI data for trending (from same table)
  const { data: historicalCRI } = await supabase
    .from('user_cri_scores')
    .select('current_cri_score as cri_score, last_calculated as calculated_at')
    .eq('user_id', userId)
    .order('last_calculated', { ascending: false })
    .limit(10);

  const trend = calculateCRITrend(historicalCRI || []);

  return new Response(
    JSON.stringify({
      criScore: latestCRI.current_cri_score,
      level: latestCRI.readiness_level || getCRILevel(latestCRI.current_cri_score),
      components: {
        skills: latestCRI.skill_completion_percentage || 0,
        experience: latestCRI.experience_score || 0,
        education: latestCRI.certification_completion_percentage || 0,
        portfolio: latestCRI.project_completion_percentage || 0,
        marketReadiness: 50 // Default value
      },
      insights: latestCRI.next_priority_items || [],
      trend,
      lastCalculated: latestCRI.last_calculated,
      recommendations: generateDetailedRecommendationsFromCRI(latestCRI)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper functions
function calculateSkillsScore(skills: any[]): number {
  if (!skills || skills.length === 0) return 0;
  
  const proficiencyScores = {
    'beginner': 25,
    'intermediate': 50,
    'advanced': 80,
    'expert': 100
  };
  
  const avgProficiency = skills.reduce((sum, skill) => {
    return sum + (proficiencyScores[skill.proficiency_level] || 25);
  }, 0) / skills.length;
  
  // Bonus for skill count (up to 20 skills)
  const skillCountBonus = Math.min(20, skills.length) * 2;
  
  return Math.min(100, Math.round(avgProficiency + skillCountBonus));
}

function calculateExperienceScore(profile: any, resumes: any[]): number {
  let score = 0;
  
  // Years of experience (from profile or resume)
  const yearsExp = profile?.years_experience || 0;
  score += Math.min(40, yearsExp * 4); // Up to 40 points for 10+ years
  
  // Resume quality
  if (resumes && resumes.length > 0) {
    const avgCRI = resumes.reduce((sum, resume) => sum + (resume.cri_average || 0), 0) / resumes.length;
    score += avgCRI * 0.6; // Up to 60 points from resume quality
  }
  
  return Math.min(100, Math.round(score));
}

function calculateEducationScore(courseProgress: any[]): number {
  if (!courseProgress || courseProgress.length === 0) return 0;
  
  const completedCourses = courseProgress.filter(c => c.status === 'completed').length;
  const inProgressCourses = courseProgress.filter(c => c.status === 'in_progress').length;
  
  // Points for completed courses (more weight)
  let score = completedCourses * 15;
  
  // Points for courses in progress
  score += inProgressCourses * 5;
  
  // Bonus for diverse learning
  const platforms = new Set(courseProgress.map(c => c.platform).filter(Boolean));
  score += platforms.size * 3;
  
  return Math.min(100, Math.round(score));
}

function calculatePortfolioScore(profile: any, resumes: any[]): number {
  let score = 0;
  
  // Published resume
  if (resumes && resumes.length > 0) {
    score += 40;
  }
  
  // Profile completeness
  const profileFields = ['name', 'bio', 'location', 'skills'];
  const completedFields = profileFields.filter(field => profile?.[field]).length;
  score += (completedFields / profileFields.length) * 30;
  
  // Additional portfolio elements (placeholder for future features)
  score += 30; // Default score for basic portfolio
  
  return Math.min(100, Math.round(score));
}

function calculateMarketReadinessScore(goals: any[], skills: any[]): number {
  let score = 50; // Base score
  
  // Active goals
  if (goals && goals.length > 0) {
    score += Math.min(30, goals.length * 10);
  }
  
  // Skill-goal alignment (simplified)
  if (skills && goals) {
    score += 20; // Placeholder for alignment calculation
  }
  
  return Math.min(100, Math.round(score));
}

function getCRILevel(score: number): string {
  if (score >= 90) return 'Expert';
  if (score >= 80) return 'Advanced';
  if (score >= 70) return 'Intermediate';
  if (score >= 60) return 'Developing';
  return 'Beginner';
}

function generateCRIInsights(criScore: number, components: any) {
  const insights = [];
  
  // Overall assessment
  if (criScore >= 80) {
    insights.push('Strong career readiness profile');
  } else if (criScore >= 60) {
    insights.push('Good foundation with room for improvement');
  } else {
    insights.push('Significant opportunity for career development');
  }
  
  // Component-specific insights
  const sortedComponents = Object.entries(components)
    .sort(([,a], [,b]) => (b as number) - (a as number));
  
  const strongest = sortedComponents[0];
  const weakest = sortedComponents[sortedComponents.length - 1];
  
  insights.push(`Strongest area: ${strongest[0]} (${strongest[1]})`);
  insights.push(`Area for improvement: ${weakest[0]} (${weakest[1]})`);
  
  return insights;
}

function generateRecommendations(criScore: number, insights: string[]) {
  const recommendations = [];
  
  if (criScore < 60) {
    recommendations.push('Focus on building foundational skills');
    recommendations.push('Complete relevant online courses');
    recommendations.push('Update and optimize your resume');
  } else if (criScore < 80) {
    recommendations.push('Develop specialized expertise in your field');
    recommendations.push('Build a portfolio of projects');
    recommendations.push('Network with industry professionals');
  } else {
    recommendations.push('Consider leadership or mentoring opportunities');
    recommendations.push('Explore advanced certifications');
    recommendations.push('Share knowledge through content creation');
  }
  
  return recommendations;
}

function generateDetailedRecommendations(criData: any) {
  // More detailed recommendations based on component breakdown
  const recommendations = [];
  const components = criData.component_scores;
  
  Object.entries(components).forEach(([component, score]) => {
    if ((score as number) < 70) {
      switch (component) {
        case 'skills':
          recommendations.push({
            area: 'Skills Development',
            action: 'Complete skill assessments and identify gaps',
            priority: 'high'
          });
          break;
        case 'experience':
          recommendations.push({
            area: 'Experience Building',
            action: 'Seek internships, projects, or volunteer opportunities',
            priority: 'medium'
          });
          break;
        case 'education':
          recommendations.push({
            area: 'Continuous Learning',
            action: 'Enroll in relevant courses and certifications',
            priority: 'medium'
          });
          break;
        case 'portfolio':
          recommendations.push({
            area: 'Portfolio Development',
            action: 'Create and publish professional portfolio',
            priority: 'high'
          });
          break;
      }
    }
  });
  
  return recommendations;
}

function generateDetailedRecommendationsFromCRI(criData: any) {
  // Generate recommendations from user_cri_scores format
  const recommendations = [];
  
  if (criData.skill_completion_percentage < 70) {
    recommendations.push({
      area: 'Skills Development',
      action: 'Complete skill assessments and identify gaps',
      priority: 'high'
    });
  }
  
  if (criData.experience_score < 70) {
    recommendations.push({
      area: 'Experience Building',
      action: 'Seek internships, projects, or volunteer opportunities',
      priority: 'medium'
    });
  }
  
  if (criData.certification_completion_percentage < 70) {
    recommendations.push({
      area: 'Continuous Learning',
      action: 'Enroll in relevant courses and certifications',
      priority: 'medium'
    });
  }
  
  if (criData.project_completion_percentage < 70) {
    recommendations.push({
      area: 'Portfolio Development',
      action: 'Create and publish professional portfolio',
      priority: 'high'
    });
  }
  
  // Add blocking factors as recommendations
  if (criData.blocking_factors) {
    criData.blocking_factors.forEach((factor: string) => {
      recommendations.push({
        area: 'Blockers',
        action: factor,
        priority: 'high'
      });
    });
  }
  
  return recommendations;
}

function calculateCRITrend(historicalData: any[]) {
  if (!historicalData || historicalData.length < 2) {
    return { direction: 'stable', change: 0 };
  }
  
  const latest = historicalData[0].cri_score;
  const previous = historicalData[1].cri_score;
  const change = latest - previous;
  
  return {
    direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
    change: Math.abs(change),
    percentage: Math.round((change / previous) * 100)
  };
}