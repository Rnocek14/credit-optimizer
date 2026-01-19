/**
 * Institution Policies Test Suite
 * 
 * CRITICAL: These tests lock in the verified TESU policy baseline
 * and prevent "policy drift" regressions.
 * 
 * Key validations:
 * 1. Combined noncollegiate pool (no fake per-provider caps)
 * 2. Correct residency values (15 for TESU standard, not 30)
 * 3. Upper-division requirements
 * 4. Cross-institution API consistency
 */

import { describe, it, expect } from 'vitest';
import {
  getPolicy,
  getPolicyOrDefault,
  getResidencyCredits,
  getNoncollegiateCap,
  isNoncollegiateProvider,
  validateNoncollegiateCredits,
  validateResidency,
  validateUpperDivision,
  getAnchorPolicy,
  getAvailableInstitutions,
} from './institutionPolicies';

describe('institutionPolicies', () => {
  
  // ==================== TESU BASELINE TESTS ====================
  
  describe('TESU Gold Baseline', () => {
    
    it('has TESU policy available', () => {
      const policy = getPolicy('TESU');
      expect(policy).toBeDefined();
      expect(policy?.code).toBe('TESU');
      expect(policy?.name).toBe('Thomas Edison State University');
    });

    it('has correct total credits requirement', () => {
      const policy = getPolicyOrDefault('TESU');
      expect(policy.totalCreditsBachelor).toBe(120);
      expect(policy.totalCreditsAssociate).toBe(60);
    });

    it('has correct noncollegiate cap (90 combined)', () => {
      expect(getNoncollegiateCap('TESU', 'bachelor')).toBe(90);
      expect(getNoncollegiateCap('TESU', 'associate')).toBe(45);
    });

    it('has correct residency requirement (15 standard, NOT 30)', () => {
      // CRITICAL: This was incorrectly 30 in old codebase
      expect(getResidencyCredits('TESU', 'standard')).toBe(15);
      expect(getResidencyCredits('TESU', 'military')).toBe(24);
      expect(getResidencyCredits('TESU', 'accelerate')).toBe(6);
    });

    it('has correct upper-division requirement (18 in area of study)', () => {
      const policy = getPolicyOrDefault('TESU');
      expect(policy.upperDivisionAreaOfStudyMin).toBe(18);
    });

    it('includes correct providers in noncollegiate pool', () => {
      expect(isNoncollegiateProvider('TESU', 'CLEP')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'DSST')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'SOPHIA')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'STUDYCOM')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'ACE')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'NCCRS')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'AP')).toBe(true);
      expect(isNoncollegiateProvider('TESU', 'TECEP')).toBe(true);
    });

    it('has high confidence score (95+)', () => {
      const policy = getPolicyOrDefault('TESU');
      expect(policy.overallConfidence).toBeGreaterThanOrEqual(95);
    });

    it('has evidence URLs for audit trail', () => {
      const policy = getPolicyOrDefault('TESU');
      expect(policy.evidenceUrls.length).toBeGreaterThan(0);
      expect(policy.evidenceUrls).toContain(
        'https://www.tesu.edu/admissions/faqs/transfer-credits.php'
      );
    });
  });

  // ==================== COMBINED NONCOLLEGIATE POOL TESTS ====================
  
  describe('validateNoncollegiateCredits (Combined Pool)', () => {
    
    it('passes when total equals cap (90 credits)', () => {
      const creditsByProvider = { 
        CLEP: 30, 
        DSST: 30, 
        SOPHIA: 20, 
        STUDYCOM: 10 
      }; // Total = 90
      
      const issues = validateNoncollegiateCredits('TESU', creditsByProvider);
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });

    it('fails when total exceeds cap (91 credits)', () => {
      const creditsByProvider = { 
        CLEP: 30, 
        DSST: 30, 
        SOPHIA: 20, 
        STUDYCOM: 11 
      }; // Total = 91
      
      const issues = validateNoncollegiateCredits('TESU', creditsByProvider);
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe('NONCOLLEGIATE_CAP_EXCEEDED');
    });

    it('warns when approaching cap (80%+)', () => {
      const creditsByProvider = { 
        CLEP: 40, 
        DSST: 35 
      }; // Total = 75 (83% of 90)
      
      const issues = validateNoncollegiateCredits('TESU', creditsByProvider);
      const warnings = issues.filter(i => i.type === 'warning');
      
      expect(warnings.length).toBe(1);
      expect(warnings[0].code).toBe('NONCOLLEGIATE_CAP_APPROACHING');
    });

    it('NO fake per-provider caps: CLEP 50 is valid if total ≤ 90', () => {
      // CRITICAL: Old code had fake caps like CLEP: 40, DSST: 30
      // This test ensures they're gone
      const creditsByProvider = { 
        CLEP: 50, 
        DSST: 20, 
        SOPHIA: 20 
      }; // Total = 90, CLEP alone = 50
      
      const issues = validateNoncollegiateCredits('TESU', creditsByProvider);
      const errors = issues.filter(i => i.type === 'error');
      
      // Should NOT fail - there's no 40-credit CLEP cap
      expect(errors.length).toBe(0);
    });

    it('NO fake per-provider caps: DSST 60 is valid if total ≤ 90', () => {
      const creditsByProvider = { 
        DSST: 60, 
        SOPHIA: 30 
      }; // Total = 90, DSST alone = 60
      
      const issues = validateNoncollegiateCredits('TESU', creditsByProvider);
      const errors = issues.filter(i => i.type === 'error');
      
      // Should NOT fail - there's no 30-credit DSST cap
      expect(errors.length).toBe(0);
    });

    it('ignores non-noncollegiate providers', () => {
      const creditsByProvider = { 
        CLEP: 30,
        TESU: 50,  // Institutional, not noncollegiate
        UNKNOWN: 20,
      };
      
      // Only CLEP (30) counts toward noncollegiate
      const issues = validateNoncollegiateCredits('TESU', creditsByProvider);
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });
  });

  // ==================== RESIDENCY VALIDATION TESTS ====================
  
  describe('validateResidency', () => {
    
    it('fails when below standard requirement (15)', () => {
      const issues = validateResidency('TESU', 14, 'standard');
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe('RESIDENCY_SHORTFALL');
      expect(errors[0].details?.shortfall).toBe(1);
    });

    it('passes when meeting standard requirement (15)', () => {
      const issues = validateResidency('TESU', 15, 'standard');
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });

    it('passes when exceeding standard requirement', () => {
      const issues = validateResidency('TESU', 30, 'standard');
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });

    it('uses correct military residency (24)', () => {
      const issues = validateResidency('TESU', 23, 'military');
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(1);
      expect(errors[0].details?.required).toBe(24);
    });

    it('uses correct accelerate residency (6)', () => {
      const issues = validateResidency('TESU', 6, 'accelerate');
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });
  });

  // ==================== UPPER DIVISION VALIDATION TESTS ====================
  
  describe('validateUpperDivision', () => {
    
    it('fails when below requirement (17 < 18)', () => {
      const issues = validateUpperDivision('TESU', 17);
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe('UPPER_DIV_SHORTFALL');
    });

    it('passes when meeting requirement (18)', () => {
      const issues = validateUpperDivision('TESU', 18);
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });

    it('passes when exceeding requirement', () => {
      const issues = validateUpperDivision('TESU', 45);
      const errors = issues.filter(i => i.type === 'error');
      
      expect(errors.length).toBe(0);
    });
  });

  // ==================== CROSS-INSTITUTION TESTS ====================
  
  describe('Cross-Institution API', () => {
    
    it('returns all available institutions', () => {
      const institutions = getAvailableInstitutions();
      expect(institutions).toContain('TESU');
      expect(institutions).toContain('WGU');
      expect(institutions).toContain('COSC');
      expect(institutions).toContain('UMGC');
      expect(institutions).toContain('SNHU');
    });

    it('WGU has different residency than TESU', () => {
      expect(getResidencyCredits('TESU', 'standard')).toBe(15);
      expect(getResidencyCredits('WGU', 'standard')).toBe(42);
    });

    it('WGU has different noncollegiate cap', () => {
      expect(getNoncollegiateCap('TESU')).toBe(90);
      expect(getNoncollegiateCap('WGU')).toBe(78);
    });

    it('WGU does NOT accept Sophia or Study.com', () => {
      expect(isNoncollegiateProvider('TESU', 'SOPHIA')).toBe(true);
      expect(isNoncollegiateProvider('WGU', 'SOPHIA')).toBe(false);
      expect(isNoncollegiateProvider('WGU', 'STUDYCOM')).toBe(false);
    });

    it('WGU has 0 upper-division requirement (competency-based)', () => {
      const policy = getPolicyOrDefault('WGU');
      expect(policy.upperDivisionAreaOfStudyMin).toBe(0);
    });

    it('getPolicyOrDefault returns null for unknown code (P1 safety fix)', () => {
      const policy = getPolicyOrDefault('UNKNOWN_SCHOOL');
      expect(policy).toBeNull();
    });
  });

  // ==================== LEGACY COMPATIBILITY TESTS ====================
  
  describe('Legacy getAnchorPolicy Compatibility', () => {
    
    it('returns legacy format for existing consumers', () => {
      const legacy = getAnchorPolicy('TESU');
      
      expect(legacy).toBeDefined();
      expect(legacy?.partner_name).toBe('Thomas Edison State University');
      expect(legacy?.max_alt_credits).toBe(90);
      expect(legacy?.min_residency_credits).toBe(15);
      expect(legacy?.upper_division_min).toBe(18);
    });

    it('returns undefined for unknown institution', () => {
      const legacy = getAnchorPolicy('UNKNOWN');
      expect(legacy).toBeUndefined();
    });
  });
});
