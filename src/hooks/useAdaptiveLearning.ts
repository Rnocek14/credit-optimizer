import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedMaya } from './useEnhancedMaya';
import { useCourseProgress } from './useCourseProgress';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

interface LearningOptimization {
  id: string;
  type: 'sequence_change' | 'difficulty_adjustment' | 'pace_modification' | 'skill_pivot' | 'learning_style_shift';
  title: string;
  description: string;
  currentApproach: string;
  optimizedApproach: string;
  expectedImprovement: {
    completionRate: number;
    retentionRate: number;
    timeToMastery: number;
    engagementScore: number;
  };
  confidence: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: number;
}

interface LearningMetrics {
  avgCompletionRate: number;
  avgRetentionRate: number;
  learningVelocity: number;
  engagementPattern: string[];
  strugglingAreas: string[];
  strongAreas: string[];
  optimalLearningTimes: string[];
  preferredLearningMethods: string[];
}

interface SmartIntervention {
  id: string;
  triggerCondition: string;
  interventionType: 'difficulty_reduction' | 'additional_practice' | 'concept_clarification' | 'motivation_boost' | 'learning_path_change';
  title: string;
  message: string;
  actionSuggestions: string[];
  autoImplement: boolean;
  priority: 'low' | 'medium' | 'high';
}

