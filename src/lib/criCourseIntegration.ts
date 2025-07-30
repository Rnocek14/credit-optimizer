/**
 * CRI Course Integration - Enhanced CRI scoring for courses and learning materials
 */

import { supabase } from '@/integrations/supabase/client';

export interface CourseCRIBreakdown {
  difficultyScore: number;
  skillCoverage: number;
  projectRigor: number;
  outcomeConversion: number;
  instructorRating: number;
  overall: number;
}

export interface CRIWeights {
  difficulty: number;
  skillCoverage: number;
  projectRigor: number;
  outcomeConversion: number;
  instructorRating: number;
}

// CRI 2.0 weighting system
export const CRI_WEIGHTS: CRIWeights = {
  difficulty: 0.30,
  skillCoverage: 0.30,
  projectRigor: 0.20,
  outcomeConversion: 0.15,
  instructorRating: 0.05
};

/**
 * Calculate CRI score for a course based on its characteristics
 */
export const calculateCourseCRI = async (courseData: {
  title: string;
  platform: string;
  difficulty?: string;
  skill_tags?: string[];
  description?: string;
  cost?: string;
  duration_hours?: number;
  has_projects?: boolean;
  instructor_rating?: number;
}): Promise<CourseCRIBreakdown> => {
  try {
    // 1. Difficulty Score (30% weight)
    const difficultyScore = calculateDifficultyScore(courseData.difficulty, courseData.duration_hours);

    // 2. Skill Coverage (30% weight)
    const skillCoverage = calculateSkillCoverage(courseData.skill_tags || [], courseData.description);

    // 3. Project Rigor (20% weight)
    const projectRigor = calculateProjectRigor(courseData.has_projects, courseData.platform, courseData.description);

    // 4. Outcome Conversion (15% weight)
    const outcomeConversion = await calculateOutcomeConversion(courseData.platform, courseData.title);

    // 5. Instructor Rating (5% weight)
    const instructorRating = calculateInstructorScore(courseData.instructor_rating, courseData.platform);

    // Calculate weighted overall score
    const overall = Math.min(
      (difficultyScore * CRI_WEIGHTS.difficulty) +
      (skillCoverage * CRI_WEIGHTS.skillCoverage) +
      (projectRigor * CRI_WEIGHTS.projectRigor) +
      (outcomeConversion * CRI_WEIGHTS.outcomeConversion) +
      (instructorRating * CRI_WEIGHTS.instructorRating),
      100
    );

    return {
      difficultyScore: Math.round(difficultyScore),
      skillCoverage: Math.round(skillCoverage),
      projectRigor: Math.round(projectRigor),
      outcomeConversion: Math.round(outcomeConversion),
      instructorRating: Math.round(instructorRating),
      overall: Math.round(overall)
    };
  } catch (error) {
    console.error('Error calculating course CRI:', error);
    return {
      difficultyScore: 0,
      skillCoverage: 0,
      projectRigor: 0,
      outcomeConversion: 0,
      instructorRating: 0,
      overall: 0
    };
  }
};

/**
 * Calculate difficulty score based on course level and duration
 */
const calculateDifficultyScore = (difficulty?: string, durationHours?: number): number => {
  let baseScore = 50;

  // Difficulty level scoring
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      baseScore = 40;
      break;
    case 'intermediate':
      baseScore = 70;
      break;
    case 'advanced':
      baseScore = 90;
      break;
    default:
      baseScore = 50;
  }

  // Duration bonus (longer courses = higher rigor)
  if (durationHours) {
    if (durationHours >= 40) baseScore += 15;
    else if (durationHours >= 20) baseScore += 10;
    else if (durationHours >= 10) baseScore += 5;
  }

  return Math.min(baseScore, 100);
};

/**
 * Calculate skill coverage based on number and relevance of skills
 */
const calculateSkillCoverage = (skillTags: string[], description?: string): number => {
  let score = 0;

  // Base scoring on number of skills
  if (skillTags.length >= 8) score = 90;
  else if (skillTags.length >= 5) score = 75;
  else if (skillTags.length >= 3) score = 60;
  else if (skillTags.length >= 1) score = 40;
  else score = 20;

  // Bonus for high-value skills
  const highValueSkills = ['react', 'python', 'javascript', 'typescript', 'node.js', 'aws', 'docker', 'kubernetes', 'machine learning', 'ai'];
  const hasHighValueSkills = skillTags.some(skill => 
    highValueSkills.some(hvSkill => skill.toLowerCase().includes(hvSkill))
  );
  
  if (hasHighValueSkills) score += 10;

  // Description analysis bonus
  if (description && description.length > 200) score += 5;

  return Math.min(score, 100);
};

