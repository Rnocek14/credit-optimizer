import { describe, it, expect } from 'vitest';
import { TIPS } from '../tutorial-map';

// Simplified tests for Tutorial Mode functionality
describe('Tutorial Mode System', () => {
  it('should have tutorial map with required tips', () => {
    expect(TIPS.criGauge).toContain('Career Readiness Index');
    expect(TIPS.skillBars).toContain('skill proficiency');
    expect(TIPS.recoOpen).toContain('course page');
    expect(TIPS.recoSave).toContain('Learning Plan');
    expect(TIPS.planProjectedCRI).toContain('Projected CRI');
    expect(TIPS.transcriptExport).toContain('transcript');
  });
  
  it('should export tutorial components without errors', () => {
    expect(() => require('../TutorialProvider')).not.toThrow();
    expect(() => require('../TutorialToggle')).not.toThrow();
    expect(() => require('../TutorialTip')).not.toThrow();
  });

  it('should have all required tip definitions', () => {
    const requiredTips = ['criGauge', 'skillBars', 'recoOpen', 'recoSave', 'planProjectedCRI', 'transcriptExport'];
    
    requiredTips.forEach(tipId => {
      expect(TIPS[tipId]).toBeDefined();
      expect(typeof TIPS[tipId]).toBe('string');
      expect(TIPS[tipId].length).toBeGreaterThan(0);
    });
  });
});