export function useAdaptiveLearning() {
  const [optimizations, setOptimizations] = useState<LearningOptimization[]>([]);
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [interventions, setInterventions] = useState<SmartIntervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Request management
  const isRequestInProgress = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const requestCount = useRef(0);
  const lastRequestTime = useRef(0);

  const { sendEnhancedRequest } = useEnhancedMaya();
  const { courseProgress } = useCourseProgress();
  const { state } = useUnifiedData();

  // Analyze current learning patterns and performance from real data
  const analyzeLearningMetrics = useCallback(async (): Promise<LearningMetrics> => {
    try {
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get real course progress data
      const { data: courseData } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.user.id);

      // Get learning milestones for engagement analysis
      const { data: milestonesData } = await supabase
        .from('learning_milestones')
        .select('*')
        .eq('user_id', user.user.id);

      if (courseData && courseData.length > 0) {
        const completedCourses = courseData.filter(c => c.status === 'completed');
        const avgCompletionRate = completedCourses.length / courseData.length;
        
        // Calculate average time spent and retention indicators
        const avgTimeSpent = courseData.reduce((sum, c) => sum + (c.time_spent_hours || 0), 0) / courseData.length;
        const learningVelocity = avgTimeSpent > 0 ? Math.min(1, avgTimeSpent / 20) : 0.5;
        
        const metrics: LearningMetrics = {
          avgCompletionRate,
          avgRetentionRate: avgCompletionRate * 0.85, // Estimated retention
          learningVelocity,
          engagementPattern: milestonesData && milestonesData.length > 5 ? ['high_engagement'] : ['moderate_engagement'],
          strugglingAreas: courseData.filter(c => c.progress_percentage < 50).map(c => 'struggling_area'),
          strongAreas: completedCourses.map(c => 'completed_area'),
          optimalLearningTimes: ['9:00-11:00', '14:00-16:00'],
          preferredLearningMethods: ['hands_on_projects', 'visual_explanations']
        };

        setMetrics(metrics);
        setIsUsingMockData(false);
        setLastRefreshed(new Date());
        return metrics;
      } else {
        throw new Error('No course data available');
      }
    } catch (error) {
      console.error('Error analyzing learning metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze metrics');
      
      // Fallback to mock data
      const mockMetrics: LearningMetrics = {
        avgCompletionRate: 0.73,
        avgRetentionRate: 0.68,
        learningVelocity: 0.82,
        engagementPattern: ['moderate_engagement'],
        strugglingAreas: ['data_analysis'],
        strongAreas: ['frontend_development'],
        optimalLearningTimes: ['9:00-11:00'],
        preferredLearningMethods: ['hands_on_projects']
      };

      setMetrics(mockMetrics);
      setIsUsingMockData(true);
      setLastRefreshed(new Date());
      return mockMetrics;
    }
  }, []);

  // Generate learning path optimizations
  const generateOptimizations = useCallback(async (): Promise<LearningOptimization[]> => {
    if (!metrics) return [];

    try {
      const request = `Based on my learning metrics showing ${metrics.avgCompletionRate * 100}% completion rate, ${metrics.avgRetentionRate * 100}% retention rate, and learning velocity of ${metrics.learningVelocity}, generate specific learning path optimizations to improve my performance. Consider my struggling areas: ${metrics.strugglingAreas.join(', ')}.`;

      const response = await sendEnhancedRequest(request);

      // Mock optimizations for now - would come from Maya's analysis
      const generatedOptimizations: LearningOptimization[] = [
        {
          id: 'opt-001',
          type: 'sequence_change',
          title: 'Reorder Algorithm Learning Sequence',
          description: 'Move data structures before algorithms to build stronger foundation',
          currentApproach: 'Algorithms → Data Structures → Projects',
          optimizedApproach: 'Data Structures → Basic Algorithms → Projects → Advanced Algorithms',
          expectedImprovement: {
            completionRate: 0.15,
            retentionRate: 0.22,
            timeToMastery: -0.18,
            engagementScore: 0.12
          },
          confidence: 0.84,
          implementationEffort: 'medium',
          priority: 1
        },
        {
          id: 'opt-002',
          type: 'learning_style_shift',
          title: 'Increase Project-Based Learning',
          description: 'Replace 40% of theoretical content with hands-on projects',
          currentApproach: '70% theory, 30% practice',
          optimizedApproach: '40% theory, 60% practice',
          expectedImprovement: {
            completionRate: 0.25,
            retentionRate: 0.30,
            timeToMastery: -0.12,
            engagementScore: 0.35
          },
          confidence: 0.91,
          implementationEffort: 'high',
          priority: 2
        },
        {
          id: 'opt-003',
          type: 'pace_modification',
          title: 'Adaptive Pacing for Difficult Topics',
          description: 'Slow down for algorithms, accelerate for frontend topics',
          currentApproach: 'Uniform pacing across all topics',
          optimizedApproach: 'Variable pacing based on difficulty and aptitude',
          expectedImprovement: {
            completionRate: 0.18,
            retentionRate: 0.15,
            timeToMastery: -0.08,
            engagementScore: 0.20
          },
          confidence: 0.78,
          implementationEffort: 'low',
          priority: 3
        },
        {
          id: 'opt-004',
          type: 'difficulty_adjustment',
          title: 'Graduated Difficulty Progression',
          description: 'Add intermediate steps for complex system design concepts',
          currentApproach: 'Jump from basic to advanced concepts',
          optimizedApproach: 'Gradual progression with intermediate challenges',
          expectedImprovement: {
            completionRate: 0.20,
            retentionRate: 0.25,
            timeToMastery: -0.05,
            engagementScore: 0.18
          },
          confidence: 0.86,
          implementationEffort: 'medium',
          priority: 4
        }
      ];

      setOptimizations(generatedOptimizations);
      return generatedOptimizations;
    } catch (error) {
      console.error('Error generating optimizations:', error);
      return [];
    }
  }, [metrics, sendEnhancedRequest]);

  // Generate smart interventions based on learning patterns
  const generateInterventions = useCallback(async (): Promise<SmartIntervention[]> => {
    if (!metrics) return [];

    const interventions: SmartIntervention[] = [
      {
        id: 'int-001',
        triggerCondition: 'completion_rate_below_60_percent',
        interventionType: 'difficulty_reduction',
        title: 'Learning Difficulty Adjustment',
        message: 'Maya noticed you\'re struggling with this topic. Let\'s break it down into smaller, more manageable pieces.',
        actionSuggestions: [
          'Switch to beginner-friendly resources',
          'Add prerequisite review sessions',
          'Enable guided practice mode'
        ],
        autoImplement: true,
        priority: 'high'
      },
      {
        id: 'int-002',
        triggerCondition: 'engagement_drop_detected',
        interventionType: 'motivation_boost',
        title: 'Engagement Recovery',
        message: 'Your learning momentum seems to be slowing down. Let\'s reignite your motivation with some quick wins!',
        actionSuggestions: [
          'Switch to a hands-on project',
          'Take a gamified coding challenge',
          'Connect with a study buddy'
        ],
        autoImplement: false,
        priority: 'medium'
      },
      {
        id: 'int-003',
        triggerCondition: 'stuck_on_concept_3_days',
        interventionType: 'concept_clarification',
        title: 'Concept Breakthrough Assistance',
        message: 'This concept has been challenging for a few days. Let Maya help you approach it from a different angle.',
        actionSuggestions: [
          'Watch alternative explanation videos',
          'Try visual learning aids',
          'Practice with simplified examples'
        ],
        autoImplement: false,
        priority: 'high'
      }
    ];

    setInterventions(interventions);
    return interventions;
  }, [metrics]);

  // Implement optimization automatically or with user approval
  const implementOptimization = useCallback(async (optimizationId: string, autoApprove: boolean = false) => {
    const optimization = optimizations.find(opt => opt.id === optimizationId);
    if (!optimization) return;

    try {
      const request = `Implement the learning optimization: ${optimization.title}. Change from "${optimization.currentApproach}" to "${optimization.optimizedApproach}". Update my learning path accordingly.`;
      
      const response = await sendEnhancedRequest(request);
      
      if (response) {
        // Mark optimization as implemented
        setOptimizations(prev => prev.filter(opt => opt.id !== optimizationId));
        
        return {
          success: true,
          message: `Successfully implemented: ${optimization.title}`,
          expectedBenefits: optimization.expectedImprovement
        };
      }
    } catch (error) {
      console.error('Error implementing optimization:', error);
      return {
        success: false,
        message: `Failed to implement: ${optimization.title}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [optimizations, sendEnhancedRequest]);

  // Trigger intervention when conditions are met
  const triggerIntervention = useCallback(async (interventionId: string) => {
    const intervention = interventions.find(int => int.id === interventionId);
    if (!intervention) return;

    if (intervention.autoImplement) {
      // Auto-implement the intervention
      const request = `Implement smart intervention: ${intervention.title}. ${intervention.message} Take these actions: ${intervention.actionSuggestions.join(', ')}.`;
      await sendEnhancedRequest(request);
    }

    return intervention;
  }, [interventions, sendEnhancedRequest]);

  // Circuit breaker: prevent excessive requests
  const canMakeRequest = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    
    // Reset counter if enough time has passed
    if (timeSinceLastRequest > 60000) { // 1 minute
      requestCount.current = 0;
    }
    
    // Maximum 3 requests per minute
    if (requestCount.current >= 3) {
      console.warn('🚫 Request rate limit reached, using cached data');
      return false;
    }
    
    return true;
  }, []);

  // Run comprehensive adaptive learning analysis with debouncing
  const runAdaptiveAnalysis = useCallback(async () => {
    // Prevent concurrent requests
    if (isRequestInProgress.current) {
      console.log('⏳ Request already in progress, skipping...');
      return;
    }

    // Check rate limiting
    if (!canMakeRequest()) {
      return;
    }

    isRequestInProgress.current = true;
    setLoading(true);
    requestCount.current++;
    lastRequestTime.current = Date.now();
    
    try {
      await analyzeLearningMetrics();
      await generateOptimizations();
      await generateInterventions();
    } catch (error) {
      console.error('Error running adaptive analysis:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
      isRequestInProgress.current = false;
    }
  }, [analyzeLearningMetrics, generateOptimizations, generateInterventions, canMakeRequest]);

  // Debounced version of runAdaptiveAnalysis
  const debouncedRunAnalysis = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      runAdaptiveAnalysis();
    }, 2000); // 2 second debounce
  }, [runAdaptiveAnalysis]);

  // Auto-run analysis when course progress changes (debounced)
  useEffect(() => {
    if (courseProgress && courseProgress.length > 0) {
      debouncedRunAnalysis();
    }
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [courseProgress, debouncedRunAnalysis]);

  // Monitor for intervention triggers
  useEffect(() => {
    if (autoOptimizationEnabled && metrics) {
      // Check for auto-intervention triggers
      interventions
        .filter(int => int.autoImplement && int.priority === 'high')
        .forEach(intervention => {
          // Would check actual trigger conditions here
          if (Math.random() > 0.9) { // Mock trigger condition
            triggerIntervention(intervention.id);
          }
        });
    }
  }, [metrics, interventions, autoOptimizationEnabled, triggerIntervention]);

  const getOptimizationsByType = useCallback((type: LearningOptimization['type']) => {
    return optimizations.filter(opt => opt.type === type);
  }, [optimizations]);

  const getHighImpactOptimizations = useCallback(() => {
    return optimizations
      .filter(opt => opt.confidence > 0.8 && opt.expectedImprovement.completionRate > 0.15)
      .sort((a, b) => b.priority - a.priority);
  }, [optimizations]);

  const getAdaptiveLearningMetrics = useCallback(() => {
    if (!metrics || optimizations.length === 0) return null;

    const totalImprovementPotential = optimizations.reduce((sum, opt) => 
      sum + opt.expectedImprovement.completionRate, 0
    );

    return {
      currentPerformance: {
        completionRate: metrics.avgCompletionRate,
        retentionRate: metrics.avgRetentionRate,
        learningVelocity: metrics.learningVelocity
      },
      optimizationPotential: {
        totalOptimizations: optimizations.length,
        highImpactOptimizations: getHighImpactOptimizations().length,
        totalImprovementPotential,
        avgConfidence: optimizations.reduce((sum, opt) => sum + opt.confidence, 0) / optimizations.length
      },
      activeInterventions: interventions.filter(int => int.priority === 'high').length,
      strugglingAreas: metrics.strugglingAreas.length,
      strongAreas: metrics.strongAreas.length
    };
  }, [metrics, optimizations, interventions, getHighImpactOptimizations]);

  return {
    // Data
    optimizations,
    metrics,
    interventions,
    
    // Actions
    runAdaptiveAnalysis,
    implementOptimization,
    triggerIntervention,
    
    // Utilities
    getOptimizationsByType,
    getHighImpactOptimizations,
    getAdaptiveLearningMetrics,
    
    // Settings
    autoOptimizationEnabled,
    setAutoOptimizationEnabled,
    
    // State
    loading,
    error,
    isReady: !loading && optimizations.length > 0,
    isUsingMockData,
    lastRefreshed
  };
}