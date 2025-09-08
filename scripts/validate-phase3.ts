#!/usr/bin/env tsx
/**
 * Phase 3 Validation Script
 * Validates spacing tokens, interactive states, and motion system compliance
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';

interface Phase3ValidationResult {
  spacingCompliance: {
    totalFiles: number;
    compliantFiles: number;
    violations: Array<{
      file: string;
      arbitrarySpacing: string[];
      nonCompliantTouchTargets: string[];
    }>;
  };
  interactiveStates: {
    componentsChecked: number;
    missingFocusRings: string[];
    missingTouchTargets: string[];
    missingHoverStates: string[];
  };
  motionSystem: {
    filesWithArbitraryDurations: string[];
    filesWithoutReducedMotion: string[];
  };
}

// Patterns to detect non-compliant spacing
const arbitrarySpacingPatterns = [
  /\b(p|m|gap|w|h|min-w|min-h|max-w|max-h)-\[[^\]]+\]/g,
  /\b(top|right|bottom|left)-\[[^\]]+\]/g,
];

// Patterns for touch target compliance
const smallTouchTargetPatterns = [
  /\bh-[1-9]\b/g,       // h-1 through h-9 (less than 40px)
  /\bh-10\b/g,          // h-10 (40px, below 44px minimum)
];

// Interactive element patterns
const interactiveElementPatterns = [
  /(button|Button)/g,
  /(input|Input)/g,  
  /(select|Select)/g,
  /role=["']button["']/g,
  /onClick=/g,
];

// Motion-related patterns
const arbitraryDurationPatterns = [
  /duration-\[[^\]]+\]/g,
  /transition.*?\d+ms/g,
  /animation.*?\d+s/g,
];

async function validateSpacing(): Promise<Phase3ValidationResult['spacingCompliance']> {
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/*.d.ts', '**/node_modules/**']
  });
  
  const violations: Array<{
    file: string;
    arbitrarySpacing: string[];
    nonCompliantTouchTargets: string[];
  }> = [];
  
  let compliantFiles = 0;
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      
      const arbitrarySpacing: string[] = [];
      const nonCompliantTouchTargets: string[] = [];
      
      // Check for arbitrary spacing
      arbitrarySpacingPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        arbitrarySpacing.push(...matches);
      });
      
      // Check for interactive elements with non-compliant touch targets
      const hasInteractiveElements = interactiveElementPatterns.some(pattern => 
        pattern.test(content)
      );
      
      if (hasInteractiveElements) {
        smallTouchTargetPatterns.forEach(pattern => {
          const matches = content.match(pattern) || [];
          nonCompliantTouchTargets.push(...matches);
        });
      }
      
      if (arbitrarySpacing.length === 0 && nonCompliantTouchTargets.length === 0) {
        compliantFiles++;
      } else {
        violations.push({
          file,
          arbitrarySpacing: [...new Set(arbitrarySpacing)], // Remove duplicates
          nonCompliantTouchTargets: [...new Set(nonCompliantTouchTargets)],
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error);
    }
  }
  
  return {
    totalFiles: files.length,
    compliantFiles,
    violations,
  };
}

async function validateInteractiveStates(): Promise<Phase3ValidationResult['interactiveStates']> {
  const files = await glob('src/components/**/*.{ts,tsx}', {
    ignore: ['**/*.d.ts']
  });
  
  let componentsChecked = 0;
  const missingFocusRings: string[] = [];
  const missingTouchTargets: string[] = [];
  const missingHoverStates: string[] = [];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      
      const hasInteractiveElements = interactiveElementPatterns.some(pattern =>
        pattern.test(content)
      );
      
      if (hasInteractiveElements) {
        componentsChecked++;
        
        // Check for focus rings
        const hasFocusRing = /focus-visible:|focus:|focus-ring/.test(content);
        if (!hasFocusRing) {
          missingFocusRings.push(file);
        }
        
        // Check for touch targets
        const hasTouchTarget = /touch-target|min-h-11|min-h-12|min-h-13/.test(content);
        if (!hasTouchTarget) {
          missingTouchTargets.push(file);
        }
        
        // Check for hover states
        const hasHoverState = /hover:/.test(content);
        if (!hasHoverState) {
          missingHoverStates.push(file);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error);
    }
  }
  
  return {
    componentsChecked,
    missingFocusRings,
    missingTouchTargets,
    missingHoverStates,
  };
}

