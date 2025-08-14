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

export interface SaveToPlanItem {
  type: 'course' | 'career_path' | 'mentor' | 'skill' | 'project';
  id: string;
  title: string;
  description?: string;
  metadata?: any;
  priority?: 'high' | 'medium' | 'low';
  estimatedTimeToComplete?: string;
  skillTags?: string[];
}

export interface SkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedActions: string[];
  estimatedTimeToClose: string;
}

export const useCrossHubIntegration = (userId?: string) => {
  const { state, actions } = useUnifiedData();
  const { userGoals, createGoal } = useEnhancedGoals(userId);
  const { getPersonalizedRecommendations, analyzeSkillGaps } = useEnhancedMaya();
  const { generateCRIGuidance } = useMayaCRIIntegration(userId);
  const queryClient = useQueryClient();

  // Save items from Discover to Plan
  const saveToplanMutation = useMutation({
    mutationFn: async (item: SaveToPlanItem) => {
      if (!userId) throw new Error('User ID required');

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
          estimated_time_to_complete: item.estimatedTimeToComplete,
          skill_tags: item.skillTags || [],
          added_from_hub: 'discover',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger Maya analysis for recommendations
      if (item.skillTags && item.skillTags.length > 0) {
        await analyzeSkillGaps(item.title, item.skillTags);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan-items', userId] });
      toast.success(`${data.title} saved to your Plan!`);
      
      // Auto-navigate to Plan hub with specific tab
      if (data.item_type === 'course') {
        window.location.href = '/plan?tab=learning&highlight=' + data.id;
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

  // Detect skill gaps based on user's goals and current progress
  const detectSkillGapsQuery = useQuery({
    queryKey: ['skill-gaps', userId, userGoals],
    queryFn: async (): Promise<SkillGap[]> => {
      if (!userId || !userGoals?.length) return [];

      // Get user's current skills from profile and completed courses
      const [profileResponse, coursesResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, role')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('course_progress')
          .select('course_id')
          .eq('user_id', userId)
          .eq('status', 'completed')
      ]);

      const currentSkills = new Set([
        // Mock skills for demonstration
        'JavaScript', 'React', 'Node.js'
      ]);

      // Analyze gaps for each goal
      const gaps: SkillGap[] = [];
      
      for (const goal of userGoals) {
        if (goal.target_role) {
          // Get required skills for target role
          const { data: roleSkills } = await supabase
            .from('career_paths')
            .select('key_skills')
            .eq('title', goal.target_role)
            .single();

          if (roleSkills?.key_skills) {
            for (const skill of roleSkills.key_skills) {
              if (!currentSkills.has(skill)) {
                gaps.push({
                  skill,
                  currentLevel: 0,
                  targetLevel: 3, // Intermediate level
                  priority: 'high',
                  suggestedActions: [
                    `Find courses for ${skill}`,
                    `Practice ${skill} through projects`,
                    `Connect with mentors in ${skill}`
                  ],
                  estimatedTimeToClose: '2-3 months'
                });
              }
            }
          }
        }
      }

      return gaps;
    },
    enabled: !!userId && !!userGoals?.length,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Get dynamic recommendations based on user's context
  const getContextualRecommendations = useCallback(async () => {
    if (!userId) return [];

    try {
      const recommendations = await getPersonalizedRecommendations();
      const skillGaps = detectSkillGapsQuery.data || [];
      
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
  }, [userId, getPersonalizedRecommendations, detectSkillGapsQuery.data]);

  // Progress milestone completion triggers
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

      // Check if this unlocks new Discover content
      const newRecommendations = await getContextualRecommendations();
      
      if (newRecommendations.length > 0) {
        toast.success('Milestone completed! New recommendations available in Discover.');
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['skill-gaps', userId] });
      queryClient.invalidateQueries({ queryKey: ['recommendations', userId] });
      
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

  return {
    // Save to Plan
    saveToPlan: saveToplanMutation.mutate,
    isSavingToPlan: saveToplanMutation.isPending,
    
    // Skill Gap Detection
    skillGaps: detectSkillGapsQuery.data || [],
    isAnalyzingSkillGaps: detectSkillGapsQuery.isLoading,
    
    // Contextual Recommendations
    getContextualRecommendations,
    
    // Cross-hub triggers
    onMilestoneCompleted,
    checkContributeAccess,
    
    // Unified Goals
    createUnifiedGoal,
    
    // Data refresh
    refreshCrossHubData: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-gaps', userId] });
      queryClient.invalidateQueries({ queryKey: ['plan-items', userId] });
      actions.refreshAllData();
    }
  };
};