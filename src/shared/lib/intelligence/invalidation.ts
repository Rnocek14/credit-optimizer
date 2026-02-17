/**
 * Intelligence Layer — Cache Invalidation Utilities
 *
 * React Query does NOT support wildcard keys.
 * All cross-key invalidation uses predicate-based matching.
 */

import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate ALL intelligence queries for a specific user.
 * Use after: milestone completion, course completion, profile update.
 */
export function invalidateUserIntelligence(qc: QueryClient, userId: string) {
  qc.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'intelligence' &&
      query.queryKey[1] === userId,
  });
}

/**
 * Invalidate intelligence for a specific user + track.
 * Use after: track-scoped progress changes, plan mutations.
 */
export function invalidateTrackIntelligence(
  qc: QueryClient,
  userId: string,
  trackId: string,
) {
  qc.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'intelligence' &&
      query.queryKey[1] === userId &&
      query.queryKey[2] === trackId,
  });
}

/**
 * Invalidate all market signal queries (any user).
 * Use after: market data refresh, external data sync.
 *
 * Signals key: ['intelligence', userId, trackId, 'signals']
 * Match on position 3 to stay compatible with positional predicates.
 */
export function invalidateMarketSignals(qc: QueryClient) {
  qc.invalidateQueries({
    predicate: (query) =>
      query.queryKey.length >= 4 &&
      query.queryKey[0] === 'intelligence' &&
      query.queryKey[3] === 'signals',
  });
}

/**
 * Invalidate on track switch — clears old track's intelligence
 * and prepares for new track computation.
 */
export function invalidateOnTrackSwitch(
  qc: QueryClient,
  userId: string,
  oldTrackId?: string,
) {
  // Invalidate all intelligence for user (covers both old & new track)
  invalidateUserIntelligence(qc, userId);

  // Also invalidate track-scoped input queries (positional)
  if (oldTrackId) {
    qc.invalidateQueries({
      predicate: (query) =>
        (query.queryKey[0] === 'progress' || query.queryKey[0] === 'crosshub') &&
        query.queryKey[1] !== undefined &&
        query.queryKey[2] === userId &&
        query.queryKey[3] === oldTrackId,
    });
  }
}

/**
 * Invalidate after save-to-plan or proof project completion.
 * Touches plan + intelligence caches.
 */
export function invalidateOnPlanMutation(
  qc: QueryClient,
  userId: string,
  trackId?: string,
) {
  // Plan queries
  qc.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'plan' &&
      query.queryKey[2] === userId,
  });

  // Intelligence (recommendations may shift)
  if (trackId) {
    invalidateTrackIntelligence(qc, userId, trackId);
  } else {
    invalidateUserIntelligence(qc, userId);
  }
}
