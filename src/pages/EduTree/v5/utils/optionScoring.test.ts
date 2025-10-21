import { describe, it, expect } from 'vitest';
import { calculateOptionScore } from './optionScoring';

describe('optionScoring – normalization & ties', () => {
  it('cost ties are neutral (50/100)', () => {
    const options = [
      { cost_usd: 500, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 500, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 500, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.cost).toBe(50);
  });

  it('free courses get perfect cost score', () => {
    const options = [
      { cost_usd: 0, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.cost).toBe(100);
  });

  it('null cost is neutral, not free', () => {
    const options = [
      { cost_usd: null, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100,  duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.cost).toBe(50);
  });
  
  it('handles NaN gracefully', () => {
    const options = [
      { cost_usd: NaN, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.cost).toBe(50);
  });

  it('single option module has neutral scores', () => {
    const options = [
      { cost_usd: 500, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.cost).toBe(50);
    expect(r.time).toBe(50);
  });
});

describe('weight sensitivity', () => {
  it('quality weight reorders toward universities', () => {
    const options = [
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'university' as const },
    ];
    const w1 = { cost: 0.4, time: 0.3, quality: 0.3 };
    const w2 = { cost: 0.1, time: 0.1, quality: 0.8 };
    
    const s1 = options.map(o => calculateOptionScore(o, options, w1).total);
    const s2 = options.map(o => calculateOptionScore(o, options, w2).total);
    
    expect(s2[1] - s2[0]).toBeGreaterThan(s1[1] - s1[0]);
  });
  
  it('cost weight does not affect tied costs', () => {
    const options = [
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'university' as const },
    ];
    const w1 = { cost: 0.4, time: 0.3, quality: 0.3 };
    const w2 = { cost: 0.8, time: 0.1, quality: 0.1 };
    
    const s1 = options.map(o => calculateOptionScore(o, options, w1).total);
    const s2 = options.map(o => calculateOptionScore(o, options, w2).total);
    
    // Order should remain the same (quality still differentiates)
    expect(s1[1] > s1[0]).toBe(s2[1] > s2[0]);
  });
});

describe('CRI calculation', () => {
  it('differentiates by ACE accreditation', () => {
    const opt1 = { 
      cost_usd: 100, 
      duration_weeks: 8, 
      providerType: 'mooc' as const, 
      aceNccrs: false, 
      proctored: false 
    };
    const opt2 = { 
      cost_usd: 100, 
      duration_weeks: 8, 
      providerType: 'mooc' as const, 
      aceNccrs: true, 
      proctored: false 
    };
    
    const r1 = calculateOptionScore(opt1, [opt1, opt2]);
    const r2 = calculateOptionScore(opt2, [opt1, opt2]);
    
    expect(r2.cri).toBeGreaterThan(r1.cri);
  });
  
  it('differentiates by proctoring', () => {
    const opt1 = { 
      cost_usd: 100, 
      duration_weeks: 8, 
      providerType: 'mooc' as const, 
      aceNccrs: false, 
      proctored: false 
    };
    const opt2 = { 
      cost_usd: 100, 
      duration_weeks: 8, 
      providerType: 'mooc' as const, 
      aceNccrs: false, 
      proctored: true 
    };
    
    const r1 = calculateOptionScore(opt1, [opt1, opt2]);
    const r2 = calculateOptionScore(opt2, [opt1, opt2]);
    
    expect(r2.cri).toBeGreaterThan(r1.cri);
  });
  
  it('universities score higher than MOOCs', () => {
    const opt1 = { 
      cost_usd: 100, 
      duration_weeks: 8, 
      providerType: 'mooc' as const 
    };
    const opt2 = { 
      cost_usd: 100, 
      duration_weeks: 8, 
      providerType: 'university' as const 
    };
    
    const r1 = calculateOptionScore(opt1, [opt1, opt2]);
    const r2 = calculateOptionScore(opt2, [opt1, opt2]);
    
    expect(r2.cri).toBeGreaterThan(r1.cri);
    expect(r2.quality).toBeGreaterThan(r1.quality);
  });
});

describe('edge cases', () => {
  it('handles all null costs', () => {
    const options = [
      { cost_usd: null, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: null, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    
    const r = calculateOptionScore(options[0], options);
    expect(r.cost).toBe(50);
    expect(r.total).toBeGreaterThan(0);
  });
  
  it('handles mixed null and zero costs', () => {
    const options = [
      { cost_usd: null, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 0, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    
    const r1 = calculateOptionScore(options[0], options);
    const r2 = calculateOptionScore(options[1], options);
    const r3 = calculateOptionScore(options[2], options);
    
    expect(r1.cost).toBe(50);  // null = neutral
    expect(r2.cost).toBe(100); // free = perfect
    expect(r3.cost).toBe(0);   // expensive = worst
  });
});

describe('duration edge cases', () => {
  it('duration ties are neutral (50/100)', () => {
    const options = [
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.time).toBe(50);
  });

  it('null duration is neutral', () => {
    const options = [
      { cost_usd: 100, duration_weeks: null, providerType: 'mooc' as const },
      { cost_usd: 100, duration_weeks: 8, providerType: 'mooc' as const },
    ];
    const r = calculateOptionScore(options[0], options);
    expect(r.time).toBe(50);
  });
});
