/**
 * Enhanced CRI Integration with Instructor Prestige and Advanced Course Intelligence
 * Extends the existing CRI system with instructor ratings and course intelligence engine
 */

import { supabase } from '@/integrations/supabase/client';

// ===== ENHANCED CRI WEIGHTS =====

export const ENHANCED_CRI_WEIGHTS = {
  difficulty: 0.20,          // Course difficulty appropriateness
  skillCoverage: 0.25,       // Breadth and depth of skills covered
  projectRigor: 0.20,        // Hands-on project quality
  outcomeConversion: 0.15,   // Career impact potential
  instructorPrestige: 0.10,  // NEW: Instructor reputation and prestige
  platformCredibility: 0.05, // Platform reliability and recognition
  marketRelevance: 0.05      // Current market demand for skills
} as const;

export interface EnhancedCRIBreakdown {
  overall_cri_score: number;
  difficulty_score: number;
  skill_coverage_score: number;
  project_rigor_score: number;
  outcome_conversion_score: number;
  instructor_prestige_score: number;
  platform_credibility_score: number;
  market_relevance_score: number;
  calculation_version: string;
  calculation_data: {
    instructor_data?: any;
    platform_analysis?: any;
    skill_analysis?: any;
    market_data?: any;
  };
  historical_scores: any[];
}

// ===== ENHANCED CRI CALCULATION =====

export async function calculateEnhancedCourseCRI(courseData: any): Promise<EnhancedCRIBreakdown> {
  try {
    // Get existing scores or calculate new ones
    const difficultyScore = await calculateDifficultyScore(
      courseData.difficulty_level,
      courseData.estimated_hours,
      courseData.user_average_difficulty
    );

    const skillCoverageScore = await calculateSkillCoverageScore(
      courseData.skill_mappings || [],
      courseData.description
    );

    const projectRigorScore = await calculateProjectRigorScore(
      courseData.description,
      courseData.platform,
      courseData.estimated_hours
    );

    const outcomeConversionScore = await calculateOutcomeConversionScore(
      courseData.platform,
      courseData.title,
      courseData.category
    );

    // NEW: Enhanced instructor prestige calculation
    const instructorPrestigeScore = await calculateInstructorPrestigeScore(
      courseData.instructor_id,
      courseData.instructor_profile
    );

    const platformCredibilityScore = calculatePlatformCredibilityScore(courseData.platform);
    
    const marketRelevanceScore = await calculateMarketRelevanceScore(
      courseData.skill_mappings || [],
      courseData.category
    );

    // Calculate weighted overall score
    const overallScore = Math.round(
      (difficultyScore * ENHANCED_CRI_WEIGHTS.difficulty) +
      (skillCoverageScore * ENHANCED_CRI_WEIGHTS.skillCoverage) +
      (projectRigorScore * ENHANCED_CRI_WEIGHTS.projectRigor) +
      (outcomeConversionScore * ENHANCED_CRI_WEIGHTS.outcomeConversion) +
      (instructorPrestigeScore * ENHANCED_CRI_WEIGHTS.instructorPrestige) +
      (platformCredibilityScore * ENHANCED_CRI_WEIGHTS.platformCredibility) +
      (marketRelevanceScore * ENHANCED_CRI_WEIGHTS.marketRelevance)
    );

    return {
      overall_cri_score: overallScore,
      difficulty_score: difficultyScore,
      skill_coverage_score: skillCoverageScore,
      project_rigor_score: projectRigorScore,
      outcome_conversion_score: outcomeConversionScore,
      instructor_prestige_score: instructorPrestigeScore,
      platform_credibility_score: platformCredibilityScore,
      market_relevance_score: marketRelevanceScore,
      calculation_version: '2.0',
      calculation_data: {
        instructor_data: courseData.instructor_profile,
        platform_analysis: { platform: courseData.platform },
        skill_analysis: courseData.skill_mappings,
        market_data: { category: courseData.category }
      },
      historical_scores: []
    };
  } catch (error) {
    console.error('Error calculating enhanced CRI:', error);
    throw error;
  }
}

// ===== ENHANCED COMPONENT CALCULATORS =====

async function calculateDifficultyScore(
  difficultyLevel?: string,
  estimatedHours?: number,
  userAverageDifficulty?: number
): Promise<number> {
  // Base difficulty mapping
  const difficultyMap = {
    'beginner': 70,
    'intermediate': 85,
    'advanced': 95
  };

  let baseScore = difficultyMap[difficultyLevel as keyof typeof difficultyMap] || 75;

  // Adjust based on duration (longer courses generally more comprehensive)
  if (estimatedHours) {
    if (estimatedHours > 40) baseScore += 10;
    else if (estimatedHours > 20) baseScore += 5;
    else if (estimatedHours < 5) baseScore -= 10;
  }

  // Incorporate user feedback if available
  if (userAverageDifficulty) {
    // Normalize user difficulty (1-5) to score adjustment (-10 to +10)
    const userAdjustment = (userAverageDifficulty - 3) * 5;
    baseScore += userAdjustment;
  }

  return Math.min(100, Math.max(0, baseScore));
}

