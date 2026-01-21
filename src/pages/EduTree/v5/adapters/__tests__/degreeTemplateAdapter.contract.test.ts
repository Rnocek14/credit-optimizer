/**
 * Degree Template Adapter Contract Tests
 * 
 * End-to-end tests that call the real adaptDegreeTemplate() function
 * to verify normalization, stable fields, and pricing logic.
 * 
 * CRITICAL: These tests catch regressions in:
 * - Provider code normalization (STUDY_COM → STUDYCOM)
 * - Stable rehydration fields (alt_identifier, alt_source_code)
 * - Equivalency matching with normalized codes
 * - Pricing model calculations
 */

import { describe, it, expect } from 'vitest';
import { 
  adaptDegreeTemplate, 
  ACE_NCCRS_PROVIDERS,
  isAceNccrsProvider,
} from '@/pages/EduTree/v5/adapters/degreeTemplateAdapter';
import type { ProviderPricingData } from '@/pages/EduTree/v5/adapters/degreeTemplateAdapter';
import type { DegreeTemplate } from '@/types/degreeTemplates';
import { matchSavedItemToOption, type SavedPlanItem } from '@/pages/EduTree/v5/utils/rehydration';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Minimal DBDegreeTemplate fixture with alt-credit options
 * Uses STUDY_COM (legacy) to test normalization
 */
function createTestTemplate(): DegreeTemplate {
  return {
    id: 'test-template-1',
    institution_id: 'inst-1',
    institution_code: 'TESU',
    program_code: 'BSBA',
    track_type: 'standard',
    total_credits: 120,
    estimated_cost: null,
    estimated_duration_months: null,
    template_data: {
      programCode: 'BSBA',
      trackType: 'standard',
      totalCredits: 120,
      terms: [
        {
          id: 'y1-t1',
          label: 'Year 1 Term 1',
          slots: [
            {
              slotId: 'slot-1',
              requirementArea: 'WRITTEN_COMM',
              kind: 'gened',
              minCredits: 3,
              preferred: {
                type: 'alt_credit',
                sourceCode: 'STUDY_COM', // Legacy format - should normalize to STUDYCOM
                identifier: 'BUS-101',
              },
              alternatives: [
                {
                  type: 'alt_credit',
                  sourceCode: 'SOPHIA',
                  identifier: 'BUS-COMM',
                },
              ],
            },
            {
              slotId: 'slot-2',
              requirementArea: 'QUANTITATIVE',
              kind: 'gened',
              minCredits: 3,
              preferred: {
                type: 'institutional_course',
                courseCode: 'MATH-101',
              },
            },
          ],
        },
      ],
    },
  };
}

/**
 * Equivalencies that use STUDY_COM (legacy) to test normalization matching
 */
function createTestEquivalencies() {
  return [
    {
      alt_credit_id: 'eq-1',
      alt_source_code: 'STUDY_COM', // Legacy format in DB
      alt_identifier: 'BUS-101',
      institutional_course_code: 'BUS-101',
      institutional_course_name: 'Business Communications',
      credits_awarded: 3,
      level: 100,
      confidence: 0.9,
    },
    {
      alt_credit_id: 'eq-2',
      alt_source_code: 'SOPHIA',
      alt_identifier: 'BUS-COMM',
      institutional_course_code: 'BUS-102',
      institutional_course_name: 'Professional Communication',
      credits_awarded: 3,
      level: 100,
      confidence: 0.85,
    },
  ];
}

/**
 * Provider pricing map with normalized codes
 */
function createTestPricingMap(): Map<string, ProviderPricingData> {
  return new Map([
    ['STUDYCOM', { 
      providerCode: 'STUDYCOM', 
      model: 'per_course', 
      perCourseCost: 199,
      effectiveCostPerCredit: 66,
    }],
    ['SOPHIA', { 
      providerCode: 'SOPHIA', 
      model: 'subscription', 
      monthlySubscription: 99, 
      avgCreditsPerMonth: 3,
      effectiveCostPerCredit: 33,
    }],
  ]);
}

// ============================================================================
// Helpers
// ============================================================================

/** Type alias for adapted template output - stays aligned if adapter evolves */
type AdaptedTemplate = ReturnType<typeof adaptDegreeTemplate>;

/**
 * Get the first option from the first module in year 1
 * (This is the slot's preferred option after adaptation)
 * Resilient to courseId vs id format drift
 */
