import { Node, Edge } from '@xyflow/react';
import { PlanningLens, BlockWithCourses } from '@/lib/types/eduTree';

/**
 * Path scoring for intelligent lens highlighting
 */
export interface ScoredPath {
  nodes: string[];
  edges: string[];
  score: number;
  lens: PlanningLens;
}

/**
 * Calculate fastest path (minimize completion time)
 */
function scoreFastest(block: BlockWithCourses): number {
  // Prefer blocks with fewer required courses and lower year
  const courseLoad = block.rule_type === 'ALL' ? block.courses.length : 
                    block.rule_type === 'K_OF_N' ? (block.k || 0) : 
                    Math.ceil((block.credits_needed || 0) / 3);
  
  return (5 - block.level_year) * 10 - courseLoad;
}

/**
 * Calculate cheapest path (minimize cost)
 */
function scoreCheapest(block: BlockWithCourses): number {
  // Prefer blocks with alternative credit options
  const altCreditBonus = block.courses.some(c => c.area === 'general_education') ? 20 : 0;
  const courseLoad = block.courses.length;
  
  return altCreditBonus - courseLoad * 2;
}

/**
 * Calculate ROI path (optimize value per dollar)
 */
function scoreROI(block: BlockWithCourses): number {
  // Prefer core and specialization courses that lead to higher-paying roles
  const strategicValue = block.area === 'specialization' ? 30 :
                        block.area === 'core' ? 20 :
                        block.area === 'software_engineering' ? 25 :
                        block.area === 'capstone' ? 15 : 5;
  
  return strategicValue - block.level_year;
}

/**
 * Find multiple alternative paths for exploration
 */
function findAlternativePaths(
  nodes: Node[], 
  edges: Edge[], 
  lens: PlanningLens,
  maxPaths: number = 3
): ScoredPath[] {
  const blockNodes = nodes.filter(node => node.type === 'blockGroup');
  const paths: ScoredPath[] = [];
  
  // Score blocks based on lens
  const scoredBlocks = blockNodes.map(node => {
    const block = node.data.block as BlockWithCourses;
    let score = 0;
    
    switch (lens) {
      case 'fastest':
        score = scoreFastest(block);
        break;
      case 'cheapest':
        score = scoreCheapest(block);
        break;
      case 'roi':
        score = scoreROI(block);
        break;
    }
    
    return { nodeId: node.id, score, block };
  });

  // Find branching points (nodes with multiple outgoing edges)
  const branchingPoints = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!branchingPoints.has(edge.source)) {
      branchingPoints.set(edge.source, []);
    }
    branchingPoints.get(edge.source)!.push(edge.target);
  });

  // Generate different paths by exploring different branches
  const usedBranches = new Set<string>();
  
  for (let pathIndex = 0; pathIndex < maxPaths; pathIndex++) {
    const pathNodes: string[] = [];
    const pathEdges: string[] = [];
    const visited = new Set<string>();
    
    // Start from level 1 blocks, but vary starting preference by lens and path index
    let startingBlocks = scoredBlocks.filter(sb => sb.block.level_year === 1);
    
    // Apply different starting strategies for path diversity
    if (pathIndex === 1) {
      // Second path: prefer different specialization areas
      startingBlocks = startingBlocks.filter(sb => 
        !usedBranches.has(sb.block.area || 'unknown')
      );
    } else if (pathIndex === 2) {
      // Third path: prefer different difficulty levels
      startingBlocks.sort((a, b) => 
        Math.abs(a.block.courses.length - 3) - Math.abs(b.block.courses.length - 3)
      );
    }
    
    if (startingBlocks.length === 0) {
      startingBlocks = scoredBlocks.filter(sb => sb.block.level_year === 1);
    }
    
    startingBlocks.sort((a, b) => b.score - a.score);
    const queue = [startingBlocks[0]];
    
    while (queue.length > 0 && pathNodes.length < 6) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      
      pathNodes.push(current.nodeId);
      visited.add(current.nodeId);
      usedBranches.add(current.block.area || 'unknown');
      
      // Find next nodes with branch-aware selection
      const nextNodes: Array<{nodeId: string, score: number, block: BlockWithCourses}> = [];
      
      edges.forEach(edge => {
        if (edge.source === current.nodeId) {
          pathEdges.push(edge.id);
          const targetBlock = scoredBlocks.find(sb => sb.nodeId === edge.target);
          if (targetBlock && !visited.has(targetBlock.nodeId)) {
            nextNodes.push(targetBlock);
          }
        }
      });
      
      // For branch diversification, prefer different specialization tracks
      if (pathIndex > 0 && nextNodes.length > 1) {
        const unusedTracks = nextNodes.filter(n => 
          !usedBranches.has(n.block.area || 'unknown')
        );
        if (unusedTracks.length > 0) {
          nextNodes.splice(0, nextNodes.length, ...unusedTracks);
        }
      }
      
      nextNodes.sort((a, b) => b.score - a.score);
      queue.push(...nextNodes.slice(0, 2)); // Add top 2 to explore branches
    }
    
    if (pathNodes.length > 0) {
      paths.push({
        nodes: pathNodes,
        edges: pathEdges,
        score: pathNodes.reduce((sum, nodeId) => {
          const block = scoredBlocks.find(sb => sb.nodeId === nodeId);
          return sum + (block?.score || 0);
        }, 0),
        lens
      });
    }
  }
  
  return paths;
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
  // Generate multiple alternative paths and return the best one
  const alternativePaths = findAlternativePaths(nodes, edges, lens, 3);
  
  if (alternativePaths.length === 0) {
    return { nodes: [], edges: [], score: 0, lens };
  }
  
  // Return the highest-scoring path
  alternativePaths.sort((a, b) => b.score - a.score);
  return alternativePaths[0];
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
    return { nodes: [], edges: [], score: 0, lens };
  }
  
  // Find the path that's most different from the primary path
  const primaryNodeSet = new Set(primaryPath.nodes);
  
  // Score paths by how different they are from primary path
  const diversePaths = alternativePaths.map(path => {
    const sharedNodes = path.nodes.filter(nodeId => primaryNodeSet.has(nodeId));
    const diversityScore = path.nodes.length - sharedNodes.length;
    
    return {
      ...path,
      diversityScore
    };
  });
  
  // Sort by diversity score first, then by lens score
  diversePaths.sort((a, b) => {
    if (a.diversityScore !== b.diversityScore) {
      return b.diversityScore - a.diversityScore;
    }
    return b.score - a.score;
  });
  
  // Return the most diverse path, or the second-best if all paths are too similar
  const bestDiverse = diversePaths[0];
  if (bestDiverse.diversityScore > 0) {
    return bestDiverse;
  }
  
  // Fallback: return second-best alternative path
  return diversePaths.length > 1 ? diversePaths[1] : diversePaths[0];
}