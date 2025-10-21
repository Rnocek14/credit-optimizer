import { describe, it, expect } from 'vitest';
import { autoCompletePlan } from './autoComplete';
import type { ModuleData } from './autoComplete';
import type { BasketItem } from '../state/usePlanBasket';

describe('autoCompletePlan - Reasoning & Status', () => {
  it('returns suggestions with auto-filled status and reasoning', () => {
    const modules: ModuleData[] = [
      {
        id: 'mod-101',
        marketplaceOptions: [
          {
            courseId: 'CS101',
            credits: 3,
            cost_usd: 299,
            duration_weeks: 8,
            workload_weekly_hours: 10,
            scoreBreakdown: { cri: 95, cost: 90, time: 85, quality: 90, total: 90 },
            prerequisites: [],
            providerType: 'university' as const,
          },
          {
            courseId: 'CS101-ALT',
            credits: 3,
            cost_usd: 499,
            duration_weeks: 12,
            workload_weekly_hours: 12,
            scoreBreakdown: { cri: 75, cost: 60, time: 70, quality: 70, total: 68 },
            prerequisites: [],
            providerType: 'mooc' as const,
          },
        ],
      },
    ];

    const currentBasket: BasketItem[] = [];
    const constraints = {
      max_budget_usd: 5000,
      min_cri_score: 70,
      max_ace_credits: 90,
    };
    const weights = { quality: 0.5, cost: 0.3, time: 0.2 };

    const result = autoCompletePlan(modules, currentBasket, constraints, weights);

    expect(result.suggestions).toHaveLength(1);
    
    const suggestion = result.suggestions[0];
    expect(suggestion.status).toBe('auto-filled');
    expect(suggestion.autoFillReason).toBeDefined();
    expect(suggestion.autoFillReason).toContain('Top-rated match');
    expect(suggestion.courseId).toBe('CS101');
  });

  it('includes reasoning for cost-optimized selections', () => {
    const modules: ModuleData[] = [
      {
        id: 'mod-102',
        marketplaceOptions: [
          {
            courseId: 'CHEAP',
            credits: 3,
            cost_usd: 99,
            duration_weeks: 8,
            workload_weekly_hours: 10,
            scoreBreakdown: { cri: 80, cost: 95, time: 85, quality: 85, total: 88 },
            prerequisites: [],
            providerType: 'mooc' as const,
          },
        ],
      },
    ];

    const result = autoCompletePlan(modules, [], {}, { quality: 0.2, cost: 0.6, time: 0.2 });

    expect(result.suggestions[0].autoFillReason).toContain('Lowest cost');
  });

  it('includes reasoning for duration-optimized selections', () => {
    const modules: ModuleData[] = [
      {
        id: 'mod-103',
        marketplaceOptions: [
          {
            courseId: 'FAST',
            credits: 3,
            cost_usd: 299,
            duration_weeks: 4,
            workload_weekly_hours: 15,
            scoreBreakdown: { cri: 85, cost: 70, time: 95, quality: 83, total: 83 },
            prerequisites: [],
            providerType: 'bootcamp' as const,
          },
        ],
      },
    ];

    const result = autoCompletePlan(modules, [], {}, { quality: 0.2, cost: 0.2, time: 0.6 });

    expect(result.suggestions[0].autoFillReason).toContain('Fastest completion');
  });

  it('filters options below min CRI threshold', () => {
    const modules: ModuleData[] = [
      {
        id: 'mod-104',
        marketplaceOptions: [
          {
            courseId: 'LOW-CRI',
            credits: 3,
            cost_usd: 99,
            duration_weeks: 6,
            workload_weekly_hours: 8,
            scoreBreakdown: { cri: 60, cost: 95, time: 90, quality: 65, total: 78 },
            prerequisites: [],
            providerType: 'mooc' as const,
          },
          {
            courseId: 'HIGH-CRI',
            credits: 3,
            cost_usd: 299,
            duration_weeks: 8,
            workload_weekly_hours: 10,
            scoreBreakdown: { cri: 90, cost: 80, time: 85, quality: 88, total: 86 },
            prerequisites: [],
            providerType: 'university' as const,
          },
        ],
      },
    ];

    const result = autoCompletePlan(modules, [], { min_cri_score: 85 }, { quality: 0.5, cost: 0.3, time: 0.2 });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].courseId).toBe('HIGH-CRI');
    expect(result.suggestions[0].autoFillReason).toBeDefined();
  });

  it('returns partial status when some modules cannot be filled', () => {
    const modules: ModuleData[] = [
      {
        id: 'mod-105',
        marketplaceOptions: [
          {
            courseId: 'VALID',
            credits: 3,
            cost_usd: 299,
            duration_weeks: 8,
            workload_weekly_hours: 10,
            scoreBreakdown: { cri: 85, cost: 80, time: 85, quality: 83, total: 83 },
            prerequisites: [],
            providerType: 'university' as const,
          },
        ],
      },
      {
        id: 'mod-106',
        marketplaceOptions: [
          {
            courseId: 'TOO-EXPENSIVE',
            credits: 3,
            cost_usd: 10000,
            duration_weeks: 8,
            workload_weekly_hours: 10,
            scoreBreakdown: { cri: 95, cost: 20, time: 85, quality: 90, total: 73 },
            prerequisites: [],
            providerType: 'bootcamp' as const,
          },
        ],
      },
    ];

    const result = autoCompletePlan(modules, [], { max_budget_usd: 500 }, { quality: 0.5, cost: 0.3, time: 0.2 });

    expect(result.status).toBe('partial');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].courseId).toBe('VALID');
  });
});
