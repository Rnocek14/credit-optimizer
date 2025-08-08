import { create } from 'zustand';

export interface TranscriptLite {
  id?: string;
  title: string;
  skill_tags?: string[];
  cri_score?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | string;
  instructor?: string;
  created_at: string; // ISO
}

interface TranscriptState {
  entries: TranscriptLite[];
  addEntry: (entry: TranscriptLite) => void;
  clear: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  entries: [],
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  clear: () => set({ entries: [] }),
}));
