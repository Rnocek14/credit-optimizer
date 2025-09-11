import { Node, Edge } from '@xyflow/react';
import { BlockWithCourses } from '@/lib/types/eduTree';

export interface ScoredPath {
  nodeIds: string[];
  edgeIds: string[];
  score: number;
  lens: PlanningLens;
}

export type PlanningLens = 'fastest' | 'cheapest' | 'roi';

/**
 * Score blocks for fastest completion
 */
function scoreFastest(block: BlockWithCourses): number {
  const baseCourseCount = block.courses?.length || 0;
  const levelPenalty = (Number(block.level_year) || 0) * 0.5;
  
  // Prefer fewer courses and lower year levels
  return Math.max(0, 10 - baseCourseCount - levelPenalty);
}

/**
 * Score blocks for cheapest option  
 */
function scoreCheapest(block: BlockWithCourses): number {
  const baseCourseCount = block.courses?.length || 0;
  const hasAltCredit = block.courses?.some(c => c.area === 'general_education') || false;
  
  // Prefer alternative credit and lower course load
  return Math.max(0, 8 - baseCourseCount + (hasAltCredit ? 3 : 0));
}

/**
 * Score blocks for best ROI
 */
function scoreROI(block: BlockWithCourses): number {
  const strategicValue = block.area === 'core' ? 5 : 
                        block.area === 'specialization' ? 4 : 
                        block.area === 'foundation' ? 3 : 2;
  const levelBonus = Math.max(0, 5 - (Number(block.level_year) || 0));
  
  return strategicValue + levelBonus;
}

/**
 * Generate alternative paths for different planning strategies
 */
export function findAlternativePaths(
  nodes: Node[], 
  edges: Edge[], 
  lens: PlanningLens,
  maxPaths: number = 3
): ScoredPath[] {
  if (nodes.length === 0) return [];

  console.log(`[PathFinding] Starting alternative path generation with ${lens} lens`);

  // Group nodes by year level for curriculum progression
  const nodesByYear = new Map<number, Node[]>();
  nodes.forEach(node => {
    const year = Number(node.data?.level_year) || 0;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });

  // Define complete curriculum strategies based on lens
  const paths: ScoredPath[] = [];
  
  if (lens === 'fastest') {
    // Strategy 1: Foundation → Core → Web Development track
    paths.push(buildCurriculumPath(nodes, edges, 'web-dev', lens));
    // Strategy 2: Foundation → Core → Accelerated track
    paths.push(buildCurriculumPath(nodes, edges, 'accelerated', lens));
  } else if (lens === 'cheapest') {
    // Strategy 1: General Education → Core → Data Science
    paths.push(buildCurriculumPath(nodes, edges, 'data-science', lens));
    // Strategy 2: Transfer-heavy path
    paths.push(buildCurriculumPath(nodes, edges, 'transfer-heavy', lens));
  } else if (lens === 'roi') {
    // Strategy 1: Mathematics → Core → DevOps
    paths.push(buildCurriculumPath(nodes, edges, 'devops', lens));
    // Strategy 2: Strategic high-value path
    paths.push(buildCurriculumPath(nodes, edges, 'high-value', lens));
  }

  // Filter to valid paths (8+ nodes for complete curriculum)
  const validPaths = paths.filter(path => path.nodeIds.length >= 8);
  
  console.log(`[PathFinding] Generated ${validPaths.length} valid curriculum paths`);
  
  return validPaths
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPaths);
}

function buildCurriculumPath(
  nodes: Node[],
  edges: Edge[],
  strategy: string,
  lens: PlanningLens
): ScoredPath {
  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  let totalScore = 0;

  // Define curriculum progression by strategy
  const progression = getCurriculumProgression(strategy);
  
  for (const yearData of progression) {
    const yearNodes = nodes.filter(n => 
      (Number(n.data?.level_year) || 0) === yearData.year && 
      (yearData.areas.length === 0 || yearData.areas.includes(String(n.data?.area) || ''))
    );
    
    // Select best node for this year based on lens scoring
    const bestNode = yearNodes
      .filter(n => n.data?.block)
      .sort((a, b) => {
        const scoreA = scoreByLens(a.data.block, lens);
        const scoreB = scoreByLens(b.data.block, lens);
        return scoreB - scoreA;
      })[0];
      
    if (bestNode) {
      pathNodes.push(bestNode.id);
      totalScore += scoreByLens(bestNode.data.block, lens);
      
      // Find connecting edge from previous node
      if (pathNodes.length > 1) {
        const prevNodeId = pathNodes[pathNodes.length - 2];
        const connectingEdge = edges.find(e => 
          e.source === prevNodeId && e.target === bestNode.id
        );
        if (connectingEdge) {
          pathEdges.push(connectingEdge.id);
        }
      }
    }
  }

  console.log(`[PathFinding] Built ${strategy} path: ${pathNodes.length} nodes`);

  return {
    nodeIds: pathNodes,
    edgeIds: pathEdges,
    score: totalScore / Math.max(pathNodes.length, 1),
    lens
  };
}

