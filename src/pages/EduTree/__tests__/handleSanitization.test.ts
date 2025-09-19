import { describe, it, expect } from 'vitest';

// Mock edge creation function similar to manualLayoutRenderer
function sanitizeEdgeHandles(edge: any) {
  const result: any = { ...edge };

  // Only set handles when they are actually needed and valid  
  if (typeof edge.sourceHandle === 'string' && 
      edge.sourceHandle !== 'null' && 
      edge.sourceHandle !== '' && 
      edge.sourceHandle !== 'undefined') {
    result.sourceHandle = edge.sourceHandle;
  } else {
    delete result.sourceHandle;
  }

  if (typeof edge.targetHandle === 'string' && 
      edge.targetHandle !== 'null' && 
      edge.targetHandle !== '' && 
      edge.targetHandle !== 'undefined') {
    result.targetHandle = edge.targetHandle;
  } else {
    delete result.targetHandle;
  }

  return result;
}

describe('EduTree Handle Sanitization', () => {
  describe('sanitizeEdgeHandles', () => {
    it('should keep valid source handles', () => {
      const edge = { 
        id: 'test', 
        source: 'a', 
        target: 'b', 
        sourceHandle: 'out' 
      };
      
      const result = sanitizeEdgeHandles(edge);
      expect(result.sourceHandle).toBe('out');
    });

    it('should remove null string source handles', () => {
      const edge = { 
        id: 'test', 
        source: 'a', 
        target: 'b', 
        sourceHandle: 'null' 
      };
      
      const result = sanitizeEdgeHandles(edge);
      expect(result.sourceHandle).toBeUndefined();
    });

    it('should remove empty string source handles', () => {
      const edge = { 
        id: 'test', 
        source: 'a', 
        target: 'b', 
        sourceHandle: '' 
      };
      
      const result = sanitizeEdgeHandles(edge);
      expect(result.sourceHandle).toBeUndefined();
    });

    it('should remove undefined string source handles', () => {
      const edge = { 
        id: 'test', 
        source: 'a', 
        target: 'b', 
        sourceHandle: 'undefined' 
      };
      
      const result = sanitizeEdgeHandles(edge);
      expect(result.sourceHandle).toBeUndefined();
    });

    it('should keep valid target handles', () => {
      const edge = { 
        id: 'test', 
        source: 'a', 
        target: 'b', 
        targetHandle: 'in' 
      };
      
      const result = sanitizeEdgeHandles(edge);
      expect(result.targetHandle).toBe('in');
    });

    it('should handle special gate handles', () => {
      const gateEdge = { 
        id: 'test', 
        source: 'gate', 
        target: 'header', 
        sourceHandle: 'out-se',
        targetHandle: 'in'
      };
      
      const result = sanitizeEdgeHandles(gateEdge);
      expect(result.sourceHandle).toBe('out-se');
      expect(result.targetHandle).toBe('in');
    });

    it('should not add handle properties when they were not present', () => {
      const edge = { 
        id: 'test', 
        source: 'a', 
        target: 'b'
      };
      
      const result = sanitizeEdgeHandles(edge);
      expect('sourceHandle' in result).toBe(false);
      expect('targetHandle' in result).toBe(false);
    });
  });
});