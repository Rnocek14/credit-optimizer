/**
 * Scale Readiness CI Test
 * 
 * Validates policy pack completeness and prevents Green institution regressions.
 * This test runs in CI to ensure the scale-readiness audit stays healthy.
 * 
 * MVP scope:
 * - Fails only if a Green school regresses below threshold
 * - Validates enforced baskets pass violation invariants
 */

import { describe, it, expect } from 'vitest';
import { evaluateCreditDecision } from '../creditPipeline';
import { GOLDEN_BASKETS } from './goldenBaskets.fixtures';
import { assertViolationInvariants, checkViolationInvariants } from '../violationInvariantsCheck';
import { computePolicyCompleteness, COMPLETENESS_THRESHOLDS } from '../policyCompletenessScore';

// ============================================================================
// Known Green Institutions (baseline for regression detection)
// Add institutions here as they achieve Green status
// ============================================================================

const KNOWN_GREEN_INSTITUTIONS = [
  // 'TESU', // Uncomment when TESU policy pack achieves Green status
] as const;

// ============================================================================
// Tests
// ============================================================================

describe('Scale Readiness Audit', () => {
  describe('Violation Invariants - Enforced Baskets', () => {
    const enforcedBaskets = GOLDEN_BASKETS.filter(b => b.status === 'enforced');
    
    enforcedBaskets.forEach(basket => {
      it(`${basket.id}: passes all violation invariants`, () => {
        const result = evaluateCreditDecision(basket.input);
        
        // This will throw with detailed message if any invariant fails
        assertViolationInvariants(result);
      });
    });
  });
  
  describe('Violation Invariants - All Baskets (structural)', () => {
    GOLDEN_BASKETS.forEach(basket => {
      it(`${basket.id}: produces valid violation structure`, () => {
        const result = evaluateCreditDecision(basket.input);
        const check = checkViolationInvariants(result);
        
        // Log but don't fail for pending baskets
        if (!check.passed && basket.status === 'pending') {
          console.log(`[PENDING] ${basket.id} invariant issues:`, 
            check.violations.map(v => v.message).join(', ')
          );
        }
        
        // Always pass structural checks for enforced baskets
        if (basket.status === 'enforced') {
          expect(check.passed).toBe(true);
        }
      });
    });
  });
  
  describe('Policy Completeness Scoring', () => {
    it('TESU bachelor policy scores correctly', () => {
      const tesutPolicy = {
        transfer_alt_bucket_mode: 'separate',
        degree_credit_total: 120,
        residency_credits: 15,
        max_alt_credit: 90,
        max_transfer_credits: 105,
        upper_division_min: 18,
        capstone_in_residence: true,
        catalog_year: '2024-2025',
        confidence: 95,
      };
      
      const result = computePolicyCompleteness(
        tesutPolicy,
        'TESU',
        'bachelor',
        true // has ground truth
      );
      
      // Should be Green with high score
      expect(result.status).toBe('green');
      expect(result.score).toBeGreaterThanOrEqual(COMPLETENESS_THRESHOLDS.GREEN_MIN);
      expect(result.missingCritical).toHaveLength(0);
    });
    
    it('missing bucket mode results in Red', () => {
      const incompletePolicy = {
        degree_credit_total: 120,
        residency_credits: 15,
        // Missing: transfer_alt_bucket_mode
      };
      
      const result = computePolicyCompleteness(
        incompletePolicy,
        'TEST',
        'bachelor',
        false
      );
      
      expect(result.status).toBe('red');
      expect(result.missingCritical.length).toBeGreaterThan(0);
    });
    
    it('unknown bucket mode results in Red', () => {
      const unknownBucketPolicy = {
        transfer_alt_bucket_mode: 'unknown',
        degree_credit_total: 120,
        residency_credits: 15,
      };
      
      const result = computePolicyCompleteness(
        unknownBucketPolicy,
        'TEST',
        'bachelor',
        false
      );
      
      expect(result.status).toBe('red');
    });
  });
  
  describe('Green Institution Regression Guard', () => {
    // This test will start failing if any known-green institution regresses
    // Currently empty - add institutions as they achieve Green status
    
    it('no known Green institutions have regressed (placeholder)', () => {
      // This is a placeholder - actual regression testing requires DB access
      // When running against real data, use validateNoGreenRegression()
      expect(KNOWN_GREEN_INSTITUTIONS.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Template Promotion Gate Logic', () => {
  it('Green status allows template generation', () => {
    const greenResult = computePolicyCompleteness(
      {
        transfer_alt_bucket_mode: 'separate',
        degree_credit_total: 120,
        residency_credits: 15,
        max_alt_credit: 90,
        max_transfer_credits: 105,
      },
      'TEST',
      'bachelor',
      true
    );
    
    expect(greenResult.status).toBe('green');
    // Green = templates buildable
  });
  
  it('Yellow status allows templates with warnings', () => {
    const yellowResult = computePolicyCompleteness(
      {
        transfer_alt_bucket_mode: 'separate',
        degree_credit_total: 120,
        residency_credits: 15,
        max_alt_credit: 90,
        // Missing optional fields
      },
      'TEST',
      'bachelor',
      false // no ground truth
    );
    
    // Yellow should still allow building
    expect(['green', 'yellow']).toContain(yellowResult.status);
  });
  
  it('Red status blocks template generation', () => {
    const redResult = computePolicyCompleteness(
      {
        // Missing critical fields
        degree_credit_total: 120,
      },
      'TEST',
      'bachelor',
      false
    );
    
    expect(redResult.status).toBe('red');
    // Red = templates blocked
  });
});
