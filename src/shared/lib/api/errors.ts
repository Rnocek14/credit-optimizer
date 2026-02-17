/**
 * Shared error helpers for the API layer.
 */

interface PostgrestError {
  code?: string;
  message?: string;
}

/** PostgREST "Results contain 0 rows" — safe to ignore for maybeSingle-style queries */
export function isNoRowsError(error: unknown): boolean {
  return (error as PostgrestError)?.code === 'PGRST116';
}
