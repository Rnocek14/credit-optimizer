/**
 * ELK Layout Engine for V4 Spine-First Planner
 * Horizontal spine (years left-to-right) with vertical branches (courses)
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import { PlanNode, PlanEdge, NodeType } from '../types/v4';

// Shared layout constant for year X positioning
const YEAR_X_SPACING = 600; // Standard horizontal spacing between years

export interface LayoutOptions {
  /** Direction of spine flow (RIGHT = horizontal left-to-right) */
  direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  /** Spacing between nodes in same layer */
  nodeSpacing?: number;
  /** Spacing between layers (spine segments) */
  layerSpacing?: number;
  /** Node dimensions */
  nodeWidth?: number;
  nodeHeight?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'RIGHT',
  nodeSpacing: 80,
  layerSpacing: 200,
  nodeWidth: 150,
  nodeHeight: 80
};

/**
 * Apply ELK hierarchical layout to spine graph
 * - Spine nodes (years) flow horizontally
 * - Course nodes branch vertically below their year
 * - Prerequisite edges create horizontal connections
 */
export async function layoutSpineGraph(
  nodes: PlanNode[],
  edges: PlanEdge[],
  options: LayoutOptions = {}
): Promise<PlanNode[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const elk = new ELK();

  // Separate spine nodes (years) from branch nodes (courses, requirements)
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  const branchNodes = nodes.filter(n => n.type !== NodeType.Year);

  console.log('[Layout Engine] Processing', {
    spine: spineNodes.length,
    branches: branchNodes.length,
    edges: edges.length
  });

  // Build ELK graph with hierarchical structure
  const elkGraph = {
    id: "root",
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': opts.direction,
      'elk.spacing.nodeNode': String(opts.nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      // Prioritize minimizing edge crossings over compactness
      'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      // Keep prerequisite edges flowing left-to-right
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.feedbackEdges': 'true'
    },
    children: [
      // Spine nodes at top level
      ...spineNodes.map((n, index) => ({
        id: n.id,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        // Assign to layers explicitly for stable horizontal ordering
        layoutOptions: {
          'elk.layered.layerConstraint': String(index)
        }
      })),
      // Branch nodes (courses, requirements) with their year as parent
      ...branchNodes.map(n => {
        // Determine which year this node belongs to
        const year = n.data.year;
        const parentYearNode = spineNodes.find(s => 
          s.data.label?.includes(String(year)) || 
          s.id === `year${year}`
        );

        return {
          id: n.id,
          width: n.type === NodeType.Bundle ? opts.nodeWidth * 0.8 : opts.nodeWidth,
          height: n.type === NodeType.Bundle ? opts.nodeHeight * 0.6 : opts.nodeHeight,
          // External nodes (transfer credits) slightly smaller
          ...(n.type === NodeType.External && {
            width: opts.nodeWidth * 0.9,
            height: opts.nodeHeight * 0.7
          }),
          // Group by year for hierarchical positioning
          ...(parentYearNode && {
            layoutOptions: {
              'elk.partitioning.partition': parentYearNode.id
            }
          })
        };
      })
    ],
    edges: edges
      .filter(e => !e.hidden) // Skip hidden equivalency edges in layout
      .map(e => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        // Sequence edges (spine) should be straight
        ...(e.type === 'sequence' && {
          layoutOptions: {
            'elk.priority': '10' // Higher priority for spine edges
          }
        })
      }))
  };

  // Run ELK layout algorithm
  const layout = await elk.layout(elkGraph);

  console.log('[Layout Engine] ELK layout complete');

  // Map ELK positions back to PlanNodes
  return nodes.map(node => {
    const layoutNode = layout.children?.find(n => n.id === node.id);
    
    if (!layoutNode) {
      console.warn(`[Layout Engine] No position found for node ${node.id}`);
      return node;
    }

    return {
      ...node,
      position: {
        x: layoutNode.x ?? 0,
        y: layoutNode.y ?? 0
      }
    };
  });
}

/**
 * Manual spine layout (fallback if ELK fails)
 * Simple grid: years horizontal, courses vertical
 */
