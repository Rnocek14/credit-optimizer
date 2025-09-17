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
import { TRACK_MAP } from '@/pages/EduTree/data/trackDefinitions';
import { computeGraphQAMetrics } from '../qa/multipathQA';
import { resolveEduTreeQAModeFlag, resolveEduTreePhaseAFlag } from '@/lib/eduTreeFlags';
import { computeDeterministicGrid } from '../layout/deterministicGrid';

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
  sortBlocksForLayout?: Function,
  selectedTrackId?: string
): TransformResult {
  // Defensive input validation
  let blocks = Array.isArray(input.blocks) ? input.blocks : [];
  const courses = Array.isArray(input.courses) ? input.courses : [];
  const blockMembers = Array.isArray(input.blockMembers) ? input.blockMembers : [];
  const gates = Array.isArray(input.gates) ? input.gates : [];
  const gateEdges = Array.isArray(input.gateEdges) ? input.gateEdges : [];

  // PhaseA: Filter out hidden blocks when flag is enabled
  if (flags.eduTreePhaseA) {
    blocks = blocks.filter(block => !block.hidden);
  }

  // Filter blocks by selected track when not in overlay mode
  if (selectedTrackId && !flags.overlayEnabled) {
    const trackDef = TRACK_MAP.get(selectedTrackId);
    if (trackDef) {
      const allowedBlockSlugs = new Set(trackDef.blockIds);
      blocks = blocks.filter(block => {
        const slug = block.slug || block.id;
        return allowedBlockSlugs.has(slug);
      });
    }
  }

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
          // PhaseA enhancements
          phaseA: flags.eduTreePhaseA ? {
            isShared: !block.track_id,
            trackId: block.track_id,
            trackBadge: block.track_id === 'software-engineering' ? 'SE' : 
                       block.track_id === 'data-science' ? 'DS' : 
                       'Shared'
          } : undefined
        },
        className: flags.eduTreePhaseA ? 
          `node ${block.track_id ? `track-${block.track_id}` : 'shared'}` : 
          'node'
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

  // Edge track classification for path identity
  const edgeClass = (sid: string, tid: string) => {
    const s = sortedBlocks.find(b => String(b.id) === sid);
    const t = sortedBlocks.find(b => String(b.id) === tid);
    const tr = t?.track_id ?? s?.track_id ?? null;
    return tr === 'software-engineering' ? 'edge--se'
         : tr === 'data-science' ? 'edge--ds'
         : 'edge--shared';
  };

  // Second pass: create edges - preserve all unique paths, consolidate only true duplicates
  for (const [edgeKey, duplicates] of edgeMap) {
    const { sourceBlockId, targetBlockId, sourceBlock } = duplicates[0];
    
    if (duplicates.length > 1) {
      // True duplicates found - consolidate
      console.log(`[EduTree] Found ${duplicates.length} duplicate edges for ${edgeKey}, consolidating`);
    }
    
    // Create single edge for this unique source->target path
    const trackClass = edgeClass(sourceBlockId, targetBlockId);
    regularEdges.push({
      id: `e-${sourceBlockId}-${targetBlockId}`,
      source: sourceBlockId,
      target: targetBlockId,
      type: 'smoothstep',
      className: duplicates.length > 1 ? `edge ${trackClass} edge-consolidated` : `edge ${trackClass}`,
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

  // PhaseA: Skip degree completion node when flag is enabled
  if (!flags.eduTreePhaseA) {
    // Legacy mode: Add degree completion node (defensive)
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
        type: 'smoothstep',
        className: 'edge degree-edge'
      });
    }
    if (architectureBlock) {
      degreeEdges.push({
        id: 'architecture-to-degree',
        source: String(architectureBlock.id),
        target: 'degree-completion',
        type: 'smoothstep',
        className: 'edge degree-edge'
      });
    }

    const nodes: Node[] = [...regularNodes, degreeNode];
    const edges: Edge[] = [...regularEdges, ...degreeEdges];
    
    return { nodes, edges, blocksWithCourses };
  }

  // PhaseA mode: No degree completion node, capstones are terminal
  let nodes: Node[] = [...regularNodes];  // Ensure mutable copies
  let edges: Edge[] = [...regularEdges];

  // === Overlay-only gate + edge cleanup ======================================
  const WANT_OVERLAY = !!flags.overlayEnabled && !!flags.eduTreePhaseA;
  const GATE_ID = 'divergence-gate';

  if (WANT_OVERLAY) {
    console.log('[Overlay][PhaseA] start', {
      overlay: flags.overlayEnabled,
      phaseA: flags.eduTreePhaseA,
      count: {
        regularNodes: regularNodes?.length,
        regularEdges: regularEdges?.length,
      }
    });

    // 1) Inject virtual gate node (shared, sits at Y3 boundary)
    const gateNode: Node = {
      id: GATE_ID,
      type: 'blockGroup',
      data: {
        block: {
          id: GATE_ID,
          slug: 'divergence-gate',
          title: 'Track Gate',
          rule_type: 'ALL' as const,
          level_year: 3,
          track_id: null,
          courses: []
        },
        completedCourseIds,
        isUnlocked: true,
        progress: {
          completed: 0,
          required: 0
        },
        subBlocks: [],
        level_year: 3,
        area: 'gate',
        isHighlighted: false,
        planningLens: null,
        phaseA: {
          isShared: true,
          trackId: null,
          trackBadge: 'Gate'
        }
      },
      position: { x: 0, y: 0 },
      draggable: false,
      className: 'node node--shared node--gate'
    };
    
    if (!nodes.some(n => String(n.id) === GATE_ID)) {
      nodes.push(gateNode);
    }

    // 2) Rewire Y2(shared) → Gate → Y3(track starts)
    const idToBlock = new Map<string, BlockWithCourses>(sortedBlocks.map(b => [String(b.id), b]));
    const isY2Shared = (b: BlockWithCourses) => b?.level_year === 2 && !b?.track_id;
    const isTrackY3 = (b: BlockWithCourses) => b?.level_year === 3 && !!b?.track_id;

    // remove ANY Y2-shared -> Y3-track edge to ensure gate owns the fork
    edges = edges.filter(e => {
      const s = idToBlock.get(String(e.source));
      const t = idToBlock.get(String(e.target));
      return !(s && t && s.level_year === 2 && !s.track_id && isTrackY3(t));
    });

    const y2SharedIds = sortedBlocks.filter(isY2Shared).map(b => String(b.id));
    const y3StartIds  = sortedBlocks.filter(isTrackY3).map(b => String(b.id));

    const seenEdge = new Set<string>();
    const addEdge = (src: string, tgt: string, cls: string) => {
      const id = `e-${src}-${tgt}`;
      if (seenEdge.has(id)) return;
      seenEdge.add(id);
      edges.push({ id, source: src, target: tgt, type: 'step', className: `edge ${cls}` });
    };

    // (Y2 shared) -> Gate (shared tint)
    y2SharedIds.forEach(s => addEdge(s, GATE_ID, 'edge--shared'));

    // Gate -> Track starts (inherit target track tint)
    y3StartIds.forEach(t => {
      const tb = idToBlock.get(String(t));
      const cls = tb?.track_id === 'software-engineering' ? 'edge--se'
               : tb?.track_id === 'data-science' ? 'edge--ds'
               : 'edge--shared';
      addEdge(GATE_ID, t, cls);
    });

    // 3) Force overlay edges to orthogonal step routing and optionally split multi-lane jumps
    const splitMultiLane = new URLSearchParams(window.location.search).get('qaSplitMultiLane') === 'true';
    const levelYear = (id: string): number | undefined => {
      if (id === GATE_ID) return 3;
      return idToBlock.get(String(id))?.level_year;
    };

    if (splitMultiLane) {
      // Multi-lane splitting enabled - create bridge nodes for long jumps
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      const makeBridgeId = (prefix: string, lane: number) => `bridge-${prefix}-y${lane}`;

      for (const e of edges) {
        const sLY = levelYear(String(e.source));
        const tLY = levelYear(String(e.target));
        if (typeof sLY === 'number' && typeof tLY === 'number' && tLY - sLY > 1) {
          // Split into adjacent-lane segments with invisible bridge nodes
          let prev = String(e.source);
          for (let y = sLY + 1; y <= tLY; y++) {
            const lastHop = y === tLY;
            const bridgeId = lastHop ? String(e.target) : makeBridgeId(prev, y);
            if (!lastHop) {
              newNodes.push({
                id: bridgeId,
                type: 'laneBridge',
                data: { block: { id: bridgeId, title: '', level_year: y, track_id: null } },
                position: { x: 0, y: 0 },
                draggable: false,
                hidden: true,
                className: 'node node--bridge'
              });
            }
            newEdges.push({
              id: `e-${prev}-${bridgeId}`,
              source: prev,
              target: bridgeId,
              type: 'step',
              className: e.className || 'edge'
            });
            prev = bridgeId;
          }
        } else {
          newEdges.push({ ...e, type: 'step' });
        }
      }

      if (newNodes.length) {
        nodes = [...nodes, ...newNodes];
        edges = newEdges;
      } else {
        edges = edges.map(ed => ({ ...ed, type: 'step' }));
      }
    } else {
      // no splitting; just convert to step edges
      edges = edges.map(ed => ({ ...ed, type: 'step' }));
    }
  }
  // === end overlay gate + edge cleanup =======================================

  // Apply deterministic grid layout when in overlay mode with PhaseA
  if (flags.eduTreePhaseA && flags.overlayEnabled) {
    // Hard guard layout inputs
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      console.warn('[Overlay] nodes/edges not arrays; skipping layout');
      return { nodes: regularNodes, edges: regularEdges, blocksWithCourses };
    }

    console.log('[Overlay] pre-layout', {
      nodesCount: nodes?.length,
      edgesCount: edges?.length,
      hasGateNode: nodes?.some(n => String(n.id) === 'divergence-gate'),
      hasGateEdge: edges?.some(e => String(e.source) === 'divergence-gate' || String(e.target) === 'divergence-gate')
    });

    // Use only real nodes for layout (exclude virtual lane bridges)
    const layoutNodes = nodes.filter(n => n.type !== 'laneBridge');
    
    // Build blocks for layout from real nodes only
    const layoutBlocks = layoutNodes.map(n => {
      const b = (n.data as any)?.block || {};
      return {
        id: n.id, 
        slug: b.slug, 
        title: b.title, 
        level_year: b.level_year, 
        track_id: b.track_id ?? null
      };
    });
    
    // Defensive layout call
    let layout: Record<string, { x: number; y: number }> = {};
    try {
      layout = computeDeterministicGrid(
        layoutBlocks,
        edges.map(e => ({ source: String(e.source), target: String(e.target) })),
        {
          laneHeight: 220, 
          colWidth: 320, 
          lanePaddingX: 64, 
          lanePaddingY: 24,
          columnOrderBySlug: {
            'general-education': 0,
            'foundations': 1,
            'mathematics': 2,
            'core-i': 3,
            'core-ii': 4,
            'divergence-gate': 4,            // moved left for better fan-out
            'specializations': 6,            // Y3 SE anchor
            'data-analysis': 8,              // Y3 DS anchor
            'architecture': 10,              // Y4 SE anchor
            'machine-learning': 12,          // Y4 DS anchor
            'capstone-software-engineering': 13,
            'capstone-data-science': 13
          },
          trackAnchorsByLane: {
            3: { sharedMax: 4, se: 6, ds: 8 }, // Y3: gate at 4, SE left, DS right
            4: { sharedMax: 9, se: 10, ds: 12 } // Y4: SE left, DS right
          },
          reservedColsByLane: {
            3: [4, 6, 8], // Reserve gate, SE anchor, DS anchor
            4: [10, 12, 13] // Reserve SE, DS, capstones
          }
        }
      );
    } catch (err) {
      console.warn('[Overlay] layout crashed, skipping layout', err);
    }

    // Apply positions to real nodes only
    nodes = nodes.map(n => {
      if (n.type === 'laneBridge') return n; // leave bridge nodes alone
      const L = layout[String(n.id)];
      return L ? { ...n, position: { x: L.x, y: L.y }, draggable: false } : n;
    });
  }

  // PhaseA assertions (non-breaking)
  if (flags.eduTreePhaseA) {
    const badIds = edges.filter(e => !/^e-.+-.+$/.test(String(e.id)));
    if (badIds.length) {
      console.warn('[MP Overlay][ASSERT] Non-normalized edge IDs', badIds.slice(0, 5));
    }
    
    const backwards = edges.filter(e => {
      const s = sortedBlocks.find(b => String(b.id) === String(e.source))?.level_year ?? -1;
      const t = sortedBlocks.find(b => String(b.id) === String(e.target))?.level_year ?? 999;
      return t < s; // <-- changed from !(t > s)
    });
    if (backwards.length) {
      console.warn('[MP Overlay][ASSERT] Backward edges found', backwards.slice(0, 5));
    }
  }

  console.log('[EduTree][Transform][Result]', { 
    nodes: nodes.length, 
    edges: edges.length, 
    flowNodes: nodes.length,
    sampleEdgeId: edges[0]?.id,
    consolidatedEdges: edges.filter(e => e.data?.isConsolidated).length,
    totalPrerequisites: edges.reduce((sum, e) => {
      const prereqs = e.data?.prerequisites;
      return sum + (Array.isArray(prereqs) ? prereqs.length : 0);
    }, 0),
    phaseAMode: flags.eduTreePhaseA
  });

  return { nodes, edges, blocksWithCourses };
}