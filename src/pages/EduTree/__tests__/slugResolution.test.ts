import { describe, it, expect } from 'vitest';

// Mock functions for slug resolution (these would normally be imported)
function resolveBlockIds(slugs: string[], blockMap: Record<string, any>): string[] {
  return slugs.map(slug => {
    const block = blockMap[slug];
    return block ? block.id : slug; // fallback to slug if not found
  });
}

function validateResolvedIds(ids: string[], blocks: any[]): { valid: boolean; missing: string[] } {
  const blockIds = new Set(blocks.map(b => b.id));
  const missing = ids.filter(id => !blockIds.has(id));
  return { valid: missing.length === 0, missing };
}

describe('EduTree Slug Resolution', () => {
  describe('resolveBlockIds', () => {
    it('should resolve valid slugs to block IDs', () => {
      const slugs = ['intro-prog', 'data-structures'];
      const blockMap = {
        'intro-prog': { id: 'block-001', title: 'Introduction to Programming' },
        'data-structures': { id: 'block-002', title: 'Data Structures' }
      };

      const result = resolveBlockIds(slugs, blockMap);
      expect(result).toEqual(['block-001', 'block-002']);
    });

    it('should fallback to slug when block not found', () => {
      const slugs = ['intro-prog', 'missing-course'];
      const blockMap = {
        'intro-prog': { id: 'block-001', title: 'Introduction to Programming' }
      };

      const result = resolveBlockIds(slugs, blockMap);
      expect(result).toEqual(['block-001', 'missing-course']);
    });

    it('should handle empty slugs array', () => {
      const result = resolveBlockIds([], {});
      expect(result).toEqual([]);
    });
  });

  describe('validateResolvedIds', () => {
    it('should validate that all IDs exist in blocks', () => {
      const ids = ['block-001', 'block-002'];
      const blocks = [
        { id: 'block-001', title: 'Course 1' },
        { id: 'block-002', title: 'Course 2' },
        { id: 'block-003', title: 'Course 3' }
      ];

      const result = validateResolvedIds(ids, blocks);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should identify missing block IDs', () => {
      const ids = ['block-001', 'missing-block', 'block-002'];
      const blocks = [
        { id: 'block-001', title: 'Course 1' },
        { id: 'block-002', title: 'Course 2' }
      ];

      const result = validateResolvedIds(ids, blocks);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['missing-block']);
    });

    it('should handle empty inputs', () => {
      const result = validateResolvedIds([], []);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should handle case where all IDs are missing', () => {
      const ids = ['missing-1', 'missing-2'];
      const blocks = [{ id: 'existing-block', title: 'Existing' }];

      const result = validateResolvedIds(ids, blocks);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['missing-1', 'missing-2']);
    });
  });
});