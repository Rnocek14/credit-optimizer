import { describe, it, expect } from 'vitest';
import { validatePlan } from './constraints';
import type { BasketItem } from '../state/usePlanBasket';

describe('validatePlan - Transfer Cap', () => {
  it('triggers violation when ACE credits exceed cap', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      },
      {
        moduleId: 'mod2',
        courseId: 'course2',
        credits: 4,
        cost_usd: 50,
        duration_weeks: 4,
        workload_weekly_hours: 5,
        cri_score: 85,
        status: 'pinned',
        providerType: 'testing_center'
      }
    ];

    const violations = validatePlan(basket, [], { max_ace_credits: 6 });
    
    const transferCapViolation = violations.find(v => v.type === 'transfer_cap');
    expect(transferCapViolation).toBeDefined();
    expect(transferCapViolation?.severity).toBe('error');
    expect(transferCapViolation?.message).toContain('7 ACE/alt credits exceeds 6');
  });

  it('no violation when ACE credits under cap', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const violations = validatePlan(basket, [], { max_ace_credits: 90 });
    
    const transferCapViolation = violations.find(v => v.type === 'transfer_cap');
    expect(transferCapViolation).toBeUndefined();
  });

  it('university courses do not count toward ACE cap', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 10,
        cost_usd: 1000,
        duration_weeks: 16,
        workload_weekly_hours: 12,
        cri_score: 95,
        status: 'pinned',
        providerType: 'university'
      }
    ];

    const violations = validatePlan(basket, [], { max_ace_credits: 6 });
    
    const transferCapViolation = violations.find(v => v.type === 'transfer_cap');
    expect(transferCapViolation).toBeUndefined();
  });

  /**
   * CRITICAL INVARIANT: Missing providerType is treated as ALT credit (conservative).
   * 
   * Rationale:
   * - Prevents "silent graduation eligibility" with unknown provenance
   * - Forces upstream normalization (fix the data instead of letting unknowns pass)
   * - Matches the design intent in altCredit.ts (countsTowardAltCap)
   * 
   * This is a safety posture - if we don't know the provider, we assume the
   * most restrictive classification to avoid false "graduation ready" signals.
   * 
   * Key name mapping (from constraints.ts line 175-181):
   * - max_alt_credit (from policy) takes precedence
   * - max_ace_credits (from constraints) is fallback
   * - effectiveAltCap = policyAltCap ?? constraintsAltCap
   */
  it('null providerType COUNTS toward ALT cap (conservative - fail safe)', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 10,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: null
      }
    ];

    // IMPORTANT: Use max_alt_credit (policy key) - this takes precedence per constraints.ts
    // bucket_mode must be 'separate' for alt_cap to be enforced
    const violations = validatePlan(basket, [], { 
      transfer_alt_bucket_mode: 'separate',
      max_alt_credit: 6, // Policy key (takes precedence)
    } as any);
    
    // Should trigger alt_cap violation since 10 > 6
    const altCapViolation = violations.find(v => v.type === 'alt_cap');
    expect(altCapViolation).toBeDefined();
    expect(altCapViolation?.severity).toBe('error');
    expect(altCapViolation?.message).toContain('10 alt credits exceeds 6');
  });

  it('null providerType under cap produces no alt_cap violation', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 5, // Under the 6-credit cap
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: null
      }
    ];

    const violations = validatePlan(basket, [], { 
      transfer_alt_bucket_mode: 'separate',
      max_alt_credit: 6,
    } as any);
    
    // No violation since 5 < 6
    const altCapViolation = violations.find(v => v.type === 'alt_cap');
    expect(altCapViolation).toBeUndefined();
  });

  it('null providerType uses fallback max_ace_credits when max_alt_credit missing', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 10,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: null
      }
    ];

    // Use max_ace_credits (constraints key) as fallback
    const violations = validatePlan(basket, [], { 
      transfer_alt_bucket_mode: 'separate',
      max_ace_credits: 6, // Fallback key
    } as any);
    
    const altCapViolation = violations.find(v => v.type === 'alt_cap');
    expect(altCapViolation).toBeDefined();
    expect(altCapViolation?.message).toContain('10 alt credits exceeds 6');
  });
});

