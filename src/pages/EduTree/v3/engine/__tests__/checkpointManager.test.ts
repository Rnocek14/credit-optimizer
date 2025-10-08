import { describe, it, expect } from 'vitest';
import { injectCheckpoints } from '../checkpointManager';
import type { V3Node, V3Edge } from '../../types/v3';
import type { BridgeMeta } from '../../data/lifePathBridge';

describe('checkpointManager', () => {
  describe('injectCheckpoints', () => {
    it('should inject one checkpoint per fork point', () => {
      const nodes: V3Node[] = [
        {
          id: 'node1',
          type: 'requirement',
          data: { tier: 1, lineage: { canonicalSlug: 'cs/se', levels: [] } },
          position: { x: 100, y: 100 },
        },
        {
          id: 'node2',
          type: 'requirement',
          data: { tier: 2, lineage: { canonicalSlug: 'cs/ds', levels: [] } },
          position: { x: 200, y: 200 },
        },
      ];

      const edges: V3Edge[] = [];

      const meta: BridgeMeta = {
        forksDetected: 2,
        tiers: 2,
        slugsUsed: ['cs/se', 'cs/ds'],
        alternativesByNode: {
          node1: 2,
          node2: 1,
        },
      };

      const result = injectCheckpoints(nodes, edges, meta);

      expect(result.checkpointsAdded).toBe(2);
      expect(result.nodes).toHaveLength(4); // 2 original + 2 checkpoints
      expect(result.nodes.some(n => n.id === 'checkpoint-node1')).toBe(true);
      expect(result.nodes.some(n => n.id === 'checkpoint-node2')).toBe(true);
    });

    it('should be idempotent (no duplicate checkpoints)', () => {
      const nodes: V3Node[] = [
        {
          id: 'node1',
          type: 'requirement',
          data: { tier: 1, lineage: { canonicalSlug: 'cs/se', levels: [] } },
          position: { x: 100, y: 100 },
        },
      ];

      const edges: V3Edge[] = [];

      const meta: BridgeMeta = {
        forksDetected: 1,
        tiers: 1,
        slugsUsed: ['cs'],
        alternativesByNode: { node1: 2 },
      };

      // First injection
      const result1 = injectCheckpoints(nodes, edges, meta);
      
      // Second injection with same data
      const result2 = injectCheckpoints(result1.nodes, result1.edges, meta);

      expect(result2.checkpointsAdded).toBe(0); // No new checkpoints
      expect(result2.nodes).toHaveLength(2); // Still 1 original + 1 checkpoint
    });

    it('should add checkpoint data with correct types', () => {
      const nodes: V3Node[] = [
        {
          id: 'node1',
          type: 'requirement',
          data: { 
            tier: 3, 
            lineage: { canonicalSlug: 'cs/se/advanced', levels: [] } 
          },
          position: { x: 100, y: 100 },
        },
      ];

      const meta: BridgeMeta = {
        forksDetected: 1,
        tiers: 3,
        slugsUsed: ['cs/se/advanced'],
        alternativesByNode: { node1: 3 },
      };

      const result = injectCheckpoints(nodes, [], meta);

      const checkpoint = result.nodes.find(n => n.id === 'checkpoint-node1');
      
      expect(checkpoint).toBeDefined();
      expect(checkpoint?.type).toBe('checkpoint');
      expect(checkpoint?.data.alternativeCount).toBe(3);
      expect(checkpoint?.data.sourceNodeId).toBe('node1');
      expect(checkpoint?.data.tier).toBe(3);
    });

    it('should create spine edge from source to checkpoint', () => {
      const nodes: V3Node[] = [
        {
          id: 'node1',
          type: 'requirement',
          data: { tier: 1, lineage: { canonicalSlug: 'cs', levels: [] } },
          position: { x: 100, y: 100 },
        },
      ];

      const meta: BridgeMeta = {
        forksDetected: 1,
        tiers: 1,
        slugsUsed: ['cs'],
        alternativesByNode: { node1: 2 },
      };

      const result = injectCheckpoints(nodes, [], meta);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('node1');
      expect(result.edges[0].target).toBe('checkpoint-node1');
      expect(result.edges[0].kind).toBe('spine');
    });

    it('should skip nodes without alternatives', () => {
      const nodes: V3Node[] = [
        {
          id: 'node1',
          type: 'requirement',
          data: { tier: 1, lineage: { canonicalSlug: 'cs', levels: [] } },
          position: { x: 100, y: 100 },
        },
      ];

      const meta: BridgeMeta = {
        forksDetected: 0,
        tiers: 1,
        slugsUsed: [],
        alternativesByNode: {},
      };

      const result = injectCheckpoints(nodes, [], meta);

      expect(result.checkpointsAdded).toBe(0);
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('should handle missing source nodes gracefully', () => {
      const nodes: V3Node[] = [];

      const meta: BridgeMeta = {
        forksDetected: 1,
        tiers: 0,
        slugsUsed: [],
        alternativesByNode: { 'nonexistent': 2 },
      };

      const result = injectCheckpoints(nodes, [], meta);

      expect(result.checkpointsAdded).toBe(0);
      expect(result.nodes).toHaveLength(0);
    });
  });
});
