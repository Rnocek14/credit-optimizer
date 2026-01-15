/**
 * Golden Basket Snapshot Tests
 * 
 * These tests ensure the credit system produces deterministic, correct results
 * for canonical scenarios. Any change that breaks these tests requires
 * explicit review and approval.
 * 
 * Run with: npm run test:credit-lock
 * 
 * IMPORTANT:
 * - Do NOT modify expected outputs without understanding the implications
 * - Add new fixtures in goldenBaskets.fixtures.ts
 * - All assertions must be stable (sorted, normalized)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateCreditDecision, type CreditDecisionOutput } from '../creditPipeline';
import { GOLDEN_BASKETS, getBasketsByCategory, type GoldenBasket } from './goldenBaskets.fixtures';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Run a single golden basket test case.
 */
function runGoldenTest(basket: GoldenBasket) {
  const result = evaluateCreditDecision(basket.input);
  
  return {
    result,
    assertions: evaluateAssertions(result, basket.expected.assertions),
  };
}

/**
 * Evaluate string assertions against result.
 * Each assertion is a simple JS expression evaluated against the result.
 */
function evaluateAssertions(
  result: CreditDecisionOutput,
  assertions: string[]
): { assertion: string; passed: boolean; actual?: any }[] {
  return assertions.map(assertion => {
    try {
      // Create a safe evaluation context
      const context = {
        totals: result.totals,
        eligibility: result.eligibility,
        blockers: result.blockers,
        warnings: result.warnings,
        violations: result.violations,
        requirements: result.requirements,
        policy: result.policy,
      };
      
      // Simple expression evaluation (safe - no function execution)
      const passed = evalAssertion(assertion, context);
      
      return { assertion, passed };
    } catch (error) {
      return { assertion, passed: false, actual: `Error: ${error}` };
    }
  });
}

/**
 * Safe assertion evaluator - only supports simple property access and comparisons.
 */
function evalAssertion(assertion: string, context: any): boolean {
  // Handle common patterns
  
  // Pattern: totals.x === n
  const equalsMatch = assertion.match(/^([\w.]+)\s*===\s*(.+)$/);
  if (equalsMatch) {
    const [, path, expected] = equalsMatch;
    const actual = getNestedValue(context, path);
    const expectedValue = JSON.parse(expected);
    return actual === expectedValue;
  }
  
  // Pattern: totals.x > n
  const gtMatch = assertion.match(/^([\w.]+)\s*>\s*(\d+)$/);
  if (gtMatch) {
    const [, path, num] = gtMatch;
    const actual = getNestedValue(context, path);
    return actual > Number(num);
  }
  
  // Pattern: totals.x >= n
  const gteMatch = assertion.match(/^([\w.]+)\s*>=\s*(\d+)$/);
  if (gteMatch) {
    const [, path, num] = gteMatch;
    const actual = getNestedValue(context, path);
    return actual >= Number(num);
  }
  
  // Pattern: totals.x < n
  const ltMatch = assertion.match(/^([\w.]+)\s*<\s*(\d+)$/);
  if (ltMatch) {
    const [, path, num] = ltMatch;
    const actual = getNestedValue(context, path);
    return actual < Number(num);
  }
  
  // Pattern: totals.x <= n
  const lteMatch = assertion.match(/^([\w.]+)\s*<=\s*(\d+)$/);
  if (lteMatch) {
    const [, path, num] = lteMatch;
    const actual = getNestedValue(context, path);
    return actual <= Number(num);
  }
  
  // Pattern: violations.some(v => v.type === "x")
  const someMatch = assertion.match(/^violations\.some\(v => v\.type === "([^"]+)"\)$/);
  if (someMatch) {
    const [, type] = someMatch;
    return context.violations.some((v: any) => v.type === type);
  }
  
  throw new Error(`Unknown assertion pattern: ${assertion}`);
}

