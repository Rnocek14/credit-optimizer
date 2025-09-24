/**
 * Suffix Compare State Management
 * Global state for checkpoint "Expand from here" functionality
 */

import { create } from 'zustand';

export interface SuffixState {
  checkpointId: string | null;
  enabled: boolean;
}

interface SuffixCompareStore extends SuffixState {
  setSuffix: (state: { checkpointId: string; enabled: boolean }) => void;
  clearSuffix: () => void;
}

export const useSuffixCompareStore = create<SuffixCompareStore>((set) => ({
  checkpointId: null,
  enabled: false,
  
  setSuffix: ({ checkpointId, enabled }) => {
    set({ checkpointId, enabled });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[SuffixCompare] Suffix state updated:', { checkpointId, enabled });
    }
  },
  
  clearSuffix: () => {
    set({ enabled: false });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[SuffixCompare] Suffix cleared');
    }
  }
}));