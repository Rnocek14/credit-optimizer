import { describe, it, expect } from 'vitest';
import { calculateTotals, calculateRunningTotals, wouldViolateConstraints } from './totalsCalculator';
import type { BasketItem, Constraints } from '../state/usePlanBasket';

describe('calculateTotals', () => {
  const mockConstraints: Constraints = {
    max_concurrent_courses: 2,
    max_budget_usd: 5000,
    max_ace_credits: 90,
    max_weekly_hours: 40,
  };

  it('returns zero totals for empty basket', () => {
    const totals = calculateTotals([], mockConstraints);
    expect(totals).toEqual({
      totalCost: 0,
      totalWeeks: 0,
      avgCRI: 0,
      totalWorkloadHours: 0,
      aceCredits: 0,
    });
  });

  it('calculates cost correctly', () => {
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', title: 'Course 1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm2', courseId: 'c2', title: 'Course 2', credits: 3, cost_usd: 200, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 85, status: 'pinned' },
    ];

    const totals = calculateTotals(items, mockConstraints);
    expect(totals.totalCost).toBe(300);
  });

  it('handles null costs', () => {
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: null, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 85, status: 'pinned' },
    ];

    const totals = calculateTotals(items, mockConstraints);
    expect(totals.totalCost).toBe(100);
  });

  it('calculates weeks using concurrency (2 concurrent)', () => {
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm3', courseId: 'c3', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
    ];

    const totals = calculateTotals(items, mockConstraints);
    // 3 courses × 8 weeks = 24 serial weeks
    // 24 / 2 concurrent = 12 weeks
    expect(totals.totalWeeks).toBe(12);
  });

  it('calculates weeks with 3 concurrent courses', () => {
    const constraints: Constraints = { max_concurrent_courses: 3 };
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 6, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 6, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm3', courseId: 'c3', credits: 3, cost_usd: 100, duration_weeks: 6, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm4', courseId: 'c4', credits: 3, cost_usd: 100, duration_weeks: 6, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
    ];

    const totals = calculateTotals(items, constraints);
    // 4 courses × 6 weeks = 24 serial weeks
    // 24 / 3 concurrent = 8 weeks
    expect(totals.totalWeeks).toBe(8);
  });

  it('calculates average CRI', () => {
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 90, status: 'pinned' },
    ];

    const totals = calculateTotals(items, mockConstraints);
    expect(totals.avgCRI).toBe(85);
  });

  it('calculates total workload hours', () => {
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 15, cri_score: 80, status: 'pinned' },
    ];

    const totals = calculateTotals(items, mockConstraints);
    expect(totals.totalWorkloadHours).toBe(25);
  });

  it('counts ACE credits only for MOOCs and testing centers', () => {
    const items: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned', providerType: 'university' },
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned', providerType: 'mooc' },
      { moduleId: 'm3', courseId: 'c3', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned', providerType: 'testing_center' },
      { moduleId: 'm4', courseId: 'c4', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned', providerType: 'bootcamp' },
    ];

    const totals = calculateTotals(items, mockConstraints);
    // Only c2 (mooc) and c3 (testing_center) count
    expect(totals.aceCredits).toBe(6);
  });
});

describe('calculateRunningTotals', () => {
  const mockConstraints: Constraints = { max_concurrent_courses: 2 };

  it('combines existing and new items', () => {
    const existing: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
    ];

    const newItems: BasketItem[] = [
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 200, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 85, status: 'auto-filled' },
    ];

    const totals = calculateRunningTotals(existing, newItems, mockConstraints);
    expect(totals.totalCost).toBe(300);
    expect(totals.avgCRI).toBe(82.5);
  });
});

describe('wouldViolateConstraints', () => {
  it('detects budget violation', () => {
    const existing: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 400, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
    ];

    const newItems: BasketItem[] = [
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 200, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 85, status: 'auto-filled' },
    ];

    const constraints: Constraints = { max_budget_usd: 500 };
    const result = wouldViolateConstraints(existing, newItems, constraints);

    expect(result.violated).toBe(true);
    expect(result.reason).toContain('Budget exceeded');
  });

  it('detects ACE credit cap violation', () => {
    const existing: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 60, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned', providerType: 'mooc' },
    ];

    const newItems: BasketItem[] = [
      { moduleId: 'm2', courseId: 'c2', credits: 40, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 85, status: 'auto-filled', providerType: 'mooc' },
    ];

    const constraints: Constraints = { max_ace_credits: 90 };
    const result = wouldViolateConstraints(existing, newItems, constraints);

    expect(result.violated).toBe(true);
    expect(result.reason).toContain('ACE credit cap exceeded');
  });

  it('detects workload violation', () => {
    const existing: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 25, cri_score: 80, status: 'pinned' },
    ];

    const newItems: BasketItem[] = [
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 20, cri_score: 85, status: 'auto-filled' },
    ];

    const constraints: Constraints = { max_weekly_hours: 40 };
    const result = wouldViolateConstraints(existing, newItems, constraints);

    expect(result.violated).toBe(true);
    expect(result.reason).toContain('Weekly workload exceeded');
  });

  it('returns no violation when within constraints', () => {
    const existing: BasketItem[] = [
      { moduleId: 'm1', courseId: 'c1', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 80, status: 'pinned' },
    ];

    const newItems: BasketItem[] = [
      { moduleId: 'm2', courseId: 'c2', credits: 3, cost_usd: 100, duration_weeks: 8, workload_weekly_hours: 10, cri_score: 85, status: 'auto-filled' },
    ];

    const constraints: Constraints = {
      max_budget_usd: 5000,
      max_ace_credits: 90,
      max_weekly_hours: 40,
    };

    const result = wouldViolateConstraints(existing, newItems, constraints);
    expect(result.violated).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});
