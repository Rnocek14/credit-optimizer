import { useState, useCallback, useEffect } from 'react';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useToast } from '@/hooks/use-toast';

export interface SharedPivotState {
  selectedPivot: any | null;
  activePivots: any[];
  progressData: any;
  roiData: any;
  timelineData: any;
  predictionData: any;
}

export function usePhase4Integration(userId: string) {
  const { state, actions } = useUnifiedData();
  const { profile } = useUserProfile(userId);
  const { toast } = useToast();
  
  // Shared state across all Phase 4 components
  const [sharedState, setSharedState] = useState<SharedPivotState>({
    selectedPivot: null,
    activePivots: [],
    progressData: null,
    roiData: null,
    timelineData: null,
    predictionData: null,
  });

  // Get pivot recommendations with real user data
  const { data: pivotPaths, isLoading: pivotsLoading } = usePivotRecommendations({
    current_career: profile?.current_role || "Software Developer",
    user_skills: profile?.skills || ["React", "TypeScript", "Python"],
    preferred_locations: [profile?.location || "Remote"],
    enabled: !!profile
  });

  // Get CRI data
  const { criScore } = useCareerReadiness({ userId });

  // Update shared state when pivot paths load
  useEffect(() => {
    if (pivotPaths && pivotPaths.length > 0) {
      setSharedState(prev => ({
        ...prev,
        activePivots: pivotPaths.slice(0, 3), // Top 3 as active pivots
        selectedPivot: prev.selectedPivot || pivotPaths[0] // Auto-select first if none selected
      }));
    }
  }, [pivotPaths]);

  // Cross-tab data synchronization
  const syncPivotSelection = useCallback((pivot: any) => {
    setSharedState(prev => ({
      ...prev,
      selectedPivot: pivot
    }));

    // Update unified context
    actions.setCurrentGoal(pivot?.new_career);

    // Generate synchronized data for all components
    const syncedData = {
      progressData: generateProgressData(pivot, profile),
      roiData: generateROIData(pivot, criScore),
      timelineData: generateTimelineData(pivot),
      predictionData: generatePredictionData(pivot)
    };

    setSharedState(prev => ({
      ...prev,
      ...syncedData
    }));

    toast({
      title: "Pivot synchronized",
      description: `All components updated for ${pivot?.new_career || 'selected career'}`,
      variant: "default"
    });
  }, [profile, criScore, actions, toast]);

  // Maya AI decision reasoning
  const getMayaReasoning = useCallback((context: string, data: any) => {
    // Add null checks to prevent accessing properties on null objects
    if (!data) {
      return "Maya is analyzing your career data to provide personalized insights.";
    }

    const reasoningMap = {
      'pivot_selection': `Based on your ${profile?.experience_level || 'current'} experience in ${profile?.current_role || 'your field'} and strong skills in ${profile?.skills?.slice(0, 2).join(' and ') || 'your core competencies'}, this pivot to ${data.new_career || 'your target career'} aligns well with market trends and offers ${data.roi_score || 75}% ROI confidence.`,
      'timeline_adjustment': `Considering your current progress of ${data.currentProgress || 0}% and learning intensity, Maya suggests this timeline adjustment will optimize your transition efficiency while maintaining quality.`,
      'roi_projection': `Market analysis shows ${data.new_career || 'your target career'} roles command 30% higher salaries than ${profile?.current_role || 'your current role'}, with strong demand in ${profile?.location || 'your area'}. Your skill overlap of ${data.skillOverlap || 50}% provides a solid foundation.`,
      'outcome_prediction': `With ${data.currentProgress || 0}% completion and current market velocity, Maya predicts ${data.successRate || 75}% success probability for your ${data.new_career || 'career'} transition.`
    };

    return reasoningMap[context as keyof typeof reasoningMap] || "Maya is analyzing this decision based on your profile and market intelligence.";
  }, [profile]);

  // Smart suggestions across components
  const getSmartSuggestions = useCallback(() => {
    if (!sharedState.selectedPivot || !profile) return [];

    const suggestions = [];
    const pivot = sharedState.selectedPivot;
    const currentCRI = criScore?.overall || 0;

    // Progress-based suggestions
    if (sharedState.progressData?.currentProgress > 80) {
      suggestions.push({
        type: 'acceleration',
        title: 'Consider Timeline Acceleration',
        description: 'Your progress suggests you could complete this transition 2-4 weeks earlier.',
        action: () => actions.setActiveTab('timeline'),
        confidence: 0.85
      });
    }

    // ROI-based suggestions
    if ((pivot.roi_score || 0) > 85 && currentCRI > 75) {
      suggestions.push({
        type: 'opportunity',
        title: 'High Opportunity Window',
        description: 'Market conditions and your readiness create an optimal pivot opportunity.',
        action: () => actions.setActiveTab('predictor'),
        confidence: 0.92
      });
    }

    // Skill gap suggestions
    const missingSkills = pivot.missing_skills?.length || 0;
    if (missingSkills > 5) {
      suggestions.push({
        type: 'preparation',
        title: 'Focus on Core Skills',
        description: `Prioritize these ${Math.min(3, missingSkills)} skills for maximum impact.`,
        action: () => window.location.href = '/planner',
        confidence: 0.78
      });
    }

    return suggestions;
  }, [sharedState, profile, criScore, actions]);

  return {
    // Shared state
    sharedState,
    
    // Actions
    syncPivotSelection,
    
    // Data
    userProfile: profile,
    pivotPaths,
    criScore,
    isLoading: pivotsLoading,
    
    // AI insights
    getMayaReasoning,
    getSmartSuggestions,
    
    // State setters for individual components
    updateProgressData: (data: any) => setSharedState(prev => ({ ...prev, progressData: data })),
    updateROIData: (data: any) => setSharedState(prev => ({ ...prev, roiData: data })),
    updateTimelineData: (data: any) => setSharedState(prev => ({ ...prev, timelineData: data })),
    updatePredictionData: (data: any) => setSharedState(prev => ({ ...prev, predictionData: data })),
  };
}

