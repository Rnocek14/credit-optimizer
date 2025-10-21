import { describe, it, expect } from 'vitest';
import { filterEligibleOptions, scoreOptions, compareByScore, pickBestOption, withinConstraints } from './optionFilters';
import type { MarketplaceOption } from '../types/v5';
import type { Constraints } from '../state/usePlanBasket';

describe('filterEligibleOptions', () => {
  const mockConstraints: Constraints = {
    max_budget_usd: 1000,
    min_cri_score: 70,
    max_ace_credits: 90,
  };

  const mockOptions: MarketplaceOption[] = [
    {
      id: 'opt1',
      courseId: 'c1',
      title: 'Course 1',
      credits: 3,
      subject: 'CS',
      provider: 'Provider A',
      cost_usd: 100,
      duration_weeks: 8,
      scoreBreakdown: { cost: 80, time: 75, quality: 85, cri: 90, total: 82.5 },
    },
    {
      id: 'opt2',
      courseId: 'c2',
      title: 'Course 2',
      credits: 3,
      subject: 'CS',
      provider: 'Provider B',
      cost_usd: 500,
      duration_weeks: 8,
      scoreBreakdown: { cost: 50, time: 75, quality: 80, cri: 60, total: 66.25 },
    },
    {
      id: 'opt3',
      courseId: 'c3',
      title: 'Course 3',
      credits: 3,
      subject: 'CS',
      provider: 'Provider C',
      cost_usd: 200,
      duration_weeks: 8,
      providerType: 'mooc',
      scoreBreakdown: { cost: 70, time: 75, quality: 75, cri: 75, total: 73.75 },
    },
  ];

  it('filters out options exceeding budget', () => {
    const runningTotals = { cost: 600, aceCredits: 0 };
    const basketIds = new Set<string>();

    const eligible = filterEligibleOptions(mockOptions, mockConstraints, runningTotals, basketIds);

    // opt2 (500) would push total to 1100, exceeding 1000 budget
    expect(eligible).toHaveLength(2);
    expect(eligible.map((o) => o.courseId)).toEqual(['c1', 'c3']);
  });

  it('filters out options below min CRI', () => {
    const runningTotals = { cost: 0, aceCredits: 0 };
    const basketIds = new Set<string>();

    const eligible = filterEligibleOptions(mockOptions, mockConstraints, runningTotals, basketIds);

    // opt2 has CRI 60, below 70 threshold
    expect(eligible).toHaveLength(2);
    expect(eligible.map((o) => o.courseId)).toEqual(['c1', 'c3']);
  });

  it('filters out MOOCs exceeding ACE cap', () => {
    const runningTotals = { cost: 0, aceCredits: 88 };
    const basketIds = new Set<string>();

    const eligible = filterEligibleOptions(mockOptions, mockConstraints, runningTotals, basketIds);

    // opt3 is MOOC with 3 credits, would push ACE total to 91, exceeding 90 cap
    expect(eligible).toHaveLength(2);
    expect(eligible.map((o) => o.courseId)).toEqual(['c1', 'c2']);
  });

  it('filters out options with unmet prerequisites', () => {
    const optionsWithPrereqs: MarketplaceOption[] = [
      { ...mockOptions[0], prereq_course_ids: [] },
      { ...mockOptions[1], prereq_course_ids: ['c1'] },
      { ...mockOptions[2], prereq_course_ids: ['c1', 'c2'] },
    ];

    const runningTotals = { cost: 0, aceCredits: 0 };
    const basketIds = new Set(['c1']); // Only c1 is in basket

    const eligible = filterEligibleOptions(optionsWithPrereqs, mockConstraints, runningTotals, basketIds);

    // opt3 needs both c1 and c2, but c2 is not in basket
    expect(eligible).toHaveLength(2);
    expect(eligible.map((o) => o.courseId)).toEqual(['c1', 'c2']);
  });
});

