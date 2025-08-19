/**
 * Cross-Hub Integration Hook
 * Manages data flow and triggers between Discover, Plan, Progress, and Contribute hubs
 */

import { useCallback } from 'react';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import { useEnhancedGoals } from '@/hooks/useEnhancedGoals';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useMayaCRIIntegration } from '@/hooks/useMayaCRIIntegration';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UnifiedRecommendation, RecoPriority } from '@/types/recommendations';
import { SaveToPlanItem } from '@/types/plan';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import type { SkillGap } from '@/types/skill';

// Re-export SkillGap type for components
export type { SkillGap };

export const useCrossHubIntegration = (userId?: string) => {
  const { state, actions } = useUnifiedData();
  const { userGoals, createGoal } = useEnhancedGoals(userId);
  const { getPersonalizedRecommendations, analyzeSkillGaps } = useEnhancedMaya();
  const { generateCRIGuidance } = useMayaCRIIntegration(userId);
  const queryClient = useQueryClient();

  // Add authentication check - if no userId, return disabled state
  if (!userId) {
    return {
      saveToPlan: () => {
        console.error('Cannot save to plan: No user authentication');
        toast.error('Please log in to save items to your plan');
      },
      isSavingToPlan: false,
      getContextualRecommendations: async () => [],
      onMilestoneCompleted: async () => {},
      checkContributeAccess: async () => false,
      createUnifiedGoal: async () => {},
      calculateCRIBoost: () => ({ boost: 0, explanation: '' }),
      refreshCrossHubData: () => {}
    };
  }

  // Recommendations are now handled by dedicated useUnifiedRecommendations hook

// Enhanced save to Plan with micro-goal creation and CRI boosting
  const saveToplanMutation = useMutation({
    mutationFn: async (item: SaveToPlanItem & { criBoost?: number; criExplanation?: string }) => {
      console.log('🔐 Attempting save with userId:', userId);
      
      if (!userId) {
        console.error('Save to plan failed: No user ID provided');
        throw new Error('Authentication required - please log in to save items');
      }

      // Verify Supabase session exists
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Save to plan failed: No active Supabase session');
        throw new Error('Session expired - please log in again');
      }

      // Check for CRI influence on this item
      const criBoost = item.criBoost || 0;
      const criExplanation = item.criExplanation || '';

      const { data, error } = await supabase
        .from('saved_plan_items')
        .insert({
          user_id: userId,
          item_type: item.type,
          item_id: item.id,
          title: item.title,
          description: item.description,
          metadata: item.metadata || {},
          priority: item.priority || 'medium',
          estimated_time_to_complete: item.timeEstimate,
          skill_tags: item.skillTags || [],
          added_from_hub: 'discover',
          status: 'pending',
          cri_boost_score: criBoost,
          cri_explanation: criExplanation
        })
        .select()
        .single();

      if (error) throw error;

      // The micro-goal creation is now handled by the database trigger
      // But we still need to trigger Maya analysis for recommendations
      if (item.skillTags && item.skillTags.length > 0) {
        await analyzeSkillGaps(item.title, item.skillTags);
      }

      return { ...data, criBoost, criExplanation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLAN_ITEMS(userId, undefined) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MICRO_GOALS(userId, undefined) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId, undefined) });
      
      let successMessage = `${data.title} saved to your Plan!`;
      if (data.criBoost && data.criBoost > 0) {
        successMessage += ` (CRI boosted +${Math.round(data.criBoost)}%)`;
      }
      
      toast.success(successMessage);
      
      // Show micro-goal creation notification
      setTimeout(() => {
        toast.info('Micro-goal created automatically! Check your Plan for next steps.');
      }, 1000);
      
      // Auto-navigate to Plan hub with specific tab
      if (data.item_type === 'course') {
        window.location.href = '/plan?tab=overview&highlight=' + data.id;
      } else if (data.item_type === 'career_path') {
        window.location.href = '/plan?tab=roadmap&highlight=' + data.id;
      } else {
        window.location.href = '/plan?tab=overview';
      }
    },
    onError: (error: any) => {
      console.error('Save to plan error:', error);
      toast.error('Failed to save to plan: ' + error.message);
    }
  });


  // Get dynamic recommendations based on user's context
  const getContextualRecommendations = useCallback(async () => {
    if (!userId) return [];

    try {
      const recommendations = await getPersonalizedRecommendations();
      // Note: Cannot use hooks inside callbacks - this would need to be refactored
      
      // Combine Maya recommendations with skill gap analysis
      const contextualRecs = [
        ...(Array.isArray(recommendations) ? recommendations : []),
        // TODO: refactor to get skillGaps from outside the callback
      ];

      return contextualRecs;
    } catch (error) {
      console.error('Error getting contextual recommendations:', error);
      return [];
    }
  }, [userId, getPersonalizedRecommendations]);

  // Centralized query invalidation for cross-hub triggers
  const refreshCrossHubData = useCallback(() => {
    if (!userId) return;
    
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SKILL_GAPS(userId, undefined) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId, undefined) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLAN_ITEMS(userId, undefined) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MICRO_GOALS(userId, undefined) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CELEBRATION_MOMENTS(userId, undefined) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMIFICATION_DATA(userId, undefined) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SMART_DASHBOARD(userId, undefined) });
  }, [userId, queryClient]);

  // Enhanced milestone completion with cross-hub triggers
  const onMilestoneCompleted = useCallback(async (milestoneData: any) => {
    if (!userId) return;

    try {
      // Award XP and update progress
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_type: 'milestone_completed',
        milestone_id: milestoneData.id,
        xp_awarded: 50,
        created_at: new Date().toISOString()
      });

      // Create celebration moment
      await supabase.from('celebration_moments').insert({
        user_id: userId,
        celebration_type: 'milestone_completed',
        trigger_data: {
          milestone_id: milestoneData.id,
          milestone_title: milestoneData.title,
          xp_awarded: 50
        },
        celebration_data: {
          type: 'confetti',
          duration: 3000,
          message: `Milestone completed: ${milestoneData.title}!`
        }
      });

      // Create completion trigger for next step recommendations
      await supabase.from('completion_triggers').insert({
        user_id: userId,
        trigger_type: 'milestone_completed',
        source_data: {
          milestone_id: milestoneData.id,
          milestone_title: milestoneData.title,
          skills_unlocked: milestoneData.skills || []
        },
        target_action: 'create_recommendation'
      });

      // Check if this unlocks new Discover content
      const newRecommendations = await getContextualRecommendations();
      
      if (newRecommendations.length > 0) {
        toast.success('Milestone completed! New recommendations available.');
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SKILL_GAPS(userId, undefined) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId, undefined) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CELEBRATION_MOMENTS(userId, undefined) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMIFICATION_DATA(userId, undefined) });
      
    } catch (error) {
      console.error('Error handling milestone completion:', error);
    }
  }, [userId, getContextualRecommendations, queryClient]);

  // Check if user qualifies for Contribute hub access
  const checkContributeAccess = useCallback(async () => {
    if (!userId) return false;

    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    const totalXP = achievements?.reduce((sum, ach) => sum + (ach.xp_awarded || 0), 0) || 0;
    const completedGoals = userGoals?.filter(g => 
      g.goal_progress?.every((p: any) => p.completed)
    ).length || 0;

    // Unlock Contribute if user has 500+ XP or completed 2+ goals
    return totalXP >= 500 || completedGoals >= 2;
  }, [userId, userGoals]);

  // Create unified goal from multiple sources
  const createUnifiedGoal = useCallback(async (goalData: {
    title: string;
    description?: string;
    targetRole?: string;
    skillGaps?: string[];
    timeframe?: string;
    sources: string[]; // e.g., ['discover_course', 'maya_recommendation']
  }) => {
    if (!userId) return;

    try {
      await createGoal({
        title: goalData.title,
        description: goalData.description,
        target_role: goalData.targetRole,
        target_date: goalData.timeframe ? 
          new Date(Date.now() + parseInt(goalData.timeframe) * 24 * 60 * 60 * 1000).toISOString() : 
          undefined,
        skill_gaps: goalData.skillGaps
      });

      // Set this as current goal in unified context
      actions.setCurrentGoal(goalData.title);
      
      toast.success('Goal created and set as your current focus!');
    } catch (error) {
      console.error('Error creating unified goal:', error);
      toast.error('Failed to create goal');
    }
  }, [userId, createGoal, actions]);

  // Enhanced CRI boost calculation for items
  const calculateCRIBoost = useCallback((item: SaveToPlanItem, userSkillGaps: SkillGap[]) => {
    if (!item.skillTags || !userSkillGaps.length) return { boost: 0, explanation: '' };
    
    const relevantGaps = userSkillGaps.filter(gap => 
      item.skillTags?.includes(gap.skill)
    );
    
    if (relevantGaps.length === 0) return { boost: 0, explanation: '' };
    
    const highPriorityGaps = relevantGaps.filter(gap => 
      gap.priority === 'critical' || gap.priority === 'high'
    );
    
    let boost = relevantGaps.length * 5; // 5% per relevant skill gap
    if (highPriorityGaps.length > 0) {
      boost += highPriorityGaps.length * 10; // Extra 10% for high-priority gaps
    }
    
    const explanation = `Addresses ${relevantGaps.length} skill gap${relevantGaps.length > 1 ? 's' : ''}: ${relevantGaps.map(g => g.skill).join(', ')}`;
    
    return { boost: Math.min(boost, 50), explanation }; // Cap at 50%
  }, []);

  return {
    // Save to Plan
    saveToPlan: (item: SaveToPlanItem) => {
      if (!userId) {
        console.error('Cannot save to plan: No user ID provided');
        throw new Error('User authentication required');
      }
      
      // Calculate CRI boost before saving - use empty array if no skillGaps available
      const { boost, explanation } = calculateCRIBoost(item, []);
      
      console.log('🎯 Saving to plan:', { item, userId, boost, explanation });
      
      saveToplanMutation.mutate({
        ...item,
        criBoost: boost,
        criExplanation: explanation
      });
    },
    isSavingToPlan: saveToplanMutation.isPending,
    
    
    // Contextual Recommendations
    getContextualRecommendations,
    
    // Cross-hub triggers
    onMilestoneCompleted,
    checkContributeAccess,
    
    // Unified Goals
    createUnifiedGoal,
    
    // CRI boost calculation
    calculateCRIBoost,
    
    // Data refresh
    refreshCrossHubData
  };
};