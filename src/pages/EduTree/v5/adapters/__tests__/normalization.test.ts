/**
 * Adapter Normalization Tests
 * 
 * These tests ensure that provider code normalization and stable matching fields
 * remain consistent across the adapter. Critical for plan rehydration and
 * marketplace course linking.
 * 
 * IMPORTANT: If these tests fail, saved plans may fail to rehydrate correctly
 * or marketplace courses may fail to link properly.
 */

import { describe, it, expect } from 'vitest';
import { normalizeProviderCode } from '@/lib/providerNormalization';

describe('Provider Code Normalization Stability', () => {
  
  it('STUDY_COM normalizes to STUDYCOM', () => {
    expect(normalizeProviderCode('STUDY_COM')).toBe('STUDYCOM');
    expect(normalizeProviderCode('study_com')).toBe('STUDYCOM');
    expect(normalizeProviderCode('Study.com')).toBe('STUDYCOM');
    expect(normalizeProviderCode('SDC')).toBe('STUDYCOM');
    expect(normalizeProviderCode('STUDY')).toBe('STUDYCOM');
  });
  
  it('STRAIGHTERLINE variants all normalize consistently', () => {
    expect(normalizeProviderCode('SL')).toBe('STRAIGHTERLINE');
    expect(normalizeProviderCode('STRAIGHTERLINE')).toBe('STRAIGHTERLINE');
    expect(normalizeProviderCode('straighterline')).toBe('STRAIGHTERLINE');
  });
  
  it('SOPHIA normalizes to SOPHIA', () => {
    expect(normalizeProviderCode('SOPHIA')).toBe('SOPHIA');
    expect(normalizeProviderCode('sophia')).toBe('SOPHIA');
  });
  
  it('exam providers normalize correctly', () => {
    expect(normalizeProviderCode('CLEP')).toBe('CLEP');
    expect(normalizeProviderCode('DSST')).toBe('DSST');
    expect(normalizeProviderCode('AP')).toBe('AP');
  });
  
  it('institution codes normalize correctly', () => {
    expect(normalizeProviderCode('TESU')).toBe('TESU');
    expect(normalizeProviderCode('COSC')).toBe('COSC');
    expect(normalizeProviderCode('WGU')).toBe('WGU');
  });
});

describe('Adapter Stable Fields Contract', () => {
  /**
   * This test verifies the contract that convertSlotOptionToMarketplaceOption
   * should produce stable fields for rehydration.
   * 
   * The actual adapter function isn't exported directly, so we test the
   * expected contract: normalized IDs + stable matching fields.
   */
  
  it('normalized ID format is predictable', () => {
    const sourceCode = 'STUDY_COM';
    const identifier = 'BUS-101';
    
    const normalizedProvider = normalizeProviderCode(sourceCode);
    const expectedId = `${normalizedProvider}-${identifier}`;
    
    expect(normalizedProvider).toBe('STUDYCOM');
    expect(expectedId).toBe('STUDYCOM-BUS-101');
  });
  
  it('stable fields remain consistent after normalization', () => {
    // Simulating what the adapter should produce
    const option = {
      sourceCode: 'STUDY_COM',
      identifier: 'BUS-101',
    };
    
    const providerCode = normalizeProviderCode(option.sourceCode);
    
    // These are the stable fields the adapter should set
    const stableFields = {
      id: `${providerCode}-${option.identifier}`,
      courseId: `${providerCode}-${option.identifier}`,
      alt_source_code: providerCode,
      alt_identifier: option.identifier,
      equivalency_key: option.identifier,
    };
    
    expect(stableFields.id).toBe('STUDYCOM-BUS-101');
    expect(stableFields.courseId).toBe('STUDYCOM-BUS-101');
    expect(stableFields.alt_source_code).toBe('STUDYCOM');
    expect(stableFields.alt_identifier).toBe('BUS-101');
    expect(stableFields.equivalency_key).toBe('BUS-101');
  });
  
  it('equivalency lookup uses normalized codes on both sides', () => {
    // Simulating equivalency lookup matching
    const equivalencies = [
      { alt_source_code: 'STUDY_COM', alt_identifier: 'BUS-101', credits_awarded: 3 },
      { alt_source_code: 'SOPHIA', alt_identifier: 'ENG-100', credits_awarded: 3 },
    ];
    
    const optionSourceCode = 'STUDYCOM'; // Already normalized in DB
    const optionIdentifier = 'BUS-101';
    
    // The adapter should normalize both sides to match
    const match = equivalencies.find(
      e => normalizeProviderCode(e.alt_source_code) === normalizeProviderCode(optionSourceCode) &&
           e.alt_identifier === optionIdentifier
    );
    
    expect(match).toBeDefined();
    expect(match?.credits_awarded).toBe(3);
  });
  
  it('rehydration can match legacy IDs to normalized IDs', () => {
    // Legacy saved plan item
    const savedItem = {
      courseId: 'STUDY_COM-BUS-101',
      alt_identifier: 'BUS-101',
      alt_source_code: 'STUDY_COM',
    };
    
    // Current adapter output
    const currentOption = {
      id: 'STUDYCOM-BUS-101',
      courseId: 'STUDYCOM-BUS-101',
      alt_identifier: 'BUS-101',
      alt_source_code: 'STUDYCOM',
    };
    
    // Matching should work via stable fields, not primary ID
    const matchByStableFields = 
      savedItem.alt_identifier === currentOption.alt_identifier &&
      normalizeProviderCode(savedItem.alt_source_code ?? '') === currentOption.alt_source_code;
    
    expect(matchByStableFields).toBe(true);
  });
});

describe('ACE/NCCRS Provider Classification', () => {
  const ACE_NCCRS_PROVIDERS = new Set(['SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'SAYLOR', 'DSST', 'CLEP']);
  
  it('correctly identifies ACE-evaluated providers', () => {
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('SOPHIA'))).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('STUDY_COM'))).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('SL'))).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('SAYLOR'))).toBe(true);
  });
  
  it('correctly identifies exam providers as ACE-evaluated', () => {
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('CLEP'))).toBe(true);
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('DSST'))).toBe(true);
  });
  
  it('does not classify institutional providers as ACE', () => {
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('TESU'))).toBe(false);
    expect(ACE_NCCRS_PROVIDERS.has(normalizeProviderCode('WGU'))).toBe(false);
  });
});