describe('compareByScore', () => {
  it('prioritizes higher score', () => {
    const a = {
      id: 'a',
      courseId: 'a',
      title: 'A',
      credits: 3,
      subject: 'CS',
      provider: 'P',
      cost_usd: 100,
      duration_weeks: 8,
      score: 80,
      scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 80, total: 80 },
    };

    const b = {
      ...a,
      courseId: 'b',
      score: 90,
      scoreBreakdown: { cost: 90, time: 90, quality: 90, cri: 90, total: 90 },
    };

    expect(compareByScore(a, b)).toBeGreaterThan(0); // b should come first (higher score)
  });

  it('uses CRI as tiebreaker when scores equal', () => {
    const a = {
      id: 'a',
      courseId: 'a',
      title: 'A',
      credits: 3,
      subject: 'CS',
      provider: 'P',
      cost_usd: 100,
      duration_weeks: 8,
      score: 80,
      scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 70, total: 80 },
    };

    const b = {
      ...a,
      courseId: 'b',
      scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 90, total: 80 },
    };

    expect(compareByScore(a, b)).toBeGreaterThan(0); // b should come first (higher CRI)
  });

  it('uses cost as tiebreaker when score and CRI equal', () => {
    const a = {
      id: 'a',
      courseId: 'a',
      title: 'A',
      credits: 3,
      subject: 'CS',
      provider: 'P',
      cost_usd: 200,
      duration_weeks: 8,
      score: 80,
      scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 80, total: 80 },
    };

    const b = {
      ...a,
      courseId: 'b',
      cost_usd: 100,
    };

    expect(compareByScore(a, b)).toBeGreaterThan(0); // b should come first (lower cost)
  });

  it('uses courseId as final tiebreaker', () => {
    const a = {
      id: 'a',
      courseId: 'z_course',
      title: 'A',
      credits: 3,
      subject: 'CS',
      provider: 'P',
      cost_usd: 100,
      duration_weeks: 8,
      score: 80,
      scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 80, total: 80 },
    };

    const b = {
      ...a,
      courseId: 'a_course',
    };

    expect(compareByScore(a, b)).toBeGreaterThan(0); // b should come first (lexicographic)
  });
});

describe('pickBestOption', () => {
  it('returns null for empty array', () => {
    expect(pickBestOption([])).toBeNull();
  });

  it('returns the highest scoring option', () => {
    const options = [
      {
        id: 'opt1',
        courseId: 'c1',
        title: 'C1',
        credits: 3,
        subject: 'CS',
        provider: 'P',
        cost_usd: 100,
        duration_weeks: 8,
        score: 70,
        scoreBreakdown: { cost: 70, time: 70, quality: 70, cri: 70, total: 70 },
      },
      {
        id: 'opt2',
        courseId: 'c2',
        title: 'C2',
        credits: 3,
        subject: 'CS',
        provider: 'P',
        cost_usd: 100,
        duration_weeks: 8,
        score: 90,
        scoreBreakdown: { cost: 90, time: 90, quality: 90, cri: 90, total: 90 },
      },
      {
        id: 'opt3',
        courseId: 'c3',
        title: 'C3',
        credits: 3,
        subject: 'CS',
        provider: 'P',
        cost_usd: 100,
        duration_weeks: 8,
        score: 80,
        scoreBreakdown: { cost: 80, time: 80, quality: 80, cri: 80, total: 80 },
      },
    ];

    const best = pickBestOption(options);
    expect(best?.courseId).toBe('c2');
  });
});

describe('withinConstraints', () => {
  it('returns false when budget would be exceeded', () => {
    const newItems: MarketplaceOption[] = [
      {
        id: 'opt1',
        courseId: 'c1',
        title: 'C1',
        credits: 3,
        subject: 'CS',
        provider: 'P',
        cost_usd: 300,
        duration_weeks: 8,
      },
    ];

    const runningTotals = { cost: 800, aceCredits: 0, workloadHours: 0 };
    const constraints: Constraints = { max_budget_usd: 1000 };

    expect(withinConstraints(newItems, runningTotals, constraints)).toBe(false);
  });

  it('returns false when ACE cap would be exceeded', () => {
    const newItems: MarketplaceOption[] = [
      {
        id: 'opt1',
        courseId: 'c1',
        title: 'C1',
        credits: 10,
        subject: 'CS',
        provider: 'P',
        providerType: 'mooc',
        cost_usd: 100,
        duration_weeks: 8,
      },
    ];

    const runningTotals = { cost: 0, aceCredits: 85, workloadHours: 0 };
    const constraints: Constraints = { max_ace_credits: 90 };

    expect(withinConstraints(newItems, runningTotals, constraints)).toBe(false);
  });

  it('returns true when within all constraints', () => {
    const newItems: MarketplaceOption[] = [
      {
        id: 'opt1',
        courseId: 'c1',
        title: 'C1',
        credits: 3,
        subject: 'CS',
        provider: 'P',
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
      },
    ];

    const runningTotals = { cost: 100, aceCredits: 30, workloadHours: 20 };
    const constraints: Constraints = {
      max_budget_usd: 1000,
      max_ace_credits: 90,
      max_weekly_hours: 40,
    };

    expect(withinConstraints(newItems, runningTotals, constraints)).toBe(true);
  });
});
