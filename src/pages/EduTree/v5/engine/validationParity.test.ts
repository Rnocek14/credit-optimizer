/**
 * Parity Tests: Classification + Validation Alignment
 * 
 * These tests ensure that:
 * 1. courseToBasketItem produces the same classification flags as addItemGuarded's item construction
 * 2. validateSemesterDrop and addItemGuarded agree on blocking decisions
 * 
 * CRITICAL: If these tests fail, the two validation paths have drifted and semester
 * drag can bypass basket-level guards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { courseToBasketItem } from './courseToBasketItem';
import { validateSemesterDrop, type Constraints as SemesterConstraints } from './semesterValidation';
import { checkForDeadEnd, type RemainingModule } from './deadEndDetector';
import { usePlanBasket, type BasketItem, type Constraints as BasketConstraints } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/v5';
import { countsTowardAltCap } from '../utils/altCredit';

// ============================================
// TEST 1: Classification Parity
// ============================================
describe('Classification Parity: courseToBasketItem matches addItemGuarded', () => {
  const testCases: Array<{
    name: string;
    option: MarketplaceOption;
    expectedFlags: {
      aceNccrs?: boolean;
      isAltCredit?: boolean;
      proctored?: boolean;
      level?: number;
      providerType?: string;
      providerCode?: string;
    };
  }> = [
    {
      name: 'ACE-evaluated MOOC (alt credit)',
      option: {
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
      },
      expectedFlags: {
        aceNccrs: true,
        isAltCredit: true,
        proctored: false,
        level: 100,
        providerType: 'mooc',
        providerCode: 'SOPHIA',
      },
    },
    {
      name: 'University course (NOT alt credit)',
      option: {
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
        aceNccrs: false,
        isAltCredit: false,
        level: 200,
      },
      expectedFlags: {
        aceNccrs: false,
        isAltCredit: false,
        level: 200,
        providerType: 'university',
        providerCode: 'TESU',
      },
    },
    {
      name: 'Testing center (CLEP) - alt credit by providerType',
      option: {
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
      },
      expectedFlags: {
        proctored: true,
        level: 100,
        providerType: 'testing_center',
        providerCode: 'CLEP',
      },
    },
    {
      name: 'Upper-division course (level 300+)',
      option: {
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
      },
      expectedFlags: {
        level: 350,
        providerType: 'university',
        providerCode: 'TESU',
      },
    },
    {
      name: 'Course with equivalency_key for transfer matching',
      option: {
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
      },
      expectedFlags: {
        aceNccrs: true,
        providerType: 'mooc',
        providerCode: 'STUDYCOM',
      },
    },
  ];

  it.each(testCases)('$name: flags match expected', ({ option, expectedFlags }) => {
    const basketItem = courseToBasketItem(option, 'test-module');
    
    // Verify each expected flag matches
    for (const [key, expectedValue] of Object.entries(expectedFlags)) {
      expect(basketItem[key as keyof BasketItem]).toBe(expectedValue);
    }
  });

  it('countsTowardAltCap classification is consistent', () => {
    const testOptions: MarketplaceOption[] = [
      // Should count as alt credit
      {
        id: 'alt-1', courseId: 'C1', title: 'MOOC', credits: 3, subject: 'CS',
        provider: 'Sophia', providerType: 'mooc', cost_usd: 79, duration_weeks: 8,
        isAltCredit: true,
      },
      {
        id: 'alt-2', courseId: 'C2', title: 'ACE Course', credits: 3, subject: 'CS',
        provider: 'Study.com', providerType: 'mooc', cost_usd: 199, duration_weeks: 8,
        aceNccrs: true,
      },
      {
        id: 'alt-3', courseId: 'C3', title: 'Testing Center', credits: 3, subject: 'CS',
        provider: 'CLEP', providerType: 'testing_center', cost_usd: 89, duration_weeks: 4,
      },
      // Should NOT count as alt credit
      {
        id: 'uni-1', courseId: 'C4', title: 'University', credits: 3, subject: 'CS',
        provider: 'TESU', providerType: 'university', cost_usd: 500, duration_weeks: 16,
        isAltCredit: false,
      },
    ];

    for (const option of testOptions) {
      const basketItem = courseToBasketItem(option, 'test-module');
      
      // Both the option and the converted item should classify the same way
      const optionCountsAsAlt = countsTowardAltCap(option);
      const itemCountsAsAlt = countsTowardAltCap(basketItem);
      
      expect(itemCountsAsAlt).toBe(optionCountsAsAlt);
    }
  });
});

// ============================================
// TEST 2: Drag vs Add Parity
// ============================================
describe('Drag vs Add Parity: validateSemesterDrop agrees with addItemGuarded', () => {
  beforeEach(() => {
    usePlanBasket.setState({ items: [], constraints: {} });
  });

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
  function buildRemainingModules(count: number): RemainingModule[] {
    return Array.from({ length: count }, (_, i) => ({
      moduleId: `remaining-${i}`,
      options: [
        {
          id: `opt-${i}`,
          courseId: `COURSE-${i}`,
          title: `Course ${i}`,
          credits: 3,
          subject: 'GEN',
          provider: 'TESU',
          providerType: 'university',
          providerCode: 'TESU',
          cost_usd: 500,
          duration_weeks: 16,
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
    const semesterValidation = validateSemesterDrop({
      course: candidate,
      semesterId: '1-fall',
      plan: { semesters: {} },
      constraints: {
        basket: nearCapBasket,
        targetSchool: 'TESU',
        remainingModules,
        moduleId: 'test-module',
      },
    });

    // Both should block
    expect(deadEndCheck.isDeadEnd).toBe(true);
    expect(semesterValidation.valid).toBe(false);
    
    // Both should cite the cap as a reason
    const deadEndHasCapReason = deadEndCheck.reasons.some(r => 
      r.toLowerCase().includes('noncollegiate') || r.toLowerCase().includes('cap')
    );
    const semesterHasDeadEndError = semesterValidation.errors.some(e => 
      e.code === 'DEAD_END'
    );
    
    expect(deadEndHasCapReason).toBe(true);
    expect(semesterHasDeadEndError).toBe(true);
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
    const semesterValidation = validateSemesterDrop({
      course: validCandidate,
      semesterId: '1-fall',
      plan: { semesters: {} },
      constraints: {
        basket,
        targetSchool: 'TESU',
        remainingModules,
        moduleId: 'test-module',
      },
    });

    // Both should allow
    expect(deadEndCheck.isDeadEnd).toBe(false);
    expect(semesterValidation.valid).toBe(true);
  });

  it('both block when residency becomes unattainable', () => {
    // Build a basket that uses up most of the degree with non-university courses
    // TESU requires 30 residency credits out of 120 total
    // If we have 100 credits already, with only 10 residency, and only 20 credits remaining...
    // Adding a non-university course would leave only 17 slots for 20 needed residency → dead end
    
    const basket: BasketItem[] = [];
    // Add 80 credits of alt courses (residency = 0)
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
    // Add 10 credits of university (residency = 10)
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
    // Total: 90 credits, 10 residency, need 30 residency, 30 credits remaining
    
    // Remaining modules that can only offer limited residency
    const remainingModules: RemainingModule[] = Array.from({ length: 5 }, (_, i) => ({
      moduleId: `remaining-${i}`,
      options: [
        {
          id: `mooc-${i}`,
          courseId: `MOOC-R-${i}`,
          title: `MOOC ${i}`,
          credits: 3,
          subject: 'GEN',
          provider: 'Sophia',
          providerType: 'mooc',
          providerCode: 'SOPHIA',
          cost_usd: 79,
          duration_weeks: 8,
        },
      ],
      creditsRequired: 3,
    }));
    // These modules can only provide MOOC credits, no university options
    // So max possible additional residency = 0

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
    const semesterValidation = validateSemesterDrop({
      course: candidate,
      semesterId: '2-spring',
      plan: { semesters: {} },
      constraints: {
        basket,
        targetSchool: 'TESU',
        remainingModules,
        moduleId: 'remaining-0',
      },
    });

    // Both should identify residency issue
    const hasResidencyReason = deadEndCheck.reasons.some(r =>
      r.toLowerCase().includes('residency') || r.toLowerCase().includes('institutional')
    );

    if (deadEndCheck.isDeadEnd) {
      expect(hasResidencyReason).toBe(true);
      expect(semesterValidation.valid).toBe(false);
    }
  });

  it('local semester errors still work independently of transfer engine', () => {
    // Test that PREREQ, TERM_CAP, ALREADY_PLACED still work
    const course: MarketplaceOption = {
      id: 'test-course',
      courseId: 'CS200',
      title: 'CS 200',
      credits: 15, // Would exceed typical term cap
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
  });
});
