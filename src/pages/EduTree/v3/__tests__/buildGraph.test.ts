import { describe, it, expect } from 'vitest';
import { buildEduTreeGraph, buildEduTreeGraphWithMetrics, enrichNode } from '../engine/buildGraph';
import { V3Graph, V3Node } from '../types/v3';

describe('buildGraph', () => {
  it('builds a complete graph from minimal input', () => {
    const input: V3Graph = {
      nodes: [
        { id: 'y1', type: 'requirement', data: { year: 1, programId: 'bs_cs', title: 'Year 1' }, position: { x: 0, y: 0 } },
        { id: 'y2', type: 'requirement', data: { year: 2, programId: 'bs_cs', title: 'Year 2' }, position: { x: 0, y: 0 } }
      ],
      edges: [
        { id: 'e1', source: 'y1', target: 'y2', kind: 'prereq' }
      ]
    };
    
    const result = buildEduTreeGraph(input);
    
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    
    // Nodes should have non-zero positions
    expect(result.nodes[0].position.x).toBeGreaterThan(0);
    expect(result.nodes[1].position.x).toBeGreaterThan(0);
  });

  it('preserves node and edge count through pipeline', () => {
    const input: V3Graph = {
      nodes: Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        type: 'requirement' as const,
        data: { year: ((i % 4) + 1) as 1 | 2 | 3 | 4, programId: 'bs_cs', title: `Node ${i}` },
        position: { x: 0, y: 0 }
      })),
      edges: []
    };
    
    const result = buildEduTreeGraph(input);
    
    expect(result.nodes).toHaveLength(10);
    expect(result.edges).toHaveLength(0);
  });

  it('returns metrics when requested', () => {
    const input: V3Graph = {
      nodes: [
        { id: 'y1', type: 'requirement', data: { year: 1, programId: 'bs_cs', title: 'Year 1' }, position: { x: 0, y: 0 } }
      ],
      edges: []
    };
    
    const { graph, metrics } = buildEduTreeGraphWithMetrics(input);
    
    expect(metrics).toBeDefined();
    expect(metrics.nodeCount).toBe(1);
    expect(metrics.totalDuration).toBeGreaterThan(0);
    expect(metrics.layoutDuration).toBeGreaterThanOrEqual(0);
    expect(metrics.collisionDuration).toBeGreaterThanOrEqual(0);
  });

  it('enrichNode preserves node when no context', () => {
    const node: V3Node = {
      id: 'test',
      type: 'requirement',
      data: { year: 1, programId: 'bs_cs', title: 'Test' },
      position: { x: 100, y: 200 }
    };
    
    const enriched = enrichNode(node);
    
    expect(enriched).toEqual(node);
  });

  it('enrichNode creates new object (no mutation)', () => {
    const node: V3Node = {
      id: 'test',
      type: 'requirement',
      data: { year: 1, programId: 'bs_cs', title: 'Test' },
      position: { x: 100, y: 200 }
    };
    
    const enriched = enrichNode(node, { marketplace: {} });
    
    expect(enriched).not.toBe(node); // Different reference
    expect(enriched.id).toBe(node.id); // Same data
  });

  it('handles gate nodes in graph', () => {
    const input: V3Graph = {
      nodes: [
        { id: 'y1', type: 'requirement', data: { year: 1, programId: 'bs_cs', title: 'Y1' }, position: { x: 0, y: 0 } },
        { id: 'gate', type: 'gate', data: { year: 2, programId: 'bs_cs', title: 'Gate' }, position: { x: 0, y: 0 } },
        { id: 'y3', type: 'requirement', data: { year: 3, programId: 'bs_cs', title: 'Y3' }, position: { x: 0, y: 0 } }
      ],
      edges: [
        { id: 'e1', source: 'y1', target: 'gate', kind: 'gate' },
        { id: 'e2', source: 'gate', target: 'y3', kind: 'prereq' }
      ]
    };
    
    const result = buildEduTreeGraph(input);
    
    expect(result.nodes).toHaveLength(3);
    const gateNode = result.nodes.find(n => n.id === 'gate');
    expect(gateNode?.type).toBe('gate');
    expect(gateNode?.data.anchorX).toBeDefined(); // Gate should be anchored
  });
});
