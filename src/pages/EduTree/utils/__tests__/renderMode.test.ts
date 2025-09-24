/**
 * Tests for Auto-Mode detection system
 */

import { deriveRenderMode } from '../renderMode';
import type { Selection } from '../../ctx/PathHighlightContext';

describe('deriveRenderMode', () => {
  const csProgram: Selection = { kind: 'program', id: 'bs_cs' };
  const itProgram: Selection = { kind: 'program', id: 'bs_it' };
  const seTrack: Selection = { kind: 'track', id: 'se' };
  const dsTrack: Selection = { kind: 'track', id: 'ds' };

  it('returns single when no selections', () => {
    expect(deriveRenderMode(null, null)).toBe('single');
    expect(deriveRenderMode(undefined, undefined)).toBe('single');
  });

  it('returns single when only primary selection', () => {
    expect(deriveRenderMode(csProgram, null)).toBe('single');
    expect(deriveRenderMode(csProgram, undefined)).toBe('single');
  });

  it('returns single when only secondary selection', () => {
    expect(deriveRenderMode(null, csProgram)).toBe('single');
    expect(deriveRenderMode(undefined, csProgram)).toBe('single');
  });

  it('returns single when both selections are identical', () => {
    expect(deriveRenderMode(csProgram, csProgram)).toBe('single');
    expect(deriveRenderMode(seTrack, seTrack)).toBe('single');
  });

  it('returns dual when selections are different', () => {
    expect(deriveRenderMode(csProgram, itProgram)).toBe('dual');
    expect(deriveRenderMode(seTrack, dsTrack)).toBe('dual');
    expect(deriveRenderMode(csProgram, seTrack)).toBe('dual');
  });

  it('handles edge cases', () => {
    // Same id but different kind should be dual
    const programCs: Selection = { kind: 'program', id: 'cs' };
    const trackCs: Selection = { kind: 'track', id: 'cs' };
    expect(deriveRenderMode(programCs, trackCs)).toBe('dual');
  });
});