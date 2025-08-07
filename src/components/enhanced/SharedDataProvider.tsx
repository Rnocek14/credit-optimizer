import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useUserProfile } from '@/hooks/useUserProfile';

interface SharedDataState {
  // User Data
  userProfile: any;
  userSkills: string[];
  currentRole: string;
  
  // Pivot Data
  pivotRecommendations: any[];
  selectedPivot: any | null;
  
  // Market Data
  marketTrends: any[];
  salaryInsights: any;
  
  // Career Readiness
  criScore: any;
  
  // Loading States
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

interface SharedDataActions {
  setSelectedPivot: (pivot: any) => void;
  refreshData: () => void;
  clearError: () => void;
}

interface SharedDataContextType extends SharedDataState, SharedDataActions {}

const SharedDataContext = createContext<SharedDataContextType | null>(null);

interface SharedDataProviderProps {
  userId: string;
  children: ReactNode;
}

export function SharedDataProvider({ userId, children }: SharedDataProviderProps) {
  const [selectedPivot, setSelectedPivot] = useState<any>(null);
  const [marketTrends, setMarketTrends] = useState<any[]>([]);
  const [salaryInsights, setSalaryInsights] = useState<any>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  
  // Core data hooks
  const { profile: userProfile, isLoading: profileLoading } = useUserProfile(userId);
  const { criScore, isLoading: criLoading } = useCareerReadiness({ userId });
  
  // Derived user data
  const currentRole = userProfile?.current_role || "Software Developer";
  const userSkills = userProfile?.skills || ["React", "TypeScript", "Node.js"];
  
  // Pivot recommendations
  const { 
    data: pivotRecommendations, 
    isLoading: pivotsLoading,
    error: pivotsError
  } = usePivotRecommendations({
    current_career: currentRole,
    user_skills: userSkills,
    preferred_locations: ["Remote", "San Francisco", "New York"],
    enabled: true
  });
  
  // Market intelligence
  const { getTopGrowingCareers, getSalaryInsights } = useMarketIntelligence();
  
  // Aggregate loading state
  const isLoading = profileLoading || criLoading || pivotsLoading;
  
  // Fetch market data when user profile is loaded
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!currentRole) return;
      
      try {
        const [trends, salary] = await Promise.all([
          getTopGrowingCareers("Remote", 10),
          getSalaryInsights(currentRole)
        ]);
        
        setMarketTrends(trends || []);
        setSalaryInsights(salary);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
        setHasError(true);
        setErrorMessage('Failed to load market insights');
      }
    };

    fetchMarketData();
  }, [currentRole, getTopGrowingCareers, getSalaryInsights]);
  
  // Handle pivot errors
  useEffect(() => {
    if (pivotsError) {
      setHasError(true);
      setErrorMessage('Failed to load career pivot recommendations');
    }
  }, [pivotsError]);
  
  const refreshData = () => {
    setHasError(false);
    setErrorMessage(undefined);
    // Trigger refetch by updating currentRole (will cause useEffect to run)
    window.location.reload();
  };
  
  const clearError = () => {
    setHasError(false);
    setErrorMessage(undefined);
  };
  
  const contextValue: SharedDataContextType = {
    // User Data
    userProfile,
    userSkills,
    currentRole,
    
    // Pivot Data
    pivotRecommendations: pivotRecommendations || [],
    selectedPivot,
    
    // Market Data
    marketTrends,
    salaryInsights,
    
    // Career Readiness
    criScore,
    
    // Loading States
    isLoading,
    hasError,
    errorMessage,
    
    // Actions
    setSelectedPivot,
    refreshData,
    clearError
  };
  
  return (
    <SharedDataContext.Provider value={contextValue}>
      {children}
    </SharedDataContext.Provider>
  );
}

export function useSharedData() {
  const context = useContext(SharedDataContext);
  if (!context) {
    throw new Error('useSharedData must be used within a SharedDataProvider');
  }
  return context;
}