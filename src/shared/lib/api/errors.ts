/**
 * Shared error helpers for the API layer.
 */

/** PostgREST "Results contain 0 rows" — safe to ignore for maybeSingle-style queries */
export function isNoRowsError(error: unknown): boolean {
  return (error as any)?.code === 'PGRST116';
}
