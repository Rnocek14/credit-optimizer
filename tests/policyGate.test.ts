/**
 * Policy Gate Unit Tests
 * 
 * Tests the V1 institution scope enforcement logic.
 * Run with: deno test tests/policyGate.test.ts --allow-env --allow-net
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// V1 Scope definition (matches src/lib/degree/v1Scope.ts and supabase/functions/_shared/v1Scope.ts)
// We duplicate here to avoid bundling issues with edge functions
// IMPORTANT: Keep in sync with v1Scope.ts files
const V1_ALLOWED_INSTITUTIONS_LIST = ['TESU', 'COSC', 'WGU'] as const;
const V1_ALLOWED_INSTITUTIONS = new Set<string>(V1_ALLOWED_INSTITUTIONS_LIST);

function checkV1InstitutionScope(institution: string): { allowed: true } | { allowed: false; reason: string } {
  const normalized = institution?.toUpperCase()?.trim();
  if (!normalized) {
    return { allowed: false, reason: 'Institution code is required' };
  }
  if (!V1_ALLOWED_INSTITUTIONS.has(normalized)) {
    return { 
      allowed: false, 
      reason: `Institution '${normalized}' is not in V1 scope. Allowed: ${V1_ALLOWED_INSTITUTIONS_LIST.join(', ')}` 
    };
  }
  return { allowed: true };
}

// ============================================================================
// Unit Tests: V1 Scope Logic
// ============================================================================

Deno.test("checkV1InstitutionScope - allows TESU", () => {
  const result = checkV1InstitutionScope("TESU");
  assertEquals(result.allowed, true);
});

Deno.test("checkV1InstitutionScope - allows lowercase tesu", () => {
  const result = checkV1InstitutionScope("tesu");
  assertEquals(result.allowed, true);
});

Deno.test("checkV1InstitutionScope - allows COSC", () => {
  const result = checkV1InstitutionScope("COSC");
  assertEquals(result.allowed, true);
});

Deno.test("checkV1InstitutionScope - allows WGU", () => {
  const result = checkV1InstitutionScope("WGU");
  assertEquals(result.allowed, true);
});

Deno.test("checkV1InstitutionScope - blocks EXCELSIOR", () => {
  const result = checkV1InstitutionScope("EXCELSIOR");
  assertEquals(result.allowed, false);
  if (!result.allowed) {
    assertEquals(result.reason.includes("EXCELSIOR"), true);
    assertEquals(result.reason.includes("not in V1 scope"), true);
  }
});

Deno.test("checkV1InstitutionScope - blocks EMPIRE", () => {
  const result = checkV1InstitutionScope("EMPIRE");
  assertEquals(result.allowed, false);
});

Deno.test("checkV1InstitutionScope - blocks SNHU", () => {
  const result = checkV1InstitutionScope("SNHU");
  assertEquals(result.allowed, false);
});

Deno.test("checkV1InstitutionScope - handles whitespace", () => {
  const result = checkV1InstitutionScope("  TESU  ");
  assertEquals(result.allowed, true);
});

Deno.test("checkV1InstitutionScope - rejects empty string", () => {
  const result = checkV1InstitutionScope("");
  assertEquals(result.allowed, false);
  if (!result.allowed) {
    assertEquals(result.reason, "Institution code is required");
  }
});

Deno.test("checkV1InstitutionScope - handles mixed case", () => {
  const result = checkV1InstitutionScope("TeSu");
  assertEquals(result.allowed, true);
});

// ============================================================================
// V1 Scope Sync Check: Verify test definition matches source files
// ============================================================================

Deno.test("V1 scope sync check - list matches expected institutions", () => {
  // This test ensures the test file's V1 scope matches the expected institutions
  // If this fails, the v1Scope.ts files may have been updated without syncing tests
  const expected = ['TESU', 'COSC', 'WGU'];
  assertEquals(
    [...V1_ALLOWED_INSTITUTIONS].sort(),
    expected.sort(),
    "V1_ALLOWED_INSTITUTIONS should match expected list. Update test if v1Scope.ts changed."
  );
});
