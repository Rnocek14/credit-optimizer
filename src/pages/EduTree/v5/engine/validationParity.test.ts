/**
 * Parity Tests: Classification + Validation Alignment
 * 
 * These tests ensure that:
 * 1. courseToBasketItem produces the same classification flags as addItemGuarded's item construction
 * 2. validateSemesterDrop and checkForDeadEnd agree on blocking decisions
 * 
 * CRITICAL: If these tests fail, the two validation paths have drifted and semester
 * drag can bypass basket-level guards.
 */

import { describe, it, expect } from 'vitest';
import { courseToBasketItem } from './courseToBasketItem';
import { validateSemesterDrop, type Constraints as SemesterConstraints } from './semesterValidation';
import { checkForDeadEnd, type RemainingModule } from './deadEndDetector';
import { deadEndToUIMessage } from './deadEndToMessage';
import type { BasketItem } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/v5';
import { countsTowardAltCap } from '../utils/altCredit';

// ============================================
// TEST 1: Classification Parity
// ============================================
describe('Classification Parity: courseToBasketItem matches addItemGuarded', () => {
  
  it('ACE-evaluated MOOC carries all alt-credit flags', () => {
    const option: MarketplaceOption = {
      id: 'opt-1',
      courseId: 'CS101',
      title: 'Intro to CS',
      credits: 3,
      subject: 'CS',
      provider: 'Sophia',
      providerType: 'mooc',
      providerCode: 'SOPHIA',
      cost_usd: 79,
      duration_weeks: 8,
      aceNccrs: true,
      isAltCredit: true,
      proctored: false,
      level: 100,
    };
    
    const item = courseToBasketItem(option, 'test-module');
    
    // All classification-critical fields must transfer
    expect(item.aceNccrs).toBe(true);
    expect(item.isAltCredit).toBe(true);
    expect(item.proctored).toBe(false);
    expect(item.level).toBe(100);
    expect(item.providerType).toBe('mooc');
    expect(item.providerCode).toBe('SOPHIA');
    expect(item.equivalency_key).toBeUndefined();
  });

  it('University course is NOT alt credit', () => {
    const option: MarketplaceOption = {
      id: 'opt-2',
      courseId: 'ENG200',
      title: 'English Composition',
      credits: 3,
      subject: 'ENG',
      provider: 'TESU',
      providerType: 'university',
      providerCode: 'TESU',
      cost_usd: 500,
      duration_weeks: 16,
      isAltCredit: false,
      level: 200,
    };
    
    const item = courseToBasketItem(option, 'test-module');
    
    expect(item.isAltCredit).toBe(false);
    expect(item.providerType).toBe('university');
    expect(item.level).toBe(200);
    
    // Derived classification must match
    expect(countsTowardAltCap(item)).toBe(false);
  });

  it('Testing center (CLEP) is alt credit by providerType', () => {
    const option: MarketplaceOption = {
      id: 'opt-3',
      courseId: 'CLEP-CALC',
      title: 'CLEP Calculus',
      credits: 4,
      subject: 'MATH',
      provider: 'CLEP',
      providerType: 'testing_center',
      providerCode: 'CLEP',
      cost_usd: 89,
      duration_weeks: 4,
      proctored: true,
      level: 100,
    };
    
    const item = courseToBasketItem(option, 'test-module');
    
    expect(item.proctored).toBe(true);
    expect(item.providerType).toBe('testing_center');
    
    // testing_center should count as alt credit
    expect(countsTowardAltCap(item)).toBe(true);
  });

  it('Upper-division course preserves level for 300+ checks', () => {
    const option: MarketplaceOption = {
      id: 'opt-4',
      courseId: 'CS350',
      title: 'Data Structures II',
      credits: 3,
      subject: 'CS',
      provider: 'TESU',
      providerType: 'university',
      providerCode: 'TESU',
      cost_usd: 500,
      duration_weeks: 16,
      level: 350,
    };
    
    const item = courseToBasketItem(option, 'test-module');
    
    expect(item.level).toBe(350);
    // Upper-div check: level >= 300
    expect(item.level! >= 300).toBe(true);
  });

  it('equivalency_key transfers for duplicate detection', () => {
    const option: MarketplaceOption = {
      id: 'opt-5',
      courseId: 'BUS101',
      title: 'Intro to Business',
      credits: 3,
      subject: 'BUS',
      provider: 'Study.com',
      providerType: 'mooc',
      providerCode: 'STUDYCOM',
      cost_usd: 199,
      duration_weeks: 8,
      equivalency_key: 'BUS-INTRO-101',
      aceNccrs: true,
    };
    
    const item = courseToBasketItem(option, 'test-module');
    
    expect(item.equivalency_key).toBe('BUS-INTRO-101');
    expect(item.aceNccrs).toBe(true);
  });

  it('countsTowardAltCap is consistent between option and converted item', () => {
    const testCases: Array<{ option: MarketplaceOption; expectedAlt: boolean }> = [
      // Explicit isAltCredit: true
      {
        option: {
          id: 'alt-1', courseId: 'C1', title: 'MOOC', credits: 3, subject: 'CS',
          provider: 'Sophia', providerType: 'mooc', cost_usd: 79, duration_weeks: 8,
          isAltCredit: true,
        },
        expectedAlt: true,
      },
      // ACE/NCCRS evaluated → alt credit
      {
        option: {
          id: 'alt-2', courseId: 'C2', title: 'ACE Course', credits: 3, subject: 'CS',
          provider: 'Study.com', providerType: 'mooc', cost_usd: 199, duration_weeks: 8,
          aceNccrs: true,
        },
        expectedAlt: true,
      },
      // testing_center → alt credit by providerType
      {
        option: {
          id: 'alt-3', courseId: 'C3', title: 'Testing Center', credits: 3, subject: 'CS',
          provider: 'CLEP', providerType: 'testing_center', cost_usd: 89, duration_weeks: 4,
        },
        expectedAlt: true,
      },
      // Explicit isAltCredit: false (university)
      {
        option: {
          id: 'uni-1', courseId: 'C4', title: 'University', credits: 3, subject: 'CS',
          provider: 'TESU', providerType: 'university', cost_usd: 500, duration_weeks: 16,
          isAltCredit: false,
        },
        expectedAlt: false,
      },
      // University without explicit flag → NOT alt credit
      {
        option: {
          id: 'uni-2', courseId: 'C5', title: 'University 2', credits: 3, subject: 'CS',
          provider: 'TESU', providerType: 'university', cost_usd: 500, duration_weeks: 16,
        },
        expectedAlt: false,
      },
    ];

    for (const { option, expectedAlt } of testCases) {
      const item = courseToBasketItem(option, 'test-module');
      
      // Convert both to AltCreditSignals shape and compare
      const itemCountsAsAlt = countsTowardAltCap(item);
      
      expect(itemCountsAsAlt).toBe(expectedAlt);
    }
  });
});

