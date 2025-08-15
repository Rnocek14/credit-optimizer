
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
  isInitialized: boolean; // Add flag to prevent re-initialization
  setStage: (stage: JourneyStage) => void;
  setPermissions: (permissions: UserPermissions) => void;
  initializeFromUser: (hasCompletedOnboarding: boolean, userPermissions: UserPermissions) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set, get) => ({
      stage: 'new',
      permissions: {},
      isInitialized: false,
      
      setStage: (stage) => set({ stage }),
      
      setPermissions: (permissions) => set({ permissions }),
      
      initializeFromUser: (hasCompletedOnboarding, userPermissions) => {
        const current = get();
        
        // Prevent re-initialization if already initialized with the same data
        if (current.isInitialized && 
            current.stage === (hasCompletedOnboarding ? 'active' : 'new') &&
            JSON.stringify(current.permissions) === JSON.stringify(userPermissions)) {
          console.log('🔒 Journey already initialized, skipping...');
          return;
        }
        
        console.log('🚀 Initializing journey store:', { hasCompletedOnboarding, userPermissions });
        
        const currentStage = hasCompletedOnboarding ? 'active' : 'new';
        set({ 
          stage: currentStage,
          permissions: userPermissions,
          isInitialized: true
        });
      },
    }),
    {
      name: 'journey-store',
    }
  )
);