export function manualSpineLayout(
  nodes: PlanNode[],
  options: LayoutOptions = {}
): PlanNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  const branchNodes = nodes.filter(n => n.type !== NodeType.Year);

  // Position spine horizontally
  const positioned = spineNodes.map((node, index) => ({
    ...node,
    position: { x: index * opts.layerSpacing, y: 0 }
  }));

  // Position courses below their year
  branchNodes.forEach((node, index) => {
    const year = node.data.year;
    const yearNode = spineNodes.find(s => 
      s.data.label?.includes(String(year)) || 
      s.id === `year${year}`
    );
    
    const yearIndex = spineNodes.indexOf(yearNode!);
    const baseX = yearIndex >= 0 ? yearIndex * opts.layerSpacing : 0;
    
    positioned.push({
      ...node,
      position: {
        x: baseX + (index % 3) * (opts.nodeWidth + 20), // 3 columns per year
        y: opts.nodeHeight + opts.nodeSpacing + Math.floor(index / 3) * (opts.nodeHeight + opts.nodeSpacing)
      }
    });
  });

  return positioned;
}

/**
 * Hybrid Layout: Manual positioning + collision avoidance
 * Guarantees no overlaps with dynamic spacing based on content
 */
export function hybridSpineLayout(
  nodes: PlanNode[],
  options: LayoutOptions = {}
): PlanNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  const branchNodes = nodes.filter(n => 
    n.type !== NodeType.Year && 
    !n.className?.includes('ghost-node')  // ✅ Exclude ghost nodes from grid layout
  );
  
  // Phase 1: Position spine horizontally with generous spacing
  const positioned: PlanNode[] = spineNodes.map((node, index) => ({
    ...node,
    position: { 
      x: index * YEAR_X_SPACING,  // Standard year spacing
      y: 50  // ✅ Match moduleCardLayout spine Y position
    }
  }));
  
  // Phase 2: Group courses by year
  const coursesByYear = new Map<number, PlanNode[]>();
  branchNodes.forEach(node => {
    const year = node.data.year ?? 1;
    if (!coursesByYear.has(year)) coursesByYear.set(year, []);
    coursesByYear.get(year)!.push(node);
  });
  
  // Phase 3: Position courses in 2-column semester grid per year with dynamic spacing
  const COLUMNS = 2;  // Fall / Spring
  const BASE_NODE_WIDTH = 440;  // ✅ Match CSS module card width
  const BASE_NODE_HEIGHT = 260; // ✅ Match CSS module card height
  const H_GAP = 120;  // Increased spacing between semester columns
  const V_GAP = 80;   // Increased vertical spacing for metadata-rich nodes
  
  coursesByYear.forEach((courses, year) => {
    const yearIndex = year - 1;
    const yearNode = spineNodes[yearIndex];
    if (!yearNode) return;
    
    const baseX = yearIndex * YEAR_X_SPACING;
    const startY = 180; // Start below year node and semester labels
    
    // Sort for deterministic layout (fallback if no semester specified)
    courses.sort((a, b) => a.id.localeCompare(b.id));
    
    // Group by semester first
    const fallCourses: PlanNode[] = [];
    const springCourses: PlanNode[] = [];
    
    courses.forEach(node => {
      const semester = node.data.semester ?? (fallCourses.length <= springCourses.length ? 'fall' : 'spring');
      if (semester === 'fall') {
        fallCourses.push(node);
      } else {
        springCourses.push(node);
      }
    });
    
    // Calculate total width of 2-column grid
    const gridWidth = COLUMNS * BASE_NODE_WIDTH + (COLUMNS - 1) * H_GAP;
    // Left-align grid, keep year node centered
    const gridStartX = baseX - 90;
    
    // Position Fall courses (left column)
    fallCourses.forEach((node, index) => {
      let x = gridStartX;
      const y = startY + index * (BASE_NODE_HEIGHT + V_GAP);
      
      // External nodes (CLEP, transfer credits) - offset slightly to the left
      if (node.type === NodeType.External) {
        x = x - 30;  // Slight left offset to visually distinguish from main courses
      }
      
      positioned.push({
        ...node,
        position: { x, y }
      });
    });
    
    // Position Spring courses (right column)
    springCourses.forEach((node, index) => {
      let x = gridStartX + BASE_NODE_WIDTH + H_GAP;
      const y = startY + index * (BASE_NODE_HEIGHT + V_GAP);
      
      // External nodes (CLEP, transfer credits) - offset slightly to the left
      if (node.type === NodeType.External) {
        x = x - 30;  // Slight left offset to visually distinguish from main courses
      }
      
      positioned.push({
        ...node,
        position: { x, y }
      });
    });
  });
  
  console.log('[Hybrid Layout] Positioned', {
    spine: spineNodes.length,
    courses: branchNodes.length,
    totalNodes: positioned.length
  });
  
  return positioned;
}

