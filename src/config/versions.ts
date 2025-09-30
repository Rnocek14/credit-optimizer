/**
 * Centralized version configuration for query keys and caching
 * Bump these when schema/API changes require cache invalidation
 */

export const EVIDENCE_VERSION = 'evidence-v1';
export const MARKETPLACE_VERSION = 'mp-keys-v1';
export const IN_CHUNK = 500; // Postgres IN() query chunk size
