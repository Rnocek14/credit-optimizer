import { describe, it, expect } from 'vitest';
import { 
  normalizeOptimization, 
  OPTIMIZATION, 
  OPTIMIZATION_LABEL,
  isAltCreditOptimization,
  type Optimization 
} from './optimizationTypes';

describe('normalizeOptimization', () => {
  it.each([
    // Alt-credit variants
    ['alt_max', OPTIMIZATION.ALT_CREDIT],
    ['ALT_MAX', OPTIMIZATION.ALT_CREDIT],
    ['alt-max', OPTIMIZATION.ALT_CREDIT],
    ['altmax', OPTIMIZATION.ALT_CREDIT],
    ['alt-credit', OPTIMIZATION.ALT_CREDIT],
    ['alt_credit', OPTIMIZATION.ALT_CREDIT],
    ['altcredit', OPTIMIZATION.ALT_CREDIT],
    ['cheapest', OPTIMIZATION.ALT_CREDIT],
    ['CHEAPEST', OPTIMIZATION.ALT_CREDIT],
    
    // Fastest variants
    ['fastest', OPTIMIZATION.FASTEST],
    ['FASTEST', OPTIMIZATION.FASTEST],
    ['time-min', OPTIMIZATION.FASTEST],
    ['time_min', OPTIMIZATION.FASTEST],
    
    // Balanced
    ['balanced', OPTIMIZATION.BALANCED],
    ['BALANCED', OPTIMIZATION.BALANCED],
    
    // Standard (default)
    ['standard', OPTIMIZATION.STANDARD],
    ['STANDARD', OPTIMIZATION.STANDARD],
    ['standard-like', OPTIMIZATION.STANDARD],
    ['standard_like', OPTIMIZATION.STANDARD],
    
    // Unknown → standard
    ['unknown', OPTIMIZATION.STANDARD],
    ['garbage', OPTIMIZATION.STANDARD],
    ['', OPTIMIZATION.STANDARD],
  ])('normalizes "%s" → "%s"', (input, expected) => {
    expect(normalizeOptimization(input)).toBe(expected);
  });

  it('handles null/undefined → standard', () => {
    expect(normalizeOptimization(null)).toBe(OPTIMIZATION.STANDARD);
    expect(normalizeOptimization(undefined)).toBe(OPTIMIZATION.STANDARD);
  });

  it('trims whitespace', () => {
    expect(normalizeOptimization('  alt_max  ')).toBe(OPTIMIZATION.ALT_CREDIT);
  });
});

describe('OPTIMIZATION_LABEL', () => {
  it('has labels for all optimization types', () => {
    // TypeScript ensures this at compile time, but runtime check for safety
    const allOptimizations: Optimization[] = Object.values(OPTIMIZATION);
    allOptimizations.forEach(opt => {
      expect(OPTIMIZATION_LABEL[opt]).toBeDefined();
      expect(typeof OPTIMIZATION_LABEL[opt]).toBe('string');
    });
  });
});

describe('isAltCreditOptimization', () => {
  it('returns true for alt-credit', () => {
    expect(isAltCreditOptimization(OPTIMIZATION.ALT_CREDIT)).toBe(true);
  });

  it('returns false for other types', () => {
    expect(isAltCreditOptimization(OPTIMIZATION.STANDARD)).toBe(false);
    expect(isAltCreditOptimization(OPTIMIZATION.FASTEST)).toBe(false);
    expect(isAltCreditOptimization(OPTIMIZATION.BALANCED)).toBe(false);
  });
});
