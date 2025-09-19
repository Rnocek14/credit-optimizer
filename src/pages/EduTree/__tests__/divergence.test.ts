import { describe, it, expect } from 'vitest';
import { computeProgramDivergence, computeTrackDivergence } from '../utils/divergence';

describe('EduTree Divergence Logic', () => {
  describe('computeProgramDivergence', () => {
    it('should return null when first difference is at Y4', () => {
      const mockBlocks = [
        // Same Y1-Y3 blocks for both programs
        { id: 'y1-core', level_year: 1, program_id: 'bs_cs' },
        { id: 'y1-core-2', level_year: 1, program_id: 'bs_it' },
        { id: 'y2-core', level_year: 2, program_id: 'bs_cs' },
        { id: 'y2-core-2', level_year: 2, program_id: 'bs_it' },
        { id: 'y3-core', level_year: 3, program_id: 'bs_cs' },
        { id: 'y3-core-2', level_year: 3, program_id: 'bs_it' },
        // Different Y4 blocks (no gate needed)
        { id: 'y4-cs-specific', level_year: 4, program_id: 'bs_cs' },
        { id: 'y4-it-specific', level_year: 4, program_id: 'bs_it' },
      ];

      const result = computeProgramDivergence(mockBlocks, ['bs_cs', 'bs_it']);
      expect(result.divergesAfter).toBeNull();
    });

    it('should return Y1 when programs diverge at year 2', () => {
      const mockBlocks = [
        { id: 'y1-core', level_year: 1, program_id: 'bs_cs' },
        { id: 'y1-core-2', level_year: 1, program_id: 'bs_it' },
        // Programs diverge at Y2
        { id: 'y2-cs', level_year: 2, program_id: 'bs_cs' },
        { id: 'y2-it', level_year: 2, program_id: 'bs_it' },
      ];

      const result = computeProgramDivergence(mockBlocks, ['bs_cs', 'bs_it']);
      expect(result.divergesAfter).toBe(1);
      expect(result.forkBetween).toEqual([2, 3]);
    });

    it('should handle single program case', () => {
      const mockBlocks = [
        { id: 'y1-core', level_year: 1, program_id: 'bs_cs' },
      ];

      const result = computeProgramDivergence(mockBlocks, ['bs_cs']);
      expect(result.divergesAfter).toBeNull();
    });
  });

  describe('computeTrackDivergence', () => {
    it('should return null when first difference is at Y4', () => {
      const mockBlocks = [
        // Same Y1-Y3 blocks for both tracks within same program
        { id: 'y1-core', level_year: 1, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y1-core-2', level_year: 1, program_id: 'bs_cs', track_id: 'ds' },
        { id: 'y2-core', level_year: 2, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y2-core-2', level_year: 2, program_id: 'bs_cs', track_id: 'ds' },
        { id: 'y3-core', level_year: 3, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y3-core-2', level_year: 3, program_id: 'bs_cs', track_id: 'ds' },
        // Different Y4 blocks (no gate needed)
        { id: 'y4-se-cap', level_year: 4, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y4-ds-cap', level_year: 4, program_id: 'bs_cs', track_id: 'ds' },
      ];

      const result = computeTrackDivergence(mockBlocks, 'bs_cs', ['se', 'ds']);
      expect(result.divergesAfter).toBeNull();
    });

    it('should return Y2 when tracks diverge at year 3', () => {
      const mockBlocks = [
        { id: 'y1-core', level_year: 1, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y1-core-2', level_year: 1, program_id: 'bs_cs', track_id: 'ds' },
        { id: 'y2-core', level_year: 2, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y2-core-2', level_year: 2, program_id: 'bs_cs', track_id: 'ds' },
        // Tracks diverge at Y3
        { id: 'y3-se', level_year: 3, program_id: 'bs_cs', track_id: 'se' },
        { id: 'y3-ds', level_year: 3, program_id: 'bs_cs', track_id: 'ds' },
      ];

      const result = computeTrackDivergence(mockBlocks, 'bs_cs', ['se', 'ds']);
      expect(result.divergesAfter).toBe(2);
      expect(result.forkBetween).toEqual([3, 4]);
    });

    it('should handle single track case', () => {
      const mockBlocks = [
        { id: 'y1-core', level_year: 1, program_id: 'bs_cs', track_id: 'se' },
      ];

      const result = computeTrackDivergence(mockBlocks, 'bs_cs', ['se']);
      expect(result.divergesAfter).toBeNull();
    });
  });
});