function getFirstOption(result: AdaptedTemplate) {
  const year1 = result.yearTemplates[0];
  const firstModule = year1.moduleTemplates[0];
  const recommendedId = firstModule.recommendedCourseId;
  // Check both courseId and id to handle potential format drift
  const preferred =
    firstModule.options.find(o => o.courseId === recommendedId) ??
    firstModule.options.find(o => o.id === recommendedId) ??
    firstModule.options[0];
  return preferred;
}

/**
 * Get all options from the first module in year 1
 */
function getFirstModuleOptions(result: AdaptedTemplate) {
  const year1 = result.yearTemplates[0];
  return year1.moduleTemplates[0].options;
}

/**
 * Get options from the second module in year 1 (institutional course slot)
 */
function getSecondModuleOptions(result: AdaptedTemplate) {
  const year1 = result.yearTemplates[0];
  return year1.moduleTemplates[1]?.options ?? [];
}

// ============================================================================
// Contract Tests
// ============================================================================

describe('adaptDegreeTemplate() Contract', () => {
  
  it('normalizes STUDY_COM to STUDYCOM in returned options', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const preferredOption = getFirstOption(result);
    
    // Verify normalization happened
    expect(preferredOption.providerCode).toBe('STUDYCOM');
    expect(preferredOption.id).toBe('STUDYCOM-BUS-101');
    expect(preferredOption.courseId).toBe('STUDYCOM-BUS-101');
  });
  
  it('sets stable rehydration fields correctly', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const preferredOption = getFirstOption(result);
    
    // Stable fields should be set
    expect(preferredOption.alt_identifier).toBe('BUS-101');
    expect(preferredOption.alt_source_code).toBe('STUDYCOM'); // Normalized
    expect(preferredOption.equivalency_key).toBe('BUS-101');
  });
  
  it('matches equivalencies with normalized provider codes', () => {
    const template = createTestTemplate();
    const equivalencies = createTestEquivalencies();
    const result = adaptDegreeTemplate(template, equivalencies);
    
    const preferredOption = getFirstOption(result);
    
    // Should have matched STUDY_COM equivalency despite option being STUDYCOM
    expect(preferredOption.title).toBe('Business Communications');
    expect(preferredOption.credits).toBe(3);
    expect(preferredOption.level).toBe(100);
  });
  
  it('uses pricing map with normalized codes', () => {
    const template = createTestTemplate();
    const equivalencies = createTestEquivalencies();
    const pricingMap = createTestPricingMap();
    const result = adaptDegreeTemplate(template, equivalencies, pricingMap);
    
    const preferredOption = getFirstOption(result);
    
    // Should use STUDYCOM pricing from map (per_course: $199)
    expect(preferredOption.cost_usd).toBe(199);
  });
  
  it('sets aceNccrs flag based on normalized provider code', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const options = getFirstModuleOptions(result);
    const studyComOption = options.find(o => o.providerCode === 'STUDYCOM');
    const sophiaOption = options.find(o => o.providerCode === 'SOPHIA');
    
    // Both STUDYCOM and SOPHIA should be ACE/NCCRS
    expect(studyComOption?.aceNccrs).toBe(true);
    expect(studyComOption?.isAltCredit).toBe(true);
    expect(sophiaOption?.aceNccrs).toBe(true);
  });
  
  it('institutional courses are not marked as alt-credit', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const institutionalOptions = getSecondModuleOptions(result);
    const institutionalOption = institutionalOptions[0];
    
    expect(institutionalOption.isAltCredit).toBe(false);
    expect(institutionalOption.providerType).toBe('university');
    expect(institutionalOption.providerCode).toBe('TESU');
  });
});

describe('ACE_NCCRS_PROVIDERS classification', () => {
  
  it('includes all expected alt-credit providers', () => {
    expect(ACE_NCCRS_PROVIDERS.has('SOPHIA')).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has('STUDYCOM')).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has('STRAIGHTERLINE')).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has('SAYLOR')).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has('CLEP')).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has('DSST')).toBe(true);
  });
  
  it('does not include institutional providers', () => {
    expect(ACE_NCCRS_PROVIDERS.has('TESU')).toBe(false);
    expect(ACE_NCCRS_PROVIDERS.has('WGU')).toBe(false);
    expect(ACE_NCCRS_PROVIDERS.has('COSC')).toBe(false);
  });
  
  it('isAceNccrsProvider normalizes before checking', () => {
    expect(isAceNccrsProvider('SOPHIA')).toBe(true);
    expect(isAceNccrsProvider('sophia')).toBe(true);
    expect(isAceNccrsProvider('STUDY_COM')).toBe(true);
    expect(isAceNccrsProvider('SDC')).toBe(true);
    expect(isAceNccrsProvider('SL')).toBe(true);
  });
});

