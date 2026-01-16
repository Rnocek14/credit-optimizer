/**
 * Invariant Snapshot Client
 * 
 * Fetch wrapper for invariant snapshot edge functions.
 * Uses GET with query params (not POST body).
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  SUPABASE_ANON_KEY, 
  getEdgeFunctionUrl 
} from './supabaseExternalConfig';

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

export interface SnapshotSummary {
  template_id: string;
  decision: 'pass' | 'warn' | 'block';
  violation_codes: string[];
  violation_count: number;
  invariant_version: string;
  created_at: string;
  job_id: string | null;
  institution_code: string;
  track: string | null;
}

export interface ListSnapshotsResponse {
  snapshots: SnapshotSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SnapshotClientError {
  type: 'auth' | 'not_found' | 'server' | 'network' | 'aborted';
  message: string;
  status: number;
}

// ============================================
// HELPERS
// ============================================

async function getAuthHeaders(signal?: AbortSignal): Promise<{ headers: Record<string, string> | null; error: SnapshotClientError | null }> {
  if (signal?.aborted) {
    return { headers: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { headers: null, error: { type: 'auth', message: 'Please log in to access this page', status: 401 } };
  }

  return {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    error: null,
  };
}

function parseHttpError(res: Response, errBody: unknown): SnapshotClientError {
  const message = 
    (errBody as any)?.error || 
    (errBody as any)?.message || 
    res.statusText || 
    `HTTP ${res.status}`;

  if (res.status === 401) {
    return { type: 'auth', message: 'Unauthorized', status: 401 };
  }
  if (res.status === 403) {
    return { type: 'auth', message: message || 'Admin access required', status: 403 };
  }
  if (res.status === 404) {
    return { type: 'not_found', message, status: 404 };
  }
  return { type: 'server', message, status: res.status };
}

// ============================================
// GET SINGLE SNAPSHOT
// ============================================

/**
 * Fetch invariant snapshot for a template (GET request with query params)
 */
export async function getInvariantSnapshot(
  templateId: string,
  invariantVersion?: string | null,
  signal?: AbortSignal
): Promise<{ data: SnapshotDrilldownResponse | null; error: SnapshotClientError | null }> {
  try {
    const { headers, error: authError } = await getAuthHeaders(signal);
    if (authError) return { data: null, error: authError };

    const params = new URLSearchParams({ template_id: templateId });
    if (invariantVersion) {
      params.set('invariant_version', invariantVersion);
    }

    const url = `${getEdgeFunctionUrl('get-invariant-snapshot')}?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: headers!,
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: parseHttpError(res, errBody) };
    }

    const responseData = await res.json() as SnapshotDrilldownResponse;
    return { data: responseData, error: null };

  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
    }
    console.error('[getInvariantSnapshot] Network error:', err);
    return {
      data: null,
      error: { type: 'network', message: err instanceof Error ? err.message : 'Failed to connect', status: 0 },
    };
  }
}

// ============================================
// LIST SNAPSHOTS (BULK)
// ============================================

export interface ListSnapshotsParams {
  institution_code?: string;
  track?: string;
  decision?: 'pass' | 'warn' | 'block';
  template_ids?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Fetch latest snapshots for multiple templates (bulk, paginated)
 */
export async function listInvariantSnapshots(
  params: ListSnapshotsParams = {},
  signal?: AbortSignal
): Promise<{ data: ListSnapshotsResponse | null; error: SnapshotClientError | null }> {
  try {
    const { headers, error: authError } = await getAuthHeaders(signal);
    if (authError) return { data: null, error: authError };

    const queryParams = new URLSearchParams();
    if (params.institution_code) queryParams.set('institution_code', params.institution_code);
    if (params.track) queryParams.set('track', params.track);
    if (params.decision) queryParams.set('decision', params.decision);
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.offset) queryParams.set('offset', String(params.offset));
    if (params.template_ids?.length) {
      queryParams.set('template_ids', params.template_ids.join(','));
    }

    const url = `${getEdgeFunctionUrl('list-invariant-snapshots')}?${queryParams.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: headers!,
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: parseHttpError(res, errBody) };
    }

    const responseData = await res.json() as ListSnapshotsResponse;
    return { data: responseData, error: null };

  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
    }
    console.error('[listInvariantSnapshots] Network error:', err);
    return {
      data: null,
      error: { type: 'network', message: err instanceof Error ? err.message : 'Failed to connect', status: 0 },
    };
  }
}

// ============================================
// RERUN INVARIANTS
// ============================================

