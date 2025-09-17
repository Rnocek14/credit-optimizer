/**
 * Determine whether localStorage can be safely accessed in the current environment.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const storage = window.localStorage;
    return typeof storage !== 'undefined' && storage !== null;
  } catch {
    return false;
  }
}

/**
 * Single-source-of-truth feature flag resolution for EduTree
 * Precedence: Query param > localStorage > env variable
 */

export function resolveEduTreeFlag(): boolean {
  // Environment default
  const fromEnv = import.meta.env.VITE_EDU_TREE_ENABLED === 'true';
  const storageAvailable = isStorageAvailable();

  // Local storage override
  const localValue = storageAvailable ? window.localStorage.getItem('eduTree') : null;
  const fromLocal = localValue === 'true';

  // URL query parameter (highest priority)
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('eduTree');

    // Query explicitly sets and persists, but only if provided
    if (fromQuery === 'true' || fromQuery === 'false') {
      const value = fromQuery === 'true';
      if (storageAvailable) {
        window.localStorage.setItem('eduTree', String(value));
      }
      return value;
    }
  }

  // Local storage overrides env, otherwise use env default (currently true)
  return localValue !== null ? fromLocal : (fromEnv || true);
}

/**
 * PhaseA flag resolution for clean track structure
 * Precedence: Query param > localStorage > default (true)
 */
export function resolveEduTreePhaseAFlag(): boolean {
  const storageAvailable = isStorageAvailable();

  // URL query parameter (highest priority)
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('eduTreePhaseA');

    if (fromQuery === 'true' || fromQuery === 'false') {
      const value = fromQuery === 'true';
      if (storageAvailable) {
        window.localStorage.setItem('eduTreePhaseA', String(value));
      }
      return value;
    }
  }

  // Local storage override
  if (storageAvailable) {
    const localValue = window.localStorage.getItem('eduTreePhaseA');
    if (localValue !== null) {
      return localValue === 'true';
    }
  }

  // Default to true for PhaseA
  return true;
}

/**
 * QA mode flag resolution for multipath testing
 * Precedence: Query param > localStorage > default (false)
 */
export function resolveEduTreeQAModeFlag(): boolean {
  const storageAvailable = isStorageAvailable();

  // URL query parameter (highest priority)
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('eduTreeQAMode');

    if (fromQuery === 'true' || fromQuery === 'false') {
      const value = fromQuery === 'true';
      if (storageAvailable) {
        window.localStorage.setItem('eduTreeQAMode', String(value));
      }
      return value;
    }
  }

  // Local storage override
  if (storageAvailable) {
    const localValue = window.localStorage.getItem('eduTreeQAMode');
    if (localValue !== null) {
      return localValue === 'true';
    }
  }

  // Default to false for QA mode
  return false;
}

/**
 * Check if user can bypass feature flag restrictions
 * Admins and mentors can see disabled features
 */
export function canBypassEduTreeFlag(userRole?: string): boolean {
  return userRole === 'admin' || userRole === 'mentor';
}