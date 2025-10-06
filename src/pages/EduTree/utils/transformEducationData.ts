import { Node, Edge } from '@xyflow/react';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge,
  BlockWithCourses,
  isBlockComplete 
} from '@/lib/types/eduTree';
import { normalizeEdges } from './edgeNormalization';

export interface TransformInput {
  blocks: RequirementBlock[];
  courses: EduCourse[];
  blockMembers: BlockMember[];
  gates: BlockGate[];
  gateEdges: GateEdge[];
}

export interface TransformResult {
  nodes: Node[];
  edges: Edge[];
  blocksWithCourses: BlockWithCourses[];
}

export function transformEducationData(
  input: TransformInput,
  completedCourseIds: Set<string> = new Set(),
  flags: any = {},
  sortBlocksForLayout?: Function
): TransformResult {
  // Defensive input validation
  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const courses = Array.isArray(input.courses) ? input.courses : [];
  const blockMembers = Array.isArray(input.blockMembers) ? input.blockMembers : [];
  const gates = Array.isArray(input.gates) ? input.gates : [];
  const gateEdges = Array.isArray(input.gateEdges) ? input.gateEdges : [];

  console.log('[EduTree][Transform][Raw]', {
    blocks: blocks.length,
    courses: courses.length,
    blockMembers: blockMembers.length,
    gates: gates.length,
    gateEdges: gateEdges.length,
    sampleBlock: blocks?.[0],
    sampleGateEdge: gateEdges?.[0],
  });

  // Build safe maps
  const blockById = new Map(blocks.map(b => [String(b.id), b]));
  const gateById = new Map(gates.map(g => [String(g.id), g]));

  // Group courses by block (defensive)
  const coursesByBlock = new Map<string, EduCourse[]>();
  blockMembers.forEach(member => {
    if (!member?.block_id || !member?.course_id) return;
    
    const course = courses.find(c => c?.id === member.course_id);
    if (course) {
      const blockId = String(member.block_id);
      if (!coursesByBlock.has(blockId)) {
        coursesByBlock.set(blockId, []);
      }
      coursesByBlock.get(blockId)!.push(course);
    }
  });

  // Create blocks with courses
  const blocksWithCourses: BlockWithCourses[] = blocks.map(block => ({
    ...block,
    courses: coursesByBlock.get(String(block.id)) || [],
    gate: gates.find(g => g?.block_id === block?.id)
  }));

  // Separate parent blocks from child blocks
  const parentBlocks = blocksWithCourses.filter(block => !block.parent_block_id);
  const childBlocks = blocksWithCourses.filter(block => block.parent_block_id);
  
  // Group child blocks by parent
  const childBlocksByParent = new Map<string, BlockWithCourses[]>();
  childBlocks.forEach(child => {
    if (!child.parent_block_id) return;
    
    const parentId = String(child.parent_block_id);
    if (!childBlocksByParent.has(parentId)) {
      childBlocksByParent.set(parentId, []);
    }
    childBlocksByParent.get(parentId)!.push(child);
  });

  // Apply sorting if available
  const sortedBlocks = (flags?.eduTreeLayoutV2 && sortBlocksForLayout) ? 
    sortBlocksForLayout(parentBlocks, gateEdges) : 
    parentBlocks;

  // Calculate unlocked blocks (defensive)
  const unlockedBlocks = new Set<string>();
  
  // Find blocks with no prerequisites (starting blocks)
  const blocksWithPrereqs = new Set(
    gateEdges
      .filter(edge => edge?.target_block_id)
      .map(edge => String(edge.target_block_id))
  );
  
  sortedBlocks.forEach(block => {
    if (block?.id && !blocksWithPrereqs.has(String(block.id))) {
      unlockedBlocks.add(String(block.id));
    }
  });

  // Unlock blocks whose prerequisites are complete
  let changed = true;
  while (changed) {
    changed = false;
    gateEdges.forEach(edge => {
      if (!edge?.source_gate_id || !edge?.target_block_id) return;
      
      const targetId = String(edge.target_block_id);
      if (unlockedBlocks.has(targetId)) return;
      
      const sourceBlock = sortedBlocks.find(b => b?.gate?.id === edge.source_gate_id);
      if (sourceBlock && isBlockComplete(sourceBlock, sourceBlock.courses, completedCourseIds)) {
        unlockedBlocks.add(targetId);
        changed = true;
      }
    });
  }

  // Create nodes (defensive)
  const yearRowCounters = new Map<number, number>();
  const regularNodes: Node[] = sortedBlocks
    .map(block => {
      // Validate block data
      if (!block || !block.id) {
        console.warn('[EduTree] Invalid block data:', block);
        return null;
      }

      // Get sub-blocks for this parent block
      const subBlocks = childBlocksByParent.get(String(block.id)) || [];
      
      // Calculate progress including sub-blocks
      const allCourses = [...(block.courses || []), ...subBlocks.flatMap(sb => sb.courses || [])];
      const completedCount = allCourses.filter(c => c?.id && completedCourseIds.has(c.id)).length;
      
      const progress = {
        completed: completedCount,
        required: block.rule_type === 'ALL' ? allCourses.length :
                 block.rule_type === 'K_OF_N' ? (block.k || 0) :
                 Math.ceil((block.credits_needed || 0) / 3) // Estimate courses needed for credits
      };

      const levelYear = block.level_year || 0;
      const rowIndex = yearRowCounters.get(levelYear) || 0;
      yearRowCounters.set(levelYear, rowIndex + 1);

      return {
        id: String(block.id), // Ensure string ID
        type: 'blockGroup',
        position: {
          x: levelYear * 320,
          y: rowIndex * 200
        },
        data: {
          block,
          completedCourseIds,
          isUnlocked: unlockedBlocks.has(String(block.id)),
          progress,
          subBlocks,
          level_year: levelYear,
          area: block.area || 'unknown',
          isHighlighted: false,
          planningLens: null,
        },
        className: 'node'
      };
    })
    .filter(Boolean) as Node[];

  // Create edges without aggressive consolidation (defensive - drop any incomplete edge instead of throwing)
  const regularEdges: Edge[] = [];
  
  // Track edges by unique source-target pair to identify true duplicates only
  const edgeMap = new Map<string, {
    gateEdge: GateEdge;
    sourceBlockId: string;
    targetBlockId: string;
    sourceBlock: BlockWithCourses | undefined;
  }[]>();
  
  // First pass: collect and validate all edges, group only true duplicates
  for (const gateEdge of gateEdges) {
    if (!gateEdge?.source_gate_id || !gateEdge?.target_block_id) continue;
    
    const gate = gateById.get(String(gateEdge.source_gate_id));
    const sourceBlockId = gate?.block_id ? String(gate.block_id) : null;
    const targetBlockId = String(gateEdge.target_block_id);
    
    if (!sourceBlockId || !targetBlockId) {
      console.warn('[EduTree] Skipping incomplete edge:', { gateEdge, sourceBlockId, targetBlockId });
      continue;
    }

    const sourceBlock = blocksWithCourses.find(b => String(b.id) === sourceBlockId);
    
    // Create unique key for this specific source->target pair
    const edgeKey = `${sourceBlockId}->${targetBlockId}`;
    
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, []);
    }
    
    edgeMap.get(edgeKey)!.push({
      gateEdge,
      sourceBlockId,
      targetBlockId,
      sourceBlock
    });
  }

  // Second pass: create edges - preserve all unique paths, consolidate only true duplicates
  for (const [edgeKey, duplicates] of edgeMap) {
    const { sourceBlockId, targetBlockId, sourceBlock } = duplicates[0];
    
    if (duplicates.length > 1) {
      // True duplicates found - consolidate
      console.log(`[EduTree] Found ${duplicates.length} duplicate edges for ${edgeKey}, consolidating`);
    }
    
    // Create single edge for this unique source->target path
    regularEdges.push({
      id: `e-${sourceBlockId}-${targetBlockId}`,
      source: sourceBlockId,
      target: targetBlockId,
      sourceHandle: 'out',
      targetHandle: 'in',
      type: 'smoothstep',
      className: duplicates.length > 1 ? 'edge edge-consolidated' : 'edge',
      data: {
        isConsolidated: duplicates.length > 1,
        prerequisite: {
          blockId: sourceBlockId,
          title: sourceBlock?.title || 'Unknown',
          levelYear: sourceBlock?.level_year || 0
        },
        duplicateCount: duplicates.length
      }
    });
  }

  // Add degree completion node (defensive)
  const capstoneBlock = sortedBlocks.find(b => b?.title?.toLowerCase().includes('capstone'));
  const architectureBlock = sortedBlocks.find(b => b?.title?.toLowerCase().includes('architecture'));
  
  const isDegreeUnlocked = capstoneBlock && architectureBlock && 
    isBlockComplete(capstoneBlock, capstoneBlock.courses || [], completedCourseIds) &&
    isBlockComplete(architectureBlock, architectureBlock.courses || [], completedCourseIds);

  const totalCourses = courses.length;
  const completedCourses = Array.from(completedCourseIds).length;

  const degreeNode: Node = {
    id: 'degree-completion',
    type: 'terminalNode',
    position: { x: 5 * 320, y: 0 },
    data: {
      block: {
        id: 'degree-completion',
        title: 'B.S. Software Engineering',
        rule_type: 'ALL' as const,
        level_year: 5,
        area: 'degree',
        courses: [],
        gate: { id: 'degree-gate', block_id: 'degree-completion' }
      },
      isEligible: isDegreeUnlocked || false,
      degreeType: 'Bachelor of Science',
      credits: totalCourses * 3,
      completedCourseIds,
      isUnlocked: isDegreeUnlocked || false,
      progress: {
        completed: completedCourses,
        required: totalCourses
      },
      isDegreeNode: true,
      isDegreeComplete: completedCourses === totalCourses
    },
    className: 'node terminal-node'
  };

  // Add degree edges (defensive)
  const degreeEdges: Edge[] = [];
  if (capstoneBlock) {
    degreeEdges.push({
      id: 'capstone-to-degree',
      source: String(capstoneBlock.id),
      target: 'degree-completion',
      sourceHandle: 'out',
      targetHandle: 'in',
      type: 'smoothstep',
      className: 'edge degree-edge'
    });
  }
  if (architectureBlock) {
    degreeEdges.push({
      id: 'architecture-to-degree',
      source: String(architectureBlock.id),
      target: 'degree-completion',
      sourceHandle: 'out',
      targetHandle: 'in',
      type: 'smoothstep',
      className: 'edge degree-edge'
    });
  }

  const nodes: Node[] = [...regularNodes, degreeNode];
  const edges: Edge[] = [...regularEdges, ...degreeEdges];

  console.log('[EduTree][Transform][Result]', { 
    nodes: nodes.length, 
    edges: edges.length, 
    flowNodes: nodes.length,
    sampleEdgeId: edges[0]?.id,
    consolidatedEdges: edges.filter(e => e.data?.isConsolidated).length,
    totalPrerequisites: edges.reduce((sum, e) => {
      const prereqs = e.data?.prerequisites;
      return sum + (Array.isArray(prereqs) ? prereqs.length : 0);
    }, 0)
  });

  return { nodes, edges, blocksWithCourses };
}