export interface RerunInvariantsResponse {
  template_id: string;
  snapshot_id?: string;
  decision: 'pass' | 'warn' | 'block';
  violation_codes: string[];
  invariant_version: string;
  created_at?: string;
  dry_run: boolean;
  warning?: string;
}

/**
 * Rerun invariants for a specific template (admin-only)
 */
export async function rerunTemplateInvariants(
  templateId: string,
  options: { reason?: string; dryRun?: boolean } = {},
  signal?: AbortSignal
): Promise<{ data: RerunInvariantsResponse | null; error: SnapshotClientError | null }> {
  try {
    const { headers, error: authError } = await getAuthHeaders(signal);
    if (authError) return { data: null, error: authError };

    const url = getEdgeFunctionUrl('rerun-template-invariants');

    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        reason: options.reason,
        dry_run: options.dryRun ?? false,
      }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: parseHttpError(res, errBody) };
    }

    const responseData = await res.json() as RerunInvariantsResponse;
    return { data: responseData, error: null };

  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
    }
    console.error('[rerunTemplateInvariants] Network error:', err);
    return {
      data: null,
      error: { type: 'network', message: err instanceof Error ? err.message : 'Failed to connect', status: 0 },
    };
  }
}

// ============================================
// BULK RERUN
// ============================================

export interface BulkRerunRequest {
  decision: 'block' | 'warn';
  institution_code?: string;
  track?: string;
  template_ids?: string[];
}

export interface BulkRerunJobResponse {
  job_id: string;
  total: number;
  status: string;
  filter: Record<string, unknown>;
}

export interface BulkRerunJobStatus {
  job: {
    id: string;
    created_at: string;
    status: string;
    filter: Record<string, unknown>;
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    started_at: string | null;
    completed_at: string | null;
  };
  progress_percent: number;
  recent_failures: Array<{
    id: string;
    template_id: string;
    last_error: string | null;
  }>;
}

export interface WorkerResponse {
  job_id: string;
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  status: 'processing' | 'completed' | 'job_not_found' | 'no_work';
}

/**
 * Create a bulk rerun job (admin-only)
 */
export async function createBulkRerunJob(
  params: BulkRerunRequest,
  signal?: AbortSignal
): Promise<{ data: BulkRerunJobResponse | null; error: SnapshotClientError | null }> {
  try {
    const { headers, error: authError } = await getAuthHeaders(signal);
    if (authError) return { data: null, error: authError };

    const confirm = params.decision === 'block' 
      ? 'BULK_RERUN_BLOCK_TEMPLATES' 
      : 'BULK_RERUN_WARN_TEMPLATES';

    const url = getEdgeFunctionUrl('bulk-rerun-templates');

    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, confirm }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: parseHttpError(res, errBody) };
    }

    return { data: await res.json(), error: null };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
    }
    return { data: null, error: { type: 'network', message: err instanceof Error ? err.message : 'Failed to connect', status: 0 } };
  }
}

/**
 * Get bulk rerun job status (admin-only)
 */
export async function getBulkRerunJob(
  jobId: string,
  signal?: AbortSignal
): Promise<{ data: BulkRerunJobStatus | null; error: SnapshotClientError | null }> {
  try {
    const { headers, error: authError } = await getAuthHeaders(signal);
    if (authError) return { data: null, error: authError };

    const url = `${getEdgeFunctionUrl('get-bulk-rerun-job')}?job_id=${jobId}`;

    const res = await fetch(url, { method: 'GET', headers: headers!, signal });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: parseHttpError(res, errBody) };
    }

    return { data: await res.json(), error: null };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
    }
    return { data: null, error: { type: 'network', message: err instanceof Error ? err.message : 'Failed to connect', status: 0 } };
  }
}

/**
 * Trigger bulk rerun worker to process batch (admin-only)
 */
export async function triggerBulkRerunWorker(
  jobId: string,
  batchSize: number = 10,
  signal?: AbortSignal
): Promise<{ data: WorkerResponse | null; error: SnapshotClientError | null }> {
  try {
    const { headers, error: authError } = await getAuthHeaders(signal);
    if (authError) return { data: null, error: authError };

    const url = getEdgeFunctionUrl('bulk-rerun-worker');

    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, batch_size: batchSize }),
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { data: null, error: parseHttpError(res, errBody) };
    }

    return { data: await res.json(), error: null };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { type: 'aborted', message: 'Request aborted', status: 0 } };
    }
    return { data: null, error: { type: 'network', message: err instanceof Error ? err.message : 'Failed to connect', status: 0 } };
  }
}
