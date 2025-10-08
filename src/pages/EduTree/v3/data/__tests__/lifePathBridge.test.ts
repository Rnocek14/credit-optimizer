import { describe, it, expect } from 'vitest';
import { lifePathToV3 } from '../lifePathBridge';
import type { GraphNode, GraphEdge } from '@/types/lifePathGraph';

describe('lifePathBridge (Phase 2)', () => {
  it('Phase 2: never emits alternative edges', () => {
    const graph = {
      nodes: [
        {
          id: 'a',
          title: 'Course A',
          type: 'course',
          attributes: { depth: 0 },
          tags: [],
          credits: 3,
          estimatedHours: 120,
          cost: 1000,
          difficulty: 3,
          modality: 'online',
          active: true,
          validated: true,
          lastUpdated: '2025-01-01',
          prerequisiteIds: [],
          skillOutcomes: [],
          metadata: {},
        } as GraphNode,
      ],
      edges: [
        {
          id: 'alt',
          sourceId: 'a',
          targetId: 'x',
          type: 'alternative',
          weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 0 },
          confidence: 1,
          source: 'test',
          validated: true,
          metadata: {},
        } as GraphEdge,
        {
          id: 'eq',
          sourceId: 'a',
          targetId: 'y',
          type: 'equivalentTo',
          weights: { time: 0, cost: 0, creditLoss: 0, difficulty: 0, roi: 0 },
          confidence: 1,
          source: 'test',
          validated: true,
          metadata: {},
        } as GraphEdge,
      ],
    };

    const out = lifePathToV3(graph, {});

    // CRITICAL: No alternative edges in output
    expect(out.edges.some((e) => e.kind === 'alternative')).toBe(false);

    // equivalentTo should map to advisory
    expect(out.edges.some((e) => e.kind === 'advisory')).toBe(true);

    // But alternative should be counted in meta
    expect(out.meta.forksDetected).toBeGreaterThanOrEqual(1);
  });

  it('slugsUsed are unique and stable', () => {
    const graph = {
      nodes: [
        {
          id: 'n1',
          title: 'Node 1',
          type: 'course',
          tags: ['slug:calc-1'],
          attributes: { depth: 0 },
          credits: 3,
          estimatedHours: 120,
          cost: 1000,
          difficulty: 3,
          modality: 'online',
          active: true,
          validated: true,
          lastUpdated: '2025-01-01',
          prerequisiteIds: [],
          skillOutcomes: [],
          metadata: {},
        } as GraphNode,
        {
          id: 'n2',
          title: 'Node 2',
          type: 'course',
          tags: ['slug:calc-1'], // duplicate slug
          attributes: { depth: 1 },
          credits: 3,
          estimatedHours: 120,
          cost: 1000,
          difficulty: 3,
          modality: 'online',
          active: true,
          validated: true,
          lastUpdated: '2025-01-01',
          prerequisiteIds: [],
          skillOutcomes: [],
          metadata: {},
        } as GraphNode,
      ],
      edges: [],
    };

    const out = lifePathToV3(graph, {});

    // Slugs should be deduplicated
    expect(new Set(out.meta.slugsUsed).size).toBe(out.meta.slugsUsed.length);

    // Should extract slug from tags
    expect(out.meta.slugsUsed).toContain('calc-1');
  });

  it('correctly maps depth to tier', () => {
    const graph = {
      nodes: [
        {
          id: 'n0',
          title: 'Year 1',
          type: 'course',
          attributes: { depth: 0 },
          tags: [],
          credits: 30,
          estimatedHours: 1200,
          cost: 10000,
          difficulty: 2,
          modality: 'online',
          active: true,
          validated: true,
          lastUpdated: '2025-01-01',
          prerequisiteIds: [],
          skillOutcomes: [],
          metadata: {},
        } as GraphNode,
        {
          id: 'n3',
          title: 'Year 4',
          type: 'course',
          attributes: { depth: 3 },
          tags: [],
          credits: 30,
          estimatedHours: 1200,
          cost: 10000,
          difficulty: 4,
          modality: 'online',
          active: true,
          validated: true,
          lastUpdated: '2025-01-01',
          prerequisiteIds: [],
          skillOutcomes: [],
          metadata: {},
        } as GraphNode,
      ],
      edges: [],
    };

    const out = lifePathToV3(graph, {});

    // Tier should equal depth
    expect(out.nodes.find((n) => n.id === 'n0')?.data.tier).toBe(0);
    expect(out.nodes.find((n) => n.id === 'n3')?.data.tier).toBe(3);

    // Meta should report max tier + 1
    expect(out.meta.tiers).toBe(4);
  });
});
