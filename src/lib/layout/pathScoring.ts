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
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PathScoring] Finding ${maxPaths} alternative paths for ${lens} lens with ${blockNodes.length} blocks`);
  }
  
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

  // Enhanced scoring with track differentiation
  const trackPreferences = new Map<string, number>();
  
  // Find branching points (nodes with multiple outgoing edges)
  const branchingPoints = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!branchingPoints.has(edge.source)) {
      branchingPoints.set(edge.source, []);
    }
    branchingPoints.get(edge.source)!.push(edge.target);
  });

  // Generate different paths by exploring different strategy combinations
  for (let pathIndex = 0; pathIndex < maxPaths; pathIndex++) {
    const pathNodes: string[] = [];
    const pathEdges: string[] = [];
    const visited = new Set<string>();
    const usedTracks = new Set<string>();
    
    // Enhanced strategy selection based on lens and path index
    const strategy = getPathStrategy(lens, pathIndex);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PathScoring] Path ${pathIndex} using strategy: ${strategy}`);
    }
    
    // Start from level 1 blocks with strategy-based filtering
    let startingBlocks = scoredBlocks.filter(sb => sb.block.level_year === 1);
    
    // Apply strategy-specific starting preferences
    startingBlocks = applyStrategyFilter(startingBlocks, strategy, pathIndex);
    
    if (startingBlocks.length === 0) {
      startingBlocks = scoredBlocks.filter(sb => sb.block.level_year === 1);
    }
    
    startingBlocks.sort((a, b) => b.score - a.score);
    const queue = [startingBlocks[0]];
    
    while (queue.length > 0 && pathNodes.length < 8) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      
      pathNodes.push(current.nodeId);
      visited.add(current.nodeId);
      usedTracks.add(current.block.area || 'unknown');
      
      // Find next nodes with enhanced branching logic
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
      
      // Apply strategy-specific node selection
      const selectedNodes = applyStrategySelection(nextNodes, strategy, usedTracks, pathIndex);
      
      // Add track diversification for different paths
      if (pathIndex > 0 && selectedNodes.length > 1) {
        const trackDiverse = selectedNodes.filter(n => 
          !usedTracks.has(n.block.area || 'unknown') || 
          n.block.title.includes('Track:') // Prioritize explicit track nodes
        );
        if (trackDiverse.length > 0) {
          selectedNodes.splice(0, selectedNodes.length, ...trackDiverse);
        }
      }
      
      selectedNodes.sort((a, b) => b.score - a.score);
      queue.push(...selectedNodes.slice(0, Math.min(3, selectedNodes.length)));
    }
    
    if (pathNodes.length > 0) {
      const totalScore = pathNodes.reduce((sum, nodeId) => {
        const block = scoredBlocks.find(sb => sb.nodeId === nodeId);
        return sum + (block?.score || 0);
      }, 0);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PathScoring] Path ${pathIndex}: ${pathNodes.length} nodes, score: ${totalScore.toFixed(2)}`);
      }
      
      paths.push({
        nodes: pathNodes,
        edges: pathEdges,
        score: totalScore,
        lens
      });
    }
  }
  
  return paths;
}

function getPathStrategy(lens: PlanningLens, pathIndex: number): string {
  const strategies = {
    fastest: ['shortest-route', 'parallel-courses', 'prereq-minimal', 'foundation-heavy', 'credit-transfer'],
    cheapest: ['credit-transfer', 'alternative-providers', 'bulk-courses', 'foundation-focus', 'certification-track'],
    roi: ['high-impact', 'specialization-focus', 'career-critical', 'skill-building', 'industry-relevant']
  };
  
  const lensStrategies = strategies[lens];
  return lensStrategies[pathIndex % lensStrategies.length];
}

function applyStrategyFilter(blocks: any[], strategy: string, pathIndex: number): any[] {
  switch (strategy) {
    case 'shortest-route':
      return blocks.filter(b => b.block.area === 'foundation');
    case 'parallel-courses':
      return blocks.filter(b => b.block.rule_type === 'K_OF_N');
    case 'credit-transfer':
      return blocks.filter(b => b.block.area === 'general_education');
    case 'high-impact':
      return blocks.filter(b => b.block.area === 'core' || b.block.area === 'foundation');
    case 'specialization-focus':
      return blocks; // Start broad for specialization paths
    default:
      return blocks;
  }
}

function applyStrategySelection(nodes: any[], strategy: string, usedTracks: Set<string>, pathIndex: number): any[] {
  if (nodes.length <= 1) return nodes;
  
  switch (strategy) {
    case 'shortest-route':
      return [nodes[0]]; // Always take best score
    case 'parallel-courses':
      return nodes.filter(n => n.block.rule_type === 'K_OF_N').slice(0, 2);
    case 'foundation-heavy':
      return nodes.filter(n => n.block.area === 'foundation' || n.block.area === 'mathematics');
    case 'credit-transfer':
      return nodes.filter(n => n.block.area === 'general_education' || n.block.area === 'foundation');
    case 'specialization-focus':
      return nodes.filter(n => n.block.area === 'specialization' || n.block.title.includes('Track:'));
    case 'career-critical':
      return nodes.filter(n => n.block.area === 'core' || n.block.area === 'software_engineering');
    case 'certification-track':
      return nodes.filter(n => n.block.courses?.some(c => c.code.includes('CERT')));
    default:
      return nodes.slice(0, 2); // Take top 2 for variety
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
      console.log(`  Path ${i}: ${path.nodes.length} nodes, score: ${path.score.toFixed(2)}`);
    });
  }
  
  if (alternativePaths.length === 0) {
    return { nodes: [], edges: [], score: 0, lens };
  }
  
  // Return the highest-scoring path
  alternativePaths.sort((a, b) => b.score - a.score);
  const optimalPath = alternativePaths[0];
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PathScoring] Selected optimal path: ${optimalPath.nodes.length} nodes`);
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