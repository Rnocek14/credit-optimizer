import { autoCompletePlan } from '../autoCompletePlan';
import type { BasketItem, Constraints, ModuleData, MarketplaceOption, ScoringWeights } from '../../types/exports';

const mo = (id: string, cost = 100, cri = 80): MarketplaceOption => ({
  id, courseId: id, title: id, credits: 3, subject: 'X', provider: 'Y',
  providerType: 'mooc', cost_usd: cost, duration_weeks: 8,
  workload_weekly_hours: 10, cri_score: cri, prereq_course_ids: [],
  scoreBreakdown: { cost: 80, time: 80, quality: cri, cri, total: cri },
});

const mod = (moduleId: string, options: MarketplaceOption[]): ModuleData => ({
  id: moduleId, label: moduleId, icon: 'BookOpen', description: '', courses: [],
  creditsEarned: 0, creditsRequired: 3, isCollapsed: false,
  marketplaceOptions: options, optionsCount: options.length, cheapestOption: null
});

const weights: ScoringWeights = { cost: 0.33, time: 0.33, cri: 0.34 };

describe('autoCompletePlan (preview)', () => {
  it('returns ok with suggestions when eligible options exist', () => {
    const modules = [mod('m1', [mo('c1', 100, 90)]), mod('m2', [mo('c2', 120, 85)])];
    const basket: BasketItem[] = [];
    const constraints: Constraints = { 
      max_concurrent_courses: 2, max_budget_usd: 1000, 
      max_ace_credits: 120, max_weekly_hours: 80 
    };

    const r = autoCompletePlan(modules, basket, constraints, weights);
    expect(r.status).toBe('ok');
    expect(r.suggestions.length).toBe(2);
    expect(r.totals.totalCost).toBeGreaterThan(0);
  });

  it('stops with partial when budget would be exceeded', () => {
    const modules = [mod('m1', [mo('cheap', 100, 80)]), mod('m2', [mo('exp', 1000, 90)])];
    const constraints: Constraints = { max_budget_usd: 200, max_concurrent_courses: 2 };
    const r = autoCompletePlan(modules, [], constraints, weights);
    expect(['partial', 'none']).toContain(r.status); // depending on first pick affordance
    expect(r.stoppedReason).toMatch(/Constraints limit|Budget/i);
  });

  it('is deterministic for same inputs', () => {
    const modules = [mod('m1', [mo('c1', 200, 85), mo('c2', 200, 85)])]; // tie → courseId tiebreaker
    const a = autoCompletePlan(modules, [], { max_concurrent_courses: 2 }, weights);
    const b = autoCompletePlan(modules, [], { max_concurrent_courses: 2 }, weights);
    expect(a.suggestions.map(s => s.courseId)).toEqual(b.suggestions.map(s => s.courseId));
  });

  it('adds shared prereqs only once across modules', () => {
    const shared = mo('MATH-101', 50, 90);
    const m1Pick = { ...mo('C1', 200, 85), prereq_course_ids: ['MATH-101'] };
    const m2Pick = { ...mo('C2', 220, 86), prereq_course_ids: ['MATH-101'] };

    const modules = [
      mod('m1', [m1Pick, shared]), 
      mod('m2', [m2Pick, shared])
    ];
    
    const r = autoCompletePlan(modules, [], { max_concurrent_courses: 4, max_budget_usd: 10000 }, weights);

    const mathCount = r.suggestions.filter(s => s.courseId === 'MATH-101').length;
    expect(mathCount).toBe(1);
    expect(r.suggestions.length).toBe(3); // MATH-101 + C1 + C2
  });

  it('assigns prerequisites to neutral "prereqs" module', () => {
    const prereq = mo('PREREQ-101', 50, 80);
    const main = { ...mo('MAIN-201', 100, 90), prereq_course_ids: ['PREREQ-101'] };
    const modules = [mod('target-module', [main, prereq])];

    const r = autoCompletePlan(modules, [], { max_concurrent_courses: 2, max_budget_usd: 1000 }, weights);
    
    const p = r.suggestions.find(s => s.courseId === 'PREREQ-101');
    expect(p?.moduleId).toBe('prereqs');
  });
});
