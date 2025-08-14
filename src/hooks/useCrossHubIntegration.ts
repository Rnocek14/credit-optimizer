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

  // Unified recommendations query
  const unifiedRecommendationsQuery = useQuery({
    queryKey: ['unified-recommendations', userId, detectSkillGapsQuery.data],
    queryFn: async (): Promise<UnifiedRecommendation[]> => {
      if (!userId) return [];

      try {
        const recommendations: UnifiedRecommendation[] = [];

        // Get skill gaps
        const skillGaps = detectSkillGapsQuery.data || [];
        skillGaps.forEach((gap, index) => {
          const priorityScore = gap.priority === 'critical' ? 4 : 
                               gap.priority === 'high' ? 3 :
                               gap.priority === 'medium' ? 2 : 1;
          
          recommendations.push({
            id: `skill-gap-${index}`,
            type: 'skill_gap',
            title: `Close ${gap.skill} gap`,
            description: `You need ${gap.skill} for your career goals`,
            priority: gap.priority,
            reason: `Required for your target role`,
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
            score: priorityScore * 1.2 // Boost skill gaps
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
        return recommendations.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score;
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          if (aPriority !== bPriority) return bPriority - aPriority;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      } catch (error) {
        console.error('Error fetching unified recommendations:', error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

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
    
    // Unified Recommendations
    recommendations: unifiedRecommendationsQuery.data || [],
    isLoading: unifiedRecommendationsQuery.isLoading,
    
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
      queryClient.invalidateQueries({ queryKey: ['unified-recommendations', userId] });
      actions.refreshAllData();
    }
  };
};