describe('Rehydration Matching', () => {
  
  it('matches legacy STUDY_COM saved item to normalized STUDYCOM option', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const currentOption = getFirstOption(result);
    
    // Simulate a legacy saved plan item with STUDY_COM
    const legacySavedItem: SavedPlanItem = {
      courseId: 'STUDY_COM-BUS-101', // Legacy ID
      alt_identifier: 'BUS-101',
      alt_source_code: 'STUDY_COM', // Legacy code
    };
    
    // Should match via stable fields even though IDs differ
    expect(matchSavedItemToOption(legacySavedItem, currentOption)).toBe(true);
  });
  
  it('matches by exact courseId when available', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const currentOption = getFirstOption(result);
    
    const savedItem: SavedPlanItem = {
      courseId: 'STUDYCOM-BUS-101', // Exact match
    };
    
    expect(matchSavedItemToOption(savedItem, currentOption)).toBe(true);
  });
  
  it('does not match different identifiers', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const currentOption = getFirstOption(result);
    
    const differentItem: SavedPlanItem = {
      courseId: 'STUDYCOM-BUS-999',
      alt_identifier: 'BUS-999',
      alt_source_code: 'STUDYCOM',
    };
    
    expect(matchSavedItemToOption(differentItem, currentOption)).toBe(false);
  });
  
  it('does not match different providers with same identifier', () => {
    const template = createTestTemplate();
    const result = adaptDegreeTemplate(template);
    
    const currentOption = getFirstOption(result);
    
    const differentProvider: SavedPlanItem = {
      courseId: 'SOPHIA-BUS-101', // Different provider
      alt_identifier: 'BUS-101', // Same identifier
      alt_source_code: 'SOPHIA',
    };
    
    expect(matchSavedItemToOption(differentProvider, currentOption)).toBe(false);
  });
});

describe('Pricing Determinism', () => {
  
  it('subscription model applies coursesPerMonth guard', () => {
    const equivalencies = createTestEquivalencies();
    
    // Create pricing where avgCreditsPerMonth < course credits
    const providerPricingMap = new Map([
      ['SOPHIA', { 
        providerCode: 'SOPHIA', 
        model: 'subscription' as const, 
        monthlySubscription: 99, 
        avgCreditsPerMonth: 2, // Less than 3-credit course
      }],
    ]);
    
    // Create template with SOPHIA as preferred
    const sophiaTemplate = createTestTemplate();
    sophiaTemplate.template_data.terms[0].slots[0].preferred = {
      type: 'alt_credit',
      sourceCode: 'SOPHIA',
      identifier: 'TEST-101',
    };
    
    // Explicitly pass undefined for institutionalPricing (4th arg) to document arg order
    // Signature: adaptDegreeTemplate(dbTemplate, equivalencies, providerPricing?, institutionalPricing?)
    const result = adaptDegreeTemplate(sophiaTemplate, equivalencies, providerPricingMap, undefined);
    const option = getFirstOption(result);
    
    // With guard: coursesPerMonth = max(1, 2/3) = 1, so cost = 99/1 = 99
    // Without guard: coursesPerMonth = 2/3 = 0.67, so cost = 99/0.67 = 148
    expect(option.cost_usd).toBe(99);
  });
  
  it('provider pricing map takes precedence over defaults', () => {
    const template = createTestTemplate();
    const equivalencies = createTestEquivalencies();
    
    // Override STUDYCOM pricing to something different from default
    const providerPricingMap = new Map([
      ['STUDYCOM', { 
        providerCode: 'STUDYCOM', 
        model: 'per_course' as const, 
        perCourseCost: 149, // Different from default $199
      }],
    ]);
    
    // Explicitly pass undefined for institutionalPricing to document arg order
    const result = adaptDegreeTemplate(template, equivalencies, providerPricingMap, undefined);
    const option = getFirstOption(result);
    
    // Should use map value, not default
    expect(option.cost_usd).toBe(149);
  });
  
  it('uses default pricing when no map provided', () => {
    const template = createTestTemplate();
    // No pricing maps - should use DEFAULT_PROVIDER_PRICING fallback
    const result = adaptDegreeTemplate(template, undefined, undefined, undefined);
    const option = getFirstOption(result);
    
    // STUDYCOM default is per_course: $199
    expect(option.cost_usd).toBe(199);
    expect(option.providerCode).toBe('STUDYCOM');
  });
});
