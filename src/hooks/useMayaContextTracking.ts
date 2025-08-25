import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

export function useMayaContextTracking() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });
  const sessionId = useRef(crypto.randomUUID());
  const pageStartTime = useRef(Date.now());

  const trackContext = useCallback(async (
    contextType: string, 
    contextData: any
  ) => {
    if (!user?.id) return;

    try {
      await supabase.functions.invoke('maya-context-processor', {
        body: {
          userId: user.id,
          contextType,
          contextData: {
            ...contextData,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          sessionId: sessionId.current
        }
      });
    } catch (error) {
      console.warn('Context tracking failed:', error);
      // Fail silently to not interrupt user experience
    }
  }, [user?.id]);

  // Track page visits
  const trackPageVisit = useCallback((page: string, additionalData?: any) => {
    trackContext('page_visit', {
      page,
      referrer: document.referrer,
      ...additionalData
    });
    pageStartTime.current = Date.now();
  }, [trackContext]);

  // Track time spent on page
  const trackTimeSpent = useCallback((page: string) => {
    const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000 / 60); // minutes
    if (timeSpent > 0) {
      trackContext('time_spent', {
        page,
        minutes: timeSpent
      });
    }
  }, [trackContext]);

  // Track course interactions
  const trackCourseInteraction = useCallback((action: string, courseId: string, additionalData?: any) => {
    trackContext('course_interaction', {
      action,
      course_id: courseId,
      ...additionalData
    });
  }, [trackContext]);

  // Track goal progress
  const trackGoalProgress = useCallback((goalId: string, progressChange: number, additionalData?: any) => {
    trackContext('goal_progress', {
      goal_id: goalId,
      progress_change: progressChange,
      ...additionalData
    });
  }, [trackContext]);

  // Track learning milestones
  const trackMilestone = useCallback((milestoneType: string, milestoneData: any) => {
    trackContext('milestone', {
      milestone_type: milestoneType,
      ...milestoneData
    });
  }, [trackContext]);

  // Track user engagement patterns
  const trackEngagement = useCallback((engagementType: string, engagementData: any) => {
    trackContext('engagement', {
      engagement_type: engagementType,
      ...engagementData
    });
  }, [trackContext]);

  // Track when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackTimeSpent(window.location.pathname);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackTimeSpent(window.location.pathname);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      trackTimeSpent(window.location.pathname);
    };
  }, [trackTimeSpent]);

  return {
    trackContext,
    trackPageVisit,
    trackTimeSpent,
    trackCourseInteraction,
    trackGoalProgress,
    trackMilestone,
    trackEngagement,
    sessionId: sessionId.current
  };
}