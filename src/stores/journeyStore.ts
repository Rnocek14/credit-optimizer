import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type JourneyStage = 'new' | 'active' | 'power';

export interface UserPermissions {
  admin?: boolean;
  institution?: boolean;
  employer?: boolean;
  teach?: boolean;
}

interface JourneyState {
  stage: JourneyStage;
  permissions: UserPermissions;
  setStage: (stage: JourneyStage) => void;
  setPermissions: (permissions: UserPermissions) => void;
  initializeFromUser: (hasCompletedOnboarding: boolean, userPermissions: UserPermissions) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      stage: 'new',
      permissions: {},
      
      setStage: (stage) => set({ stage }),
      
      setPermissions: (permissions) => set({ permissions }),
      
      initializeFromUser: (hasCompletedOnboarding, userPermissions) => {
        const currentStage = hasCompletedOnboarding ? 'active' : 'new';
        set({ 
          stage: currentStage,
          permissions: userPermissions 
        });
      },
    }),
    {
      name: 'journey-store',
    }
  )
);