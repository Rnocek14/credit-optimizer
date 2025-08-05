import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useUnifiedCareerData } from '@/hooks/useUnifiedCareerData';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

// Core state interface
interface UnifiedDataState {
  // User context
  user: any;
  isAuthenticated: boolean;
  
  // Selected context (what user is currently focused on)
  selectedCareerPath: string | null;
  selectedLocation: string | null;
  currentGoal: string | null;
  
  // Cross-system data
  careerData: any;
  marketData: any;
  readinessData: any;
  pivotData: any;
  
  // UI state
  activeTab: string;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Feature flags & UI preferences
  features: {
    marketIntelligence: boolean;
    skillTree: boolean;
    pivotRecommendations: boolean;
    gamification: boolean;
    simplifiedUI: boolean;
    progressiveDisclosure: boolean;
  };
  
  // User experience level
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

// Action types
type UnifiedDataAction = 
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_SELECTED_CAREER_PATH'; payload: string | null }
  | { type: 'SET_SELECTED_LOCATION'; payload: string | null }
  | { type: 'SET_CURRENT_GOAL'; payload: string | null }
  | { type: 'SET_CAREER_DATA'; payload: any }
  | { type: 'SET_MARKET_DATA'; payload: any }
  | { type: 'SET_READINESS_DATA'; payload: any }
  | { type: 'SET_PIVOT_DATA'; payload: any }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_LOADING'; payload: { key: string; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; error: string | null } }
  | { type: 'CLEAR_ERRORS' };

// Initial state
const initialState: UnifiedDataState = {
  user: null,
  isAuthenticated: false,
  selectedCareerPath: null,
  selectedLocation: null,
  currentGoal: null,
  careerData: null,
  marketData: null,
  readinessData: null,
  pivotData: null,
  activeTab: 'overview',
  loading: {},
  errors: {},
  features: {
    marketIntelligence: true,
    skillTree: true,
    pivotRecommendations: true,
    gamification: true,
    simplifiedUI: true,
    progressiveDisclosure: true,
  },
  experienceLevel: 'beginner'
};

// Reducer
function unifiedDataReducer(state: UnifiedDataState, action: UnifiedDataAction): UnifiedDataState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_SELECTED_CAREER_PATH':
      return { ...state, selectedCareerPath: action.payload };
    case 'SET_SELECTED_LOCATION':
      return { ...state, selectedLocation: action.payload };
    case 'SET_CURRENT_GOAL':
      return { ...state, currentGoal: action.payload };
    case 'SET_CAREER_DATA':
      return { ...state, careerData: action.payload };
    case 'SET_MARKET_DATA':
      return { ...state, marketData: action.payload };
    case 'SET_READINESS_DATA':
      return { ...state, readinessData: action.payload };
    case 'SET_PIVOT_DATA':
      return { ...state, pivotData: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_LOADING':
      return { 
        ...state, 
        loading: { 
          ...state.loading, 
          [action.payload.key]: action.payload.value 
        }
      };
    case 'SET_ERROR':
      return { 
        ...state, 
        errors: { 
          ...state.errors, 
          [action.payload.key]: action.payload.error 
        }
      };
    case 'CLEAR_ERRORS':
      return { ...state, errors: {} };
    default:
      return state;
  }
}

// Context
const UnifiedDataContext = createContext<{
  state: UnifiedDataState;
  dispatch: React.Dispatch<UnifiedDataAction>;
  actions: {
    setSelectedCareerPath: (path: string | null) => void;
    setSelectedLocation: (location: string | null) => void;
    setCurrentGoal: (goal: string | null) => void;
    setActiveTab: (tab: string) => void;
    refreshAllData: () => Promise<void>;
    getContextualRecommendations: () => any[];
    getUnifiedProgress: () => any;
  };
} | null>(null);

