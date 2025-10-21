import { resolveChain, detectCycles } from '../prereqs';
import type { BasketItem, MarketplaceOption } from '../../types/exports';

const opt = (id: string, prereqs: string[] = []): MarketplaceOption => ({
  id, courseId: id, title: id, credits: 3, subject: 'X', provider: 'Y',
  cost_usd: 100, duration_weeks: 8, prereq_course_ids: prereqs,
  providerType: 'mooc', workload_weekly_hours: 10, cri_score: 80,
  scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 80, total: 80 }
});

describe('prereqs.resolveChain', () => {
  it('returns ordered missing prereqs (deepest-first) for target', () => {
    const options = [opt('A'), opt('B', ['A']), opt('C', ['B'])];
    const basket: BasketItem[] = [{ 
      moduleId:'m', courseId:'A', credits:3, cost_usd:100, 
      duration_weeks:8, workload_weekly_hours:10, cri_score:80, status:'pinned' 
    }];
    const chain = resolveChain('C', options, basket);
    expect(chain.chain).toEqual(['B']); // A already in basket
    expect(chain.unsatisfiable).toEqual([]);
  });

  it('flags unsatisfiable prereqs when not in marketplace', () => {
    const options = [opt('C', ['B']), opt('B', ['A'])]; // A missing
    const basket: BasketItem[] = [];
    const chain = resolveChain('C', options, basket);
    expect(chain.chain).toEqual(['A', 'B']); // includes missing id in chain attempt
    expect(chain.unsatisfiable).toContain('A');
  });
});

describe('prereqs.detectCycles', () => {
  it('detects simple cycle', () => {
    const options = [opt('X', ['Y']), opt('Y', ['X'])];
    const cycles = detectCycles(options);
    expect(cycles).not.toBeNull();
    expect(cycles?.[0].courses.join('')).toContain('X');
    expect(cycles?.[0].courses.join('')).toContain('Y');
  });

  it('returns null when no cycles', () => {
    const options = [opt('A'), opt('B', ['A']), opt('C', ['B'])];
    expect(detectCycles(options)).toBeNull();
  });
});
