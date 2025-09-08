#!/usr/bin/env tsx

// Simple test to see current validation status
console.log('🧪 Testing current validation status...\n');

try {
  const { execSync } = require('child_process');
  
  // Quick smoke test
  console.log('Touch target smoke test:');
  const result = execSync('pnpm tsx scripts/quick-smoke-test.ts', { encoding: 'utf8' });
  console.log(result);
  
} catch (error: any) {
  console.log('Result:', error.stdout || error.message);
}