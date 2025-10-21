import { describe, it, expect } from 'vitest';
import { autoCompletePlan } from './autoComplete';
import type { ScoringWeights } from '../utils/optionScoring';

const defaultWeights: ScoringWeights = { cost: 0.33, time: 0.33, quality: 0.34 };

describe('autoCompletePlan - Reasoning Thresholds', () => {
  it('shows "Top-rated match" for score >= 80', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 80,
            scoreBreakdown: { cri: 85, cost: 75, time: 80, quality: 80, total: 80 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    expect(result.reasoning.get('course1')).toContain('Top-rated match');
  });

  it('does not show "Top-rated match" for score < 80', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 79,
            scoreBreakdown: { cri: 70, cost: 75, time: 80, quality: 80, total: 79 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    expect(result.reasoning.get('course1')).not.toContain('Top-rated match');
  });

  it('shows transfer safety for CRI >= 85', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 80,
            scoreBreakdown: { cri: 92, cost: 75, time: 80, quality: 80, total: 80 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    expect(result.reasoning.get('course1')).toContain('92% transfer safety');
  });

  it('shows fast completion for duration <= 8 weeks', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 6,
            score: 75,
            scoreBreakdown: { cri: 80, cost: 70, time: 85, quality: 75, total: 75 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    expect(result.reasoning.get('course1')).toContain('Fast completion');
  });

  it('shows budget-friendly for low cost', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 50,
            duration_weeks: 8,
            score: 75,
            scoreBreakdown: { cri: 75, cost: 95, time: 70, quality: 70, total: 75 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    const reasoning = result.reasoning.get('course1') || '';
    expect(reasoning.toLowerCase()).toContain('budget');
  });
});

describe('autoCompletePlan - Constraint Respect', () => {
  it('respects budget constraint', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 2000,
            duration_weeks: 8,
            score: 90,
            scoreBreakdown: { cri: 85, cost: 75, time: 80, quality: 80, total: 90 },
            providerType: 'university' as const,
            workload_weekly_hours: 12
          },
          {
            courseId: 'course2',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 70,
            scoreBreakdown: { cri: 75, cost: 90, time: 80, quality: 70, total: 70 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(
      modules, 
      [], 
      { max_budget_usd: 500 }, 
      defaultWeights
    );
    
    // Should choose cheaper option despite lower score
    expect(result.suggestions[0].courseId).toBe('course2');
    expect(result.status).toBe('ok');
  });

  it('respects ACE transfer cap', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 10,
            cost_usd: 100,
            duration_weeks: 8,
            score: 90,
            scoreBreakdown: { cri: 85, cost: 90, time: 80, quality: 80, total: 90 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          },
          {
            courseId: 'course2',
            credits: 3,
            cost_usd: 500,
            duration_weeks: 16,
            score: 70,
            scoreBreakdown: { cri: 95, cost: 60, time: 70, quality: 90, total: 70 },
            providerType: 'university' as const,
            workload_weekly_hours: 12
          }
        ]
      }
    ];

    const currentBasket = [
      {
        moduleId: 'mod0',
        courseId: 'existing',
        credits: 85,
        cost_usd: 1000,
        duration_weeks: 60,
        workload_weekly_hours: 10,
        cri_score: 80,
        status: 'pinned' as const,
        providerType: 'mooc' as const
      }
    ];

    const result = autoCompletePlan(
      modules,
      currentBasket,
      { max_ace_credits: 90 },
      defaultWeights
    );
    
    // Should choose university option to avoid exceeding ACE cap (85 + 10 > 90)
    expect(result.suggestions[0].courseId).toBe('course2');
  });

  it('respects minimum CRI constraint', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 50,
            duration_weeks: 4,
            score: 80,
            scoreBreakdown: { cri: 70, cost: 90, time: 85, quality: 75, total: 80 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 5
          },
          {
            courseId: 'course2',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 75,
            scoreBreakdown: { cri: 92, cost: 80, time: 70, quality: 85, total: 75 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(
      modules,
      [],
      { min_cri_score: 85 },
      defaultWeights
    );
    
    // Should choose higher CRI option despite lower overall score
    expect(result.suggestions[0].courseId).toBe('course2');
  });

  it('handles multiple constraints simultaneously', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 2000,
            duration_weeks: 16,
            score: 95,
            scoreBreakdown: { cri: 98, cost: 50, time: 60, quality: 95, total: 95 },
            providerType: 'university' as const,
            workload_weekly_hours: 15
          },
          {
            courseId: 'course2',
            credits: 3,
            cost_usd: 200,
            duration_weeks: 8,
            score: 85,
            scoreBreakdown: { cri: 88, cost: 85, time: 80, quality: 88, total: 85 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 8
          }
        ]
      }
    ];

    const result = autoCompletePlan(
      modules,
      [],
      { 
        max_budget_usd: 500,
        min_cri_score: 85,
        max_weekly_hours: 10
      },
      defaultWeights
    );
    
    // Should choose course2 (meets all constraints)
    expect(result.suggestions[0].courseId).toBe('course2');
  });
});

describe('autoCompletePlan - Edge Cases', () => {
  it('handles empty marketplace options', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: []
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    expect(result.suggestions).toHaveLength(0);
  });

  it('skips modules already in basket', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 80,
            scoreBreakdown: { cri: 85, cost: 75, time: 80, quality: 80, total: 80 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const currentBasket = [
      {
        moduleId: 'mod1',
        courseId: 'existing',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 85,
        status: 'pinned' as const,
        providerType: 'mooc' as const
      }
    ];

    const result = autoCompletePlan(modules, currentBasket, {}, defaultWeights);
    
    expect(result.suggestions).toHaveLength(0);
  });

  it('provides reasoning for each suggestion', () => {
    const modules = [
      {
        id: 'mod1',
        marketplaceOptions: [
          {
            courseId: 'course1',
            credits: 3,
            cost_usd: 100,
            duration_weeks: 8,
            score: 80,
            scoreBreakdown: { cri: 85, cost: 75, time: 80, quality: 80, total: 80 },
            providerType: 'mooc' as const,
            workload_weekly_hours: 7.5
          }
        ]
      }
    ];

    const result = autoCompletePlan(modules, [], {}, defaultWeights);
    
    expect(result.suggestions).toHaveLength(1);
    expect(result.reasoning.has('course1')).toBe(true);
    expect(result.reasoning.get('course1')).toBeTruthy();
  });
});