/**
 * Group courses by their moduleId (includes Placeholders)
 */
export function groupCoursesByModule(
  nodes: PlanNode[]
): Map<string, PlanNode[]> {
  const coursesByModule = new Map<string, PlanNode[]>();
  
  nodes
    .filter(n => (n.type === NodeType.Course || n.type === NodeType.Placeholder) && n.data.moduleId)
    .forEach(node => {
      const moduleId = node.data.moduleId!;
      if (!coursesByModule.has(moduleId)) {
        coursesByModule.set(moduleId, []);
      }
      coursesByModule.get(moduleId)!.push(node);
    });
  
  return coursesByModule;
}

/**
 * Module Card Layout - Multi-year distribution
 * Creates module cards for each year a module appears in
 */
export function moduleCardLayout(
  courses: PlanNode[],
  requirements: any[] // HierarchicalRequirement[]
): PlanNode[] {
  const moduleNodes: PlanNode[] = [];
  const spineNodes: PlanNode[] = [];
  
  const CARD_WIDTH = 440;    // ✅ Match CSS dimensions exactly
  const CARD_HEIGHT = 260;   // ✅ Slightly taller cards (was 240)
  const CARD_GAP = 50;       // ✅ Increased vertical gap (was 30)
  
  // 1. Create spine (year markers)
  for (let year = 1; year <= 4; year++) {
    spineNodes.push({
      id: `year${year}`,
      type: NodeType.Year,
      position: { x: (year - 1) * YEAR_X_SPACING, y: 50 },
      data: { label: `Year ${year}`, type: 'year' }
    });
  }
  
  // 2. Get top-level modules (buckets + standalone sequences)
  const topLevelModules = requirements.filter((r: any) => 
    r.level === 'bucket' || (r.level === 'sequence' && !r.parentId)
  );
  
  // 3. For each module, create cards for each year it appears in
  const cardCountByYear = new Map<number, number>();
  
  topLevelModules.forEach((module: any) => {
    const isBucket = module.level === 'bucket';
    
    // Get all course IDs for this module (flatten children for buckets)
    const courseIds = getAllCourseIdsForModule(module, requirements);
    const moduleCourses = courses.filter((c: PlanNode) => {
      // Match by direct course ID or by moduleId in course data
      return courseIds.includes(c.data.label) || 
             (c.data.moduleId && isModuleMatch(c.data.moduleId, module, requirements));
    });
    
    if (moduleCourses.length === 0) return; // Skip empty modules
    
    // Group courses by year
    const coursesByYear = new Map<number, PlanNode[]>();
    moduleCourses.forEach((course: PlanNode) => {
      const year = course.data.year || 1;
      if (!coursesByYear.has(year)) {
        coursesByYear.set(year, []);
      }
      coursesByYear.get(year)!.push(course);
    });
    
    // Create a module card for EACH year this module appears in
    coursesByYear.forEach((yearCourses, year) => {
      const moduleX = (year - 1) * YEAR_X_SPACING;
      
      // Stack module cards vertically using exact year tracking
      const currentCount = cardCountByYear.get(year) || 0;
      const moduleY = 200 + currentCount * (CARD_HEIGHT + CARD_GAP);
      cardCountByYear.set(year, currentCount + 1);
      
      console.log(`[Layout] ${module.label} Y${year}: card ${currentCount + 1}, Y=${moduleY}`);
      
      // Calculate summary data for this year's courses
      const creditsEarned = yearCourses
        .filter((c: PlanNode) => c.data.status === 'completed')
        .reduce((sum, c) => sum + (c.data.credits || 0), 0);
      
      const totalCredits = yearCourses.reduce((sum, c) => sum + (c.data.credits || 0), 0);
      
      moduleNodes.push({
        id: `module-${module.id}-y${year}`,
        type: NodeType.ModuleGroup,
        position: { x: moduleX, y: moduleY },
        data: {
          label: module.label,
          moduleId: module.id,
          type: 'moduleGroup',
          level: module.level,
          icon: module.icon,
          description: module.description,
          
          // Year filter for this card
          yearFilter: year,
          
          // Summary data (for THIS year only)
          courseCount: yearCourses.length,
          creditsEarned: creditsEarned,
          creditsRequired: totalCredits,
        } as any,
        style: {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        }
      });
    });
  });
  
  return [...spineNodes, ...moduleNodes];
}

