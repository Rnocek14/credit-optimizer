
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveTrackState {
  activeTrackId: string | null;
  activeTrack: any | null;
  setActiveTrackId: (id: string | null) => void;
}

export const useActiveTrackStore = create<ActiveTrackState>()(
  persist(
    (set) => ({
      activeTrackId: null,
      activeTrack: null,
      setActiveTrackId: (id) => set({ activeTrackId: id }),
    }),
    {
      name: 'active-track-id-v1',
    }
  )
);
