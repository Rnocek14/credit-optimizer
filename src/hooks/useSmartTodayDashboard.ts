import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCrossHubIntegration } from './useCrossHubIntegration';
import { useIntelligenceLayer } from './useIntelligenceLayer';
import { useGamification } from './useGamification';
import type { IntelligenceRecommendation } from '@/shared/types/intelligence';
import { SaveToPlanItem } from '@/types/plan';
import type { RecoType } from '@/types/recommendations';
import { telemetry } from '@/lib/telemetry';

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
  criExplanation?: string;
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

export function useSmartTodayDashboard(userId?: string, trackId?: string) {
  // ── Intelligence Layer replaces useUnifiedRecommendations + useSkillGaps ──
  const {
    recommendations,
    topRecommendation,
    quickWins: intelligenceQuickWins,
    criticalGaps,
    skillGaps,
    isLoading: isLoadingIntelligence,
  } = useIntelligenceLayer(userId, trackId);

  // Dev-only: confirm track-scoped intelligence pipe at runtime
  if (import.meta.env.DEV) {
    console.debug('[Today:Intelligence]', {
      userId,
      trackId,
      recCount: recommendations.length,
      quickWins: intelligenceQuickWins.length,
      criticalGaps: criticalGaps.length,
    });
  }

  const { saveToPlan } = useCrossHubIntegration();
  
  const { 
    getCurrentStreak, 
    metrics, 
    isLoading: isLoadingGamification 
  } = useGamification(userId);

  const [lastActivityDate, setLastActivityDate] = useState<Date | null>(null);

  // Calculate next step from top recommendation (use layer's precomputed topRecommendation)
  const nextStep = useMemo((): SmartNextStep | null => {
    const topRec = topRecommendation ?? recommendations[0] ?? null;
    if (!topRec) return null;

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
      criBoost: topRec.criContribution ? Math.round(topRec.criContribution * 100) : undefined,
      criExplanation: topRec.criExplanation,
    };
  }, [topRecommendation, recommendations]);

  // Quick wins — delegate to intelligence layer, just truncate + map shape
  const quickWins = useMemo((): QuickWin[] => {
    return intelligenceQuickWins.slice(0, 3).map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      timeEstimate: rec.timeEstimate || '30 min',
      priority: rec.priority,
      type: rec.type,
      actions: rec.actions,
      criBoost: rec.criContribution ? Math.round(rec.criContribution * 100) : undefined,
      criExplanation: rec.criExplanation,
    }));
  }, [intelligenceQuickWins]);

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
    
    const skillName = typeof firstSkillGap === 'string' 
      ? firstSkillGap 
      : firstSkillGap.skill || 'a core skill';
    
    return {
      daysSinceActivity: daysSince,
      suggestedTask: firstSkillGap
        ? `Practice ${skillName} basics`
        : 'Do a 10-min warmup',
      timeEstimate: '15 min',
      type: 'skill_practice'
    };
  }, [lastActivityDate, skillGaps]);

  // Get current streak data
  const currentStreak = getCurrentStreak ? getCurrentStreak() : 0;

  // Handle actions with cross-hub sync
  const handleNextStepAction = useCallback(async (action: SmartNextStep['actions'][0]) => {
    if (!nextStep || !userId) return;
    
    try {
      // Track CTA click
      telemetry.feedCtaClick(userId, nextStep.id, 'today', nextStep.type);
      
      if (action.on === 'plan') {
        const payload: SaveToPlanItem = {
          type: 'quick_win',
          id: nextStep.id,
          title: nextStep.title,
          description: nextStep.description,
          timeEstimate: nextStep.timeEstimate,
          metadata: { 
            source: 'today_dashboard', 
            recommendation_id: nextStep.id 
          }
        };
        
        // Track save to plan with CRI boost if available
        telemetry.saveToPlan(userId, 'quick_win', 'today_dashboard', nextStep.criBoost);
        
        await saveToPlan(payload);
      }
      
      // Navigate if href provided
      if (action.href) {
        window.location.href = action.href;
      }
    } catch (error) {
      console.error('Error handling next step action:', error);
    }
  }, [nextStep, userId, saveToPlan]);

  const handleQuickWinAction = useCallback(async (quickWin: QuickWin, action: QuickWin['actions'][0]) => {
    if (!userId) return;
    
    try {
      // Track quick win start
      telemetry.quickWinStart(userId, quickWin.id);
      
      if (action.on === 'plan') {
        const payload: SaveToPlanItem = {
          type: 'quick_win',
          id: quickWin.id,
          title: quickWin.title,
          description: quickWin.description,
          timeEstimate: quickWin.timeEstimate,
          metadata: {
            source: 'today_dashboard_quick_win',
            priority: quickWin.priority
          }
        };
        
        // Track save to plan with CRI boost if available
        telemetry.saveToPlan(userId, 'quick_win', 'today_dashboard_quick_win', quickWin.criBoost);
        
        await saveToPlan(payload);
      }
      
      if (action.href) {
        window.location.href = action.href;
      }
    } catch (error) {
      console.error('Error handling quick win action:', error);
    }
  }, [userId, saveToPlan]);

  const handleUnstickAction = useCallback(async () => {
    if (!unstickData || !userId) return;
    
    try {
      // Track unstick creation
      telemetry.unstickCreated(userId, unstickData.daysSinceActivity);
      
      const payload: SaveToPlanItem = {
        type: 'micro_task',
        id: `unstick-${Date.now()}`,
        title: unstickData.suggestedTask,
        description: 'Quick task to get back on track',
        timeEstimate: unstickData.timeEstimate,
        metadata: {
          source: 'unstick_suggestion',
          days_inactive: unstickData.daysSinceActivity
        }
      };
      
      // Track save to plan
      telemetry.saveToPlan(userId, 'micro_task', 'unstick_suggestion');
      
      await saveToPlan(payload);
    } catch (error) {
      console.error('Error handling unstick action:', error);
    }
  }, [unstickData, userId, saveToPlan]);

  // Check for user activity data and emit telemetry for next step
  useEffect(() => {
    // TODO: Replace with actual last activity check from user data
    // For now, simulate based on current streak
    if (currentStreak === 0) {
      setLastActivityDate(new Date(Date.now() - (4 * 24 * 60 * 60 * 1000))); // 4 days ago
    } else {
      setLastActivityDate(new Date()); // Active
    }
  }, [currentStreak]);

  // Track next step rendering
  useEffect(() => {
    if (nextStep && userId) {
      telemetry.nextStepRendered(userId, nextStep.id, nextStep.type);
    }
  }, [nextStep, userId]);

  return {
    nextStep,
    quickWins,
    currentStreak,
    unstickData,
    isLoading: isLoadingIntelligence || isLoadingGamification,
    actions: {
      handleNextStepAction,
      handleQuickWinAction,
      handleUnstickAction
    }
  };
}

function getActionsForType(
  type: RecoType, 
  originalActions: IntelligenceRecommendation['actions']
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