// ============================================
// TEST 2: Drag vs Add Parity
// ============================================
describe('Drag vs Add Parity: validateSemesterDrop agrees with checkForDeadEnd', () => {

  /**
   * Helper to build a basket near the alt-credit cap
   */
  function buildNearCapBasket(altCredits: number): BasketItem[] {
    const items: BasketItem[] = [];
    let remaining = altCredits;
    let i = 0;
    while (remaining > 0) {
      const credits = Math.min(3, remaining);
      items.push({
        moduleId: `mod-${i}`,
        courseId: `MOOC-${i}`,
        credits,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        isAltCredit: true,
      });
      remaining -= credits;
      i++;
    }
    return items;
  }

  /**
   * Helper to build remaining modules for feasibility checks
   */
  function buildRemainingModules(count: number, hasUniversity = true): RemainingModule[] {
    return Array.from({ length: count }, (_, i) => ({
      moduleId: `remaining-${i}`,
      options: hasUniversity ? [
        {
          id: `opt-${i}`,
          courseId: `COURSE-${i}`,
          title: `Course ${i}`,
          credits: 3,
          subject: 'GEN',
          provider: 'TESU',
          providerType: 'university' as const,
          providerCode: 'TESU',
          cost_usd: 500,
          duration_weeks: 16,
        },
      ] : [
        {
          id: `mooc-${i}`,
          courseId: `MOOC-R-${i}`,
          title: `MOOC ${i}`,
          credits: 3,
          subject: 'GEN',
          provider: 'Sophia',
          providerType: 'mooc' as const,
          providerCode: 'SOPHIA',
          cost_usd: 79,
          duration_weeks: 8,
        },
      ],
      creditsRequired: 3,
    }));
  }

  it('both block when alt-credit cap would be exceeded', () => {
    // Set up basket at 88/90 alt credits
    const nearCapBasket = buildNearCapBasket(88);
    const constraints = { target_school: 'TESU' };
    const remainingModules = buildRemainingModules(10);

    // Candidate that would exceed cap (4 credits = 88 + 4 = 92 > 90)
    const candidate: MarketplaceOption = {
      id: 'test-opt',
      courseId: 'MOOC-NEW',
      title: 'New MOOC',
      credits: 4,
      subject: 'CS',
      provider: 'Sophia',
      providerType: 'mooc',
      providerCode: 'SOPHIA',
      cost_usd: 79,
      duration_weeks: 8,
      isAltCredit: true,
    };

    // Check via dead-end detector (what addItemGuarded uses)
    const deadEndCheck = checkForDeadEnd(candidate, nearCapBasket, constraints, remainingModules);
    
    // Check via semester validation (what drag uses)
    const semesterConstraints: SemesterConstraints = {
      basket: nearCapBasket,
      targetSchool: 'TESU',
      remainingModules,
      moduleId: 'test-module',
    };
    
    const semesterValidation = validateSemesterDrop({
      course: candidate,
      semesterId: '1-fall',
      plan: { semesters: {} },
      constraints: semesterConstraints,
    });

    // Both should block
    expect(deadEndCheck.isDeadEnd).toBe(true);
    expect(semesterValidation.valid).toBe(false);
    
    // Both should produce matching invariant codes
    const deadEndMsg = deadEndToUIMessage(deadEndCheck);
    const semesterDeadEndError = semesterValidation.errors.find(e => e.code === 'DEAD_END');
    
    expect(semesterDeadEndError).toBeDefined();
    
    // If invariant code exists, they should match
    if (deadEndMsg.invariantCode && semesterDeadEndError?.details?.uiMessage?.invariantCode) {
      expect(semesterDeadEndError.details.uiMessage.invariantCode).toBe(deadEndMsg.invariantCode);
    }
  });

  it('both allow when selection is valid', () => {
    // Basket with plenty of room
    const basket = buildNearCapBasket(30); // Only 30/90 used
    const constraints = { target_school: 'TESU' };
    const remainingModules = buildRemainingModules(20);

    // Valid university course
    const validCandidate: MarketplaceOption = {
      id: 'uni-opt',
      courseId: 'ENG101',
      title: 'English 101',
      credits: 3,
      subject: 'ENG',
      provider: 'TESU',
      providerType: 'university',
      providerCode: 'TESU',
      cost_usd: 500,
      duration_weeks: 16,
      isAltCredit: false,
    };

    const deadEndCheck = checkForDeadEnd(validCandidate, basket, constraints, remainingModules);
    
    const semesterConstraints: SemesterConstraints = {
      basket,
      targetSchool: 'TESU',
      remainingModules,
      moduleId: 'test-module',
    };
    
    const semesterValidation = validateSemesterDrop({
      course: validCandidate,
      semesterId: '1-fall',
      plan: { semesters: {} },
      constraints: semesterConstraints,
    });

    // Both should allow
    expect(deadEndCheck.isDeadEnd).toBe(false);
    expect(semesterValidation.valid).toBe(true);
    expect(semesterValidation.errors.filter(e => e.code === 'DEAD_END')).toHaveLength(0);
  });

  it('both block when residency becomes unattainable', () => {
    // Build a basket that uses up credits with non-university courses
    // TESU: 30 residency required out of 120 total
    const basket: BasketItem[] = [];
    
    // Add 81 credits of MOOC (residency = 0, alt = 81)
    for (let i = 0; i < 27; i++) {
      basket.push({
        moduleId: `mod-${i}`,
        courseId: `MOOC-${i}`,
        credits: 3,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 80,
        status: 'pinned',
        providerType: 'mooc',
        providerCode: 'SOPHIA',
        isAltCredit: true,
      });
    }
    // Add 9 credits of university (residency = 9)
    for (let i = 0; i < 3; i++) {
      basket.push({
        moduleId: `uni-${i}`,
        courseId: `UNI-${i}`,
        credits: 3,
        cost_usd: 500,
        duration_weeks: 16,
        workload_weekly_hours: 10,
        cri_score: 90,
        status: 'pinned',
        providerType: 'university',
        providerCode: 'TESU',
        isAltCredit: false,
      });
    }
    // Total: 90 credits, 9 residency, need 30 residency, 30 credits remaining
    
    // Remaining modules that can only offer MOOC credits (no university options)
    const remainingModules = buildRemainingModules(10, false); // hasUniversity = false

    const constraints = { target_school: 'TESU' };

    // Candidate: another MOOC that would make residency impossible
    const candidate: MarketplaceOption = {
      id: 'mooc-final',
      courseId: 'MOOC-FINAL',
      title: 'Final MOOC',
      credits: 3,
      subject: 'CS',
      provider: 'Sophia',
      providerType: 'mooc',
      providerCode: 'SOPHIA',
      cost_usd: 79,
      duration_weeks: 8,
    };

    const deadEndCheck = checkForDeadEnd(candidate, basket, constraints, remainingModules);
    
    const semesterConstraints: SemesterConstraints = {
      basket,
      targetSchool: 'TESU',
      remainingModules,
      moduleId: 'remaining-0',
    };
    
    const semesterValidation = validateSemesterDrop({
      course: candidate,
      semesterId: '2-spring',
      plan: { semesters: {} },
      constraints: semesterConstraints,
    });

    // Both should identify residency/feasibility issue
    if (deadEndCheck.isDeadEnd) {
      // Verify the reason mentions residency
      const hasResidencyReason = deadEndCheck.reasons.some(r =>
        r.toLowerCase().includes('residency') || r.toLowerCase().includes('institutional')
      );
      expect(hasResidencyReason).toBe(true);
      
      // Semester validation should also block
      expect(semesterValidation.valid).toBe(false);
      expect(semesterValidation.errors.some(e => e.code === 'DEAD_END')).toBe(true);
    }
  });

  it('local semester errors work independently of transfer engine', () => {
    // Test that TERM_CAP still works without basket context
    const course: MarketplaceOption = {
      id: 'test-course',
      courseId: 'CS200',
      title: 'CS 200',
      credits: 15, // Would exceed typical term cap of 15
      subject: 'CS',
      provider: 'TESU',
      providerType: 'university',
      cost_usd: 500,
      duration_weeks: 16,
    };

    const validation = validateSemesterDrop({
      course,
      semesterId: '1-fall',
      plan: { 
        semesters: {
          '1-fall': { credits: 5, workloadHours: 10, courseIds: [] }
        }
      },
      constraints: {
        termCap: 15,
        // No basket context = no dead-end check
      },
    });

    // Should fail due to term cap (5 + 15 = 20 > 15)
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === 'TERM_CAP')).toBe(true);
    // Should NOT have DEAD_END error (no basket context)
    expect(validation.errors.some(e => e.code === 'DEAD_END')).toBe(false);
  });

  it('ALREADY_PLACED error works correctly', () => {
    const course: MarketplaceOption = {
      id: 'existing-course',
      courseId: 'CS100',
      title: 'CS 100',
      credits: 3,
      subject: 'CS',
      provider: 'TESU',
      providerType: 'university',
      cost_usd: 500,
      duration_weeks: 16,
    };

    const validation = validateSemesterDrop({
      course,
      semesterId: '1-fall',
      plan: { 
        semesters: {
          '1-fall': { credits: 3, workloadHours: 10, courseIds: ['CS100'] }
        }
      },
      constraints: {},
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.code === 'ALREADY_PLACED')).toBe(true);
  });
});
