import { describe, it, expect } from 'vitest';
import { computeGraphQAMetrics, type GraphQAMetrics } from '../multipathQA';
import type { Node, Edge } from '@xyflow/react';

describe('multipathQA', () => {
  // Helper to create test nodes
  const createNode = (id: string, levelYear: number, trackId?: string): Node => ({
    id,
    type: 'blockGroup',
    position: { x: 0, y: 0 },
    data: { 
      block: { 
        id, 
        title: `Block ${id}`, 
        level_year: levelYear,
        track_id: trackId || null
      }
    }
  });

  // Helper to create test edges
  const createEdge = (source: string, target: string): Edge => ({
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep'
  });

  it('Test A: 3-node chain → cycleDetected=false, forwardEdgeViolations=0', () => {
    const nodes = [
      createNode('1', 1, 'software-engineering'),
      createNode('2', 2, 'software-engineering'), 
      createNode('3', 3, 'software-engineering')
    ];

    const edges = [
      createEdge('1', '2'),
      createEdge('2', '3')
    ];

    const metrics = computeGraphQAMetrics(nodes, edges, {
      getLevelYear: (id) => {
        const node = nodes.find(n => n.id === id);
        return (node?.data as any)?.block?.level_year ?? 1;
      },
      getTrackId: (id) => {
        const node = nodes.find(n => n.id === id);
        return (node?.data as any)?.block?.track_id ?? null;
      },
      flags: { eduTreePhaseA: true, qaMode: true }
    });

    expect(metrics.cycleDetected).toBe(false);
    expect(metrics.forwardEdgeViolations).toBe(0);
    expect(metrics.nodes).toBe(3);
    expect(metrics.edges).toBe(2);
  });

  it('Test B: shared gate → (SE, DS) fork → divergenceGateId is defined', () => {
    const nodes = [
      createNode('foundation', 1), // shared
      createNode('gate', 2), // shared divergence gate
      createNode('se-spec', 3, 'software-engineering'),
      createNode('ds-spec', 3, 'data-science')
    ];

    const edges = [
      createEdge('foundation', 'gate'),
      createEdge('gate', 'se-spec'),
      createEdge('gate', 'ds-spec')
    ];

    const metrics = computeGraphQAMetrics(nodes, edges, {
      getLevelYear: (id) => {
        const node = nodes.find(n => n.id === id);
        return (node?.data as any)?.block?.level_year ?? 1;
      },
      getTrackId: (id) => {
        const node = nodes.find(n => n.id === id);
        return (node?.data as any)?.block?.track_id ?? null;
      },
      flags: { eduTreePhaseA: true, qaMode: true }
    });

    expect(metrics.divergenceGateId).toBeDefined();
    expect(metrics.divergenceGateId).toBe('gate');
    expect(metrics.cycleDetected).toBe(false);
  });

  it('Test C: same-level edges present → forwardEdgeViolations=0, sameLevelEdges>0', () => {
    const nodes = [
      createNode('arch', 4, 'software-engineering'),
      createNode('capstone', 4, 'software-engineering')
    ];

    const edges = [
      createEdge('arch', 'capstone') // same level Y4 → Y4
    ];

    const metrics = computeGraphQAMetrics(nodes, edges, {
      getLevelYear: (id) => (nodes.find(n => n.id === id)?.data as any)?.block?.level_year ?? 1,
      getTrackId: (id) => (nodes.find(n => n.id === id)?.data as any)?.block?.track_id ?? null,
      flags: { eduTreePhaseA: true, qaMode: true }
    });

    expect(metrics.forwardEdgeViolations).toBe(0);
    expect(metrics.sameLevelEdges).toBeGreaterThan(0);
    expect(metrics.sameLevelEdges).toBe(1);
    expect(metrics.cycleDetected).toBe(false);
  });

  it('should handle backward edges correctly', () => {
    const nodes = [
      createNode('1', 2),
      createNode('2', 1)
    ];

    const edges = [
      createEdge('1', '2') // Y2 → Y1 (backward)
    ];

    const metrics = computeGraphQAMetrics(nodes, edges, {
      getLevelYear: (id) => (nodes.find(n => n.id === id)?.data as any)?.block?.level_year ?? 1,
      getTrackId: (id) => (nodes.find(n => n.id === id)?.data as any)?.block?.track_id ?? null,
      flags: { eduTreePhaseA: true, qaMode: true }
    });

    expect(metrics.forwardEdgeViolations).toBe(1);
    expect(metrics.sameLevelEdges).toBe(0);
  });

  it('should detect cycles', () => {
    const nodes = [
      createNode('1', 1),
      createNode('2', 2),
      createNode('3', 3)
    ];

    const edges = [
      createEdge('1', '2'),
      createEdge('2', '3'),
      createEdge('3', '1') // creates cycle
    ];

    const metrics = computeGraphQAMetrics(nodes, edges, {
      getLevelYear: (id) => (nodes.find(n => n.id === id)?.data as any)?.block?.level_year ?? 1,
      getTrackId: (id) => (nodes.find(n => n.id === id)?.data as any)?.block?.track_id ?? null,
      flags: { eduTreePhaseA: true, qaMode: true }
    });

    expect(metrics.cycleDetected).toBe(true);
  });
});