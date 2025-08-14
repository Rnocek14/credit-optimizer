/**
 * Market scoring utilities for calculating opportunity scores and ROI
 */

interface MarketTrend {
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
}

interface CourseROIData {
  currentSalary: number;
  targetSalary: number;
  courseCost: number;
  timeToSkill: number; // in months
  attainmentProbability: number; // 0-1
}

/**
 * Calculate opportunity score for a career path (0-100)
 */
export const calculateOpportunityScore = (
  marketTrend: MarketTrend,
  locationMultiplier: number = 1.0
): number => {
  // Normalize scores to 0-100 scale
  const normalizedDemand = Math.min(marketTrend.demand_score, 100);
  const normalizedGrowth = Math.min(marketTrend.growth_rate * 5, 100); // 20% growth = 100 points
  const normalizedSalary = Math.min((marketTrend.average_salary / 200000) * 100, 100); // $200k = 100 points
  
  // Convert competition level to inverse score
  const competitionScores = {
    'low': 100,
    'medium': 60,
    'high': 20
  };
  const competitionScore = competitionScores[marketTrend.competition_level as keyof typeof competitionScores] || 50;

  // Weighted calculation
  const opportunityScore = (
    (normalizedDemand * 0.3) + 
    (normalizedGrowth * 0.25) + 
    (normalizedSalary * 0.25) + 
    (competitionScore * 0.2)
  ) * locationMultiplier;

  return Math.round(Math.min(opportunityScore, 100));
};

/**
 * Calculate Expected ROI for a course
 */
export const calculateCourseROI = (data: CourseROIData): number => {
  const salaryUplift = data.targetSalary - data.currentSalary;
  const annualBenefit = salaryUplift * data.attainmentProbability;
  const totalCost = data.courseCost + (data.timeToSkill * (data.currentSalary / 12)); // Include opportunity cost
  
  if (totalCost === 0) return 0;
  
  // Calculate ROI as annual benefit / total cost
  return Math.round((annualBenefit / totalCost) * 100);
};

/**
 * Get opportunity score level and color
 */
export const getOpportunityLevel = (score: number): { level: string; color: string; description: string } => {
  if (score >= 81) return { 
    level: 'Excellent', 
    color: 'bg-emerald-500', 
    description: 'Outstanding career opportunity' 
  };
  if (score >= 61) return { 
    level: 'Good', 
    color: 'bg-green-500', 
    description: 'Strong career opportunity' 
  };
  if (score >= 41) return { 
    level: 'Fair', 
    color: 'bg-yellow-500', 
    description: 'Moderate career opportunity' 
  };
  if (score >= 21) return { 
    level: 'Poor', 
    color: 'bg-orange-500', 
    description: 'Limited career opportunity' 
  };
  return { 
    level: 'Very Poor', 
    color: 'bg-red-500', 
    description: 'Challenging career opportunity' 
  };
};

/**
 * Get market badges based on thresholds
 */
export const getMarketBadges = (marketTrend: MarketTrend): string[] => {
  const badges: string[] = [];
  
  if (marketTrend.demand_score > 80) badges.push('High Demand');
  if (marketTrend.growth_rate > 15) badges.push('High Growth');
  if (marketTrend.average_salary > 120000) badges.push('High Salary');
  if (marketTrend.competition_level === 'low') badges.push('Low Competition');
  
  // Rising star: good demand + good growth + not high competition
  if (marketTrend.demand_score > 70 && marketTrend.growth_rate > 10 && marketTrend.competition_level !== 'high') {
    badges.push('Rising Star');
  }
  
  return badges;
};

/**
 * Sort market trends by different criteria
 */
export const sortMarketTrends = (
  trends: MarketTrend[], 
  sortBy: 'opportunity' | 'salary' | 'growth' | 'demand' | 'time',
  locationMultipliers: Record<string, number> = {}
): MarketTrend[] => {
  return [...trends].sort((a, b) => {
    switch (sortBy) {
      case 'opportunity':
        const scoreA = calculateOpportunityScore(a, locationMultipliers[a.location] || 1);
        const scoreB = calculateOpportunityScore(b, locationMultipliers[b.location] || 1);
        return scoreB - scoreA;
      case 'salary':
        return b.average_salary - a.average_salary;
      case 'growth':
        return b.growth_rate - a.growth_rate;
      case 'demand':
        return b.demand_score - a.demand_score;
      case 'time':
        // Sort by demand score as proxy for time to role
        return b.demand_score - a.demand_score;
      default:
        return 0;
    }
  });
};