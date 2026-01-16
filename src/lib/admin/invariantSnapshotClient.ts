/**
 * Invariant Snapshot Client
 * 
 * Fetch wrapper for get-invariant-snapshot edge function.
 * Uses GET with query params (not POST body).
 * 
 * Note: SUPABASE_URL and ANON_KEY are hardcoded because Lovable projects
 * connected to external Supabase don't support VITE_* env variables.
 * The anon key is publishable by design.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES
// ============================================

export interface SnapshotDrilldownResponse {
  template: {
    id: string;
    institution_code: string;
    program_slug: string;
    track: string;
    generated_at: string | null;
    template_status?: string;
  };
  snapshot: {
    id: string;
    job_id: string | null;
    template_status: string;
    invariant_version: string;
    effective_config: Record<string, unknown>;
    decision: 'pass' | 'warn' | 'block';
    violation_codes: string[];
    created_at: string;
  } | null;
  job: {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  } | null;
}

export interface SnapshotClientError {
  type: 'auth' | 'not_found' | 'server' | 'network' | 'aborted';
  message: string;
  status: number;
}

// ============================================
// CONFIG
// ============================================

// Hardcoded because Lovable doesn't support VITE_* env variables for external Supabase
const SUPABASE_URL = 'https://vzpissitddpunkpythsb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI';

// ============================================
// CLIENT
// ============================================

/**
 * Fetch invariant snapshot for a template (GET request with query params)
 * 
 * @param templateId - Required template ID
 * @param invariantVersion - Optional specific version (defaults to latest)
 * @param signal - Optional AbortSignal for cancellation
 */
export async function getInvariantSnapshot(
  templateId: string,
  invariantVersion?: string | null,
  signal?: AbortSignal
): Promise<{ data: SnapshotDrilldownResponse | null; error: SnapshotClientError | null }> {
  try {
    // Check for abort before starting
    if (signal?.aborted) {
      return {
        data: null,
        error: { type: 'aborted', message: 'Request aborted', status: 0 },
      };
    }

    // Get session for auth header
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return {
        data: null,
        error: { type: 'auth', message: 'Please log in to access this page', status: 401 },
      };
    }

    // Build URL with query params
    const base = `${SUPABASE_URL}/functions/v1/get-invariant-snapshot`;
    const params = new URLSearchParams({ template_id: templateId });
    if (invariantVersion) {
      params.set('invariant_version', invariantVersion);
    }

    const url = `${base}?${params.toString()}`;

    // Make GET request (no Content-Type header for GET)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      signal,
    });

    // Handle HTTP errors based on status code
    if (!res.ok) {
      // Try to parse JSON error body, fallback to statusText
      let message: string;
      try {
        const errBody = await res.json();
        message = errBody.error || errBody.message || res.statusText || 'Request failed';
      } catch {
        message = res.statusText || `HTTP ${res.status}`;
      }

      if (res.status === 401) {
        return {
          data: null,
          error: { type: 'auth', message: 'Unauthorized', status: 401 },
        };
      }
      if (res.status === 403) {
        return {
          data: null,
          error: { type: 'auth', message: message || 'Admin access required', status: 403 },
        };
      }
      if (res.status === 404) {
        return {
          data: null,
          error: { type: 'not_found', message, status: 404 },
        };
      }
      return {
        data: null,
        error: { type: 'server', message, status: res.status },
      };
    }

    // Parse successful response
    const responseData = await res.json() as SnapshotDrilldownResponse;
    return { data: responseData, error: null };

  } catch (err) {
    // Handle abort
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        data: null,
        error: { type: 'aborted', message: 'Request aborted', status: 0 },
      };
    }

    console.error('[getInvariantSnapshot] Network error:', err);
    return {
      data: null,
      error: {
        type: 'network',
        message: err instanceof Error ? err.message : 'Failed to connect to server',
        status: 0,
      },
    };
  }
}