async function validateMotionSystem(): Promise<Phase3ValidationResult['motionSystem']> {
  const files = await glob('src/**/*.{ts,tsx,css}', {
    ignore: ['**/*.d.ts', '**/node_modules/**']
  });
  
  const filesWithArbitraryDurations: string[] = [];
  const filesWithoutReducedMotion: string[] = [];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      
      // Check for arbitrary durations
      const hasArbitraryDuration = arbitraryDurationPatterns.some(pattern =>
        pattern.test(content)
      );
      
      if (hasArbitraryDuration) {
        filesWithArbitraryDurations.push(file);
      }
      
      // Check for animations without reduced motion consideration
      const hasAnimation = /animate-|animation:|@keyframes/.test(content);
      const hasReducedMotionCheck = /prefers-reduced-motion|motion-safe/.test(content);
      
      if (hasAnimation && !hasReducedMotionCheck && !file.endsWith('index.css')) {
        filesWithoutReducedMotion.push(file);
      }
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}:`, error);
    }
  }
  
  return {
    filesWithArbitraryDurations,
    filesWithoutReducedMotion,
  };
}

async function main() {
  console.log('🎨 Running Phase 3 Design System Validation...\n');
  
  console.log('📏 Validating spacing system compliance...');
  const spacingResults = await validateSpacing();
  
  console.log('⚡ Validating interactive states...');
  const interactiveResults = await validateInteractiveStates();
  
  console.log('🎬 Validating motion system...');
  const motionResults = await validateMotionSystem();
  
  const results: Phase3ValidationResult = {
    spacingCompliance: spacingResults,
    interactiveStates: interactiveResults,
    motionSystem: motionResults,
  };
  
  // Generate report
  let report = '# Phase 3 Design System Validation Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Spacing compliance
  const spacingScore = (spacingResults.compliantFiles / spacingResults.totalFiles) * 100;
  report += `## Spacing System Compliance: ${spacingScore.toFixed(1)}%\n\n`;
  report += `- Compliant files: ${spacingResults.compliantFiles}/${spacingResults.totalFiles}\n`;
  report += `- Files with violations: ${spacingResults.violations.length}\n\n`;
  
  if (spacingResults.violations.length > 0) {
    report += '### Spacing Violations\n\n';
    spacingResults.violations.forEach(({ file, arbitrarySpacing, nonCompliantTouchTargets }) => {
      report += `**${file}**\n`;
      if (arbitrarySpacing.length > 0) {
        report += `- Arbitrary spacing: ${arbitrarySpacing.join(', ')}\n`;
      }
      if (nonCompliantTouchTargets.length > 0) {
        report += `- Non-compliant touch targets: ${nonCompliantTouchTargets.join(', ')}\n`;
      }
      report += '\n';
    });
  }
  
  // Interactive states
  const interactiveScore = interactiveResults.componentsChecked > 0 
    ? ((interactiveResults.componentsChecked - 
        interactiveResults.missingFocusRings.length - 
        interactiveResults.missingTouchTargets.length - 
        interactiveResults.missingHoverStates.length) / 
       interactiveResults.componentsChecked * 3) * 100 // 3 checks per component
    : 100;
    
  report += `## Interactive States Compliance: ${interactiveScore.toFixed(1)}%\n\n`;
  report += `- Components checked: ${interactiveResults.componentsChecked}\n`;
  report += `- Missing focus rings: ${interactiveResults.missingFocusRings.length}\n`;
  report += `- Missing touch targets: ${interactiveResults.missingTouchTargets.length}\n`;
  report += `- Missing hover states: ${interactiveResults.missingHoverStates.length}\n\n`;
  
  // Motion system
  const motionScore = 100 - (motionResults.filesWithArbitraryDurations.length * 10) - 
                      (motionResults.filesWithoutReducedMotion.length * 5);
  report += `## Motion System Compliance: ${Math.max(0, motionScore).toFixed(1)}%\n\n`;
  report += `- Files with arbitrary durations: ${motionResults.filesWithArbitraryDurations.length}\n`;
  report += `- Files without reduced motion: ${motionResults.filesWithoutReducedMotion.length}\n\n`;
  
  // Overall score
  const overallScore = (spacingScore + interactiveScore + Math.max(0, motionScore)) / 3;
  report += `## Overall Phase 3 Compliance: ${overallScore.toFixed(1)}%\n\n`;
  
  if (overallScore >= 90) {
    report += '✅ Excellent compliance! Ready for production.\n';
  } else if (overallScore >= 75) {
    report += '⚠️ Good compliance with some improvements needed.\n';
  } else {
    report += '❌ Significant improvements needed before Phase 3 completion.\n';
  }
  
  // Write report
  const fs = require('fs');
  fs.mkdirSync('reports', { recursive: true });
  const timestamp = new Date().toISOString().split('T')[0];
  fs.writeFileSync(`reports/phase3-validation-${timestamp}.md`, report);
  
  console.log(`\n📊 Phase 3 Validation Complete - Overall Score: ${overallScore.toFixed(1)}%`);
  console.log(`📄 Report saved: reports/phase3-validation-${timestamp}.md`);
  
  // Exit code for CI
  process.exit(overallScore >= 75 ? 0 : 1);
}

main().catch(error => {
  console.error('Phase 3 validation failed:', error);
  process.exit(1);
});