/**
 * Get nested value from object by dot-separated path.
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ============================================================================
// Tests
// ============================================================================

describe('Golden Basket Tests', () => {
  describe('All Baskets - Eligibility', () => {
    GOLDEN_BASKETS.forEach(basket => {
      it(`${basket.id}: ${basket.name} → ${basket.expected.eligibility}`, () => {
        const { result } = runGoldenTest(basket);
        
        expect(result.eligibility).toBe(basket.expected.eligibility);
        
        if (basket.expected.eligibility === 'blocked') {
          expect(result.blockers.length).toBeGreaterThanOrEqual(basket.expected.blockerCount);
        } else {
          expect(result.blockers.length).toBe(0);
        }
      });
    });
  });
  
  describe('All Baskets - Assertions', () => {
    GOLDEN_BASKETS.forEach(basket => {
      it(`${basket.id}: assertions hold`, () => {
        const { result, assertions } = runGoldenTest(basket);
        
        assertions.forEach(({ assertion, passed, actual }) => {
          expect(passed, `Assertion failed: ${assertion}${actual ? ` (got: ${actual})` : ''}`).toBe(true);
        });
      });
    });
  });
  
  describe('Happy Path Scenarios', () => {
    const happyPathBaskets = getBasketsByCategory('happy_path');
    
    happyPathBaskets.forEach(basket => {
      it(`${basket.id}: produces eligible result`, () => {
        const result = evaluateCreditDecision(basket.input);
        
        expect(result.eligibility).toBe('eligible');
        expect(result.blockers).toHaveLength(0);
        expect(result.hashes.input).toBeDefined();
        expect(result.hashes.output).toBeDefined();
      });
    });
  });
  
  describe('Cap Boundary Edge Cases', () => {
    const boundaryBaskets = getBasketsByCategory('cap_boundary');
    
    boundaryBaskets.forEach(basket => {
      it(`${basket.id}: handles boundary correctly`, () => {
        const result = evaluateCreditDecision(basket.input);
        
        expect(result.eligibility).toBe(basket.expected.eligibility);
        
        // Verify alt cap is being tracked
        expect(result.requirements.altCreditCap).toBeDefined();
        expect(typeof result.totals.alt).toBe('number');
      });
    });
  });
  
  describe('Residency Requirements', () => {
    const residencyBaskets = getBasketsByCategory('residency');
    
    residencyBaskets.forEach(basket => {
      it(`${basket.id}: enforces residency`, () => {
        const result = evaluateCreditDecision(basket.input);
        
        expect(result.requirements.residency).toBeDefined();
        
        if (basket.expected.eligibility === 'blocked') {
          expect(result.requirements.residency.met).toBe(false);
        }
      });
    });
  });
  
  describe('Failure Modes', () => {
    const failureBaskets = getBasketsByCategory('failure_mode');
    
    failureBaskets.forEach(basket => {
      it(`${basket.id}: fails safely`, () => {
        const result = evaluateCreditDecision(basket.input);
        
        expect(result.eligibility).toBe('blocked');
        expect(result.blockers.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Determinism', () => {
    it('produces identical output for identical input', () => {
      const basket = GOLDEN_BASKETS[0];
      
      const result1 = evaluateCreditDecision(basket.input);
      const result2 = evaluateCreditDecision(basket.input);
      
      // Hashes should match (excluding timestamp)
      expect(result1.hashes.input).toBe(result2.hashes.input);
      expect(result1.hashes.output).toBe(result2.hashes.output);
      
      // Core values should match
      expect(result1.eligibility).toBe(result2.eligibility);
      expect(result1.totals).toEqual(result2.totals);
      expect(result1.blockers.sort()).toEqual(result2.blockers.sort());
    });
    
    it('different baskets produce different hashes', () => {
      const basket1 = GOLDEN_BASKETS[0];
      const basket2 = GOLDEN_BASKETS[1];
      
      const result1 = evaluateCreditDecision(basket1.input);
      const result2 = evaluateCreditDecision(basket2.input);
      
      expect(result1.hashes.input).not.toBe(result2.hashes.input);
    });
  });
  
  describe('Null ProviderType (Conservative Classification)', () => {
    it('treats null providerType as alt credit', () => {
      const basket = GOLDEN_BASKETS.find(b => b.id === 'null_provider_conservative');
      if (!basket) throw new Error('Fixture not found');
      
      const result = evaluateCreditDecision(basket.input);
      
      // 100 null-providerType items should count as alt
      expect(result.totals.alt).toBe(100);
      expect(result.eligibility).toBe('blocked');
    });
  });
});

describe('Credit Pipeline Contract', () => {
  it('output includes all required fields', () => {
    const basket = GOLDEN_BASKETS[0];
    const result = evaluateCreditDecision(basket.input);
    
    // Totals
    expect(result.totals).toHaveProperty('total');
    expect(result.totals).toHaveProperty('resident');
    expect(result.totals).toHaveProperty('transfer');
    expect(result.totals).toHaveProperty('alt');
    expect(result.totals).toHaveProperty('upperDiv');
    expect(result.totals).toHaveProperty('byProvider');
    
    // Eligibility
    expect(['eligible', 'blocked']).toContain(result.eligibility);
    expect(Array.isArray(result.blockers)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    
    // Violations
    expect(Array.isArray(result.violations)).toBe(true);
    
    // Requirements
    expect(result.requirements).toHaveProperty('totalCredits');
    expect(result.requirements).toHaveProperty('residency');
    expect(result.requirements).toHaveProperty('upperDivision');
    expect(result.requirements).toHaveProperty('altCreditCap');
    
    // Policy metadata
    expect(result.policy).toHaveProperty('institution');
    expect(result.policy).toHaveProperty('degreeLevel');
    expect(result.policy).toHaveProperty('confidence');
    expect(result.policy).toHaveProperty('bucketMode');
    
    // Audit trail
    expect(result.hashes).toHaveProperty('input');
    expect(result.hashes).toHaveProperty('output');
    expect(typeof result.evaluatedAt).toBe('string');
  });
  
  it('eligibility is strictly binary', () => {
    GOLDEN_BASKETS.forEach(basket => {
      const result = evaluateCreditDecision(basket.input);
      
      expect(['eligible', 'blocked']).toContain(result.eligibility);
      
      // If eligible, no blockers
      if (result.eligibility === 'eligible') {
        expect(result.blockers).toHaveLength(0);
      }
      
      // If blocked, at least one blocker
      if (result.eligibility === 'blocked') {
        expect(result.blockers.length).toBeGreaterThan(0);
      }
    });
  });
});
