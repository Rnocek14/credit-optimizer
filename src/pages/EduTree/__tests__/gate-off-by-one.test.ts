// Gate positioning regression test - prevents off-by-one errors
import { describe, it, expect } from 'vitest';
import { computeProgramDivergence, computeTrackDivergence } from '../utils/divergence';

describe('Gate forkBetween is before first differing year', () => {
  it('programs diverge at Y2 ⇒ forkBetween [1,2]', () => {
    const blocks = [
      { id:'y1-a', level_year:1, program_id:'bs_cs' },
      { id:'y1-b', level_year:1, program_id:'bs_it' },
      { id:'y2-cs', level_year:2, program_id:'bs_cs' },
      { id:'y2-it', level_year:2, program_id:'bs_it' },
    ];
    const res = computeProgramDivergence(blocks, ['bs_cs','bs_it']);
    expect(res?.forkBetween).toEqual([1,2]);
  });

  it('tracks diverge at Y3 ⇒ forkBetween [2,3]', () => {
    const blocks = [
      { id:'y1', level_year:1, program_id:'bs_cs', track_id:'se' },
      { id:'y1', level_year:1, program_id:'bs_cs', track_id:'ds' },
      { id:'y2', level_year:2, program_id:'bs_cs', track_id:'se' },
      { id:'y2', level_year:2, program_id:'bs_cs', track_id:'ds' },
      { id:'y3-se', level_year:3, program_id:'bs_cs', track_id:'se' },
      { id:'y3-ds', level_year:3, program_id:'bs_cs', track_id:'ds' },
    ];
    const res = computeTrackDivergence(blocks, 'bs_cs', ['se','ds']);
    expect(res?.forkBetween).toEqual([2,3]);
  });

  it('first difference at Y4 ⇒ no gate', () => {
    const blocks = [
      { id:'y1', level_year:1, program_id:'bs_cs' },
      { id:'y1', level_year:1, program_id:'bs_it' },
      { id:'y2', level_year:2, program_id:'bs_cs' },
      { id:'y2', level_year:2, program_id:'bs_it' },
      { id:'y3', level_year:3, program_id:'bs_cs' },
      { id:'y3', level_year:3, program_id:'bs_it' },
      { id:'y4-cs', level_year:4, program_id:'bs_cs' },
      { id:'y4-it', level_year:4, program_id:'bs_it' },
    ];
    const res = computeProgramDivergence(blocks, ['bs_cs','bs_it']);
    expect(res?.forkBetween ?? null).toBeNull();
  });
});