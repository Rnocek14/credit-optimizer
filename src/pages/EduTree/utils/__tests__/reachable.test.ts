/**
 * Tests for reachability utilities
 */

import { buildAdjacency, reachableAfter, getGraphVersion } from '../reachable';
import { Edge } from '@xyflow/react';

describe('reachable utilities', () => {
  const mockEdges: Edge[] = [
    { id: 'e1', source: 'A', target: 'B' },
    { id: 'e2', source: 'B', target: 'C' },
    { id: 'e3', source: 'B', target: 'D' },
    { id: 'e4', source: 'D', target: 'E' },
  ] as Edge[];

  describe('buildAdjacency', () => {
    it('builds correct adjacency map', () => {
      const adjacency = buildAdjacency(mockEdges);
      
      expect(adjacency.get('A')).toEqual(['B']);
      expect(adjacency.get('B')).toEqual(['C', 'D']);
      expect(adjacency.get('C')).toBeUndefined();
      expect(adjacency.get('D')).toEqual(['E']);
      expect(adjacency.get('E')).toBeUndefined();
    });

    it('handles empty edges', () => {
      const adjacency = buildAdjacency([]);
      expect(adjacency.size).toBe(0);
    });
  });

  describe('reachableAfter', () => {
    it('finds all reachable nodes from start', () => {
      const adjacency = buildAdjacency(mockEdges);
      const reachable = reachableAfter('A', adjacency);
      
      expect(reachable).toEqual(new Set(['A', 'B', 'C', 'D', 'E']));
    });

    it('finds reachable nodes from middle node', () => {
      const adjacency = buildAdjacency(mockEdges);
      const reachable = reachableAfter('B', adjacency);
      
      expect(reachable).toEqual(new Set(['B', 'C', 'D', 'E']));
    });

    it('handles leaf nodes', () => {
      const adjacency = buildAdjacency(mockEdges);
      const reachable = reachableAfter('E', adjacency);
      
      expect(reachable).toEqual(new Set(['E']));
    });

    it('handles non-existent nodes', () => {
      const adjacency = buildAdjacency(mockEdges);
      const reachable = reachableAfter('Z', adjacency);
      
      expect(reachable).toEqual(new Set(['Z']));
    });
  });

  describe('getGraphVersion', () => {
    it('generates stable version string', () => {
      const version1 = getGraphVersion(mockEdges);
      const version2 = getGraphVersion([...mockEdges].reverse());
      
      expect(version1).toBe(version2);
      expect(typeof version1).toBe('string');
      expect(version1.length).toBeGreaterThan(0);
    });

    it('generates different versions for different graphs', () => {
      const edges2: Edge[] = [
        { id: 'e1', source: 'X', target: 'Y' },
      ] as Edge[];
      
      const version1 = getGraphVersion(mockEdges);
      const version2 = getGraphVersion(edges2);
      
      expect(version1).not.toBe(version2);
    });
  });
});