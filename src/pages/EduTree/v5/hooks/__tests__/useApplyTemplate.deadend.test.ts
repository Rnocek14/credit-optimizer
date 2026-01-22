/**
 * P0 Tests: Template Apply Dead-End Validation
 * 
 * These tests verify that bulk template application is blocked when
 * it would violate policy constraints (alt-credit cap, residency requirements).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkForDeadEnd } from '../../engine/deadEndDetector';
import { courseToBasketItem } from '../../engine/courseToBasketItem';
import type { MarketplaceOption } from '../../types/v5';
import type { BasketItem, Constraints } from '../../state/usePlanBasket';

// Mock the policy functions
vi.mock('@/lib/degree/institutionPolicies', () => ({
  getNoncollegiateCap: vi.fn(() => 90), // 90 credit cap
  getResidencyCredits: vi.fn(() => 30), // 30 credits residency
  getPolicyOrDefault: vi.fn(() => ({
    totalCreditsBachelor: 120,
    upperDivisionAreaOfStudyMin: 18,
    requiredResidenceCourses: [
      { code: 'SOS-1100', name: 'Information Literacy Today', credits: 3 },
      { code: 'CAPSTONE', name: 'Program-specific Capstone Course', credits: 3 },
    ],
  })),
}));

/** Helper to create a valid MarketplaceOption with required fields */
function createOption(overrides: Partial<MarketplaceOption> & { id: string; courseId: string; title: string; credits: number }): MarketplaceOption {
  return {
    subject: 'Business',
    provider: overrides.providerCode || 'SOPHIA',
    duration_weeks: 8,
    cost_usd: 79,
    ...overrides,
  };
}

