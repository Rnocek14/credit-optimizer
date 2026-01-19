/**
 * Policy Gate Unit Tests
 * 
 * Tests the V1 institution scope enforcement logic.
 * Run with: deno test tests/policyGate.test.ts --allow-env --allow-net
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Note: We test the logic directly, not via import from _shared (which is edge-function-only)
// This ensures tests don't get bundled with edge functions

const V1_ALLOWED_INSTITUTIONS = new Set(['TESU', 'COSC', 'WGU']);

function checkV1InstitutionScope(institution: string): { allowed: true } | { allowed: false; reason: string } {
  const normalized = institution?.toUpperCase()?.trim();
  if (!normalized) {
    return { allowed: false, reason: 'Institution code is required' };
  }
  if (!V1_ALLOWED_INSTITUTIONS.has(normalized)) {
    return { 
      allowed: false, 
      reason: `Institution '${normalized}' is not in V1 scope. Allowed: ${Array.from(V1_ALLOWED_INSTITUTIONS).join(', ')}` 
    };
  }
  return { allowed: true };
}

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
