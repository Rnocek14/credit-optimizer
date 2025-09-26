import * as React from 'react';

type HighlightKind = 'program' | 'track';
type HighlightKey = `${HighlightKind}:${string}`;

export type Selection = {
  kind: HighlightKind;
  id: string;
};

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

type FilterMode = 'compare-programs' | 'compare-tracks' | 'compare-any' | string;

type API = {
  // Legacy single selection (backward compatible)
  hoveredKey: HighlightKey | null;
  lockedKey: HighlightKey | null;
  activeKey: HighlightKey | null;
  
  // Dual selection support for compare-any
  primarySelection: Selection | null;
  secondarySelection: Selection | null;
  
  preview: (key: HighlightKey | null) => void;
  clearPreview: () => void;
  toggleLock: (key: HighlightKey) => void;
  
  // New methods for dual selection
  setPrimarySelection: (selection: Selection | null) => void;
  setSecondarySelection: (selection: Selection | null) => void;
  clearSecondarySelection: () => void;

  // Enhanced membership helpers supporting dual selection:
  belongs: (b?: Blockish | null, selection?: Selection) => boolean;
  isNodeDimmed: (b?: Blockish | null) => boolean;
  isEdgeDimmed: (a?: Blockish | null, b?: Blockish | null, edgeType?: string) => boolean;
};

const Ctx = React.createContext<API | null>(null);

// Helper to parse URL for initial state
const parseUrlSelections = (): { primary: Selection | null; secondary: Selection | null } => {
  const params = new URLSearchParams(window.location.search);
  const parseSelection = (param: string | null): Selection | null => {
    if (!param) return null;
    const match = param.match(/^(program|track):(.+)$/);
    if (match) {
      return { kind: match[1] as 'program' | 'track', id: match[2] };
    }
    return null;
  };

  return {
    primary: parseSelection(params.get('a')),
    secondary: parseSelection(params.get('b'))
  };
};

export function PathHighlightProvider({
  children,
  filterMode,
}: {
  children: React.ReactNode;
  filterMode: FilterMode;
}) {
  const [hoveredKey, setHovered] = React.useState<HighlightKey | null>(null);
  const [lockedKey, setLocked] = React.useState<HighlightKey | null>(null);
  
  // Initialize dual selection state from URL
  const urlSelections = React.useMemo(() => {
    const selections = parseUrlSelections();
    console.log('[PathHighlightProvider] URL parsing:', {
      url: window.location.search,
      parsed: selections,
      timestamp: new Date().toISOString()
    });
    return selections;
  }, []);
  const [primarySelection, setPrimary] = React.useState<Selection | null>(urlSelections.primary);
  const [secondarySelection, setSecondary] = React.useState<Selection | null>(urlSelections.secondary);

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

  // Generic membership check supporting both legacy and dual selection modes
  const belongs = React.useCallback((b?: Blockish | null, selection?: Selection) => {
    // Use passed selection or fall back to legacy activeKey behavior
    const targetSelection = selection || (activeKey ? parseSelection(activeKey) : null);
    
    if (!targetSelection) return true; // nothing dimmed
    if (!b) return true; // treat nodes without metadata as shared/visible

    console.log('[PathHighlight] belongs check:', { selection: targetSelection, blockish: b });

    const { kind, id } = targetSelection;

    if (kind === 'program') {
      if (!b.program_id) return true; // globally shared blocks
      return b.program_id === id;
    } else if (kind === 'track') {
      // Generic track membership - no hardcoded CS logic
      if (!b.program_id && !b.track_id) return true; // globally shared (Y1)
      
      // Track-specific blocks
      if (b.track_id === id) return true;
      
      // Program-shared blocks: determine if this track belongs to the block's program
      if (b.program_id && !b.track_id) {
        // This requires program lookup - delegate to useApplyDimming's trackToProgram map
        return true; // Allow useApplyDimming to handle program-shared logic
      }
      
      return false;
    }
    
    return true;
  }, [activeKey]);

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

  // Helper to convert legacy key to selection
  const parseSelection = React.useCallback((key: HighlightKey): Selection | null => {
    const { kind, value } = parse(key);
    if (!kind || !value) return null;
    return { kind, id: value };
  }, [parse]);

  // Dual selection methods
  const setPrimarySelection = React.useCallback((selection: Selection | null) => {
    console.log('[PathHighlight] setPrimarySelection:', selection);
    setPrimary(selection);
  }, []);

  const setSecondarySelection = React.useCallback((selection: Selection | null) => {
    console.log('[PathHighlight] setSecondarySelection:', selection);
    setSecondary(selection);
  }, []);

  const clearSecondarySelection = React.useCallback(() => {
    console.log('[PathHighlight] clearSecondarySelection');
    setSecondary(null);
  }, []);

  // Reset legacy state when switching to compare-any mode
  React.useEffect(() => {
    if (filterMode === 'compare-any') {
      setHovered(null);
      setLocked(null);
    }
  }, [filterMode]);

  // Watch for URL changes (browser back/forward navigation)
  React.useEffect(() => {
    const handlePopState = () => {
      const newSelections = parseUrlSelections();
      console.log('[PathHighlight] URL changed, updating selections:', newSelections);
      setPrimary(newSelections.primary);
      setSecondary(newSelections.secondary);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Debug initial state
  React.useEffect(() => {
    console.log('[PathHighlight] Provider initialized with:', {
      filterMode,
      primarySelection: urlSelections.primary,
      secondarySelection: urlSelections.secondary,
      url: window.location.search
    });
  }, []);

  const value = React.useMemo<API>(() => ({
    hoveredKey, lockedKey, activeKey,
    primarySelection, secondarySelection,
    preview, clearPreview, toggleLock,
    setPrimarySelection, setSecondarySelection, clearSecondarySelection,
    belongs, isNodeDimmed, isEdgeDimmed
  }), [hoveredKey, lockedKey, activeKey, primarySelection, secondarySelection, preview, clearPreview, toggleLock, setPrimarySelection, setSecondarySelection, clearSecondarySelection, belongs, isNodeDimmed, isEdgeDimmed]);

  // Expose state for HUD debugging
  React.useEffect(() => {
    if (import.meta.env?.DEV) {
      (window as any).__highlight_state__ = { 
        hoveredKey, lockedKey, activeKey,
        primarySelection, secondarySelection
      };
      document.body.classList.toggle('edutree-highlight-active', !!(activeKey || primarySelection || secondarySelection));
    }
  }, [hoveredKey, lockedKey, activeKey, primarySelection, secondarySelection]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePathHighlight(): API {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error('usePathHighlight must be used within PathHighlightProvider');
  }
  return ctx;
}
