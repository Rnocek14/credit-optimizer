import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { getCurrentUser } from '@/lib/authHelper';
import { supabase } from '@/integrations/supabase/client';

export type UserPhase = 'discovery' | 'assessment' | 'planning' | 'execution' | 'optimization';
export type UserRole = 'learner' | 'professional' | 'career_changer' | 'student' | 'employer';

interface UserJourneyState {
  // User context
  user: any;
  isAuthenticated: boolean;
  isNewUser: boolean;
  
  // Journey progression
  currentPhase: UserPhase;
  completedSteps: string[];
  availableFeatures: string[];
  
  // Personalization
  role: UserRole | null;
  goals: string[];
  preferences: {
    showAdvancedFeatures: boolean;
    onboardingComplete: boolean;
    mayaIntroComplete: boolean;
    firstValueDemonstrated: boolean;
  };
  
  // Progress tracking
  milestones: {
    firstLogin: boolean;
    profileComplete: boolean;
    firstAssessment: boolean;
    firstPlan: boolean;
    firstCourse: boolean;
  };
  
  // Feature engagement
  featureEngagement: Record<string, number>;
  lastActiveFeature: string | null;
  
  // Maya AI state
  mayaPersonality: 'friendly' | 'professional' | 'encouraging';
  mayaContext: {
    lastConversation: string | null;
    userPreferences: any;
    suggestedActions: string[];
  };
}

type UserJourneyAction = 
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_PHASE'; payload: UserPhase }
  | { type: 'COMPLETE_STEP'; payload: string }
  | { type: 'SET_ROLE'; payload: UserRole }
  | { type: 'ADD_GOAL'; payload: string }
  | { type: 'UPDATE_PREFERENCE'; payload: { key: string; value: any } }
  | { type: 'TRACK_MILESTONE'; payload: { milestoneKey: string; data?: any } }
  | { type: 'TRACK_FEATURE_ENGAGEMENT'; payload: string }
  | { type: 'UPDATE_MAYA_CONTEXT'; payload: Partial<UserJourneyState['mayaContext']> }
  | { type: 'SET_MAYA_PERSONALITY'; payload: UserJourneyState['mayaPersonality'] };

const initialState: UserJourneyState = {
  user: null,
  isAuthenticated: false,
  isNewUser: true,
  currentPhase: 'discovery',
  completedSteps: [],
  availableFeatures: ['resume-analysis', 'skill-assessment', 'maya-chat'],
  role: null,
  goals: [],
  preferences: {
    showAdvancedFeatures: false,
    onboardingComplete: false,
    mayaIntroComplete: false,
    firstValueDemonstrated: false,
  },
  milestones: {
    firstLogin: false,
    profileComplete: false,
    firstAssessment: false,
    firstPlan: false,
    firstCourse: false,
  },
  featureEngagement: {},
  lastActiveFeature: null,
  mayaPersonality: 'friendly',
  mayaContext: {
    lastConversation: null,
    userPreferences: {},
    suggestedActions: [],
  },
};

function userJourneyReducer(state: UserJourneyState, action: UserJourneyAction): UserJourneyState {
  switch (action.type) {
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        isNewUser: !action.payload?.isDevUser && !state.preferences.onboardingComplete
      };
    case 'SET_PHASE':
      return { ...state, currentPhase: action.payload };
    case 'COMPLETE_STEP':
      return { 
        ...state, 
        completedSteps: [...state.completedSteps, action.payload],
        availableFeatures: getAvailableFeaturesForSteps([...state.completedSteps, action.payload])
      };
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_PREFERENCE':
      return { 
        ...state, 
        preferences: { ...state.preferences, [action.payload.key]: action.payload.value }
      };
    case 'TRACK_MILESTONE':
      return { 
        ...state, 
        milestones: { ...state.milestones, [action.payload.milestoneKey]: true }
      };
    case 'TRACK_FEATURE_ENGAGEMENT':
      return { 
        ...state, 
        featureEngagement: { 
          ...state.featureEngagement, 
          [action.payload]: (state.featureEngagement[action.payload] || 0) + 1 
        },
        lastActiveFeature: action.payload
      };
    case 'UPDATE_MAYA_CONTEXT':
      return { 
        ...state, 
        mayaContext: { ...state.mayaContext, ...action.payload }
      };
    case 'SET_MAYA_PERSONALITY':
      return { ...state, mayaPersonality: action.payload };
    default:
      return state;
  }
}

