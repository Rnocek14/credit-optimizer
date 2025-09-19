import { describe, it, expect } from 'vitest';
import { normalizeEdgeId, normalizeEdges, validateEdgeIdSpace } from '../utils/edgeNormalization';

describe('EduTree Edge Conversion', () => {
  describe('normalizeEdgeId', () => {
    it('should create consistent edge IDs from source/target', () => {
      const edge = {
        source: 'block-1',
        target: 'block-2',
        data: { sourceBlockId: 'block-1', targetBlockId: 'block-2' }
      };

      const result = normalizeEdgeId(edge);
      expect(result).toBe('e-block-1-block-2');
    });

    it('should handle missing data by falling back to source/target', () => {
      const edge = {
        source: 'block-a',
        target: 'block-b'
      };

      const result = normalizeEdgeId(edge);
      expect(result).toBe('e-block-a-block-b');
    });

    it('should handle data overrides for sourceBlockId/targetBlockId', () => {
      const edge = {
        source: 'node-1',
        target: 'node-2',
        data: { 
          sourceBlockId: 'actual-block-1', 
          targetBlockId: 'actual-block-2' 
        }
      };

      const result = normalizeEdgeId(edge);
      expect(result).toBe('e-actual-block-1-actual-block-2');
    });
  });

  describe('normalizeEdges', () => {
    it('should normalize all edge IDs in array', () => {
      const edges = [
        { source: 'a', target: 'b', id: 'old-id-1' },
        { source: 'b', target: 'c', id: 'old-id-2' },
      ];

      const result = normalizeEdges(edges);
      
      expect(result).toEqual([
        { source: 'a', target: 'b', id: 'e-a-b' },
        { source: 'b', target: 'c', id: 'e-b-c' },
      ]);
    });

    it('should preserve other edge properties', () => {
      const edges = [
        { 
          source: 'a', 
          target: 'b', 
          id: 'old-id',
          type: 'smoothstep',
          style: { strokeWidth: 2 }
        }
      ];

      const result = normalizeEdges(edges);
      
      expect(result[0]).toMatchObject({
        source: 'a',
        target: 'b',
        id: 'e-a-b',
        type: 'smoothstep',
        style: { strokeWidth: 2 }
      });
    });
  });

  describe('validateEdgeIdSpace', () => {
    it('should return true when overlay IDs match edge IDs', () => {
      const edges = [
        { id: 'e-a-b', source: 'a', target: 'b' },
        { id: 'e-b-c', source: 'b', target: 'c' },
      ];
      const overlayIds = ['e-a-b', 'e-x-y'];

      const result = validateEdgeIdSpace(edges, overlayIds);
      expect(result).toBe(true);
    });

    it('should return false when no overlay IDs match edge IDs', () => {
      const edges = [
        { id: 'e-a-b', source: 'a', target: 'b' },
      ];
      const overlayIds = ['e-x-y', 'e-z-w'];

      const result = validateEdgeIdSpace(edges, overlayIds);
      expect(result).toBe(false);
    });
  });
});