/**
 * Calculate project rigor based on hands-on components
 */
const calculateProjectRigor = (hasProjects?: boolean, platform?: string, description?: string): number => {
  let score = 30; // Base score

  // Project-based scoring
  if (hasProjects) score += 40;

  // Platform-based rigor scoring
  const rigorousPlatforms = ['mit opencourseware', 'stanford online', 'harvard online', 'coursera specialization', 'udacity nanodegree'];
  if (platform && rigorousPlatforms.some(p => platform.toLowerCase().includes(p))) {
    score += 20;
  }

  // Description analysis for project keywords
  const projectKeywords = ['project', 'portfolio', 'build', 'create', 'develop', 'hands-on', 'practical'];
  if (description) {
    const projectMentions = projectKeywords.filter(keyword => 
      description.toLowerCase().includes(keyword)
    ).length;
    score += Math.min(projectMentions * 5, 20);
  }

  return Math.min(score, 100);
};

/**
 * Calculate outcome conversion based on historical platform data
 */
const calculateOutcomeConversion = async (platform?: string, title?: string): Promise<number> => {
  // Platform-based conversion rates (simulated data)
  const platformConversions: Record<string, number> = {
    'mit opencourseware': 85,
    'stanford online': 80,
    'harvard online': 80,
    'coursera': 70,
    'udacity': 75,
    'pluralsight': 65,
    'udemy': 60,
    'freecodecamp': 70,
    'edx': 75,
    'linkedin learning': 60
  };

  let score = 50; // Default score

  if (platform) {
    const platformKey = Object.keys(platformConversions).find(key => 
      platform.toLowerCase().includes(key)
    );
    if (platformKey) {
      score = platformConversions[platformKey];
    }
  }

  // Title-based bonuses for high-demand skills
  const highDemandKeywords = ['react', 'python', 'data science', 'machine learning', 'cloud', 'devops', 'full stack'];
  if (title) {
    const hasHighDemand = highDemandKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
    if (hasHighDemand) score += 10;
  }

  return Math.min(score, 100);
};

/**
 * Calculate instructor rating score
 */
const calculateInstructorScore = (instructorRating?: number, platform?: string): number => {
  if (instructorRating) {
    return (instructorRating / 5) * 100;
  }

  // Platform-based instructor quality estimates
  const platformQuality: Record<string, number> = {
    'mit opencourseware': 95,
    'stanford online': 90,
    'harvard online': 90,
    'coursera': 75,
    'udacity': 80,
    'pluralsight': 70,
    'udemy': 65,
    'edx': 80
  };

  if (platform) {
    const platformKey = Object.keys(platformQuality).find(key => 
      platform.toLowerCase().includes(key)
    );
    if (platformKey) {
      return platformQuality[platformKey];
    }
  }

  return 70; // Default instructor quality
};

/**
 * Get CRI-based course recommendations for skill gaps
 */
export const getCRIBasedRecommendations = async (
  userId: string,
  targetCRI: number = 80,
  skillGaps: string[] = []
): Promise<any[]> => {
  try {
    // Get user's current CRI score
    const { data: currentCRI } = await supabase
      .from('ai_resume_drafts')
      .select('cri_average')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const currentScore = currentCRI?.[0]?.cri_average || 0;
    const neededImprovement = targetCRI - currentScore;

    // Find courses that could bridge the gap
    const { data: courses } = await supabase
      .from('recommended_courses')
      .select('*')
      .overlaps('skill_tags', skillGaps)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate potential CRI contribution for each course
    const coursesWithCRI = await Promise.all(
      (courses || []).map(async course => {
        const criBreakdown = await calculateCourseCRI(course);
        return {
          ...course,
          criBreakdown,
          criContribution: Math.min(criBreakdown.overall * 0.1, neededImprovement) // Max 10% contribution per course
        };
      })
    );

    // Sort by CRI contribution potential
    return coursesWithCRI.sort((a, b) => b.criContribution - a.criContribution);
  } catch (error) {
    console.error('Error getting CRI-based recommendations:', error);
    return [];
  }
};

/**
 * Update course/transcript with CRI score
 */
export const updateCourseWithCRI = async (
  courseId: string,
  courseData: any,
  tableType: 'transcripts' | 'saved_courses' = 'transcripts'
): Promise<boolean> => {
  try {
    const criBreakdown = await calculateCourseCRI(courseData);
    
    const { error } = await supabase
      .from(tableType)
      .update({
        cri_breakdown: criBreakdown,
        cri_score: criBreakdown.overall,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating course with CRI:', error);
    return false;
  }
};