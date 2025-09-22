import * as React from 'react';

type HighlightKind = 'program' | 'track';
type HighlightKey = `${HighlightKind}:${string}`;

export type Blockish = {
  id?: string;
  program_id?: string | null;
  track_id?: string | null;
  type?: string;
};

export type Edgeish = {
  type?: string;
  source?: string;
  target?: string;
  data?: any;
};

type FilterMode = 'compare-programs' | 'compare-tracks' | string;

type API = {
  hoveredKey: HighlightKey | null;
  lockedKey: HighlightKey | null;
  activeKey: HighlightKey | null;
  preview: (key: HighlightKey | null) => void;
  clearPreview: () => void;
  toggleLock: (key: HighlightKey) => void;

  // Membership helpers (stateless, identity-stable):
  belongs: (b?: Blockish | null) => boolean;
  isNodeDimmed: (b?: Blockish | null) => boolean;
  isEdgeDimmed: (a?: Blockish | null, b?: Blockish | null, edgeType?: string) => boolean;
};

const Ctx = React.createContext<API | null>(null);

export function PathHighlightProvider({
  children,
  filterMode,
}: {
  children: React.ReactNode;
  filterMode: FilterMode;
}) {
  const [hoveredKey, setHovered] = React.useState<HighlightKey | null>(null);
  const [lockedKey, setLocked] = React.useState<HighlightKey | null>(null);

  const activeKey = lockedKey ?? hoveredKey;

  const parse = React.useCallback((key: HighlightKey | null) => {
    if (!key) return { kind: null as null, value: null as null };
    const i = key.indexOf(':');
    if (i < 0) return { kind: null as null, value: null as null };
    const kind = key.slice(0, i) as HighlightKind;
    const value = key.slice(i + 1);
    return { kind, value };
  }, []);

  const preview = React.useCallback((key: HighlightKey | null) => {
    console.log('[PathHighlight] preview called with key:', key, 'lockedKey:', lockedKey);
    // If locked, ignore hover
    if (lockedKey) {
      console.log('[PathHighlight] preview ignored due to lock');
      return;
    }
    console.log('[PathHighlight] setHovered called with:', key);
    setHovered(key);
  }, [lockedKey]);

  const clearPreview = React.useCallback(() => {
    console.log('[PathHighlight] clearPreview called, lockedKey:', lockedKey);
    if (lockedKey) {
      console.log('[PathHighlight] clearPreview ignored due to lock');
      return;
    }
    console.log('[PathHighlight] setHovered(null) called');
    setHovered(null);
  }, [lockedKey]);

  const toggleLock = React.useCallback((key: HighlightKey) => {
    console.log('[PathHighlight] toggleLock called with key:', key, 'current locked:', lockedKey);
    const newLocked = lockedKey === key ? null : key;
    console.log('[PathHighlight] setLocked called with:', newLocked);
    setLocked(newLocked);
    // Also clear hover to avoid confusion
    console.log('[PathHighlight] setHovered(null) called from toggleLock');
    setHovered(null);
  }, [lockedKey]);

  const belongs = React.useCallback((b?: Blockish | null) => {
    if (!activeKey) return true; // nothing dimmed
    if (!b) return true; // treat nodes without metadata as shared/visible

    console.log('[PathHighlight] belongs check:', { activeKey, blockish: b });

    const { kind, value } = parse(activeKey);
    if (!kind || !value) return true;

    if (kind === 'program') {
      if (!b.program_id) return true; // globally shared blocks
      return b.program_id === value;
    } else if (kind === 'track') {
      // For track highlighting, add program-awareness
      if (!b.program_id && !b.track_id) return true; // globally shared (Y1)
      
      // CS tracks (se/ds): include CS program blocks and specific track blocks
      if (value === 'se' || value === 'ds') {
        if (b.track_id === value) return true; // specific track blocks
        if (b.program_id === 'bs_cs' && !b.track_id) return true; // CS program shared
        return false; // IT blocks should be dimmed
      }
      
      // Fallback for other tracks
      if (!b.track_id) return true;
      return b.track_id === value;
    }
    
    return true;
  }, [activeKey, parse]);

  const isNodeDimmed = React.useCallback((b?: Blockish | null) => {
    if (!activeKey) return false;
    return !belongs(b);
  }, [activeKey, belongs]);

  const isEdgeDimmed = React.useCallback((a?: Blockish | null, b?: Blockish | null, edgeType?: string) => {
    if (!activeKey) return false;
    // Gate/header edges (metro/gate): keep visible if either endpoint belongs (or is shared)
    const keepIfEither = edgeType === 'metroGate' || edgeType === 'gate';
    const A = belongs(a);
    const B = belongs(b);
    return keepIfEither ? !(A || B) : !(A && B);
  }, [activeKey, belongs]);

  const value = React.useMemo<API>(() => ({
    hoveredKey, lockedKey, activeKey,
    preview, clearPreview, toggleLock,
    belongs, isNodeDimmed, isEdgeDimmed
  }), [hoveredKey, lockedKey, activeKey, preview, clearPreview, toggleLock, belongs, isNodeDimmed, isEdgeDimmed]);

  // Expose state for HUD debugging
  React.useEffect(() => {
    if (import.meta.env?.DEV) {
      (window as any).__highlight_state__ = { hoveredKey, lockedKey, activeKey };
      document.body.classList.toggle('edutree-highlight-active', !!activeKey);
    }
  }, [hoveredKey, lockedKey, activeKey]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePathHighlight(): API {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error('usePathHighlight must be used within PathHighlightProvider');
  }
  return ctx;
}
