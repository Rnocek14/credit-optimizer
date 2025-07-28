import { useState, useCallback, useEffect } from 'react';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

// Unified loading state management
export function useUnifiedLoading() {
  const { state, dispatch } = useUnifiedData();
  
  const setLoading = useCallback((key: string, value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  }, [dispatch]);
  
  const isLoading = useCallback((key?: string) => {
    if (key) {
      return state.loading[key] || false;
    }
    return Object.values(state.loading).some(Boolean);
  }, [state.loading]);
  
  return { setLoading, isLoading };
}

// Unified error handling
export function useUnifiedError() {
  const { state, dispatch } = useUnifiedData();
  
  const setError = useCallback((key: string, error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: { key, error } });
  }, [dispatch]);
  
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, [dispatch]);
  
  const getError = useCallback((key: string) => {
    return state.errors[key];
  }, [state.errors]);
  
  const hasErrors = Object.values(state.errors).some(error => error !== undefined);
  
  return { setError, clearErrors, getError, hasErrors, errors: state.errors };
}

// Smart data synchronization hook
export function useSmartSync() {
  const { state, actions } = useUnifiedData();
  
  // Auto-sync when context changes
  useEffect(() => {
    if (state.selectedCareerPath || state.selectedLocation || state.currentGoal) {
      // Debounced refresh when context changes
      const timeoutId = setTimeout(() => {
        actions.refreshAllData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.selectedCareerPath, state.selectedLocation, state.currentGoal]); // Remove actions dependency
  
  const syncData = useCallback(async (systems: string[] = []) => {
    console.log('Syncing data for systems:', systems);
    await actions.refreshAllData();
  }, [actions]);
  
  return { syncData };
}

// Cross-system recommendations
export function useIntelligentRecommendations() {
  const { state, actions } = useUnifiedData();
  
  const recommendations = actions.getContextualRecommendations();
  
  const getRecommendationsForContext = useCallback((context: string) => {
    return recommendations.filter(rec => rec.context === context || !rec.context);
  }, [recommendations]);
  
  return { 
    recommendations, 
    getRecommendationsForContext,
    hasRecommendations: recommendations.length > 0
  };
}

// Unified feature flags
export function useFeatureFlags() {
  const { state } = useUnifiedData();
  
  const isFeatureEnabled = useCallback((feature: keyof typeof state.features) => {
    return state.features[feature];
  }, [state.features]);
  
  return { isFeatureEnabled, features: state.features };
}