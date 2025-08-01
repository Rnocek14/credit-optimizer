/**
 * Enhanced Goal Setting Engine with AI-powered recommendations
 */

import { supabase } from '@/integrations/supabase/client';
import { realCourseService, type RealCourse } from './courseAPIs';

export interface CareerGoal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target_role: string;
  target_date: string;
  current_progress: number;
  skill_gaps: string[];
  estimated_timeline_weeks: number;
  priority_score: number;
  market_demand_score: number;
  recommended_courses: RealCourse[];
  milestones: GoalMilestone[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  target_date: string;
  completion_criteria: string[];
  courses_required: string[];
  skills_gained: string[];
  xp_reward: number;
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
}

export interface GoalRecommendation {
  goal: Partial<CareerGoal>;
  reasoning: string;
  confidence_score: number;
  market_insights: {
    demand_level: 'high' | 'medium' | 'low';
    avg_salary: number;
    job_growth_rate: number;
    skills_in_demand: string[];
  };
}

/**
 * Enhanced Goal Setting Service
 */
export class EnhancedGoalService {
  
  /**
   * Get AI-powered career goal recommendations based on user's current skills
   */
  async getGoalRecommendations(userId: string): Promise<GoalRecommendation[]> {
    try {
      // Get user's current skills and career data
      const userProfile = await this.getUserProfile(userId);
      const skillGaps = await this.analyzeSkillGaps(userId);
      
      // Generate goal recommendations
      const recommendations = await this.generateGoalRecommendations(userProfile, skillGaps);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting goal recommendations:', error);
      return [];
    }
  }

  /**
   * Validate goal against market demand and feasibility
   */
  async validateGoal(goalData: Partial<CareerGoal>): Promise<{
    isValid: boolean;
    marketDemand: number;
    feasibilityScore: number;
    recommendations: string[];
    estimatedTimeline: number;
  }> {
    try {
      // Market demand analysis
      const marketDemand = await this.analyzeMarketDemand(goalData.target_role || '');
      
      // Feasibility analysis based on skill gaps
      const feasibilityScore = this.calculateFeasibilityScore(goalData.skill_gaps || []);
      
      // Timeline estimation
      const estimatedTimeline = this.estimateTimeline(goalData.skill_gaps || []);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(marketDemand, feasibilityScore);

      return {
        isValid: marketDemand > 30 && feasibilityScore > 40,
        marketDemand,
        feasibilityScore,
        recommendations,
        estimatedTimeline
      };
    } catch (error) {
      console.error('Error validating goal:', error);
      return {
        isValid: false,
        marketDemand: 0,
        feasibilityScore: 0,
        recommendations: ['Unable to validate goal at this time'],
        estimatedTimeline: 0
      };
    }
  }

  /**
   * Create adaptive milestones for a goal
   */
  async createAdaptiveMilestones(goalId: string, skillGaps: string[]): Promise<GoalMilestone[]> {
    try {
      const milestones: Partial<GoalMilestone>[] = [];
      
      // Group skills by learning phases
      const beginnerSkills = skillGaps.filter(skill => this.isBeginnerSkill(skill));
      const intermediateSkills = skillGaps.filter(skill => this.isIntermediateSkill(skill));
      const advancedSkills = skillGaps.filter(skill => this.isAdvancedSkill(skill));

      let orderIndex = 0;

      // Phase 1: Foundation Skills
      if (beginnerSkills.length > 0) {
        milestones.push({
          goal_id: goalId,
          title: 'Foundation Skills',
          description: 'Master the fundamental skills required for your career path',
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          completion_criteria: beginnerSkills.map(skill => `Complete course covering ${skill}`),
          skills_gained: beginnerSkills,
          xp_reward: 100,
          status: 'pending',
          order_index: orderIndex++
        });
      }

      // Phase 2: Intermediate Skills
      if (intermediateSkills.length > 0) {
        milestones.push({
          goal_id: goalId,
          title: 'Intermediate Development',
          description: 'Build practical experience with intermediate-level skills',
          target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          completion_criteria: intermediateSkills.map(skill => `Complete project using ${skill}`),
          skills_gained: intermediateSkills,
          xp_reward: 200,
          status: 'pending',
          order_index: orderIndex++
        });
      }

      // Phase 3: Advanced Skills & Portfolio
      if (advancedSkills.length > 0) {
        milestones.push({
          goal_id: goalId,
          title: 'Advanced Expertise',
          description: 'Develop advanced skills and build a comprehensive portfolio',
          target_date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(), // 150 days
          completion_criteria: [
            ...advancedSkills.map(skill => `Demonstrate proficiency in ${skill}`),
            'Complete a capstone project',
            'Create a portfolio showcasing skills'
          ],
          skills_gained: advancedSkills,
          xp_reward: 300,
          status: 'pending',
          order_index: orderIndex++
        });
      }

      // Phase 4: Job Preparation
      milestones.push({
        goal_id: goalId,
        title: 'Career Readiness',
        description: 'Prepare for job applications and interviews',
        target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days
        completion_criteria: [
          'Update resume with new skills',
          'Practice technical interviews',
          'Apply to target positions',
          'Build professional network'
        ],
        skills_gained: ['Interview Skills', 'Resume Writing', 'Networking'],
        xp_reward: 500,
        status: 'pending',
        order_index: orderIndex++
      });

      return milestones as GoalMilestone[];
    } catch (error) {
      console.error('Error creating adaptive milestones:', error);
      return [];
    }
  }

