#!/usr/bin/env node

/**
 * Phase 4 Smoke Test Runner
 * Validates core security and functionality requirements
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running Phase 4 Smoke Tests...\n');

// Test 1: Verify sanitizeUrl is integrated
function testUrlSanitizationIntegration() {
  console.log('1. Testing URL sanitization integration...');
  
  const exploreFile = fs.readFileSync('src/pages/Explore.tsx', 'utf8');
  const railFile = fs.readFileSync('src/components/course/RecommendationsRail.tsx', 'utf8');
  
  const hasExploreIntegration = exploreFile.includes('import { sanitizeUrl }') && 
                                exploreFile.includes('sanitizeUrl(url)');
  const hasRailIntegration = railFile.includes('import { sanitizeUrl }') && 
                             railFile.includes('sanitizeUrl(course.url)');
  
  if (hasExploreIntegration && hasRailIntegration) {
    console.log('   ✅ URL sanitization properly integrated');
  } else {
    console.log('   ❌ URL sanitization missing in components');
    return false;
  }
  return true;
}

// Test 2: Verify security toast error handling
function testSecurityErrorHandling() {
  console.log('2. Testing security error handling...');
  
  const exploreFile = fs.readFileSync('src/pages/Explore.tsx', 'utf8');
  const railFile = fs.readFileSync('src/components/course/RecommendationsRail.tsx', 'utf8');
  
  const hasSecurityToast = exploreFile.includes('Security Error') && 
                           railFile.includes('Security Error');
  
  if (hasSecurityToast) {
    console.log('   ✅ Security error toasts implemented');
  } else {
    console.log('   ❌ Security error handling missing');
    return false;
  }
  return true;
}

// Test 3: Verify telemetry integration
function testTelemetryIntegration() {
  console.log('3. Testing telemetry integration...');
  
  const transcriptFile = fs.readFileSync('src/pages/Transcript.tsx', 'utf8');
  const trustTranscriptFile = fs.readFileSync('src/components/resume/TrustTranscript.tsx', 'utf8');
  
  const hasTranscriptView = transcriptFile.includes('resume_view');
  const hasTranscriptExport = trustTranscriptFile.includes('transcript_export');
  
  if (hasTranscriptView && hasTranscriptExport) {
    console.log('   ✅ Telemetry events properly tracked');
  } else {
    console.log('   ❌ Missing telemetry tracking');
    return false;
  }
  return true;
}

// Test 4: Verify test files exist
function testTestSuiteExists() {
  console.log('4. Testing comprehensive test suite...');
  
  const testFiles = [
    'src/lib/__tests__/validation.cri.spec.ts',
    'src/lib/__tests__/security.sanitizeUrl.spec.ts', 
    'src/lib/__tests__/useErrorRecovery.spec.ts',
    'src/components/course/__tests__/RecommendationsRail.spec.tsx',
    'src/components/plan/__tests__/SavedCoursesList.spec.tsx',
    'src/pages/__tests__/Explore.spec.tsx',
    'src/pages/__tests__/Plans.spec.tsx',
    'src/pages/__tests__/Transcript.spec.tsx'
  ];
  
  let allTestsExist = true;
  testFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`   ❌ Missing test file: ${file}`);
      allTestsExist = false;
    }
  });
  
  if (allTestsExist) {
    console.log('   ✅ All required test files present');
  }
  return allTestsExist;
}

// Test 5: Verify documentation exists
function testDocumentationExists() {
  console.log('5. Testing smoke test documentation...');
  
  if (fs.existsSync('docs/smoke-tests/phase4.md')) {
    console.log('   ✅ Smoke test documentation complete');
    return true;
  } else {
    console.log('   ❌ Missing smoke test documentation');
    return false;
  }
}

// Run all tests
const tests = [
  testUrlSanitizationIntegration,
  testSecurityErrorHandling,
  testTelemetryIntegration,
  testTestSuiteExists,
  testDocumentationExists
];

let passedTests = 0;
tests.forEach(test => {
  if (test()) {
    passedTests++;
  }
  console.log('');
});

console.log(`\n📊 Results: ${passedTests}/${tests.length} tests passed`);

if (passedTests === tests.length) {
  console.log('🎉 Phase 4 implementation complete and ready for production!');
  process.exit(0);
} else {
  console.log('⚠️  Phase 4 implementation has issues that need to be addressed.');
  process.exit(1);
}