/**
 * useGuideAttribution — captures and persists the SEO source slug.
 *
 * Why this exists:
 *   When a user lands on /get-started?ref=guide&slug=tesu-vs-cosc-bsba we want
 *   to know — at the END of onboarding — which guide actually drove that
 *   conversion. Query strings die on first navigation, so we stash the slug in
 *   sessionStorage and read it back on completion events.
 *
 * NOT a tracking pipeline. NOT an attribution table. Just enough state to
 * answer "which guide converts?" before we invest in real schema (Track 2).
 */
import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'pivot.attribution.guideSlug';
const REF_KEY = 'pivot.attribution.ref';

interface Attribution {
  ref: string | null;
  slug: string | null;
}

/**
 * Reads ?ref / ?slug from the URL on mount and persists them to sessionStorage.
 * Subsequent navigations within the session retain the same attribution.
 */
export function useCaptureGuideAttribution() {
  const [params] = useSearchParams();

  useEffect(() => {
    const ref = params.get('ref');
    const slug = params.get('slug');

    // Only overwrite if a fresh ref is present — preserves first-touch.
    if (ref) {
      try {
        sessionStorage.setItem(REF_KEY, ref);
        if (slug) sessionStorage.setItem(STORAGE_KEY, slug);
      } catch {
        // sessionStorage can throw in private mode; safe to ignore.
      }
    }
  }, [params]);
}

/**
 * Reads the persisted attribution. Safe to call anywhere, returns nulls if
 * never set.
 */
export function readGuideAttribution(): Attribution {
  try {
    return {
      ref: sessionStorage.getItem(REF_KEY),
      slug: sessionStorage.getItem(STORAGE_KEY),
    };
  } catch {
    return { ref: null, slug: null };
  }
}

/**
 * Hook variant for components that need to read attribution reactively.
 */
export function useGuideAttribution(): Attribution & {
  clear: () => void;
} {
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(REF_KEY);
    } catch {
      // noop
    }
  }, []);

  return { ...readGuideAttribution(), clear };
}
