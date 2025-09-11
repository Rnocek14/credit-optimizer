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

function scoreByLens(block: BlockWithCourses, lens: PlanningLens): number {
  if (lens === 'fastest') {
    return scoreFastest(block);
  } else if (lens === 'cheapest') {
    return scoreCheapest(block);
  } else {
    return scoreROI(block);
  }
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

  // Build lookup from block.id to React Flow node ID
  const blockIdToNodeId = new Map<string, string>();
  nodes.forEach(n => {
    const b = n.data?.block;
    if (b && typeof b === 'object' && 'id' in b && b.id) {
      blockIdToNodeId.set(String(b.id), String(n.id));
    }
  });

  // Extract blocks from nodes with proper typing
  const allBlocks: BlockWithCourses[] = [];
  for (const node of nodes) {
    if (node.data?.block && 
        typeof node.data.block === 'object' && 
        'id' in node.data.block &&
        node.data.block.id !== 'degree-completion') {
      allBlocks.push(node.data.block as BlockWithCourses);
    }
  }
  
  if (allBlocks.length === 0) return [];

  const paths: ScoredPath[] = [];
  
  // Generate multiple paths for each lens with different selection criteria
  for (let strategyIndex = 0; strategyIndex < 3; strategyIndex++) {
    let selectedBlocks: BlockWithCourses[] = [];
    
    if (lens === 'fastest') {
      // Fastest: core + web/frontend + terminal, prefer lower years but include Year 3
      selectedBlocks = allBlocks
        .filter(block => {
          const isCore = block.area === 'core';
          const isWeb = block.title?.toLowerCase().includes('web') || 
                       block.title?.toLowerCase().includes('frontend');
          const isTerminal = block.area === 'terminal';
          const isSpecialization = block.area === 'specialization';
          return isCore || isWeb || isTerminal || isSpecialization;
        })
        .sort((a, b) => {
          // Sort by level year but ensure we get progression
          const aYear = a.level_year || 0;
          const bYear = b.level_year || 0;
          return aYear - bYear;
        });
      
      // Ensure we have enough blocks for a valid path
      if (selectedBlocks.length < 4) {
        selectedBlocks = allBlocks
          .filter(block => block.area !== 'degree-completion')
          .sort((a, b) => (a.level_year || 0) - (b.level_year || 0));
      }
    } else if (lens === 'cheapest') {
      // Cheapest: gen ed + data + core + terminal, prefer alternative credit
      selectedBlocks = allBlocks
        .filter(block => {
          const isGenEd = block.area === 'general-education';
          const isData = block.title?.toLowerCase().includes('data') || 
                        block.title?.toLowerCase().includes('analytics');
          const isCore = block.area === 'core';
          const isTerminal = block.area === 'terminal';
          const isSpecialization = block.area === 'specialization';
          return isGenEd || isData || isCore || isTerminal || isSpecialization;
        })
        .sort((a, b) => (a.level_year || 0) - (b.level_year || 0));
      
      // Fallback to broader selection if needed
      if (selectedBlocks.length < 4) {
        selectedBlocks = allBlocks
          .filter(block => block.area !== 'degree-completion')
          .sort((a, b) => (a.level_year || 0) - (b.level_year || 0));
      }
    } else if (lens === 'roi') {
      // ROI: mathematics + core + specialization + terminal, strategic value focus
      selectedBlocks = allBlocks
        .filter(block => {
          const isMath = block.area === 'mathematics';
          const isCore = block.area === 'core';
          const isSpecialization = block.area === 'specialization';
          const isTerminal = block.area === 'terminal';
          const isSystems = block.title?.toLowerCase().includes('systems') ||
                           block.title?.toLowerCase().includes('devops');
          return isMath || isCore || isSpecialization || isTerminal || isSystems;
        })
        .sort((a, b) => (a.level_year || 0) - (b.level_year || 0));
      
      // Fallback to broader selection if needed
      if (selectedBlocks.length < 4) {
        selectedBlocks = allBlocks
          .filter(block => block.area !== 'degree-completion')
          .sort((a, b) => (a.level_year || 0) - (b.level_year || 0));
      }
    }

    // Only create path if we have sufficient blocks
    if (selectedBlocks.length >= 4) {
      // Map block IDs to React Flow node IDs
      const pathNodes: string[] = [];
      selectedBlocks.forEach(block => {
        const rfId = blockIdToNodeId.get(String(block.id));
        if (rfId) pathNodes.push(rfId);
      });

      // Filter edges using React Flow node IDs  
      const rfNodeSet = new Set(pathNodes);
      const pathEdges = edges
        .filter(edge => rfNodeSet.has(String(edge.source)) && rfNodeSet.has(String(edge.target)))
        .map(edge => String(edge.id));
      
      // Only accept if there is at least one Year 3 node OR ≥3 edges:
      const hasY3 = selectedBlocks.some(b => (b.level_year ?? 0) >= 3);
      if (hasY3 || pathEdges.length >= 3) {
        const score = selectedBlocks.reduce((total, block) => {
          return total + scoreByLens(block, lens);
        }, 0) / selectedBlocks.length;
        
        paths.push({
          nodeIds: pathNodes,
          edgeIds: pathEdges,
          score,
          lens
        });

        // Dev logging for selected path IDs
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PathScoring] Selected ${lens} path (strategy ${strategyIndex}):`, {
            nodes: pathNodes.slice(0, 6),
            edges: pathEdges.slice(0, 6),
            score: score.toFixed(2),
            hasYear3: hasY3
          });
        }
      }
    }
  }

  // Filter to valid paths (4+ nodes for curriculum progression with Year 3)
  const validPaths = paths.filter(path => path.nodeIds.length >= 4);
  
  console.log(`[PathFinding] Generated ${validPaths.length} valid curriculum paths`);
  
  return validPaths
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPaths);
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
    console.log('[PathScoring] Selected path IDs (first 6):', {
      nodes: optimalPath.nodeIds.slice(0, 6),
      edges: optimalPath.edgeIds.slice(0, 6),
      lens,
      score: optimalPath.score.toFixed(2)
    });
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