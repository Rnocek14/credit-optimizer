/**
 * Provider Normalization Unit Tests
 * 
 * Tests the core normalization logic in isolation.
 * These are fast, pure function tests.
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeProviderCode, 
  isKnownProvider,
  normalizeCourseCode,
} from '@/lib/providerNormalization';

describe('normalizeProviderCode', () => {
  
  describe('Study.com variants', () => {
    it('STUDY_COM → STUDYCOM', () => {
      expect(normalizeProviderCode('STUDY_COM')).toBe('STUDYCOM');
    });
    
    it('study_com (lowercase) → STUDYCOM', () => {
      expect(normalizeProviderCode('study_com')).toBe('STUDYCOM');
    });
    
    it('STUDY.COM → STUDYCOM', () => {
      expect(normalizeProviderCode('STUDY.COM')).toBe('STUDYCOM');
    });
    
    it('SDC alias → STUDYCOM', () => {
      expect(normalizeProviderCode('SDC')).toBe('STUDYCOM');
    });
    
    it('STUDY → STUDYCOM', () => {
      expect(normalizeProviderCode('STUDY')).toBe('STUDYCOM');
    });
  });
  
  describe('StraighterLine variants', () => {
    it('SL → STRAIGHTERLINE', () => {
      expect(normalizeProviderCode('SL')).toBe('STRAIGHTERLINE');
    });
    
    it('STRAIGHTERLINE passes through', () => {
      expect(normalizeProviderCode('STRAIGHTERLINE')).toBe('STRAIGHTERLINE');
    });
    
    it('straighterline (lowercase) → STRAIGHTERLINE', () => {
      expect(normalizeProviderCode('straighterline')).toBe('STRAIGHTERLINE');
    });
  });
  
  describe('Other providers', () => {
    it('SOPHIA passes through', () => {
      expect(normalizeProviderCode('SOPHIA')).toBe('SOPHIA');
    });
    
    it('CLEP passes through', () => {
      expect(normalizeProviderCode('CLEP')).toBe('CLEP');
    });
    
    it('DSST passes through', () => {
      expect(normalizeProviderCode('DSST')).toBe('DSST');
    });
    
    it('AP passes through', () => {
      expect(normalizeProviderCode('AP')).toBe('AP');
    });
    
    it('SAYLOR passes through', () => {
      expect(normalizeProviderCode('SAYLOR')).toBe('SAYLOR');
    });
  });
  
  describe('Institutions', () => {
    it('TESU passes through', () => {
      expect(normalizeProviderCode('TESU')).toBe('TESU');
    });
    
    it('COSC passes through', () => {
      expect(normalizeProviderCode('COSC')).toBe('COSC');
    });
    
    it('WGU passes through', () => {
      expect(normalizeProviderCode('WGU')).toBe('WGU');
    });
  });
  
  describe('Unknown codes', () => {
    it('returns uppercased unknown codes', () => {
      expect(normalizeProviderCode('unknown_provider')).toBe('UNKNOWN_PROVIDER');
    });
  });
});

describe('isKnownProvider', () => {
  it('returns true for known providers', () => {
    expect(isKnownProvider('SOPHIA')).toBe(true);
    expect(isKnownProvider('STUDY_COM')).toBe(true);
    expect(isKnownProvider('STUDYCOM')).toBe(true);
  });
  
  it('returns false for unknown providers', () => {
    expect(isKnownProvider('RANDOM_PROVIDER')).toBe(false);
  });
});

describe('normalizeCourseCode', () => {
  it('normalizes known aliases', () => {
    expect(normalizeCourseCode('SOPHIA-STATS')).toBe('SOPHIA-STATISTICS');
    expect(normalizeCourseCode('SOPHIA-ART-HIST')).toBe('SOPHIA-ART-HIST-I');
  });
  
  it('preserves unknown codes', () => {
    expect(normalizeCourseCode('UNKNOWN-CODE')).toBe('UNKNOWN-CODE');
  });
});
