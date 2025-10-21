import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScoringWeights } from '../utils/optionScoring';

interface ScoringPrefsState {
  weights: ScoringWeights;
  setWeights: (w: Partial<ScoringWeights>) => void;
  resetWeights: () => void;
}

const DEFAULT_WEIGHTS: ScoringWeights = { cost: 0.4, time: 0.3, quality: 0.3 };

export const useScoringPrefs = create<ScoringPrefsState>()(
  persist(
    (set, get) => ({
      weights: DEFAULT_WEIGHTS,
      
      setWeights: (w) => {
        const cur = get().weights;
        const updated = { ...cur, ...w };
        
        // Normalize to sum to 1.0
        const sum = updated.cost + updated.time + updated.quality;
        
        // Safeguard: if weights drift to 0/0/0, reset to default
        if (sum <= 0.01) {
          set({ weights: DEFAULT_WEIGHTS });
          return;
        }
        
        // Normalize
        updated.cost /= sum;
        updated.time /= sum;
        updated.quality /= sum;
        
        set({ weights: updated });
      },
      
      resetWeights: () => {
        set({ weights: DEFAULT_WEIGHTS });
      },
    }),
    { name: 'v5-scoring-prefs' }
  )
);
