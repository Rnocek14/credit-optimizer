import React, { createContext, useContext, useState, ReactNode } from 'react';

export type FocusMode = 'overview' | 'web-track' | 'mobile-track' | 'compare-tracks';
export type DisclosureLevel = 'summary' | 'details' | 'full';

interface FocusState {
  mode: FocusMode;
  disclosureLevel: DisclosureLevel;
  focusedBlockId: string | null;
  highlightedTrack: string | null;
}

interface FocusContextType {
  focusState: FocusState;
  setFocusMode: (mode: FocusMode) => void;
  setDisclosureLevel: (level: DisclosureLevel) => void;
  focusBlock: (blockId: string | null) => void;
  highlightTrack: (track: string | null) => void;
  resetFocus: () => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}

interface FocusProviderProps {
  children: ReactNode;
}

export function FocusProvider({ children }: FocusProviderProps) {
  const [focusState, setFocusState] = useState<FocusState>({
    mode: 'overview',
    disclosureLevel: 'summary',
    focusedBlockId: null,
    highlightedTrack: null
  });

  const setFocusMode = (mode: FocusMode) => {
    setFocusState(prev => ({ ...prev, mode }));
  };

  const setDisclosureLevel = (level: DisclosureLevel) => {
    setFocusState(prev => ({ ...prev, disclosureLevel: level }));
  };

  const focusBlock = (blockId: string | null) => {
    setFocusState(prev => ({ ...prev, focusedBlockId: blockId }));
  };

  const highlightTrack = (track: string | null) => {
    setFocusState(prev => ({ ...prev, highlightedTrack: track }));
  };

  const resetFocus = () => {
    setFocusState({
      mode: 'overview',
      disclosureLevel: 'summary',
      focusedBlockId: null,
      highlightedTrack: null
    });
  };

  return (
    <FocusContext.Provider value={{
      focusState,
      setFocusMode,
      setDisclosureLevel,
      focusBlock,
      highlightTrack,
      resetFocus
    }}>
      {children}
    </FocusContext.Provider>
  );
}