async function calculateSkillCoverageScore(
  skillMappings: any[],
  description?: string
): Promise<number> {
  let score = 50; // Base score

  // Score based on number and depth of skills
  if (skillMappings.length > 0) {
    const skillCount = skillMappings.length;
    score += Math.min(25, skillCount * 3); // Up to 25 points for skill count

    // Bonus for skill depth diversity
    const depthLevels = new Set(skillMappings.map(s => s.skill_depth));
    score += depthLevels.size * 5; // 5 points per depth level

    // Bonus for high relevance scores
    const avgRelevance = skillMappings.reduce((sum, s) => sum + s.relevance_score, 0) / skillMappings.length;
    score += avgRelevance * 10;
  }

  // Description analysis bonus
  if (description) {
    const keyTerms = ['project', 'hands-on', 'practical', 'real-world', 'portfolio'];
    const termCount = keyTerms.filter(term => 
      description.toLowerCase().includes(term)
    ).length;
    score += termCount * 3;
  }

  return Math.min(100, Math.max(0, score));
}

async function calculateProjectRigorScore(
  description?: string,
  platform?: string,
  estimatedHours?: number
): Promise<number> {
  let score = 40; // Base score

  // Platform-based scoring
  const platformScores = {
    'Coursera': 80,
    'edX': 85,
    'Udacity': 90,
    'Pluralsight': 75,
    'LinkedIn Learning': 70,
    'Udemy': 60
  };
  
  if (platform && platformScores[platform as keyof typeof platformScores]) {
    score = platformScores[platform as keyof typeof platformScores];
  }

  // Project-related terms in description
  if (description) {
    const projectTerms = [
      'project', 'portfolio', 'capstone', 'hands-on', 'build', 'create',
      'deploy', 'implement', 'develop', 'code along', 'real-world'
    ];
    
    const termCount = projectTerms.filter(term => 
      description.toLowerCase().includes(term)
    ).length;
    score += Math.min(20, termCount * 4);
  }

  // Duration factor (longer courses more likely to have substantial projects)
  if (estimatedHours) {
    if (estimatedHours > 30) score += 10;
    else if (estimatedHours > 15) score += 5;
    else if (estimatedHours < 5) score -= 15;
  }

  return Math.min(100, Math.max(0, score));
}

async function calculateOutcomeConversionScore(
  platform?: string,
  title?: string,
  category?: string
): Promise<number> {
  let score = 60; // Base score

  // Platform reputation for career outcomes
  const platformOutcomes = {
    'Coursera': 85,
    'edX': 80,
    'Udacity': 90,
    'Pluralsight': 75,
    'LinkedIn Learning': 70,
    'Udemy': 55
  };

  if (platform && platformOutcomes[platform as keyof typeof platformOutcomes]) {
    score = platformOutcomes[platform as keyof typeof platformOutcomes];
  }

  // High-demand skill categories
  if (category) {
    const highDemandCategories = [
      'Data Science', 'Machine Learning', 'Artificial Intelligence',
      'Cloud Computing', 'Cybersecurity', 'DevOps', 'Full Stack Development',
      'Mobile Development', 'Blockchain', 'Product Management'
    ];
    
    if (highDemandCategories.some(cat => 
      category.toLowerCase().includes(cat.toLowerCase())
    )) {
      score += 15;
    }
  }

  // Title indicators of practical applicability
  if (title) {
    const careerTerms = ['career', 'professional', 'job', 'certification', 'bootcamp', 'masterclass'];
    const termCount = careerTerms.filter(term => 
      title.toLowerCase().includes(term)
    ).length;
    score += termCount * 5;
  }

  return Math.min(100, Math.max(0, score));
}

// ===== NEW: INSTRUCTOR PRESTIGE CALCULATION =====

async function calculateInstructorPrestigeScore(
  instructorId?: string,
  instructorProfile?: any
): Promise<number> {
  if (!instructorId && !instructorProfile) {
    return 50; // Default score for unknown instructors
  }

  let score = 50; // Base score

  try {
    let instructor = instructorProfile;
    
    // Fetch instructor profile if not provided
    if (!instructor && instructorId) {
      const { data } = await supabase
        .from('instructor_profiles')
        .select('*')
        .eq('id', instructorId)
        .single();
      instructor = data;
    }

    if (!instructor) return 50;

    // Prestige tier scoring
    const prestigeScores = {
      'bronze': 50,
      'silver': 65,
      'gold': 80,
      'platinum': 90,
      'diamond': 100
    };
    
    score = prestigeScores[instructor.prestige_tier as keyof typeof prestigeScores] || 50;

    // Verification bonus
    if (instructor.verification_status === 'verified') {
      score += 10;
    }

    // Experience bonus
    if (instructor.years_experience) {
      score += Math.min(15, instructor.years_experience * 1.5);
    }

    // Student reach bonus
    if (instructor.total_students > 1000) score += 10;
    else if (instructor.total_students > 100) score += 5;

    // Rating bonus
    if (instructor.average_rating >= 4.5) score += 10;
    else if (instructor.average_rating >= 4.0) score += 5;

    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('Error calculating instructor prestige score:', error);
    return 50;
  }
}