function getAvailableFeaturesForSteps(completedSteps: string[]): string[] {
  const baseFeatures = ['resume-analysis', 'skill-assessment', 'maya-chat'];
  
  if (completedSteps.includes('profile-setup')) {
    baseFeatures.push('career-planning', 'roadmap-generation');
  }
  
  if (completedSteps.includes('first-assessment')) {
    baseFeatures.push('skill-tree', 'learning-paths', 'market-intelligence');
  }
  
  if (completedSteps.includes('first-plan')) {
    baseFeatures.push('course-recommendations', 'timeline-planning', 'phase-progression');
  }
  
  return baseFeatures;
}

const UserJourneyContext = createContext<{
  state: UserJourneyState;
  dispatch: React.Dispatch<UserJourneyAction>;
  actions: {
    setCurrentPhase: (phase: UserPhase) => Promise<void>;
    completeStep: (step: string) => Promise<void>;
    setUserRole: (role: UserRole) => void;
    addGoal: (goal: string) => Promise<void>;
    updatePreference: (key: string, value: any) => void;
    trackMilestone: (milestone: string, data?: any) => Promise<void>;
    trackFeatureEngagement: (feature: string) => void;
    updateMayaContext: (context: Partial<UserJourneyState['mayaContext']>) => void;
    getNextRecommendedAction: () => string | null;
    shouldShowFeature: (feature: string) => boolean;
    getMayaSuggestions: () => string[];
  };
} | null>(null);

