#!/usr/bin/env tsx

/**
 * Phase 3 Validation Script
 * Comprehensive accessibility and UX compliance check
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  score: number;
  maxScore: number;
  issues: string[];
  passed: boolean;
}

const results: ValidationResult[] = [];

function scanFile(filePath: string): { touchTargets: number; focusRings: number; motionSafe: number } {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let touchTargets = 0;
  let focusRings = 0;
  let motionSafe = 0;
  
  lines.forEach(line => {
    // Count proper touch targets (≥48px)
    if (/\b(min-h|h)-(12|13|14|16|20|24)\b/.test(line) && /\b(onClick|Button|button)\b/.test(line)) {
      touchTargets++;
    }
    
    // Count focus ring implementations
    if (/focus:ring|focus-visible|focus:outline/.test(line)) {
      focusRings++;
    }
    
    // Count motion-safe animations
    if (/motion-safe:animate/.test(line) || /motion-reduce:/.test(line)) {
      motionSafe++;
    }
  });
  
  return { touchTargets, focusRings, motionSafe };
}

function scanDirectory(dir: string) {
  const items = readdirSync(dir);
  let totalTouchTargets = 0;
  let totalFocusRings = 0;
  let totalMotionSafe = 0;
  let totalFiles = 0;
  
  items.forEach(item => {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      const subResults = scanDirectory(fullPath);
      totalTouchTargets += subResults.totalTouchTargets;
      totalFocusRings += subResults.totalFocusRings;
      totalMotionSafe += subResults.totalMotionSafe;
      totalFiles += subResults.totalFiles;
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      const fileResults = scanFile(fullPath);
      totalTouchTargets += fileResults.touchTargets;
      totalFocusRings += fileResults.focusRings;
      totalMotionSafe += fileResults.motionSafe;
      totalFiles++;
    }
  });
  
  return { totalTouchTargets, totalFocusRings, totalMotionSafe, totalFiles };
}

function validateTokenSystem() {
  try {
    const indexCss = readFileSync('src/index.css', 'utf-8');
    
    // Required semantic tokens for Phase 3
    const requiredTokens = [
      '--background', '--foreground', '--card', '--card-foreground',
      '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
      '--muted', '--muted-foreground', '--accent', '--accent-foreground',
      '--destructive', '--destructive-foreground', '--border', '--input', '--ring'
    ];
    
    const presentTokens = requiredTokens.filter(token => indexCss.includes(token));
    const score = Math.round((presentTokens.length / requiredTokens.length) * 100);
    
    results.push({
      category: 'Design Tokens',
      score,
      maxScore: 100,
      issues: requiredTokens.filter(token => !indexCss.includes(token)),
      passed: score >= 90
    });
    
  } catch (error) {
    results.push({
      category: 'Design Tokens',
      score: 0,
      maxScore: 100,
      issues: ['Could not read design token file'],
      passed: false
    });
  }
}

function runPhase3Validation() {
  console.log('🎯 Running Phase 3 Validation...\n');
  
  // Validate design tokens
  validateTokenSystem();
  
  // Scan source files for accessibility features
  const scanResults = scanDirectory('src');
  
  // Touch Targets validation
  const touchTargetScore = Math.min(100, scanResults.totalTouchTargets * 10);
  results.push({
    category: 'Touch Targets',
    score: touchTargetScore,
    maxScore: 100,
    issues: touchTargetScore < 90 ? ['Insufficient touch target implementations'] : [],
    passed: touchTargetScore >= 90
  });
  
  // Focus Management validation
  const focusScore = Math.min(100, scanResults.totalFocusRings * 8);
  results.push({
    category: 'Focus Management',
    score: focusScore,
    maxScore: 100,
    issues: focusScore < 80 ? ['Missing focus ring implementations'] : [],
    passed: focusScore >= 80
  });
  
  // Motion Preferences validation
  const motionScore = Math.min(100, scanResults.totalMotionSafe * 15);
  results.push({
    category: 'Motion Preferences',
    score: motionScore,
    maxScore: 100,
    issues: motionScore < 70 ? ['Insufficient motion-safe implementations'] : [],
    passed: motionScore >= 70
  });
  
  // Generate report
  console.log('📊 PHASE 3 VALIDATION RESULTS\n');
  console.log('=' .repeat(50));
  
  let totalScore = 0;
  let maxTotalScore = 0;
  let allPassed = true;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.category}: ${result.score}/${result.maxScore} (${Math.round((result.score/result.maxScore)*100)}%)`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   🔸 ${issue}`);
      });
    }
    
    totalScore += result.score;
    maxTotalScore += result.maxScore;
    if (!result.passed) allPassed = false;
  });
  
  const overallScore = Math.round((totalScore / maxTotalScore) * 100);
  
  console.log('\n' + '=' .repeat(50));
  console.log(`\n🎯 OVERALL SCORE: ${overallScore}%`);
  console.log(`📊 Details: ${totalScore}/${maxTotalScore} points`);
  
  const finalStatus = overallScore >= 90 ? 'PASS' : 'NEEDS IMPROVEMENT';
  const statusIcon = finalStatus === 'PASS' ? '🟢' : '🟡';
  
  console.log(`\n${statusIcon} STATUS: ${finalStatus}`);
  
  if (finalStatus === 'PASS') {
    console.log('✨ Excellent! Phase 3 accessibility standards met.');
  } else {
    console.log('📈 Good progress! Address remaining items to reach 90%.');
  }
  
  console.log('\n🔧 Key metrics:');
  console.log(`   • Touch targets found: ${scanResults.totalTouchTargets}`);
  console.log(`   • Focus implementations: ${scanResults.totalFocusRings}`);
  console.log(`   • Motion-safe animations: ${scanResults.totalMotionSafe}`);
  Console.log(`   • Files scanned: ${scanResults.totalFiles}`);
  
  return overallScore >= 90;
}

// Run the validation
const passed = runPhase3Validation();
process.exit(passed ? 0 : 1);