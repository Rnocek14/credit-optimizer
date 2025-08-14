import { useState, useEffect, useMemo } from 'react';
import { useCrossHubIntegration } from './useCrossHubIntegration';
import { useGamification } from './useGamification';
import { UnifiedRecommendation } from '@/types/recommendations';

export interface QuickWin {
  id: string;
  title: string;
  description: string;
  timeEstimate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'skill_gap' | 'maya_action' | 'market_alert' | 'proof_project';
  actions: Array<{
    label: string;
    href?: string;
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: Record<string, string | number | boolean>;
  }>;
  criBoost?: number;
}

export interface SmartNextStep {
  id: string;
  title: string;
  description: string;
  progress?: number;
  timeEstimate?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  type: 'skill_gap' | 'maya_action' | 'market_alert' | 'proof_project';
  actions: Array<{
    label: string;
    href?: string;
    on?: 'discover' | 'plan' | 'progress' | 'contribute';
    params?: Record<string, string | number | boolean>;
  }>;
  criBoost?: number;
  criExplanation?: string;
}

export interface UnstickData {
  daysSinceActivity: number;
  suggestedTask: string;
  timeEstimate: string;
  type: 'skill_practice' | 'quick_learn' | 'micro_project';
}

export function useSmartTodayDashboard(userId?: string) {
  const { 
    recommendations, 
    isLoading: isLoadingRecommendations,
    skillGaps,
    saveToPlan 
  } = useCrossHubIntegration();
  
  const { 
    getCurrentStreak, 
    metrics, 
    isLoading: isLoadingGamification 
  } = useGamification(userId);

  const [lastActivityDate, setLastActivityDate] = useState<Date | null>(null);

  // Calculate next step from top recommendation
  const nextStep = useMemo((): SmartNextStep | null => {
    if (!recommendations || recommendations.length === 0) return null;
    
    const topRec = recommendations[0];
    return {
      id: topRec.id,
      title: topRec.title,
      description: topRec.description,
      progress: topRec.progress,
      timeEstimate: topRec.timeEstimate,
      difficulty: topRec.priority === 'critical' ? 'advanced' : 
                 topRec.priority === 'high' ? 'intermediate' : 'beginner',
      type: topRec.type,
      actions: getActionsForType(topRec.type, topRec.actions),
      criBoost: topRec.criBoost,
      criExplanation: topRec.criExplanation
    };
  }, [recommendations]);

  // Filter and rank quick wins (30-60 min tasks)
  const quickWins = useMemo((): QuickWin[] => {
    if (!recommendations) return [];
    
    return recommendations
      .filter(rec => {
        if (!rec.timeEstimate) return false;
        const timeStr = rec.timeEstimate.toLowerCase();
        // Check for quick tasks: 30 min, 45 min, 1 hr, etc.
        return timeStr.includes('min') || 
               (timeStr.includes('hr') && (timeStr.includes('1') || timeStr.includes('0.5')));
      })
      .slice(1, 4) // Skip first item (it's the next step)
      .map(rec => ({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        timeEstimate: rec.timeEstimate || '30 min',
        priority: rec.priority,
        type: rec.type,
        actions: rec.actions,
        criBoost: rec.criBoost
      }));
  }, [recommendations]);

  // Check for inactivity and generate unstick suggestions
  const unstickData = useMemo((): UnstickData | null => {
    if (!lastActivityDate) return null;
    
    const daysSince = Math.floor(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSince < 3) return null;
    
    // Generate micro-task based on skill gaps
    const firstSkillGap = skillGaps?.[0];
    if (!firstSkillGap) return null;
    
    return {
      daysSinceActivity: daysSince,
      suggestedTask: `Practice ${firstSkillGap} basics`,
      timeEstimate: '15 min',
      type: 'skill_practice'
    };
  }, [lastActivityDate, skillGaps]);

  // Get current streak data
  const currentStreak = getCurrentStreak ? getCurrentStreak() : 0;

  // Handle actions with cross-hub sync
  const handleNextStepAction = async (action: SmartNextStep['actions'][0]) => {
    if (!nextStep) return;
    
    try {
      if (action.on === 'plan' && action.params?.courseId) {
        await saveToPlan({
          type: 'course',
          id: action.params.courseId as string,
          title: nextStep.title,
          description: nextStep.description,
          skillTags: [],
          metadata: {
            source: 'today_dashboard',
            recommendation_id: nextStep.id,
            timeEstimate: nextStep.timeEstimate
          }
        });
      }
      
      // Navigate if href provided
      if (action.href) {
        window.location.href = action.href;
      }
    } catch (error) {
      console.error('Error handling next step action:', error);
    }
  };

  const handleQuickWinAction = async (quickWin: QuickWin, action: QuickWin['actions'][0]) => {
    try {
      if (action.on === 'plan') {
        await saveToPlan({
          type: 'skill',
          id: quickWin.id,
          title: quickWin.title,
          description: quickWin.description,
          skillTags: [],
          metadata: {
            source: 'today_dashboard_quick_win',
            priority: quickWin.priority,
            timeEstimate: quickWin.timeEstimate
          }
        });
      }
      
      if (action.href) {
        window.location.href = action.href;
      }
    } catch (error) {
      console.error('Error handling quick win action:', error);
    }
  };

  const handleUnstickAction = async () => {
    if (!unstickData) return;
    
    try {
      await saveToPlan({
        type: 'skill',
        id: `unstick-${Date.now()}`,
        title: unstickData.suggestedTask,
        description: `Quick task to get back on track`,
        skillTags: skillGaps?.slice(0, 1).map(gap => gap.skill) || [],
        metadata: {
          source: 'unstick_suggestion',
          days_inactive: unstickData.daysSinceActivity,
          timeEstimate: unstickData.timeEstimate
        }
      });
    } catch (error) {
      console.error('Error handling unstick action:', error);
    }
  };

  // Check for user activity data
  useEffect(() => {
    // TODO: Replace with actual last activity check from user data
    // For now, simulate based on current streak
    if (currentStreak === 0) {
      setLastActivityDate(new Date(Date.now() - (4 * 24 * 60 * 60 * 1000))); // 4 days ago
    } else {
      setLastActivityDate(new Date()); // Active
    }
  }, [currentStreak]);

  return {
    nextStep,
    quickWins,
    currentStreak,
    unstickData,
    isLoading: isLoadingRecommendations || isLoadingGamification,
    actions: {
      handleNextStepAction,
      handleQuickWinAction,
      handleUnstickAction
    }
  };
}

function getActionsForType(
  type: UnifiedRecommendation['type'], 
  originalActions: UnifiedRecommendation['actions']
): SmartNextStep['actions'] {
  switch (type) {
    case 'skill_gap':
      return [
        { label: 'Find Courses', on: 'discover', params: { filter: 'skill-gaps' } },
        { label: 'Start Project', on: 'contribute', params: { type: 'skill-practice' } }
      ];
    case 'maya_action':
      return [
        { label: 'Open Workflow', on: 'progress', params: { tab: 'workflows' } },
        { label: 'Take Next Step', on: 'plan' }
      ];
    case 'market_alert':
      return [
        { label: 'View Insights', on: 'discover', params: { tab: 'market' } },
        { label: 'Explore Roles', on: 'discover', params: { filter: 'jobs' } }
      ];
    case 'proof_project':
      return [
        { label: 'Plan Project', on: 'plan' },
        { label: 'Add to Resume', on: 'progress', params: { tab: 'resume' } }
      ];
    default:
      return originalActions;
  }
}