export function UserJourneyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(userJourneyReducer, initialState);

  // Initialize user state
  useEffect(() => {
    const initializeUser = async () => {
      console.log('📊 Initializing user journey...');
      const user = await getCurrentUser();
      
      if (!user) {
        console.log('❌ No authenticated user found');
        return;
      }

      try {
        // First, try to load existing preferences from database
        const { data: preferences, error } = await supabase
          .from('user_preferences')
          .select('completed_steps, milestones, user_goals, current_phase, has_completed_onboarding, experience_level')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading user preferences:', error);
        }

        // Set user info
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'TRACK_MILESTONE', payload: { milestoneKey: 'firstLogin' } });

        // Restore state from database if available
        if (preferences) {
          console.log('🔄 Restoring user journey state from database:', preferences);
          
          if (preferences.completed_steps?.length > 0) {
            preferences.completed_steps.forEach((step: string) => {
              dispatch({ type: 'COMPLETE_STEP', payload: step });
            });
          }

          if (preferences.milestones && typeof preferences.milestones === 'object') {
            Object.entries(preferences.milestones).forEach(([key, value]) => {
              if (value) {
                dispatch({ type: 'TRACK_MILESTONE', payload: { milestoneKey: key } });
              }
            });
          }

          if (preferences.user_goals?.length > 0) {
            preferences.user_goals.forEach((goal: string) => {
              dispatch({ type: 'ADD_GOAL', payload: goal });
            });
          }

          if (preferences.current_phase) {
            dispatch({ type: 'SET_PHASE', payload: preferences.current_phase as UserPhase });
          } else if (preferences.experience_level) {
            const phase = mapExperienceLevelToPhase(preferences.experience_level);
            dispatch({ type: 'SET_PHASE', payload: phase });
          }

          if (preferences.has_completed_onboarding) {
            dispatch({ type: 'UPDATE_PREFERENCE', payload: { key: 'onboardingComplete', value: true } });
          }
        }
      } catch (error) {
        console.error('Error initializing user journey:', error);
      }
    };
    
    initializeUser();
  }, []);

  // Persist user journey state to database
  const persistUserJourney = useCallback(async () => {
    if (!state.user?.id) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: state.user.id,
          completed_steps: state.completedSteps,
          milestones: state.milestones,
          user_goals: state.goals,
          current_phase: state.currentPhase,
        });

      if (error) {
        console.error('Error persisting user journey:', error);
      } else {
        console.log('💾 User journey persisted to database');
      }
    } catch (error) {
      console.error('Error persisting user journey:', error);
    }
  }, [state]);

  const actions = {
    setCurrentPhase: useCallback(async (phase: UserPhase) => {
      console.log(`📍 Moving to phase: ${phase}`);
      dispatch({ type: 'SET_PHASE', payload: phase });
      
      // Persist to database
      setTimeout(() => persistUserJourney(), 100);
    }, [persistUserJourney]),

    completeStep: useCallback(async (step: string) => {
      console.log(`✅ Completing step: ${step}`);
      dispatch({ type: 'COMPLETE_STEP', payload: step });
      
      // Persist to database
      setTimeout(() => persistUserJourney(), 100);
    }, [persistUserJourney]),

    setUserRole: useCallback((role: UserRole) => {
      dispatch({ type: 'SET_ROLE', payload: role });
    }, []),

    addGoal: useCallback(async (goal: string) => {
      console.log(`🎯 Adding goal: ${goal}`);
      dispatch({ type: 'ADD_GOAL', payload: goal });
      
      // Persist to database
      setTimeout(() => persistUserJourney(), 100);
    }, [persistUserJourney]),

    updatePreference: useCallback((key: string, value: any) => {
      dispatch({ type: 'UPDATE_PREFERENCE', payload: { key, value } });
    }, []),

    trackMilestone: useCallback(async (milestone: string, data: any = {}) => {
      console.log(`🏆 Milestone achieved: ${milestone}`, data);
      dispatch({ type: 'TRACK_MILESTONE', payload: { milestoneKey: milestone, data } });
      
      // Persist to database
      setTimeout(() => persistUserJourney(), 100);
    }, [persistUserJourney]),

    trackFeatureEngagement: useCallback((feature: string) => {
      dispatch({ type: 'TRACK_FEATURE_ENGAGEMENT', payload: feature });
    }, []),

    updateMayaContext: useCallback((context: Partial<UserJourneyState['mayaContext']>) => {
      dispatch({ type: 'UPDATE_MAYA_CONTEXT', payload: context });
    }, []),

    getNextRecommendedAction: useCallback(() => {
      if (!state.milestones.profileComplete) return 'complete-profile';
      if (!state.milestones.firstAssessment) return 'take-skill-assessment';
      if (!state.milestones.firstPlan) return 'create-career-plan';
      if (!state.milestones.firstCourse) return 'start-learning';
      return 'explore-advanced-features';
    }, [state.milestones]),

    shouldShowFeature: useCallback((feature: string) => {
      return state.availableFeatures.includes(feature);
    }, [state.availableFeatures]),

    getMayaSuggestions: useCallback(() => {
      const suggestions = [];
      
      if (!state.milestones.profileComplete) {
        suggestions.push("Let's complete your profile to get personalized recommendations!");
      }
      
      if (state.role === 'career_changer') {
        suggestions.push("I can help you identify transferable skills and plan your transition.");
      }
      
      if (state.currentPhase === 'planning' && state.goals.length === 0) {
        suggestions.push("Setting clear goals will help me create a better roadmap for you.");
      }
      
      return suggestions;
    }, [state.milestones, state.role, state.currentPhase, state.goals])
  };

  return (
    <UserJourneyContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </UserJourneyContext.Provider>
  );
}

export function useUserJourney() {
  const context = useContext(UserJourneyContext);
  if (!context) {
    throw new Error('useUserJourney must be used within UserJourneyProvider');
  }
  return context;
}

function mapExperienceLevelToPhase(level: string): UserPhase {
  switch (level) {
    case 'beginner': return 'discovery';
    case 'intermediate': return 'planning';
    case 'advanced': return 'optimization';
    default: return 'discovery';
  }
}