describe('Template Apply Dead-End Validation', () => {
  const defaultConstraints: Constraints = {
    target_school: 'TESU',
    max_concurrent_courses: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Alt-Credit Cap Enforcement', () => {
    it('blocks template when cumulative alt credits would exceed cap', () => {
      // Current basket: 85 alt credits (mooc)
      const currentBasket: BasketItem[] = Array.from({ length: 17 }, (_, i) => ({
        moduleId: `mod-${i}`,
        courseId: `MOOC-${i}`,
        title: `MOOC Course ${i}`,
        credits: 5,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 75,
        providerType: 'mooc' as const,
        status: 'pinned' as const,
      }));

      // Template would add 10 more alt credits (2 courses × 5 credits)
      const templateOptions: MarketplaceOption[] = [
        createOption({
          id: 'opt-1',
          courseId: 'SOPHIA-BUS101',
          title: 'Business 101',
          credits: 5,
          cost_usd: 79,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
        }),
        createOption({
          id: 'opt-2',
          courseId: 'SOPHIA-BUS102',
          title: 'Business 102',
          credits: 5,
          cost_usd: 79,
          providerType: 'mooc',
          providerCode: 'SOPHIA',
        }),
      ];

      // Simulate aggregate check (like useApplyTemplate does)
      const simulatedItems = templateOptions.map(opt => 
        courseToBasketItem(opt, 'test-module')
      );
      const aggregateBasket = [...currentBasket, ...simulatedItems];
      const basketWithoutLast = aggregateBasket.slice(0, -1);

      const check = checkForDeadEnd(
        templateOptions[templateOptions.length - 1],
        basketWithoutLast,
        defaultConstraints,
        []
      );

      expect(check.isDeadEnd).toBe(true);
      expect(check.reasons.some(r => r.includes('noncollegiate cap'))).toBe(true);
    });

    it('allows template when alt credits stay within cap', () => {
      // Current basket: 80 alt credits
      const currentBasket: BasketItem[] = Array.from({ length: 16 }, (_, i) => ({
        moduleId: `mod-${i}`,
        courseId: `MOOC-${i}`,
        title: `MOOC Course ${i}`,
        credits: 5,
        cost_usd: 100,
        duration_weeks: 8,
        workload_weekly_hours: 10,
        cri_score: 75,
        providerType: 'mooc' as const,
        status: 'pinned' as const,
      }));

      // Template adds 8 credits (well under the 90 cap)
      const templateOption = createOption({
        id: 'opt-1',
        courseId: 'SOPHIA-BUS101',
        title: 'Business 101',
        credits: 8,
        cost_usd: 79,
        providerType: 'mooc',
        providerCode: 'SOPHIA',
      });

      const check = checkForDeadEnd(
        templateOption,
        currentBasket,
        defaultConstraints,
        []
      );

      // 80 + 8 = 88, which is under 90
      expect(check.isDeadEnd).toBe(false);
    });

    it('calculates exact boundary correctly (88 + 2 = 90 is OK)', () => {
      // Current basket: 88 alt credits
      const currentBasket: BasketItem[] = [
        {
          moduleId: 'mod-1',
          courseId: 'MOOC-1',
          title: 'MOOC Course 1',
          credits: 88,
          cost_usd: 100,
          duration_weeks: 8,
          workload_weekly_hours: 10,
          cri_score: 75,
          providerType: 'mooc' as const,
          status: 'pinned' as const,
        },
      ];

      // Template adds exactly 2 credits (hitting 90 exactly)
      const templateOption = createOption({
        id: 'opt-1',
        courseId: 'SOPHIA-BUS101',
        title: 'Business 101',
        credits: 2,
        cost_usd: 79,
        providerType: 'mooc',
        providerCode: 'SOPHIA',
      });

      const check = checkForDeadEnd(
        templateOption,
        currentBasket,
        defaultConstraints,
        []
      );

      // 88 + 2 = 90, exactly at cap, should be allowed
      expect(check.isDeadEnd).toBe(false);
    });

    it('blocks at 91 credits (88 + 3 exceeds cap)', () => {
      const currentBasket: BasketItem[] = [
        {
          moduleId: 'mod-1',
          courseId: 'MOOC-1',
          title: 'MOOC Course 1',
          credits: 88,
          cost_usd: 100,
          duration_weeks: 8,
          workload_weekly_hours: 10,
          cri_score: 75,
          providerType: 'mooc' as const,
          status: 'pinned' as const,
        },
      ];

      const templateOption = createOption({
        id: 'opt-1',
        courseId: 'SOPHIA-BUS101',
        title: 'Business 101',
        credits: 3, // 88 + 3 = 91, exceeds 90
        cost_usd: 79,
        providerType: 'mooc',
        providerCode: 'SOPHIA',
      });

      const check = checkForDeadEnd(
        templateOption,
        currentBasket,
        defaultConstraints,
        []
      );

      expect(check.isDeadEnd).toBe(true);
      expect(check.reasons[0]).toContain('noncollegiate cap');
    });
  });

  describe('Required Residence Course Enforcement', () => {
    it('blocks SOS-1100 substitution with alt-credit', () => {
      const option = createOption({
        id: 'opt-sos',
        courseId: 'SOPHIA-SOS-1100',
        title: 'SOS-1100 Information Literacy',
        credits: 3,
        cost_usd: 79,
        providerType: 'mooc',
        providerCode: 'SOPHIA',
      });

      const check = checkForDeadEnd(option, [], defaultConstraints, []);

      expect(check.isDeadEnd).toBe(true);
      expect(check.reasons.some(r => 
        r.includes('residence') && r.includes('TESU')
      )).toBe(true);
    });

    it('blocks Capstone substitution with alt-credit', () => {
      const option = createOption({
        id: 'opt-cap',
        courseId: 'STUDYCOM-CAPSTONE',
        title: 'Business Capstone',
        credits: 3,
        cost_usd: 200,
        providerType: 'mooc',
        providerCode: 'STUDYCOM',
        provider: 'STUDYCOM',
      });

      const check = checkForDeadEnd(option, [], defaultConstraints, []);

      expect(check.isDeadEnd).toBe(true);
      expect(check.reasons.some(r => r.includes('residence'))).toBe(true);
    });

    it('allows SOS-1100 from resident institution', () => {
      const option = createOption({
        id: 'opt-sos-tesu',
        courseId: 'TESU-SOS-1100',
        title: 'SOS-1100 Information Literacy Today',
        credits: 3,
        cost_usd: 500,
        providerType: 'university',
        providerCode: 'TESU',
        provider: 'TESU',
      });

      const check = checkForDeadEnd(option, [], defaultConstraints, []);

      // Should not be blocked for residency violation
      expect(check.reasons.some(r => r.includes('residence'))).toBe(false);
    });

    it('allows Capstone from resident institution', () => {
      const option = createOption({
        id: 'opt-cap-tesu',
        courseId: 'TESU-BSBA-CAPSTONE',
        title: 'BSBA Capstone Course',
        credits: 3,
        cost_usd: 500,
        providerType: 'university',
        providerCode: 'TESU',
        provider: 'TESU',
      });

      const check = checkForDeadEnd(option, [], defaultConstraints, []);

      expect(check.reasons.some(r => r.includes('residence'))).toBe(false);
    });
  });

  describe('courseToBasketItem normalization', () => {
    it('preserves providerType for classification', () => {
      const option = createOption({
        id: 'opt-1',
        courseId: 'SOPHIA-BUS101',
        title: 'Business 101',
        credits: 3,
        cost_usd: 79,
        providerType: 'mooc',
        providerCode: 'SOPHIA',
      });

      const basketItem = courseToBasketItem(option, 'test-module');

      expect(basketItem.providerType).toBe('mooc');
      expect(basketItem.providerCode).toBe('SOPHIA');
      expect(basketItem.credits).toBe(3);
    });

    it('preserves level for upper-division checks', () => {
      const option = createOption({
        id: 'opt-ud',
        courseId: 'TESU-BUS400',
        title: 'Advanced Business',
        credits: 3,
        cost_usd: 500,
        providerType: 'university',
        providerCode: 'TESU',
        provider: 'TESU',
        level: 400,
      });

      const basketItem = courseToBasketItem(option, 'test-module');

      expect(basketItem.level).toBe(400);
    });
  });
});
