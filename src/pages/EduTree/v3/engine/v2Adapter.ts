import { V3Node, V3Edge, V3Graph, NodeType } from '../types/v3';
import type { V2RequirementBlock, V2Edge, Junction } from '../../data/seedDataV2';

/**
 * Adapts V2 seed data (blocks, edges, junctions) to V3 graph format
 * - Converts blocks to V3 nodes with strict IDs
 * - Maps junctions to gate nodes
 * - Converts edges to V3 format with educational semantics
 */
export function adaptSeedDataV2(seed: {
  blocks: V2RequirementBlock[];
  edges: V2Edge[];
  junctions: Junction[];
}): V3Graph {
  const nodes: V3Node[] = [];
  const edges: V3Edge[] = [];
  
  // Convert blocks to requirement nodes
  for (const block of seed.blocks) {
    // Skip ghost/virtual nodes from V2
    if (block.is_virtual || block.is_empty_year) continue;
    
    const node: V3Node = {
      id: block.id,
      type: 'requirement',
      data: {
        year: block.level_year as 1 | 2 | 3 | 4,
        programId: block.program_id || 'bs_cs',
        trackId: block.track_id === 'se' ? 'se' : block.track_id === 'ds' ? 'ds' : undefined,
        title: block.title
      },
      position: { x: 0, y: 0 } // Will be set by layout engine
    };
    
    nodes.push(node);
  }
  
  // Convert junctions to gate nodes
  for (const junction of seed.junctions) {
    const node: V3Node = {
      id: junction.id,
      type: 'gate',
      data: {
        year: junction.level_year as 1 | 2 | 3 | 4,
        programId: 'bs_cs', // Infer from context or make configurable
        title: junction.title
      },
      position: { x: 0, y: 0 }
    };
    
    nodes.push(node);
  }
  
  // Convert edges
  for (const edge of seed.edges) {
    const v3Edge: V3Edge = {
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      kind: edge.kind || 'prereq'
    };
    
    edges.push(v3Edge);
  }
  
  return { nodes, edges };
}

/**
 * Maps V2 node type to V3 NodeType
 */
export function mapNodeType(block: V2RequirementBlock): NodeType {
  if (block.is_virtual) return 'year';
  if (block.track_id) return 'requirement';
  return 'requirement';
}

/**
 * Extracts program ID from block, with fallback
 */
export function extractProgramId(block: V2RequirementBlock): string {
  return block.program_id || 'bs_cs';
}

/**
 * Validates that adapted graph has no duplicate IDs
 */
export function validateGraphIds(graph: V3Graph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }
  
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge ID: ${edge.id}`);
    }
    edgeIds.add(edge.id);
  }
  
  // Validate edge references
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target: ${edge.target}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
