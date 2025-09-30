/**
 * Centralized version configuration for query keys and caching
 * Bump these when schema/API changes require cache invalidation
 */

export const MARKETPLACE_VERSION = 'v3';    // bump on schema/transform changes
export const EVIDENCE_VERSION    = 'v2';    // bump when evidence structure changes
export const IN_CHUNK            = 500;     // keep in sync with Postgres params
