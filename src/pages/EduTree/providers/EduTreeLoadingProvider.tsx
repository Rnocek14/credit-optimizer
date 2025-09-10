import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingState {
  courses: boolean;
  blocks: boolean;
  blockMembers: boolean;
  gates: boolean;
  gateEdges: boolean;
  layout: boolean;
}

interface ErrorState {
  courses?: string;
  blocks?: string;
  blockMembers?: string;
  gates?: string;
  gateEdges?: string;
  layout?: string;
}

interface EduTreeLoadingContextType {
  loading: LoadingState;
  errors: ErrorState;
  setLoading: (key: keyof LoadingState, value: boolean) => void;
  setError: (key: keyof ErrorState, error: string | null) => void;
  clearError: (key: keyof ErrorState) => void;
  clearAllErrors: () => void;
  retryQuery: (key: keyof LoadingState) => void;
  isAnyLoading: boolean;
  hasAnyError: boolean;
  criticalDataLoaded: boolean;
  allDataLoaded: boolean;
}

const EduTreeLoadingContext = createContext<EduTreeLoadingContextType | undefined>(undefined);

interface EduTreeLoadingProviderProps {
  children: React.ReactNode;
}

export function EduTreeLoadingProvider({ children }: EduTreeLoadingProviderProps) {
  const [loading, setLoadingState] = useState<LoadingState>({
    courses: true,
    blocks: true,
    blockMembers: true,
    gates: true,
    gateEdges: true,
    layout: false,
  });

  const [errors, setErrorState] = useState<ErrorState>({});
  const [retryCallbacks, setRetryCallbacks] = useState<Record<string, () => void>>({});

  const setLoading = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }));
    if (value) {
      // Clear error when starting to load
      setError(key, null);
    }
  }, []);

  const setError = useCallback((key: keyof ErrorState, error: string | null) => {
    setErrorState(prev => error ? { ...prev, [key]: error } : { ...prev, [key]: undefined });
  }, []);

  const clearError = useCallback((key: keyof ErrorState) => {
    setError(key, null);
  }, [setError]);

  const clearAllErrors = useCallback(() => {
    setErrorState({});
  }, []);

  const retryQuery = useCallback((key: keyof LoadingState) => {
    const callback = retryCallbacks[key];
    if (callback) {
      clearError(key);
      callback();
    }
  }, [retryCallbacks, clearError]);

  const isAnyLoading = Object.values(loading).some(Boolean);
  const hasAnyError = Object.values(errors).some(error => error !== undefined);
  
  // Critical data: courses and blocks are needed to show anything
  const criticalDataLoaded = !loading.courses && !loading.blocks;
  
  // All data loaded
  const allDataLoaded = !isAnyLoading;

  return (
    <EduTreeLoadingContext.Provider
      value={{
        loading,
        errors,
        setLoading,
        setError,
        clearError,
        clearAllErrors,
        retryQuery,
        isAnyLoading,
        hasAnyError,
        criticalDataLoaded,
        allDataLoaded,
      }}
    >
      {children}
    </EduTreeLoadingContext.Provider>
  );
}

export function useEduTreeLoading() {
  const context = useContext(EduTreeLoadingContext);
  if (!context) {
    throw new Error('useEduTreeLoading must be used within EduTreeLoadingProvider');
  }
  return context;
}