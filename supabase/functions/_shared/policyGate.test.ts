/**
 * V1 Institution Scope Guard Tests
 * 
 * These tests verify the server-side enforcement of the V1 institution allowlist.
 * Critical for preventing bypass of UI-only gating.
 */

import { checkV1InstitutionScope, V1_ALLOWED_INSTITUTIONS } from './policyGate.ts';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('V1 scope guard - allowed institutions pass', () => {
  // All V1 allowed institutions should pass
  for (const institution of V1_ALLOWED_INSTITUTIONS) {
    const result = checkV1InstitutionScope(institution);
    assertEquals(result.allowed, true, `${institution} should be allowed`);
  }
});

Deno.test('V1 scope guard - blocked institutions return 403-ready response', () => {
  const blockedInstitutions = ['EMPIRE', 'EXCELSIOR', 'SNHU', 'UNKNOWN'];
  
  for (const institution of blockedInstitutions) {
    const result = checkV1InstitutionScope(institution);
    assertEquals(result.allowed, false, `${institution} should be blocked`);
    if (!result.allowed) {
      assertEquals(
        result.reason.includes('not in V1 scope'),
        true,
        `${institution} should have scope error message`
      );
    }
  }
});

Deno.test('V1 scope guard - normalizes case', () => {
  // Should handle lowercase, mixed case, whitespace
  const variants = ['tesu', 'Tesu', 'TESU', '  TESU  ', 'tesu '];
  
  for (const variant of variants) {
    const result = checkV1InstitutionScope(variant);
    assertEquals(result.allowed, true, `"${variant}" should normalize to TESU and be allowed`);
  }
});

Deno.test('V1 scope guard - rejects empty/null input', () => {
  const result1 = checkV1InstitutionScope('');
  assertEquals(result1.allowed, false, 'Empty string should be blocked');
  
  const result2 = checkV1InstitutionScope('   ');
  assertEquals(result2.allowed, false, 'Whitespace-only should be blocked');
});