// Helper: Get all course IDs for a module (including nested sequences)
function getAllCourseIdsForModule(
  module: any,
  allRequirements: any[]
): string[] {
  if (module.courseIds) return module.courseIds;
  if (module.children) {
    return module.children.flatMap((child: any) => getAllCourseIdsForModule(child, allRequirements));
  }
  return [];
}

// Helper: Check if a course's moduleId matches this module or its children
function isModuleMatch(
  courseModuleId: string,
  module: any,
  allRequirements: any[]
): boolean {
  if (courseModuleId === module.id) return true;
  if (module.children) {
    return module.children.some((child: any) => isModuleMatch(courseModuleId, child, allRequirements));
  }
  return false;
}

/**
 * Hierarchical Module Layout - Two-level nesting: Bucket → Sequence → Courses
 * Supports both bucket-level containers and standalone sequences
 * @deprecated Use moduleCardLayout for Phase 2I
 */
export function hierarchicalModuleLayout(
  nodes: PlanNode[],
  requirements: any[], // HierarchicalRequirement[]
  collapsedModules: Set<string> = new Set()
): PlanNode[] {
  const positioned: PlanNode[] = [];
  const bucketParentNodes: PlanNode[] = [];
  const sequenceParentNodes: PlanNode[] = [];
  
  // 1. Group courses by module (sequence-level)
  const coursesByModule = groupCoursesByModule(nodes);
  
  // 2. Get spine nodes (Year markers)
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  
  // 3. Get bucket-level requirements and standalone sequences
  const buckets = requirements.filter((r: any) => r.level === 'bucket');
  const standaloneSequences = requirements.filter((r: any) => 
    r.level === 'sequence' && !r.parentId
  );
  
  // 4. Process buckets (two-level nesting)
  let bucketYOffset = 180; // Start below spine
  
  buckets.forEach((bucket: any) => {
    const sequences = bucket.children || [];
    
    // Calculate total bucket content
    let totalBucketCourses = 0;
    sequences.forEach((seq: any) => {
      const seqCourses = coursesByModule.get(seq.id) || [];
      totalBucketCourses += seqCourses.length;
    });
    
    if (totalBucketCourses === 0) return; // Skip empty buckets
    
    const isBucketCollapsed = collapsedModules.has(bucket.id);
    
    // Determine bucket position based on earliest year of courses
    const allBucketCourses: PlanNode[] = [];
    sequences.forEach((seq: any) => {
      const seqCourses = coursesByModule.get(seq.id) || [];
      allBucketCourses.push(...seqCourses);
    });
    
    const years = allBucketCourses.map(c => c.data.year || 1);
    const minYear = years.length > 0 ? Math.min(...years) : 1;
    const bucketX = 100 + (minYear - 1) * 1200;
    
    // Calculate bucket dimensions
    let totalSequenceHeight = 0;
    sequences.forEach((seq: any) => {
      const seqCourses = coursesByModule.get(seq.id) || [];
      const isSeqCollapsed = collapsedModules.has(seq.id);
      const seqHeight = isSeqCollapsed ? 100 : Math.max(200, 140 + seqCourses.length * 220);
      totalSequenceHeight += seqHeight + 30; // Add gap between sequences
    });
    
    const bucketHeight = isBucketCollapsed 
      ? 180 
      : Math.max(400, 220 + totalSequenceHeight);
    
    // Create bucket parent node
    const bucketNode: PlanNode = {
      id: `bucket-${bucket.id}`,
      type: NodeType.ModuleGroup,
      position: { x: bucketX, y: bucketYOffset },
      data: {
        label: bucket.label,
        moduleId: bucket.id,
        type: 'moduleGroup',
        level: 'bucket'
      },
      style: {
        width: 480,
        height: bucketHeight,
      }
    };
    bucketParentNodes.push(bucketNode);
    
    // 5. Position sequences within bucket
    let sequenceYOffset = 200; // Start after bucket header
    
    sequences.forEach((sequence: any) => {
      const seqCourses = coursesByModule.get(sequence.id) || [];
      if (seqCourses.length === 0) return;
      
      const isSeqCollapsed = collapsedModules.has(sequence.id);
      const seqHeight = isSeqCollapsed 
        ? 100 
        : Math.max(200, 140 + seqCourses.length * 220);
      
      // Create sequence node (child of bucket)
      const sequenceNode: PlanNode = {
        id: `module-${sequence.id}`,
        type: NodeType.ModuleGroup,
        position: { x: 20, y: sequenceYOffset }, // Relative to bucket
        parentNode: `bucket-${bucket.id}`,
        extent: 'parent' as const,
        data: {
          label: sequence.label,
          moduleId: sequence.id,
          type: 'moduleGroup',
          level: 'sequence'
        },
        style: {
          width: 420,
          height: seqHeight,
        }
      };
      sequenceParentNodes.push(sequenceNode);
      
      // 6. Position courses within sequence
      seqCourses.forEach((course, courseIndex) => {
        positioned.push({
          ...course,
          position: { x: 20, y: 160 + courseIndex * 220 }, // Relative to sequence
          parentNode: `module-${sequence.id}`,
          extent: 'parent' as const,
        });
      });
      
      sequenceYOffset += seqHeight + 30; // Stack sequences vertically
    });
    
    bucketYOffset += bucketHeight + 50; // Stack buckets vertically
  });
  
  // 7. Process standalone sequences (no parent bucket)
  let standaloneYOffset = bucketYOffset;
  
  standaloneSequences.forEach((sequence: any) => {
    const seqCourses = coursesByModule.get(sequence.id) || [];
    if (seqCourses.length === 0) return;
    
    const isCollapsed = collapsedModules.has(sequence.id);
    const years = seqCourses.map(c => c.data.year || 1);
    const minYear = Math.min(...years);
    const moduleX = 100 + (minYear - 1) * 1200;
    
    const moduleHeight = isCollapsed 
      ? 140 
      : Math.max(280, 200 + seqCourses.length * 220);
    
    // Create standalone sequence node
    const moduleNode: PlanNode = {
      id: `module-${sequence.id}`,
      type: NodeType.ModuleGroup,
      position: { x: moduleX, y: standaloneYOffset },
      data: {
        label: sequence.label,
        moduleId: sequence.id,
        type: 'moduleGroup',
        level: 'sequence'
      },
      style: {
        width: 420,
        height: moduleHeight,
      }
    };
    sequenceParentNodes.push(moduleNode);
    
    // Position courses within standalone sequence
    seqCourses.forEach((course, index) => {
      positioned.push({
        ...course,
        position: { x: 20, y: 200 + index * 220 }, // Relative to sequence
        parentNode: `module-${sequence.id}`,
        extent: 'parent' as const,
      });
    });
    
    standaloneYOffset += moduleHeight + 50;
  });
  
  // 8. Position spine nodes (Year markers) at top
  spineNodes.forEach((spine, index) => {
    positioned.push({
      ...spine,
      position: { x: 100 + index * 1200, y: 50 },
    });
  });
  
  // 9. Handle courses NOT in modules - use existing hybrid layout
  const coursesNotInModules = nodes.filter(n => 
    (n.type === NodeType.Course || n.type === NodeType.Placeholder) && 
    !n.data.moduleId &&
    !n.className?.includes('ghost-node')
  );
  
  // Group by year and position in grid
  const coursesByYear = new Map<number, PlanNode[]>();
  coursesNotInModules.forEach(node => {
    const year = node.data.year ?? 1;
    if (!coursesByYear.has(year)) coursesByYear.set(year, []);
    coursesByYear.get(year)!.push(node);
  });
  
  const COLUMNS = 2;
  const BASE_NODE_WIDTH = 440;  // ✅ Match CSS module card width
  const BASE_NODE_HEIGHT = 260; // ✅ Match CSS module card height
  const H_GAP = 120;
  const V_GAP = 80;
  
  coursesByYear.forEach((courses, year) => {
    const yearIndex = year - 1;
    const baseX = yearIndex * 1200 + 100;
    const startY = 180;
    
    const fallCourses: PlanNode[] = [];
    const springCourses: PlanNode[] = [];
    
    courses.forEach(node => {
      const semester = node.data.semester ?? (fallCourses.length <= springCourses.length ? 'fall' : 'spring');
      if (semester === 'fall') {
        fallCourses.push(node);
      } else {
        springCourses.push(node);
      }
    });
    
    const gridStartX = baseX - 90;
    
    fallCourses.forEach((node, index) => {
      positioned.push({
        ...node,
        position: { x: gridStartX, y: startY + index * (BASE_NODE_HEIGHT + V_GAP) }
      });
    });
    
    springCourses.forEach((node, index) => {
      positioned.push({
        ...node,
        position: { x: gridStartX + BASE_NODE_WIDTH + H_GAP, y: startY + index * (BASE_NODE_HEIGHT + V_GAP) }
      });
    });
  });
  
  console.log('[Hierarchical Layout] Created modules:', {
    buckets: bucketParentNodes.length,
    sequences: sequenceParentNodes.length,
    childrenInModules: positioned.filter(n => n.parentNode).length,
    independentCourses: positioned.filter(n => !n.parentNode && n.type !== NodeType.Year).length,
    spineNodes: spineNodes.length,
  });
  
  return [...bucketParentNodes, ...sequenceParentNodes, ...positioned];
}