describe('validatePlan - Workload', () => {
  it('triggers warning when total weekly hours exceed cap', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      },
      {
        moduleId: 'mod2',
        courseId: 'course2',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 15,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      },
      {
        moduleId: 'mod3',
        courseId: 'course3',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 25,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const violations = validatePlan(basket, [], { max_weekly_hours: 20 });
    
    const workloadViolation = violations.find(v => v.type === 'workload');
    expect(workloadViolation).toBeDefined();
    expect(workloadViolation?.severity).toBe('warning');
    expect(workloadViolation?.message).toContain('50hrs/wk exceeds 20hrs/wk');
  });

  it('handles undefined workload_weekly_hours gracefully', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: undefined as any,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const violations = validatePlan(basket, [], { max_weekly_hours: 20 });
    
    const workloadViolation = violations.find(v => v.type === 'workload');
    expect(workloadViolation).toBeUndefined();
  });

  it('no violation when total weekly hours under cap', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 8,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      },
      {
        moduleId: 'mod2',
        courseId: 'course2',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const violations = validatePlan(basket, [], { max_weekly_hours: 20 });
    
    const workloadViolation = violations.find(v => v.type === 'workload');
    expect(workloadViolation).toBeUndefined();
  });
});

describe('validatePlan - Deadline with Concurrency', () => {
  it('includes concurrency in deadline violation message', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 12,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      },
      {
        moduleId: 'mod2',
        courseId: 'course2',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 12,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const targetDate = new Date(Date.now() + 10 * 7 * 24 * 60 * 60 * 1000); // 10 weeks from now
    const violations = validatePlan(basket, [], { 
      target_graduation_date: targetDate,
      max_concurrent_courses: 2 
    });
    
    const deadlineViolation = violations.find(v => v.type === 'deadline');
    expect(deadlineViolation).toBeDefined();
    expect(deadlineViolation?.message).toContain('12 weeks');
    expect(deadlineViolation?.message).toContain('max 2 concurrent');
  });

  it('accounts for concurrency=1 in deadline calculation', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      },
      {
        moduleId: 'mod2',
        courseId: 'course2',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const targetDate = new Date(Date.now() + 10 * 7 * 24 * 60 * 60 * 1000); // 10 weeks from now
    const violations = validatePlan(basket, [], { 
      target_graduation_date: targetDate,
      max_concurrent_courses: 1 
    });
    
    const deadlineViolation = violations.find(v => v.type === 'deadline');
    expect(deadlineViolation).toBeDefined();
    expect(deadlineViolation?.message).toContain('16 weeks');
    expect(deadlineViolation?.message).toContain('max 1 concurrent');
  });

  it('no deadline violation when plan fits within target date', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 100,
        duration_weeks: 4,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const targetDate = new Date(Date.now() + 52 * 7 * 24 * 60 * 60 * 1000); // 52 weeks from now
    const violations = validatePlan(basket, [], { 
      target_graduation_date: targetDate,
      max_concurrent_courses: 2 
    });
    
    const deadlineViolation = violations.find(v => v.type === 'deadline');
    expect(deadlineViolation).toBeUndefined();
  });
});

describe('validatePlan - Budget', () => {
  it('triggers violation when total cost exceeds budget', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: 800,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'university'
      },
      {
        moduleId: 'mod2',
        courseId: 'course2',
        credits: 3,
        cost_usd: 500,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'university'
      }
    ];

    const violations = validatePlan(basket, [], { max_budget_usd: 1000 });
    
    const budgetViolation = violations.find(v => v.type === 'budget');
    expect(budgetViolation).toBeDefined();
    expect(budgetViolation?.severity).toBe('error');
    expect(budgetViolation?.message).toContain('$1,300 exceeds budget of $1,000');
  });

  it('handles null costs gracefully', () => {
    const basket: BasketItem[] = [
      {
        moduleId: 'mod1',
        courseId: 'course1',
        credits: 3,
        cost_usd: null,
        duration_weeks: 8,
        workload_weekly_hours: 7.5,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc'
      }
    ];

    const violations = validatePlan(basket, [], { max_budget_usd: 1000 });
    
    const budgetViolation = violations.find(v => v.type === 'budget');
    expect(budgetViolation).toBeUndefined();
  });
});