// Helper functions for generating synchronized data
function generateProgressData(pivot: any, profile: any) {
  if (!pivot) return null;
  
  return {
    currentProgress: Math.floor(Math.random() * 40 + 40), // 40-80%
    milestones: [
      {
        id: '1',
        title: `Master ${pivot.missing_skills?.[0] || 'Core Skills'}`,
        description: 'Build foundational knowledge',
        progress: 75,
        status: 'completed',
        skills: pivot.missing_skills?.slice(0, 2) || []
      },
      {
        id: '2', 
        title: `${pivot.missing_skills?.[1] || 'Advanced'} Specialization`,
        description: 'Develop advanced competencies',
        progress: 45,
        status: 'in_progress',
        skills: pivot.missing_skills?.slice(1, 3) || []
      },
      {
        id: '3',
        title: 'Portfolio Development',
        description: 'Create showcase projects',
        progress: 0,
        status: 'pending',
        skills: ['Portfolio', 'Projects']
      }
    ],
    skillsAcquired: pivot.shared_skills?.length || 0,
    timeRemaining: pivot.estimated_time
  };
}

function generateROIData(pivot: any, criScore: any) {
  if (!pivot) return null;
  
  return {
    netROI: pivot.roi_score,
    paybackPeriod: '14 months',
    salaryIncrease: '32%',
    totalInvestment: pivot.estimated_cost,
    projections: generateROIProjections(pivot.roi_score)
  };
}

function generateTimelineData(pivot: any) {
  if (!pivot) return null;
  
  return {
    originalDuration: pivot.estimated_time,
    currentIntensity: 3, // 1-5 scale
    adjustments: [
      {
        type: 'accelerate',
        description: 'Intensive 6-week bootcamp approach',
        impact: 'High',
        newDuration: '3 months',
        confidence: 0.78
      },
      {
        type: 'standard',
        description: 'Balanced learning with current pace',
        impact: 'Medium',
        newDuration: pivot.estimated_time,
        confidence: 0.85
      },
      {
        type: 'decelerate', 
        description: 'Extended timeline with deeper mastery',
        impact: 'Low',
        newDuration: '6 months',
        confidence: 0.92
      }
    ]
  };
}

function generatePredictionData(pivot: any) {
  if (!pivot) return null;
  
  return {
    successProbability: pivot.roi_score,
    marketDemand: 'High',
    competitionLevel: 'Medium',
    skillGapRisk: pivot.missing_skills?.length > 4 ? 'Medium' : 'Low',
    alternatives: [
      {
        career: `Senior ${pivot.new_career}`,
        similarity: 95,
        roi: pivot.roi_score + 5
      },
      {
        career: `${pivot.new_career} Lead`,
        similarity: 88,
        roi: pivot.roi_score + 12
      }
    ]
  };
}

function generateROIProjections(baseROI: number) {
  return Array.from({ length: 24 }, (_, i) => ({
    month: i + 1,
    currentSalary: 85000 + (i * 500),
    newSalary: 110000 + (i * 800),
    investment: Math.max(0, 3000 - (i * 200)),
    roi: Math.min(baseROI, (i + 1) * 4)
  }));
}