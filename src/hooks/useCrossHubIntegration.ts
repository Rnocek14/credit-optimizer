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

  // Use the dedicated skill gaps hook for production-ready detection
  const skillGapsQuery = useSkillGaps(userId);

  // Unified recommendations query
  const unifiedRecommendationsQuery = useQuery({
    queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId),
    queryFn: async (): Promise<UnifiedRecommendation[]> => {
      if (!userId) return [];

      try {
        const recommendations: UnifiedRecommendation[] = [];

        // Get skill gaps and apply CRI boosting
        const skillGaps = skillGapsQuery.data || [];
        console.log('Skill gaps detected:', skillGaps.length, skillGaps);
        
        skillGaps.forEach((gap, index) => {
          const priorityScore = gap.priority === 'critical' ? 4 : 
                               gap.priority === 'high' ? 3 :
                               gap.priority === 'medium' ? 2 : 1;
          
          // Calculate CRI boost for skill gap recommendations
          let criBoost = priorityScore * 5; // Base boost of 5% per priority level
          if (gap.priority === 'critical') criBoost += 15; // Extra boost for critical gaps
          if (gap.priority === 'high') criBoost += 10; // Extra boost for high priority gaps
          
          recommendations.push({
            id: `skill-gap-${index}`,
            type: 'skill_gap',
            title: `Close ${gap.skill} gap`,
            description: `You need ${gap.skill} for your career goals`,
            priority: gap.priority,
            reason: `Required for your target role - CRI boosted +${criBoost}%`,
            timeEstimate: gap.estimatedTimeToClose,
            skills: [gap.skill],
            actions: [
              {
                label: 'Find Courses',
                href: `/discover?skills=${gap.skill}&filter=skill-gaps`,
                testId: 'reco-action-find-courses'
              },
              {
                label: 'Find Mentors',
                href: `/discover?tab=mentors&skill=${gap.skill}`
              },
              {
                label: 'Take Next Step',
                href: '/plan?tab=roadmap'
              }
            ],
            createdAt: new Date().toISOString(),
            score: (priorityScore * 1.2) + (criBoost / 10), // Boost score based on CRI
            criBoost,
            criExplanation: `Addresses critical skill gap in ${gap.skill} required for your career goals`
          });
        });

        // Get Maya recommendations (mock data for now)
        if (recommendations.length < 5) {
          recommendations.push({
            id: 'maya-action-1',
            type: 'maya_action',
            title: 'Complete Python Fundamentals',
            description: 'Maya recommends focusing on Python basics',
            priority: 'high',
            reason: 'Maya recommends based on your learning pattern',
            timeEstimate: '2-3 hrs',
            progress: 65,
            skills: ['Python'],
            actions: [
              {
                label: 'Take Next Step',
                href: '/plan?tab=roadmap',
                testId: 'reco-action-next-step'
              },
              {
                label: 'Open Workflow',
                href: '/plan?tab=workflows'
              }
            ],
            createdAt: new Date().toISOString(),
            score: 3.5
          });
        }

        // Get proof project suggestions
        if (recommendations.length < 7) {
          recommendations.push({
            id: 'proof-project-1',
            type: 'proof_project',
            title: 'Build Customer Churn Prediction Model',
            description: 'Demonstrate your machine learning skills',
            priority: 'medium',
            reason: 'High impact project for data science roles',
            timeEstimate: '2-3 weeks',
            skills: ['Python', 'Pandas', 'Scikit-learn'],
            actions: [
              {
                label: 'Plan Project',
                href: '/plan?tab=proof'
              },
              {
                label: 'Add to Resume',
                href: '/progress?tab=resume'
              }
            ],
            createdAt: new Date().toISOString(),
            score: 2.8
          });
        }

        // Get market alerts
        if (recommendations.length < 8) {
          recommendations.push({
            id: 'market-alert-1',
            type: 'market_alert',
            title: 'Data Science Demand Rising',
            description: 'Market demand for data scientists up 15%',
            priority: 'medium',
            reason: 'Boosted by market demand +15%',
            skills: ['Python', 'Machine Learning', 'Statistics'],
            actions: [
              {
                label: 'View Insights',
                href: '/discover?tab=market'
              },
              {
                label: 'Explore Roles',
                href: '/discover?tab=careers&role=data-scientist'
              }
            ],
            createdAt: new Date().toISOString(),
            score: 2.5
          });
        }

        // Sort by score (descending), then by priority, then by date
        const sortedRecommendations = recommendations.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score;
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          if (aPriority !== bPriority) return bPriority - aPriority;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        console.log('Generated recommendations by type:', {
          skill_gap: sortedRecommendations.filter(r => r.type === 'skill_gap').length,
          maya_action: sortedRecommendations.filter(r => r.type === 'maya_action').length,
          market_alert: sortedRecommendations.filter(r => r.type === 'market_alert').length,
          proof_project: sortedRecommendations.filter(r => r.type === 'proof_project').length,
          total: sortedRecommendations.length
        });
        
        return sortedRecommendations;

      } catch (error) {
        console.error('Error fetching unified recommendations:', error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

// Enhanced save to Plan with micro-goal creation and CRI boosting
  const saveToplanMutation = useMutation({
    mutationFn: async (item: SaveToPlanItem & { criBoost?: number; criExplanation?: string }) => {
      if (!userId) throw new Error('User ID required');

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLAN_ITEMS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MICRO_GOALS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId) });
      
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
      const skillGaps = skillGapsQuery.data || [];
      
      // Combine Maya recommendations with skill gap analysis
      const contextualRecs = [
        ...(Array.isArray(recommendations) ? recommendations : []),
        ...skillGaps.map(gap => ({
          type: 'skill_gap',
          title: `Close ${gap.skill} gap`,
          description: `You need ${gap.skill} for your career goals`,
          priority: gap.priority,
          actions: gap.suggestedActions,
          hubTarget: 'discover',
          filters: { skills: [gap.skill] }
        }))
      ];

      return contextualRecs;
    } catch (error) {
      console.error('Error getting contextual recommendations:', error);
      return [];
    }
  }, [userId, getPersonalizedRecommendations, skillGapsQuery.data]);

  // Centralized query invalidation for cross-hub triggers
  const refreshCrossHubData = useCallback(() => {
    if (!userId) return;
    
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SKILL_GAPS(userId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLAN_ITEMS(userId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MICRO_GOALS(userId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CELEBRATION_MOMENTS(userId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMIFICATION_DATA(userId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SMART_DASHBOARD(userId) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SKILL_GAPS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.UNIFIED_RECOMMENDATIONS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CELEBRATION_MOMENTS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GAMIFICATION_DATA(userId) });
      
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
      // Calculate CRI boost before saving
      const skillGaps = skillGapsQuery.data || [];
      const { boost, explanation } = calculateCRIBoost(item, skillGaps);
      
      saveToplanMutation.mutate({
        ...item,
        criBoost: boost,
        criExplanation: explanation
      });
    },
    isSavingToPlan: saveToplanMutation.isPending,
    
    // Skill Gap Detection
    skillGaps: skillGapsQuery.data || [],
    isAnalyzingSkillGaps: skillGapsQuery.isLoading,
    
    // Unified Recommendations with CRI boosting
    recommendations: unifiedRecommendationsQuery.data || [],
    isLoading: unifiedRecommendationsQuery.isLoading,
    
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