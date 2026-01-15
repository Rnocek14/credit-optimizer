import { describe, it, expect } from 'vitest';
import { validatePlan } from './constraints';
import { VIOLATION_TYPES } from './violationTypes';
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
    
    const transferCapViolation = violations.find(v => v.type === VIOLATION_TYPES.ALT_CAP);
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
    
    const transferCapViolation = violations.find(v => v.type === VIOLATION_TYPES.ALT_CAP);
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
    
    const transferCapViolation = violations.find(v => v.type === VIOLATION_TYPES.ALT_CAP);
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
    const altCapViolation = violations.find(v => v.type === VIOLATION_TYPES.ALT_CAP);
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
    const altCapViolation = violations.find(v => v.type === VIOLATION_TYPES.ALT_CAP);
    expect(altCapViolation).toBeUndefined();
  });

it('null providerType correctly uses max_ace_credits fallback when max_alt_credit is missing', () => {
    const basket: BasketItem[] = [
      { moduleId: 'mod1', courseId: 'c1', credits: 10, status: 'pinned', providerType: null } as any,
    ];

    // Missing max_alt_credit, so should fall back to max_ace_credits
    const violations = validatePlan(basket, [], {
      transfer_alt_bucket_mode: 'separate',
      max_ace_credits: 6, // fallback key
      // max_alt_credit intentionally omitted
    } as any);

    expect(violations.some(v => v.type === VIOLATION_TYPES.ALT_CAP)).toBe(true);
  });

  /**
   * PRECEDENCE TEST: max_alt_credit MUST override max_ace_credits when both provided.
   * This prevents future refactors from accidentally reversing the merge logic.
   */
  it('effectiveAltCap uses max_alt_credit over max_ace_credits when both provided', () => {
    const basket: BasketItem[] = [
      { moduleId: 'mod1', courseId: 'c1', credits: 7, status: 'pinned', providerType: null } as any,
    ];

    // If precedence is correct: cap=10 (from max_alt_credit) => no violation (7 < 10)
    // If precedence breaks: cap=6 (from max_ace_credits) => violation (7 > 6)
    const violations = validatePlan(basket, [], {
      transfer_alt_bucket_mode: 'separate',
      max_alt_credit: 10,     // policy key - should WIN
      max_ace_credits: 6,     // fallback key - should be IGNORED
    } as any);

    // Should NOT have alt_cap violation because 7 < 10
    expect(violations.some(v => v.type === VIOLATION_TYPES.ALT_CAP)).toBe(false);
  });

  /**
   * INVERSE PRECEDENCE TEST: Verify that when max_alt_credit is lower, it still wins.
   */
  it('max_alt_credit takes precedence even when lower than max_ace_credits', () => {
    const basket: BasketItem[] = [
      { moduleId: 'mod1', courseId: 'c1', credits: 8, status: 'pinned', providerType: null } as any,
    ];

    // If precedence is correct: cap=6 (from max_alt_credit) => violation (8 > 6)
    // If precedence breaks: cap=10 (from max_ace_credits) => no violation (8 < 10)
    const violations = validatePlan(basket, [], {
      transfer_alt_bucket_mode: 'separate',
      max_alt_credit: 6,      // policy key - should WIN
      max_ace_credits: 10,    // fallback key - should be IGNORED
    } as any);

    // Should HAVE alt_cap violation because 8 > 6
    expect(violations.some(v => v.type === VIOLATION_TYPES.ALT_CAP)).toBe(true);
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
    
    const workloadViolation = violations.find(v => v.type === VIOLATION_TYPES.WORKLOAD);
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
    
    const workloadViolation = violations.find(v => v.type === VIOLATION_TYPES.WORKLOAD);
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
    
    const workloadViolation = violations.find(v => v.type === VIOLATION_TYPES.WORKLOAD);
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
    
    const deadlineViolation = violations.find(v => v.type === VIOLATION_TYPES.DEADLINE);
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
    
    const deadlineViolation = violations.find(v => v.type === VIOLATION_TYPES.DEADLINE);
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
    
    const deadlineViolation = violations.find(v => v.type === VIOLATION_TYPES.DEADLINE);
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
    
    const budgetViolation = violations.find(v => v.type === VIOLATION_TYPES.BUDGET);
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
    
    const budgetViolation = violations.find(v => v.type === VIOLATION_TYPES.BUDGET);
    expect(budgetViolation).toBeUndefined();
  });
});