function getCurriculumProgression(strategy: string) {
  const progressions: Record<string, Array<{ year: number; areas: string[] }>> = {
    'web-dev': [
      { year: 1, areas: ['foundation', 'general'] },
      { year: 2, areas: ['core', 'mathematics'] },
      { year: 3, areas: ['web', 'frontend'] },
      { year: 4, areas: ['web', 'capstone'] },
      { year: 5, areas: ['degree'] }
    ],
    'data-science': [
      { year: 1, areas: ['foundation', 'general'] },
      { year: 2, areas: ['mathematics', 'statistics'] },
      { year: 3, areas: ['data', 'analytics'] },
      { year: 4, areas: ['data', 'capstone'] },
      { year: 5, areas: ['degree'] }
    ],
    'devops': [
      { year: 1, areas: ['foundation', 'general'] },
      { year: 2, areas: ['core', 'systems'] },
      { year: 3, areas: ['devops', 'infrastructure'] },
      { year: 4, areas: ['devops', 'capstone'] },
      { year: 5, areas: ['degree'] }
    ],
    'accelerated': [
      { year: 1, areas: ['foundation'] },
      { year: 2, areas: ['core'] },
      { year: 3, areas: ['web', 'data'] },
      { year: 4, areas: ['capstone'] },
      { year: 5, areas: ['degree'] }
    ],
    'transfer-heavy': [
      { year: 1, areas: ['general'] },
      { year: 2, areas: ['core'] },
      { year: 3, areas: ['data'] },
      { year: 4, areas: ['capstone'] },
      { year: 5, areas: ['degree'] }
    ],
    'high-value': [
      { year: 1, areas: ['mathematics'] },
      { year: 2, areas: ['core'] },
      { year: 3, areas: ['devops'] },
      { year: 4, areas: ['capstone'] },
      { year: 5, areas: ['degree'] }
    ]
  };
  
  return progressions[strategy] || progressions['web-dev'];
}

function scoreByLens(block: any, lens: PlanningLens): number {
  if (lens === 'fastest') {
    return scoreFastest(block);
  } else if (lens === 'cheapest') {
    return scoreCheapest(block);
  } else {
    return scoreROI(block);
  }
}

/**
 * Find optimal path for given lens with enhanced branching
 */
export function findOptimalPath(
  nodes: Node[], 
  edges: Edge[], 
  lens: PlanningLens,
  completedCourseIds: Set<string>,
  constraints?: { maxCost?: number; maxMonths?: number; providerIds?: string[] }
): ScoredPath {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PathScoring] Finding optimal path for lens: ${lens}`);
  }
  
  // Generate multiple alternative paths and return the best one
  const alternativePaths = findAlternativePaths(nodes, edges, lens, 5);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PathScoring] Generated ${alternativePaths.length} alternative paths`);
    alternativePaths.forEach((path, i) => {
      console.log(`  Path ${i}: ${path.nodeIds.length} nodes, score: ${path.score.toFixed(2)}`);
    });
  }
  
  if (alternativePaths.length === 0) {
    return { nodeIds: [], edgeIds: [], score: 0, lens };
  }
  
  // Return the highest-scoring path
  alternativePaths.sort((a, b) => b.score - a.score);
  const optimalPath = alternativePaths[0];
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PathScoring] Selected optimal path: ${optimalPath.nodeIds.length} nodes`);
  }
  
  return optimalPath;
}

/**
 * Find comparison path that's different from the primary path
 */
export function findComparisonPath(
  nodes: Node[], 
  edges: Edge[], 
  lens: PlanningLens,
  primaryPath: ScoredPath,
  completedCourseIds: Set<string>,
  constraints?: { maxCost?: number; maxMonths?: number; providerIds?: string[] }
): ScoredPath {
  // Generate multiple alternative paths
  const alternativePaths = findAlternativePaths(nodes, edges, lens, 5);
  
  if (alternativePaths.length === 0) {
    return { nodeIds: [], edgeIds: [], score: 0, lens };
  }
  
  // Find the path that's most different from the primary path
  const primaryNodeSet = new Set(primaryPath.nodeIds);
  
  // Score paths by how different they are from primary path
  const diversePaths = alternativePaths.map(path => {
    const sharedNodes = path.nodeIds.filter(nodeId => primaryNodeSet.has(nodeId));
    const diversityScore = path.nodeIds.length - sharedNodes.length;
    
    return {
      ...path,
      diversityScore,
      combinedScore: path.score * 0.7 + diversityScore * 0.3
    };
  });
  
  // Sort by combined score (quality + diversity)
  diversePaths.sort((a, b) => b.combinedScore - a.combinedScore);
  
  // Return the most diverse viable path
  const bestDiverse = diversePaths[0];
  if (bestDiverse.diversityScore > 0) {
    return bestDiverse;
  }
  
  // Fallback: return second-best alternative path
  return diversePaths.length > 1 ? diversePaths[1] : diversePaths[0];
}