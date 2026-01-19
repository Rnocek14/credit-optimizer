/**
 * Admin Test Harness for V1 Scope Black-Box Verification
 * 
 * This script performs black-box verification of admin-only edge functions
 * to ensure resolved guards correctly block non-V1 institutions.
 * 
 * Usage:
 *   1. Set environment variables:
 *      - SUPABASE_URL: Your Supabase project URL
 *      - SUPABASE_ANON_KEY: Your Supabase anon/public key (required for auth)
 *      - ADMIN_EMAIL: Email of admin user
 *      - ADMIN_PASSWORD: Password of admin user
 *      - BLOCKED_PACK_ID: UUID of a policy pack for EMPIRE/EXCELSIOR
 *      - BLOCKED_TEMPLATE_ID: UUID of a template for EMPIRE/EXCELSIOR (if exists)
 * 
 *   2. Run with Deno:
 *      deno run --allow-net --allow-env tests/adminV1ScopeHarness.ts
 * 
 * Expected Results:
 *   - promote-policy-pack with blocked pack ID → 403 INSTITUTION_NOT_IN_V1_SCOPE
 *   - rerun-template-invariants with blocked template ID → 403 INSTITUTION_NOT_IN_V1_SCOPE
 * 
 * If you get 401/403 for auth reasons, the guard was not tested.
 * 
 * NOTE: V1 scope is defined in synchronized configs:
 *   - Frontend: src/lib/degree/v1Scope.ts
 *   - Backend: supabase/functions/_shared/v1Scope.ts
 * These must be kept in sync manually. This harness helps detect drift.
 */

interface TestResult {
  endpoint: string;
  passed: boolean;
  expectedStatus: number;
  actualStatus: number;
  expectedError?: string;
  actualError?: string;
  message: string;
}

// Global anon key - validated at startup
let SUPABASE_ANON_KEY: string;

async function getAdminJwt(
  supabaseUrl: string,
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to authenticate admin: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function testEndpoint(
  supabaseUrl: string,
  jwt: string,
  endpoint: string,
  method: string,
  body: Record<string, unknown>,
  expectedStatus: number,
  expectedErrorCode?: string
): Promise<TestResult> {
  const url = `${supabaseUrl}/functions/v1/${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json().catch(() => ({}));
    const actualError = responseData.error || responseData.message;

    const passed = response.status === expectedStatus && 
      (!expectedErrorCode || actualError?.includes(expectedErrorCode));

    return {
      endpoint,
      passed,
      expectedStatus,
      actualStatus: response.status,
      expectedError: expectedErrorCode,
      actualError,
      message: passed 
        ? `✅ PASSED: ${endpoint} returned ${response.status} as expected`
        : `❌ FAILED: ${endpoint} returned ${response.status} (expected ${expectedStatus})${actualError ? ` - Error: ${actualError}` : ''}`,
    };
  } catch (error) {
    return {
      endpoint,
      passed: false,
      expectedStatus,
      actualStatus: 0,
      message: `❌ ERROR: ${endpoint} - ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function runHarness() {
  console.log('='.repeat(70));
  console.log('Admin V1 Scope Black-Box Verification Harness');
  console.log('='.repeat(70));
  console.log('');

  // Check required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  const adminPassword = Deno.env.get('ADMIN_PASSWORD');
  const blockedPackId = Deno.env.get('BLOCKED_PACK_ID');
  const blockedTemplateId = Deno.env.get('BLOCKED_TEMPLATE_ID');

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!adminEmail) missing.push('ADMIN_EMAIL');
  if (!adminPassword) missing.push('ADMIN_PASSWORD');

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('');
    console.error('Set them and retry:');
    console.error('  export SUPABASE_URL=https://your-project.supabase.co');
    console.error('  export SUPABASE_ANON_KEY=your-anon-key');
    console.error('  export ADMIN_EMAIL=admin@example.com');
    console.error('  export ADMIN_PASSWORD=your-password');
    console.error('  export BLOCKED_PACK_ID=uuid-of-empire-pack (optional)');
    console.error('  export BLOCKED_TEMPLATE_ID=uuid-of-empire-template (optional)');
    Deno.exit(1);
  }

  // Set global anon key for use in request headers
  SUPABASE_ANON_KEY = anonKey!

  // Step 1: Get admin JWT
  console.log('Step 1: Authenticating as admin...');
  let jwt: string;
  try {
    jwt = await getAdminJwt(supabaseUrl!, adminEmail!, adminPassword!);
    console.log('✅ Admin authenticated successfully');
    console.log('');
  } catch (error) {
    console.error('❌ Authentication failed:', error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }

  const results: TestResult[] = [];

  // Step 2: Test promote-policy-pack (resolved guard)
  if (blockedPackId) {
    console.log('Step 2: Testing promote-policy-pack with blocked institution...');
    const result = await testEndpoint(
      supabaseUrl!,
      jwt,
      'promote-policy-pack',
      'POST',
      { pack_id: blockedPackId },
      403,
      'INSTITUTION_NOT_IN_V1_SCOPE'
    );
    results.push(result);
    console.log(result.message);
    console.log('');
  } else {
    console.log('Step 2: SKIPPED - BLOCKED_PACK_ID not set');
    console.log('   To test, set BLOCKED_PACK_ID to a policy pack UUID for EMPIRE/EXCELSIOR');
    console.log('');
  }

  // Step 3: Test rerun-template-invariants (resolved guard)
  if (blockedTemplateId) {
    console.log('Step 3: Testing rerun-template-invariants with blocked institution...');
    const result = await testEndpoint(
      supabaseUrl!,
      jwt,
      'rerun-template-invariants',
      'POST',
      { template_id: blockedTemplateId },
      403,
      'INSTITUTION_NOT_IN_V1_SCOPE'
    );
    results.push(result);
    console.log(result.message);
    console.log('');
  } else {
    console.log('Step 3: SKIPPED - BLOCKED_TEMPLATE_ID not set');
    console.log('   To test, set BLOCKED_TEMPLATE_ID to a template UUID for EMPIRE/EXCELSIOR');
    console.log('   (Create a minimal template in QA if needed)');
    console.log('');
  }

  // Summary
  console.log('='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));
  
  const tested = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  if (tested === 0) {
    console.log('⚠️  No endpoints tested. Set BLOCKED_PACK_ID and/or BLOCKED_TEMPLATE_ID.');
  } else {
    console.log(`Total: ${tested} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('');
      console.log('Failed tests:');
      for (const result of results.filter(r => !r.passed)) {
        console.log(`  - ${result.endpoint}: ${result.actualStatus} (expected ${result.expectedStatus})`);
      }
    }
  }

  console.log('');
  
  // Exit with appropriate code
  Deno.exit(failed > 0 ? 1 : 0);
}

// Run the harness
runHarness();
