import { describe, it, expect } from 'vitest';
import type { 
  PathLineage, 
  PathLevelType, 
  BranchState, 
  CheckpointOptionPreview,
  V3NodeData,
  V3Edge,
  NodeType
} from '../types/v3';

describe('Phase 1: Type System Contracts', () => {
  describe('PathLineage', () => {
    it('requires canonicalSlug and levels array', () => {
      const lineage: PathLineage = {
        levels: [
          { type: 'degree_level', slug: 'bs', label: 'Bachelor of Science' },
          { type: 'major', slug: 'cs', label: 'Computer Science' }
        ],
        canonicalSlug: 'bs/cs'
      };

      expect(lineage.canonicalSlug).toBe('bs/cs');
      expect(lineage.levels).toHaveLength(2);
      expect(lineage.levels[0].type).toBe('degree_level');
    });

    it('supports all PathLevelType values', () => {
      const types: PathLevelType[] = [
        'degree_level', 
        'degree_type', 
        'major', 
        'track', 
        'emphasis'
      ];

      types.forEach(type => {
        const lineage: PathLineage = {
          levels: [{ type, slug: 'test', label: 'Test' }],
          canonicalSlug: 'test'
        };
        expect(lineage.levels[0].type).toBe(type);
      });
    });

    it('canonicalSlug is never derived from labels', () => {
      // Labels can change; slugs must be stable
      const lineage: PathLineage = {
        levels: [
          { type: 'major', slug: 'cs', label: 'Computer Science' }
        ],
        canonicalSlug: 'bs/cs' // NOT derived from 'Computer Science'
      };

      expect(lineage.canonicalSlug).not.toContain('Computer Science');
      expect(lineage.canonicalSlug).toBe('bs/cs');
    });
  });

  describe('BranchState finite state machine', () => {
    it('starts unselected', () => {
      const state: BranchState = { kind: 'unselected' };
      expect(state.kind).toBe('unselected');
    });

    it('transitions to preview with checkpointId', () => {
      const state: BranchState = { 
        kind: 'preview', 
        checkpointId: 'checkpoint-y2-tracks' 
      };
      expect(state.kind).toBe('preview');
      expect(state.checkpointId).toBe('checkpoint-y2-tracks');
    });

    it('transitions to selected with pathSlug', () => {
      const state: BranchState = { 
        kind: 'selected', 
        pathSlug: 'bs/cs/se' 
      };
      expect(state.kind).toBe('selected');
      expect(state.pathSlug).toBe('bs/cs/se');
    });

    it('only allows valid kinds', () => {
      // TypeScript compile-time check
      const validStates: BranchState[] = [
        { kind: 'unselected' },
        { kind: 'preview', checkpointId: 'test' },
        { kind: 'selected', pathSlug: 'test' }
      ];

      expect(validStates).toHaveLength(3);
    });
  });

  describe('CheckpointOptionPreview', () => {
    it('requires pathSlug, name, courses, credits', () => {
      const option: CheckpointOptionPreview = {
        pathSlug: 'bs/cs/se',
        name: 'Software Engineering Track',
        courses: 12,
        credits: 48
      };

      expect(option.pathSlug).toBe('bs/cs/se');
      expect(option.courses).toBe(12);
      expect(option.credits).toBe(48);
    });

    it('supports optional fields', () => {
      const option: CheckpointOptionPreview = {
        pathSlug: 'bs/cs/clep',
        name: 'CLEP Calculus',
        courses: 1,
        credits: 4,
        costUsd: 89,
        durationWeeks: 1,
        badges: ['CLEP', 'ACE'],
        score: 0.92
      };

      expect(option.costUsd).toBe(89);
      expect(option.badges).toContain('CLEP');
      expect(option.score).toBe(0.92);
    });

    it('score is used for deterministic ranking', () => {
      const options: CheckpointOptionPreview[] = [
        { pathSlug: 'a', name: 'A', courses: 1, credits: 4, score: 0.5 },
        { pathSlug: 'b', name: 'B', courses: 1, credits: 4, score: 0.9 },
        { pathSlug: 'c', name: 'C', courses: 1, credits: 4, score: 0.3 }
      ];

      const sorted = options.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      expect(sorted[0].pathSlug).toBe('b'); // highest score
      expect(sorted[1].pathSlug).toBe('a');
      expect(sorted[2].pathSlug).toBe('c'); // lowest score
    });
  });

  describe('V3NodeData extensions', () => {
    it('supports tier and tierLabel', () => {
      const data: V3NodeData = {
        tier: 2,
        tierLabel: 'Associate Completion'
      };

      expect(data.tier).toBe(2);
      expect(data.tierLabel).toBe('Associate Completion');
    });

    it('marks year as deprecated but still supported', () => {
      const data: V3NodeData = {
        year: 3, // DEPRECATED but backward-compatible
        tier: 3  // NEW
      };

      expect(data.year).toBe(3);
      expect(data.tier).toBe(3);
    });

    it('supports checkpoint type with alternatives', () => {
      const data: V3NodeData = {
        type: 'checkpoint',
        tier: 1,
        tierLabel: 'Math Entry',
        alternatives: [
          { pathSlug: 'bs/cs/calc', name: 'Calculus I', courses: 1, credits: 4 },
          { pathSlug: 'bs/cs/clep', name: 'CLEP Calc', courses: 1, credits: 4 }
        ]
      };

      expect(data.type).toBe('checkpoint');
      expect(data.alternatives).toHaveLength(2);
    });

    it('supports lineage on all nodes', () => {
      const data: V3NodeData = {
        lineage: {
          levels: [
            { type: 'degree_level', slug: 'bs', label: 'BS' },
            { type: 'major', slug: 'cs', label: 'CS' }
          ],
          canonicalSlug: 'bs/cs'
        }
      };

      expect(data.lineage?.canonicalSlug).toBe('bs/cs');
    });
  });

  describe('V3Edge extensions', () => {
    it('supports alternative kind', () => {
      const edge: V3Edge = {
        id: 'e1',
        source: 'checkpoint-1',
        target: 'bundle-2',
        kind: 'alternative'
      };

      expect(edge.kind).toBe('alternative');
    });

    it('supports merge flag in data', () => {
      const edge: V3Edge = {
        id: 'e2',
        source: 'y3-se',
        target: 'y4-common',
        kind: 'spine',
        data: { merge: true }
      };

      expect(edge.data?.merge).toBe(true);
    });

    it('supports transferRate in data', () => {
      const edge: V3Edge = {
        id: 'e3',
        source: 'aa-cc',
        target: 'bs-entry',
        kind: 'spine',
        data: { transferRate: 0.75 } // 75% of credits transfer
      };

      expect(edge.data?.transferRate).toBe(0.75);
    });
  });

  describe('NodeType includes checkpoint', () => {
    it('allows checkpoint in NodeType union', () => {
      const types: NodeType[] = [
        'year',
        'track-bundle',
        'requirement',
        'gate',
        'checkpoint' // NEW
      ];

      expect(types).toContain('checkpoint');
    });

    it('creates a V3Node with type checkpoint', () => {
      const node: import('../types/v3').V3Node = {
        id: 'checkpoint-math',
        type: 'checkpoint',
        data: {
          type: 'checkpoint',
          tier: 1,
          tierLabel: 'Math Entry'
        },
        position: { x: 0, y: 0 }
      };

      expect(node.type).toBe('checkpoint');
      expect(node.data.type).toBe('checkpoint');
    });
  });
});
