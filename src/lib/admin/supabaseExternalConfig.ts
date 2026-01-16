/**
 * Supabase External Config
 * 
 * Single source of truth for Supabase project credentials.
 * Hardcoded because Lovable projects connected to external Supabase
 * don't support VITE_* environment variables.
 * 
 * The anon key is publishable by design - it's safe to include in client code.
 * 
 * @module
 */

// ============================================
// CONFIG CONSTANTS
// ============================================

export const SUPABASE_URL = 'https://vzpissitddpunkpythsb.supabase.co';

export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI';

export const SUPABASE_PROJECT_ID = 'vzpissitddpunkpythsb';

// ============================================
// VALIDATION (runs once at module load)
// ============================================

function validateConfig() {
  // Validate URL format
  if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
    throw new Error(
      `[supabaseExternalConfig] Invalid SUPABASE_URL: ${SUPABASE_URL}. ` +
      `Expected format: https://<project>.supabase.co`
    );
  }

  // Validate anon key is a JWT (3 dot-separated segments)
  const segments = SUPABASE_ANON_KEY.split('.');
  if (segments.length !== 3) {
    throw new Error(
      `[supabaseExternalConfig] Invalid SUPABASE_ANON_KEY: expected JWT with 3 segments, got ${segments.length}`
    );
  }
}

// Run validation at module load
validateConfig();

// ============================================
// HELPERS
// ============================================

/**
 * Build edge function URL
 */
export function getEdgeFunctionUrl(functionName: string): string {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}