function calculatePlatformCredibilityScore(platform?: string): number {
  const credibilityScores = {
    'Coursera': 95,
    'edX': 90,
    'Udacity': 85,
    'Pluralsight': 80,
    'LinkedIn Learning': 75,
    'Skillshare': 65,
    'Udemy': 60,
    'YouTube': 40
  };

  return credibilityScores[platform as keyof typeof credibilityScores] || 50;
}

async function calculateMarketRelevanceScore(
  skillMappings: any[],
  category?: string
): Promise<number> {
  let score = 60; // Base score

  // High-demand skills boost
  const highDemandSkills = [
    'Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'Docker',
    'Kubernetes', 'Machine Learning', 'Data Analysis', 'SQL',
    'TypeScript', 'Vue.js', 'Angular', 'DevOps', 'Cybersecurity'
  ];

  if (skillMappings.length > 0) {
    const relevantSkills = skillMappings.filter(skill =>
      highDemandSkills.some(demandSkill =>
        skill.skill_name.toLowerCase().includes(demandSkill.toLowerCase())
      )
    );

    score += Math.min(30, relevantSkills.length * 8);
  }

  // Category relevance
  if (category) {
    const emergingCategories = [
      'Artificial Intelligence', 'Machine Learning', 'Data Science',
      'Cloud Computing', 'Cybersecurity', 'Blockchain', 'IoT'
    ];
    
    if (emergingCategories.some(cat => 
      category.toLowerCase().includes(cat.toLowerCase())
    )) {
      score += 20;
    }
  }

  return Math.min(100, Math.max(0, score));
}

// ===== CRI MANAGEMENT FUNCTIONS =====

export async function updateCourseCRIScore(
  courseId: string,
  courseData: any
): Promise<EnhancedCRIBreakdown> {
  const criBreakdown = await calculateEnhancedCourseCRI(courseData);

  // Store historical score before updating
  const { data: existingCRI } = await supabase
    .from('course_cri_scores')
    .select('*')
    .eq('course_id', courseId)
    .single();

  let historicalScores = criBreakdown.historical_scores;
  if (existingCRI) {
    historicalScores = [
      ...(Array.isArray(existingCRI.historical_scores) ? existingCRI.historical_scores : []),
      {
        score: existingCRI.overall_cri_score,
        calculated_at: new Date().toISOString(),
        version: existingCRI.calculation_version
      }
    ].slice(-10); // Keep last 10 scores
  }

  const { error } = await supabase
    .from('course_cri_scores')
    .upsert({
      course_id: courseId,
      ...criBreakdown,
      historical_scores: historicalScores
    });

  if (error) throw error;
  return { ...criBreakdown, historical_scores: historicalScores };
}

export async function getCRIBasedRecommendations(
  userId: string,
  targetCRI = 80,
  skillGaps: string[] = []
): Promise<any[]> {
  try {
    let query = supabase
      .from('courses')
      .select(`
        *,
        instructor_profile:instructor_profiles(*),
        difficulty_rating:course_difficulty_ratings(*),
        cri_score:course_cri_scores(*),
        skill_mappings:course_skill_mappings(*)
      `)
      .eq('is_active', true)
      .eq('verification_status', 'verified');

    const { data: courses, error } = await query;
    if (error) throw error;

    // Filter and score courses based on CRI and skill gaps
    const scoredCourses = courses
      ?.filter(course => course.cri_score?.overall_cri_score >= targetCRI)
      .map(course => {
        let relevanceScore = course.cri_score?.overall_cri_score || 0;

        // Boost score for courses that address skill gaps
        if (skillGaps.length > 0 && course.skill_mappings) {
          const matchingSkills = course.skill_mappings.filter((mapping: any) =>
            skillGaps.some(gap => 
              mapping.skill_name.toLowerCase().includes(gap.toLowerCase())
            )
          );
          relevanceScore += matchingSkills.length * 10;
        }

        return { ...course, relevanceScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    return scoredCourses || [];
  } catch (error) {
    console.error('Error getting CRI-based recommendations:', error);
    return [];
  }
}

export default {
  calculateEnhancedCourseCRI,
  updateCourseCRIScore,
  getCRIBasedRecommendations,
  ENHANCED_CRI_WEIGHTS
};