  /**
   * Calculate goal priority score based on multiple factors
   */
  calculateGoalPriority(
    marketDemand: number,
    userInterest: number,
    skillAlignment: number,
    timeToCompletion: number
  ): number {
    // Weighted scoring: market demand (30%), user interest (25%), skill alignment (25%), time efficiency (20%)
    const priority = (
      marketDemand * 0.30 +
      userInterest * 0.25 +
      skillAlignment * 0.25 +
      (100 - timeToCompletion) * 0.20 // Lower time = higher priority
    );

    return Math.round(priority);
  }

  // Private helper methods
  private async getUserProfile(userId: string) {
    const { data } = await supabase
      .from('ai_resume_drafts')
      .select('content, cri_average')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    return data?.[0] || null;
  }

  private async analyzeSkillGaps(userId: string): Promise<string[]> {
    // This would integrate with the career graph to identify skill gaps
    // For now, return mock data
    return ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker'];
  }

  private async generateGoalRecommendations(
    userProfile: any, 
    skillGaps: string[]
  ): Promise<GoalRecommendation[]> {
    // Mock recommendations based on skill gaps
    const recommendations: GoalRecommendation[] = [
      {
        goal: {
          title: 'Become a Full Stack Developer',
          description: 'Master both frontend and backend development skills',
          target_role: 'Full Stack Developer',
          skill_gaps: ['React', 'Node.js', 'Express', 'MongoDB'],
          estimated_timeline_weeks: 24,
          priority_score: 85
        },
        reasoning: 'High market demand and good alignment with your current skills',
        confidence_score: 0.87,
        market_insights: {
          demand_level: 'high',
          avg_salary: 95000,
          job_growth_rate: 15,
          skills_in_demand: ['React', 'Node.js', 'TypeScript', 'AWS']
        }
      },
      {
        goal: {
          title: 'Transition to Data Science',
          description: 'Develop data analysis and machine learning skills',
          target_role: 'Data Scientist',
          skill_gaps: ['Python', 'Pandas', 'Machine Learning', 'Statistics'],
          estimated_timeline_weeks: 32,
          priority_score: 78
        },
        reasoning: 'Growing field with excellent career prospects',
        confidence_score: 0.75,
        market_insights: {
          demand_level: 'high',
          avg_salary: 115000,
          job_growth_rate: 22,
          skills_in_demand: ['Python', 'Machine Learning', 'SQL', 'Statistics']
        }
      }
    ];

    return recommendations;
  }

  private async analyzeMarketDemand(targetRole: string): Promise<number> {
    // This would integrate with job market APIs (Indeed, Glassdoor)
    // For now, return mock data based on role
    const demandScores: Record<string, number> = {
      'full stack developer': 85,
      'data scientist': 90,
      'product manager': 75,
      'devops engineer': 80,
      'ui/ux designer': 70,
      'software engineer': 88
    };

    const normalizedRole = targetRole.toLowerCase();
    return demandScores[normalizedRole] || 60;
  }

  private calculateFeasibilityScore(skillGaps: string[]): number {
    // Calculate based on number of skills and their complexity
    const complexityScores: Record<string, number> = {
      'html': 1, 'css': 1, 'javascript': 2,
      'react': 3, 'node.js': 3, 'python': 2,
      'machine learning': 5, 'aws': 4, 'docker': 3
    };

    const totalComplexity = skillGaps.reduce((sum, skill) => {
      return sum + (complexityScores[skill.toLowerCase()] || 3);
    }, 0);

    // Higher complexity = lower feasibility
    const feasibilityScore = Math.max(20, 100 - (totalComplexity * 5));
    return Math.min(feasibilityScore, 100);
  }

  private estimateTimeline(skillGaps: string[]): number {
    // Estimate weeks based on skill complexity
    const timeEstimates: Record<string, number> = {
      'html': 2, 'css': 2, 'javascript': 4,
      'react': 6, 'node.js': 6, 'python': 5,
      'machine learning': 12, 'aws': 8, 'docker': 4
    };

    const totalWeeks = skillGaps.reduce((sum, skill) => {
      return sum + (timeEstimates[skill.toLowerCase()] || 4);
    }, 0);

    return Math.max(totalWeeks, 8); // Minimum 8 weeks
  }

  private generateRecommendations(marketDemand: number, feasibilityScore: number): string[] {
    const recommendations: string[] = [];

    if (marketDemand < 50) {
      recommendations.push('Consider exploring roles with higher market demand');
    }
    if (feasibilityScore < 60) {
      recommendations.push('Break down your goal into smaller, more manageable milestones');
    }
    if (marketDemand > 80 && feasibilityScore > 70) {
      recommendations.push('Excellent goal choice! High demand and achievable timeline');
    }

    return recommendations;
  }

  private isBeginnerSkill(skill: string): boolean {
    const beginnerSkills = ['html', 'css', 'javascript basics', 'git', 'sql basics'];
    return beginnerSkills.some(s => skill.toLowerCase().includes(s));
  }

  private isIntermediateSkill(skill: string): boolean {
    const intermediateSkills = ['react', 'node.js', 'python', 'express', 'mongodb'];
    return intermediateSkills.some(s => skill.toLowerCase().includes(s));
  }

  private isAdvancedSkill(skill: string): boolean {
    const advancedSkills = ['machine learning', 'aws', 'docker', 'kubernetes', 'microservices'];
    return advancedSkills.some(s => skill.toLowerCase().includes(s));
  }
}

export const enhancedGoalService = new EnhancedGoalService();