/**
 * Legacy wrapper for backward compatibility
 */
export function nestedModuleLayout(
  nodes: PlanNode[],
  subRequirements: any[],
  collapsedModules: Set<string> = new Set()
): PlanNode[] {
  return hierarchicalModuleLayout(nodes, subRequirements, collapsedModules);
}

/**
 * Calculate optimal module card positions with improved collision avoidance
 * Groups modules by year tier and applies horizontal/vertical offsets
 */
export function calculateModuleCardPositions(
  coursesByModule: Map<string, PlanNode[]>,
  subRequirements: any[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Group modules by year tier (based on average year of their courses)
  const modulesByYear = new Map<number, Array<{ id: string; courses: PlanNode[]; avgX: number; minY: number }>>();
  
  subRequirements.forEach(subReq => {
    const moduleCourses = coursesByModule.get(subReq.id) || [];
    if (moduleCourses.length === 0) return;
    
    const avgYear = moduleCourses.reduce((sum, n) => sum + (n.data.year || 1), 0) / moduleCourses.length;
    const yearBucket = Math.round(avgYear);
    const avgX = moduleCourses.reduce((sum, n) => sum + n.position.x, 0) / moduleCourses.length;
    const minY = Math.min(...moduleCourses.map(n => n.position.y));
    
    if (!modulesByYear.has(yearBucket)) {
      modulesByYear.set(yearBucket, []);
    }
    modulesByYear.get(yearBucket)!.push({ id: subReq.id, courses: moduleCourses, avgX, minY });
  });
  
  // Position modules: horizontal spacing within year, vertical by year
  modulesByYear.forEach((modules, year) => {
    // Sort by X position for left-to-right layout
    modules.sort((a, b) => a.avgX - b.avgX);
    
    modules.forEach((module, index) => {
      // Horizontal offset to prevent overlap (320px spacing)
      const horizontalOffset = index * 320;
      
      // Vertical offset based on year tier (deeper years = higher up)
      const verticalOffset = 180 + (year * 30);
      
      positions.set(module.id, {
        x: module.avgX - 140 + (index > 0 ? horizontalOffset - (modules.length - 1) * 160 : 0),
        y: module.minY - verticalOffset,
      });
    });
  });
  
  return positions;
}

/**
 * Enrich year nodes with credit summaries and load health
 */
export function enrichYearNodesWithSummaries(
  nodes: PlanNode[]
): PlanNode[] {
  const yearNodes = nodes.filter(n => n.type === NodeType.Year);
  const courseNodes = nodes.filter(n => 
    n.type === NodeType.Course && 
    !n.className?.includes('ghost-node')
  );
  
  return nodes.map(node => {
    if (node.type !== NodeType.Year) return node;
    
    const yearMatch = node.data.label?.match(/Year (\d+)/);
    if (!yearMatch) return node;
    
    const year = parseInt(yearMatch[1]);
    const yearCourses = courseNodes.filter(n => n.data.year === year);
    
    const planned = yearCourses.reduce((sum, n) => sum + (n.data.credits || 0), 0);
    const required = 30; // Standard full-time load per year
    
    const byCategory: Record<string, number> = {};
    yearCourses.forEach(n => {
      const cat = n.data.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (n.data.credits || 0);
    });
    
    const loadHealth: 'underloaded' | 'balanced' | 'overloaded' = 
      planned < 24 ? 'underloaded' : 
      planned > 36 ? 'overloaded' : 'balanced';
    
    // Detect missing requirements per year (basic check)
    const missingRequirements: string[] = [];
    if (year <= 2 && !yearCourses.some(c => c.data.category === 'genEd')) {
      missingRequirements.push('Need Gen Ed');
    }
    
    return {
      ...node,
      data: {
        ...node.data,
        creditsSummary: { planned, required, byCategory },
        loadHealth,
        missingRequirements: missingRequirements.length > 0 ? missingRequirements : undefined
      }
    };
  });
}
