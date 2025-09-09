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
 * Find optimal path for given lens
 */
export function findOptimalPath(
  nodes: Node[], 
  edges: Edge[], 
  lens: PlanningLens,
  completedCourseIds: Set<string>
): ScoredPath {
  const blockNodes = nodes.filter(node => node.type === 'blockGroup');
  
  // Score each block based on lens
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

  // Sort by score and select top path
  scoredBlocks.sort((a, b) => b.score - a.score);
  
  // Create critical path through highest-scoring accessible blocks
  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  
  // Build path following prerequisites and include graduation terminal
  const visited = new Set<string>();
  const queue = scoredBlocks.filter(sb => sb.block.level_year === 1);
  
  while (queue.length > 0 && pathNodes.length < 8) {
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) continue;
    
    pathNodes.push(current.nodeId);
    visited.add(current.nodeId);
    
    // Find edges from this node and add connected nodes to queue
    edges.forEach(edge => {
      if (edge.source === current.nodeId) {
        pathEdges.push(edge.id);
        const targetBlock = scoredBlocks.find(sb => sb.nodeId === edge.target);
        if (targetBlock && !visited.has(targetBlock.nodeId)) {
          queue.push(targetBlock);
        }
      }
    });
    
    // Sort queue by score to maintain optimal path
    queue.sort((a, b) => b.score - a.score);
  }
  
  // Always include graduation terminal in highlighted path
  pathNodes.push('graduation-terminal');

  return {
    nodes: pathNodes,
    edges: pathEdges,
    score: scoredBlocks.slice(0, pathNodes.length).reduce((sum, sb) => sum + sb.score, 0),
    lens
  };
}