/**
 * Authorization guard for write-capable edge functions.
 *
 * WHY THIS EXISTS
 * ---------------
 * `verify_jwt` in config.toml is NOT access control. It checks that the
 * Authorization header carries a *valid* JWT — and the anon key is a valid
 * JWT, published in every browser bundle (see
 * src/integrations/supabase/client.ts). So `verify_jwt = true` on a function
 * that writes data still leaves it callable by anyone who views source.
 *
 * The 2026-09-15 accuracy audit found the data seeders (`optimizer-seed-*`,
 * `run-seeds`, `seed-*`) running with `verify_jwt = false`, CORS `*`, a
 * service-role client, and no in-code guard whatsoever — an unauthenticated
 * write path to `institutions`, `institution_credit_limits`, `alt_credits`,
 * `cross_institution_equivalencies` and `degree_templates`, i.e. the values
 * every cost and transferability estimate is computed from.
 *
 * Two accepted callers, matching conventions already in this codebase:
 *
 *   1. Automation presenting `x-cron-secret` matching CRON_SECRET
 *      (the pattern in ops-cron-runner, canonical-enrichment-worker, and
 *      validate-transfer-candidates).
 *   2. A signed-in user holding the `admin` role in `user_roles`
 *      (the pattern in purge-seeded-invariant-data and rerun-template-invariants).
 *
 * Anything else gets 401/403. Fails CLOSED: any unexpected error denies.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** Include `x-cron-secret` so automation can preflight successfully. */
export const guardedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function deny(status: number, error: string, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Returns `null` when the caller is authorized, or a Response to return as-is.
 *
 * Usage:
 *   const denied = await requireAdminOrCron(req, corsHeaders);
 *   if (denied) return denied;
 */
export async function requireAdminOrCron(
  req: Request,
  corsHeaders: Record<string, string> = guardedCorsHeaders
): Promise<Response | null> {
  try {
    // ── Path 1: shared-secret automation ───────────────────────────
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('x-cron-secret');
    if (expectedSecret && providedSecret) {
      // Note: not constant-time. Deno's std has no timing-safe compare for
      // this without pulling a dep; the exposure is a remote timing oracle on
      // a high-entropy secret, which is not the threat model that matters
      // here (the prior state was "no check at all").
      if (providedSecret === expectedSecret) return null;
      return deny(403, 'Forbidden: invalid cron secret', corsHeaders);
    }

    // ── Path 2: authenticated admin user ───────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return deny(401, 'Unauthorized: authentication required', corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[requireAdminOrCron] Missing SUPABASE_URL / SUPABASE_ANON_KEY');
      return deny(500, 'Server misconfiguration', corsHeaders);
    }

    // Anon-key client carrying the caller's token: resolves the real user and
    // keeps RLS in force. A service-role client here would defeat the check.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // An anon- or service-key bearer token resolves to no user and lands here.
      return deny(401, 'Unauthorized: valid user session required', corsHeaders);
    }

    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('[requireAdminOrCron] Role check failed:', roleError.message);
      return deny(500, 'Failed to verify admin role', corsHeaders);
    }
    if (!roleRow) {
      return deny(403, 'Forbidden: admin role required', corsHeaders);
    }

    return null;
  } catch (err) {
    console.error('[requireAdminOrCron] Unexpected error:', err);
    return deny(500, 'Authorization check failed', corsHeaders);
  }
}