// Provider component
export function UnifiedDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(unifiedDataReducer, initialState);
  
  // Initialize user auth state
  useEffect(() => {
    console.log('🔄 UnifiedDataContext: Initializing user auth state');
    
    const getUser = async () => {
      console.log('👤 UnifiedDataContext: Getting current user (including dev users)');
      const user = await getCurrentUser();
      console.log('✅ UnifiedDataContext: User loaded:', user);
      dispatch({ type: 'SET_USER', payload: user });
    };
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 UnifiedDataContext: Auth state changed, event:', _event);
      
      // For auth state changes, we still need to check dev users
      if (!session?.user) {
        const devUser = await getCurrentUser();
        console.log('👤 UnifiedDataContext: No session user, checking dev user:', devUser);
        dispatch({ type: 'SET_USER', payload: devUser });
      } else {
        console.log('👤 UnifiedDataContext: Session user found:', session.user);
        dispatch({ type: 'SET_USER', payload: session.user });
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Actions
  const actions = {
    setSelectedCareerPath: useCallback((path: string | null) => {
      dispatch({ type: 'SET_SELECTED_CAREER_PATH', payload: path });
    }, []),
    
    setSelectedLocation: useCallback((location: string | null) => {
      dispatch({ type: 'SET_SELECTED_LOCATION', payload: location });
    }, []),
    
    setCurrentGoal: useCallback((goal: string | null) => {
      dispatch({ type: 'SET_CURRENT_GOAL', payload: goal });
    }, []),
    
    setActiveTab: useCallback((tab: string) => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    }, []),
    
    refreshAllData: useCallback(async () => {
      console.log('Refreshing all data for:', {
        careerPath: state.selectedCareerPath,
        location: state.selectedLocation,
        goal: state.currentGoal
      });
      
      dispatch({ type: 'SET_LOADING', payload: { key: 'refreshAll', value: true } });
      
      try {
        // Fetch career paths data
        if (state.selectedCareerPath) {
          const { data: careerData } = await supabase
            .from('career_paths')
            .select('*')
            .eq('title', state.selectedCareerPath)
            .maybeSingle();
          
          dispatch({ type: 'SET_CAREER_DATA', payload: careerData });
        }
        
        // Fetch market trends data
        if (state.selectedCareerPath && state.selectedLocation) {
          const { data: marketData } = await supabase
            .from('market_trends')
            .select('*')
            .eq('career_path', state.selectedCareerPath)
            .eq('location', state.selectedLocation)
            .order('created_at', { ascending: false })
            .limit(10);
          
          dispatch({ type: 'SET_MARKET_DATA', payload: marketData });
        }
        
        // Fetch readiness data (mock for now)
        const readinessData = {
          skillProgress: 75,
          readinessScore: 82,
          marketAlignment: 90,
          overallProgress: 82
        };
        dispatch({ type: 'SET_READINESS_DATA', payload: readinessData });
        
      } catch (error) {
        console.error('Error refreshing data:', error);
        dispatch({ type: 'SET_ERROR', payload: { key: 'refreshAll', error: 'Failed to refresh data' } });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'refreshAll', value: false } });
      }
    }, [state.selectedCareerPath, state.selectedLocation, state.currentGoal]),
    
    getContextualRecommendations: useCallback(() => {
      // Cross-system intelligence - combine data from all sources
      const recommendations = [];
      
      if (state.careerData && state.marketData) {
        // Example: If user has career data and market shows opportunity
        recommendations.push({
          type: 'market_opportunity',
          message: 'Based on your skills and current market trends...',
          action: 'explore_pivot'
        });
      }
      
      return recommendations;
    }, [state.careerData, state.marketData, state.readinessData]),
    
    getUnifiedProgress: useCallback(() => {
      // Combine progress from all systems
      return {
        skillProgress: state.careerData?.completionPercentage || 0,
        readinessScore: state.readinessData?.criScore || 0,
        marketAlignment: state.marketData?.alignmentScore || 0,
        overallProgress: 0 // Calculate based on weighted average
      };
    }, [state.careerData, state.readinessData, state.marketData])
  };

  return (
    <UnifiedDataContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

// Hook to use unified data
export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within UnifiedDataProvider');
  }
  return context;
}

// Specialized hooks for specific features
export function useUnifiedCareerContext() {
  const { state, actions } = useUnifiedData();
  return {
    selectedCareerPath: state.selectedCareerPath,
    selectedLocation: state.selectedLocation,
    currentGoal: state.currentGoal,
    setSelectedCareerPath: actions.setSelectedCareerPath,
    setSelectedLocation: actions.setSelectedLocation,
    setCurrentGoal: actions.setCurrentGoal,
  };
}

export function useUnifiedProgress() {
  const { actions } = useUnifiedData();
  return { data: actions.getUnifiedProgress() };
}

export function useContextualRecommendations() {
  const { actions } = useUnifiedData();
  return actions.getContextualRecommendations();
}