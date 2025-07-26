import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useUnifiedCareerData } from '@/hooks/useUnifiedCareerData';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { supabase } from '@/integrations/supabase/client';

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
  isLoading: boolean;
  errors: Record<string, string>;
  
  // Feature flags
  features: {
    marketIntelligence: boolean;
    skillTree: boolean;
    pivotRecommendations: boolean;
    gamification: boolean;
  };
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
  isLoading: false,
  errors: {},
  features: {
    marketIntelligence: true,
    skillTree: true,
    pivotRecommendations: true,
    gamification: true,
  }
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
      return { ...state, isLoading: action.payload.value };
    case 'SET_ERROR':
      return { 
        ...state, 
        errors: action.payload.error 
          ? { ...state.errors, [action.payload.key]: action.payload.error }
          : { ...state.errors, [action.payload.key]: undefined }
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
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      dispatch({ type: 'SET_USER', payload: user });
    };
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_USER', payload: session?.user || null });
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
      if (!state.isAuthenticated) return;
      
      dispatch({ type: 'SET_LOADING', payload: { key: 'global', value: true } });
      
      try {
        // This will be implemented as we integrate each system
        console.log('Refreshing all data for:', {
          careerPath: state.selectedCareerPath,
          location: state.selectedLocation,
          goal: state.currentGoal
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: { key: 'global', error: 'Failed to refresh data' } });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'global', value: false } });
      }
    }, [state.isAuthenticated, state.selectedCareerPath, state.selectedLocation, state.currentGoal]),
    
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
  return actions.getUnifiedProgress();
}

export function useContextualRecommendations() {
  const { actions } = useUnifiedData();
  return actions.getContextualRecommendations();
}