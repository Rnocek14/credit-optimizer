/**
 * Invariant Snapshot Client
 * 
 * Fetch wrapper for get-invariant-snapshot edge function.
 * Uses GET with query params (not POST body).
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
  type: 'auth' | 'not_found' | 'server' | 'network';
  message: string;
  status: number;
}

// ============================================
// CLIENT
// ============================================

const SUPABASE_URL = 'https://vzpissitddpunkpythsb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI';

/**
 * Fetch invariant snapshot for a template (GET request with query params)
 */
export async function getInvariantSnapshot(
  templateId: string,
  invariantVersion?: string | null
): Promise<{ data: SnapshotDrilldownResponse | null; error: SnapshotClientError | null }> {
  try {
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

    // Make GET request
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
    });

    // Handle HTTP errors based on status code
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
      const message = errBody.error || errBody.message || 'Request failed';

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
    console.error('[getInvariantSnapshot] Network error:', err);
    return {
      data: null,
      error: {
        type: 'network',
        message: 'Failed to connect to server',
        status: 0,
      },
    };
  }
}
