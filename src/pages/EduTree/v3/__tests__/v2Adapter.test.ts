import { describe, it, expect } from 'vitest';
import { adaptSeedDataV2, validateGraphIds } from '../engine/v2Adapter';
import type { V2RequirementBlock, V2Edge, Junction } from '../../data/seedDataV2';

describe('v2Adapter', () => {
  it('converts V2 blocks to V3 nodes', () => {
    const blocks: V2RequirementBlock[] = [
      {
        id: 'y1-math',
        title: 'Math I',
        rule_type: 'ALL',
        level_year: 1,
        area: 'core',
        position_x: 300,
        position_y: 100,
        program_id: 'bs_cs'
      }
    ];
    
    const graph = adaptSeedDataV2({ blocks, edges: [], junctions: [] });
    
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({
      id: 'y1-math',
      type: 'requirement',
      data: {
        year: 1,
        programId: 'bs_cs',
        title: 'Math I'
      }
    });
  });

  it('converts junctions to gate nodes', () => {
    const junctions: Junction[] = [
      {
        id: 'gate-program',
        level_year: 2,
        junction_type: 'program',
        title: 'Program Gate',
        position_x: 700,
        position_y: 200,
        outputs: []
      }
    ];
    
    const graph = adaptSeedDataV2({ blocks: [], edges: [], junctions });
    
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toMatchObject({
      id: 'gate-program',
      type: 'gate',
      data: {
        year: 2,
        title: 'Program Gate'
      }
    });
  });

  it('skips virtual and empty year blocks', () => {
    const blocks: V2RequirementBlock[] = [
      {
        id: 'real',
        title: 'Real Block',
        rule_type: 'ALL',
        level_year: 1,
        area: 'core',
        position_x: 300,
        position_y: 100
      },
      {
        id: 'virtual',
        title: 'Virtual Block',
        rule_type: 'ALL',
        level_year: 1,
        area: 'core',
        position_x: 300,
        position_y: 200,
        is_virtual: true
      },
      {
        id: 'empty',
        title: 'Empty Year',
        rule_type: 'ALL',
        level_year: 1,
        area: 'core',
        position_x: 300,
        position_y: 300,
        is_empty_year: true
      }
    ];
    
    const graph = adaptSeedDataV2({ blocks, edges: [], junctions: [] });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe('real');
  });

  it('converts edges with kind preservation', () => {
    const edges: V2Edge[] = [
      { source: 'y1', target: 'y2', kind: 'prereq' },
      { source: 'y2', target: 'gate', kind: 'gate' },
      { source: 'gate', target: 'y3', kind: 'prereq' }
    ];
    
    const graph = adaptSeedDataV2({ blocks: [], edges, junctions: [] });
    
    expect(graph.edges).toHaveLength(3);
    expect(graph.edges[0]).toMatchObject({
      source: 'y1',
      target: 'y2',
      kind: 'prereq'
    });
    expect(graph.edges[1].kind).toBe('gate');
  });

  it('maps track IDs correctly', () => {
    const blocks: V2RequirementBlock[] = [
      {
        id: 'se-block',
        title: 'SE Core',
        rule_type: 'ALL',
        level_year: 3,
        area: 'track',
        position_x: 1100,
        position_y: 100,
        track_id: 'se'
      },
      {
        id: 'ds-block',
        title: 'DS Core',
        rule_type: 'ALL',
        level_year: 3,
        area: 'track',
        position_x: 1100,
        position_y: 300,
        track_id: 'ds'
      }
    ];
    
    const graph = adaptSeedDataV2({ blocks, edges: [], junctions: [] });
    
    expect(graph.nodes.find(n => n.id === 'se-block')?.data.trackId).toBe('se');
    expect(graph.nodes.find(n => n.id === 'ds-block')?.data.trackId).toBe('ds');
  });

  it('validates graph has no duplicate IDs', () => {
    const graph = adaptSeedDataV2({
      blocks: [
        {
          id: 'y1',
          title: 'Year 1',
          rule_type: 'ALL',
          level_year: 1,
          area: 'core',
          position_x: 300,
          position_y: 100
        }
      ],
      edges: [{ source: 'y1', target: 'y2' }],
      junctions: []
    });
    
    const validation = validateGraphIds(graph);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('detects invalid edge references', () => {
    const graph = adaptSeedDataV2({
      blocks: [
        {
          id: 'y1',
          title: 'Year 1',
          rule_type: 'ALL',
          level_year: 1,
          area: 'core',
          position_x: 300,
          position_y: 100
        }
      ],
      edges: [{ source: 'y1', target: 'nonexistent' }],
      junctions: []
    });
    
    const validation = validateGraphIds(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('nonexistent'))).toBe(true);
  });
});
