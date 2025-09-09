import { BlockWithCourses, GateEdge } from '@/lib/types/eduTree';

/**
 * Topological sort for blocks within the same year
 * Orders blocks by prerequisite distance to fix Year-3 ordering drift
 */
export function sortBlocksWithinYear(blocks: BlockWithCourses[], edges: GateEdge[]): string[] {
  const graph = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  const ids = blocks.map(b => String(b.id));
  
  // Initialize graph
  ids.forEach(id => { 
    graph.set(id, []); 
    indeg.set(id, 0); 
  });

  // Build prerequisite graph - map source_gate_id to block_id through BlockGate
  edges.forEach(e => {
    const sourceBlock = blocks.find(b => b.gate?.id === e.source_gate_id);
    const s = sourceBlock ? String(sourceBlock.id) : null;
    const t = String(e.target_block_id);
    
    if (s && ids.includes(s) && ids.includes(t) && s !== t) {
      graph.get(s)!.push(t);
      indeg.set(t, (indeg.get(t) || 0) + 1);
    }
  });

  // Kahn's algorithm for topological sort
  const q: string[] = ids.filter(id => (indeg.get(id) || 0) === 0).sort();
  const out: string[] = [];
  
  while (q.length) {
    const u = q.shift()!;
    out.push(u);
    graph.get(u)!.forEach(v => {
      indeg.set(v, (indeg.get(v) || 0) - 1);
      if ((indeg.get(v) || 0) === 0) q.push(v);
    });
  }
  
  // Handle cycles - fallback to original order for any remaining
  const leftover = ids.filter(id => !out.includes(id));
  return out.concat(leftover);
}

/**
 * Calculate prerequisite depth for cross-year anchoring
 */
function calculatePrereqDepth(blockId: string, blocks: BlockWithCourses[], edges: GateEdge[], visited = new Set<string>()): number {
  if (visited.has(blockId)) return 0;
  visited.add(blockId);
  
  const incomingEdges = edges.filter(e => e.target_block_id === blockId);
  if (incomingEdges.length === 0) return 0;
  
  let maxDepth = 0;
  for (const edge of incomingEdges) {
    const sourceBlock = blocks.find(b => b.gate?.id === edge.source_gate_id);
    if (sourceBlock) {
      const depth = calculatePrereqDepth(String(sourceBlock.id), blocks, edges, new Set(visited));
      maxDepth = Math.max(maxDepth, depth + 1);
    }
  }
  
  return maxDepth;
}

/**
 * Sort blocks by year, then by topological prerequisites with cross-year anchoring
 * Enhanced to fix Year-3 ordering drift by considering prerequisite depth
 */
export function sortBlocksForLayout(blocks: BlockWithCourses[], edges: GateEdge[]): BlockWithCourses[] {
  // Area ordering priority - Foundation/Core above Specialization; Capstone last
  const areaOrder = [
    'foundation',
    'mathematics', 
    'general_education',
    'core',
    'specialization',
    'software_engineering',
    'capstone'
  ];

  // Calculate prerequisite depths for all blocks
  const prereqDepths = new Map<string, number>();
  blocks.forEach(block => {
    prereqDepths.set(String(block.id), calculatePrereqDepth(String(block.id), blocks, edges));
  });

  // Group by level_year
  const blocksByYear = new Map<number, BlockWithCourses[]>();
  blocks.forEach(block => {
    const year = block.level_year || 1;
    if (!blocksByYear.has(year)) {
      blocksByYear.set(year, []);
    }
    blocksByYear.get(year)!.push(block);
  });

  // Sort each year group with enhanced cross-year awareness
  const sortedBlocks: BlockWithCourses[] = [];
  
  Array.from(blocksByYear.keys()).sort().forEach(year => {
    const yearBlocks = blocksByYear.get(year)!;
    
    // Apply topological sort within year
    const sortedIds = sortBlocksWithinYear(yearBlocks, edges);
    
    // Convert back to blocks and apply enhanced sorting
    const blockMap = new Map(yearBlocks.map(b => [String(b.id), b]));
    const yearSorted = sortedIds
      .map(id => blockMap.get(id)!)
      .filter(Boolean)
      .sort((a, b) => {
        // Primary sort by prerequisite depth (deeper chains first for Year 3+)
        if (year >= 3) {
          const aDepth = prereqDepths.get(String(a.id)) || 0;
          const bDepth = prereqDepths.get(String(b.id)) || 0;
          if (aDepth !== bDepth) return bDepth - aDepth; // Deeper first
        }
        
        // Secondary sort by area (Foundation/Core above Specialization)
        const aIndex = areaOrder.indexOf(a.area || '');
        const bIndex = areaOrder.indexOf(b.area || '');
        if (aIndex !== bIndex) return aIndex - bIndex;
        
        // Tertiary sort by title
        return (a.title || '').localeCompare(b.title || '');
      });
    
    sortedBlocks.push(...yearSorted);
  });

  return sortedBlocks;
}