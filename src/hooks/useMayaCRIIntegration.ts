/**
 * Phase 7: Maya + CRI Integration Hook
 * Seamlessly integrates Maya's AI intelligence with CRI system
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCRIGoals } from '@/hooks/useCRIGoals';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CRIInsight {
  type: 'skill_gap' | 'market_trend' | 'career_advice' | 'learning_path';
  title: string;
  message: string;
  actionable: boolean;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

interface CareerTrajectory {
  currentCRI: number;
  targetCRI: number;
  timeToTarget: string;
  skillGaps: string[];
  recommendedActions: string[];
  confidenceInterval: number;
  marketFactors: string[];
}

export function useMayaCRIIntegration(userId?: string) {
  const queryClient = useQueryClient();
  const [insights, setInsights] = useState<CRIInsight[]>([]);
  const [trajectory, setTrajectory] = useState<CareerTrajectory | null>(null);

  const { sendEnhancedRequest, analyzeSkillGaps, getMarketIntelligence } = useEnhancedMaya();
  const { criScore, userProgress, markCompleted } = useCareerReadiness({ userId });
  const { criGoal, targetCRI } = useCRIGoals(userId);

  // Generate CRI-informed career guidance
  const generateCRIGuidance = useCallback(async () => {
    if (!userId || !criScore) return;

    try {
      const currentCRI = criScore.overall;
      const gap = targetCRI - currentCRI;

      if (gap > 0) {
        const request = `Based on my current CRI score of ${currentCRI} and target of ${targetCRI}, provide specific guidance to close the ${gap}-point gap. Consider my skill completion rate of ${criScore.skillsScore}% and experience level of ${criScore.experienceScore}%. What should I prioritize?`;
        
        const response = await sendEnhancedRequest(request, {
          goals: [{ target_role: 'Career advancement', cri_context: { current: currentCRI, target: targetCRI } }]
        });

        if (response) {
          const newInsight: CRIInsight = {
            type: 'career_advice',
            title: 'Maya\'s CRI Guidance',
            message: response.response,
            actionable: true,
            confidence: 0.9,
            priority: gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
            suggestedAction: 'Follow Maya\'s recommendation'
          };

          setInsights(prev => [newInsight, ...prev.slice(0, 4)]);
        }
      }
    } catch (error) {
      console.error('Error generating CRI guidance:', error);
    }
  }, [userId, criScore, targetCRI, sendEnhancedRequest]);

  // Analyze skill gaps with market context
  const analyzeCRISkillGaps = useCallback(async (targetRole?: string) => {
    if (!userId || !criScore) return;

    try {
      const skillGaps = Object.entries(criScore.breakdown || {})
        .filter(([_, completed]) => !completed)
        .map(([skill]) => skill);

      if (skillGaps.length > 0) {
        const response = await analyzeSkillGaps(
          targetRole || 'current career path',
          skillGaps
        );

        if (response) {
          const insight: CRIInsight = {
            type: 'skill_gap',
            title: 'CRI Skill Gap Analysis',
            message: response.response,
            actionable: true,
            confidence: 0.85,
            priority: 'high',
            suggestedAction: 'Start learning recommended skills'
          };

          setInsights(prev => [insight, ...prev.slice(0, 4)]);
        }
      }
    } catch (error) {
      console.error('Error analyzing CRI skill gaps:', error);
    }
  }, [userId, criScore, analyzeSkillGaps]);

  // Generate predictive career trajectory
  const generateCareerTrajectory = useCallback(async () => {
    if (!userId || !criScore) return;

    try {
      const currentCRI = criScore.overall;
      const skillCompletionRate = criScore.skillsScore / 100;
      const experienceScore = criScore.experienceScore;

      // Calculate estimated time to target based on current progress rate
      const progressRate = Math.max(skillCompletionRate * 0.3 + experienceScore * 0.2, 0.1);
      const pointsToGain = Math.max(targetCRI - currentCRI, 0);
      const weeksToTarget = Math.ceil(pointsToGain / (progressRate * 5)); // Assuming 5 points per week at current rate

      const newTrajectory: CareerTrajectory = {
        currentCRI,
        targetCRI,
        timeToTarget: weeksToTarget > 52 ? `${Math.ceil(weeksToTarget / 52)} year(s)` : `${weeksToTarget} weeks`,
        skillGaps: Object.keys(criScore.breakdown || {}).filter(skill => !criScore.breakdown[skill]),
        recommendedActions: [
          'Complete priority skill courses',
          'Build practical projects',
          'Gain relevant experience',
          'Network with industry professionals'
        ],
        confidenceInterval: 0.8,
        marketFactors: ['Industry demand trends', 'Skill market saturation', 'Economic indicators']
      };

      setTrajectory(newTrajectory);

      // Generate Maya's insights on the trajectory
      const request = `Analyze my career trajectory: Current CRI ${currentCRI}, target ${targetCRI}, estimated time ${newTrajectory.timeToTarget}. What market factors should I consider and how can I accelerate progress?`;
      
      const response = await sendEnhancedRequest(request);
      
      if (response) {
        const insight: CRIInsight = {
          type: 'career_advice',
          title: 'Career Trajectory Analysis',
          message: response.response,
          actionable: true,
          confidence: 0.85,
          priority: 'medium',
          suggestedAction: 'Review trajectory recommendations'
        };

        setInsights(prev => [insight, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error generating career trajectory:', error);
    }
  }, [userId, criScore, targetCRI, sendEnhancedRequest]);

  // Create intelligent workflow based on CRI gaps
  const createCRIWorkflow = useMutation({
    mutationFn: async (params: { targetRole: string; priority: 'high' | 'medium' | 'low' }) => {
      if (!userId || !criScore) throw new Error('User data required');

      const currentCRI = criScore.overall;
      const gap = targetCRI - currentCRI;

      const workflowData = {
        user_id: userId,
        workflow_type: 'cri_improvement',
        title: `CRI Improvement: ${params.targetRole}`,
        description: `Intelligent workflow to improve CRI from ${currentCRI} to ${targetCRI}`,
        target_outcome: `Achieve CRI score of ${targetCRI}`,
        priority: params.priority,
        context_data: {
          current_cri: currentCRI,
          target_cri: targetCRI,
          gap: gap,
          skill_gaps: Object.keys(criScore.breakdown || {}).filter(skill => !criScore.breakdown[skill]),
          target_role: params.targetRole
        },
        config: {
          auto_adjust: true,
          cri_tracking: true,
          milestone_alerts: true
        }
      };

      const { data, error } = await supabase
        .from('autonomous_workflows')
        .insert(workflowData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['autonomous-workflows'] });
      toast.success(`Created CRI improvement workflow: ${workflow.title}`);
      
      const insight: CRIInsight = {
        type: 'learning_path',
        title: 'CRI Workflow Created',
        message: `Maya has created an intelligent workflow to help you reach your CRI goal. The workflow will adapt based on your progress and market changes.`,
        actionable: true,
        confidence: 0.95,
        priority: 'high',
        suggestedAction: 'Follow workflow recommendations'
      };

      setInsights(prev => [insight, ...prev.slice(0, 4)]);
    },
    onError: (error) => {
      console.error('Error creating CRI workflow:', error);
      toast.error('Failed to create CRI workflow');
    }
  });

  // Real-time CRI monitoring
  const { data: criTrends } = useQuery({
    queryKey: ['cri-trends', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('ai_resume_drafts')
        .select('cri_average, created_at, improvement_suggestions')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return data || [];
    },
    enabled: !!userId,
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Monitor for CRI milestones
  useEffect(() => {
    if (criScore && criTrends && criTrends.length > 1) {
      const currentCRI = criScore.overall;
      const previousCRI = criTrends[1]?.cri_average || 0;
      const improvement = currentCRI - previousCRI;

      if (improvement >= 5) {
        const insight: CRIInsight = {
          type: 'career_advice',
          title: 'CRI Milestone Achieved!',
          message: `Congratulations! Your CRI improved by ${improvement.toFixed(1)} points. Maya detected this progress and suggests continuing with your current learning strategy.`,
          actionable: true,
          confidence: 1.0,
          priority: 'high',
          suggestedAction: 'Celebrate and continue learning'
        };

        setInsights(prev => [insight, ...prev.slice(0, 4)]);
        toast.success(`CRI improved by ${improvement.toFixed(1)} points!`);
      }
    }
  }, [criScore, criTrends]);

  return {
    // Data
    insights,
    trajectory,
    criTrends,
    
    // Functions
    generateCRIGuidance,
    analyzeCRISkillGaps,
    generateCareerTrajectory,
    createCRIWorkflow: createCRIWorkflow.mutate,
    
    // State
    isGeneratingGuidance: false,
    isCreatingWorkflow: createCRIWorkflow.isPending,
    
    // Computed
    hasInsights: insights.length > 0,
    highPriorityInsights: insights.filter(i => i.priority === 'high'),
    actionableInsights: insights.filter(i => i.actionable)
  };
}