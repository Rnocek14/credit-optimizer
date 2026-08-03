import { PathResult, PathfindingResult } from '@/types/lifePathGraph';

export interface ParetoMetrics {
  time: number;
  cost: number;
  credits: number;
  roi: number;
  difficulty: number;
}

export interface ParetoPoint extends PathResult {
  metrics: ParetoMetrics;
  isDominated: boolean;
  dominates: string[]; // IDs of paths this one dominates
}

/**
 * Calculate Pareto Frontier for multi-objective optimization
 * Returns non-dominated solutions across time, cost, credits, and ROI
 */
export function calcParetoFrontier(
  paths: PathResult[],
  objectives: ('time' | 'cost' | 'credits' | 'roi' | 'difficulty')[] = ['time', 'cost', 'credits', 'roi']
): ParetoPoint[] {
  if (paths.length === 0) return [];

  // Convert paths to Pareto points with normalized metrics
  const paretoPoints: ParetoPoint[] = paths.map(path => ({
    ...path,
    metrics: {
      time: path.totalTime,
      cost: path.totalCost,
      credits: path.totalCredits,
      roi: path.roiScore,
      difficulty: path.difficultyScore
    },
    isDominated: false,
    dominates: []
  }));

  // Determine domination relationships
  for (let i = 0; i < paretoPoints.length; i++) {
    for (let j = 0; j < paretoPoints.length; j++) {
      if (i === j) continue;

      const pointA = paretoPoints[i];
      const pointB = paretoPoints[j];

      if (dominates(pointA, pointB, objectives)) {
        pointA.dominates.push(pointB.id);
        pointB.isDominated = true;
      }
    }
  }

  // Return only non-dominated points (the Pareto frontier)
  return paretoPoints.filter(point => !point.isDominated);
}

/**
 * Check if point A dominates point B
 * A dominates B if A is at least as good in all objectives and strictly better in at least one
 */
function dominates(
  pointA: ParetoPoint, 
  pointB: ParetoPoint, 
  objectives: ('time' | 'cost' | 'credits' | 'roi' | 'difficulty')[]
): boolean {
  let strictlyBetter = false;
  
  for (const objective of objectives) {
    const valueA = pointA.metrics[objective];
    const valueB = pointB.metrics[objective];
    
    // Define which objectives should be minimized vs maximized
    const shouldMinimize = ['time', 'cost', 'difficulty'].includes(objective);
    const shouldMaximize = ['credits', 'roi'].includes(objective);
    
    if (shouldMinimize) {
      if (valueA > valueB) return false; // A is worse
      if (valueA < valueB) strictlyBetter = true; // A is better
    } else if (shouldMaximize) {
      if (valueA < valueB) return false; // A is worse
      if (valueA > valueB) strictlyBetter = true; // A is better
    }
  }
  
  return strictlyBetter;
}

/**
 * Generate trade-off analysis for frontier points
 */
export function analyzeTradoffs(frontier: ParetoPoint[]): {
  timeVsCost: { correlation: number; efficient: ParetoPoint[] };
  costVsCredits: { correlation: number; efficient: ParetoPoint[] };
  roiVsDifficulty: { correlation: number; efficient: ParetoPoint[] };
} {
  const correlations = {
    timeVsCost: calculateCorrelation(frontier, 'time', 'cost'),
    costVsCredits: calculateCorrelation(frontier, 'cost', 'credits'),
    roiVsDifficulty: calculateCorrelation(frontier, 'roi', 'difficulty')
  };

  return {
    timeVsCost: {
      correlation: correlations.timeVsCost,
      efficient: frontier.filter(p => p.metrics.time <= median(frontier, 'time') || p.metrics.cost <= median(frontier, 'cost'))
    },
    costVsCredits: {
      correlation: correlations.costVsCredits,
      efficient: frontier.filter(p => p.metrics.cost <= median(frontier, 'cost') || p.metrics.credits >= median(frontier, 'credits'))
    },
    roiVsDifficulty: {
      correlation: correlations.roiVsDifficulty,
      efficient: frontier.filter(p => p.metrics.roi >= median(frontier, 'roi') || p.metrics.difficulty <= median(frontier, 'difficulty'))
    }
  };
}

function calculateCorrelation(
  points: ParetoPoint[], 
  metric1: keyof ParetoMetrics, 
  metric2: keyof ParetoMetrics
): number {
  const n = points.length;
  if (n < 2) return 0;

  const values1 = points.map(p => p.metrics[metric1]);
  const values2 = points.map(p => p.metrics[metric2]);

  const mean1 = values1.reduce((a, b) => a + b) / n;
  const mean2 = values2.reduce((a, b) => a + b) / n;

  const numerator = values1.reduce((sum, val1, i) => 
    sum + (val1 - mean1) * (values2[i] - mean2), 0
  );

  const denominator = Math.sqrt(
    values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) *
    values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

function median(points: ParetoPoint[], metric: keyof ParetoMetrics): number {
  const values = points.map(p => p.metrics[metric]).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}

/**
 * Update PathfindingResult with calculated Pareto frontier
 */
export function enhanceWithParetoFrontier(result: PathfindingResult): PathfindingResult {
  const allPaths = [result.fastest, result.cheapest, result.creditMaximized];
  const frontier = calcParetoFrontier(allPaths);
  const tradeoffs = analyzeTradoffs(frontier);

  return {
    ...result,
    paretoFrontier: frontier,
    tradeoffs: {
      timeVsCost: { 
        correlation: tradeoffs.timeVsCost.correlation, 
        alternatives: tradeoffs.timeVsCost.efficient 
      },
      costVsCredits: { 
        correlation: tradeoffs.costVsCredits.correlation, 
        alternatives: tradeoffs.costVsCredits.efficient 
      }
    }
  };
}