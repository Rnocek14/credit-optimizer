import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  CRIRequest, 
  CRIResponse, 
  RecoRequest, 
  RecoResponse,
  CIRecommendation,
  UUID 
} from '@/types/course-intelligence';

// Legacy interface for backward compatibility
interface CourseRecommendation {
  courseId: string;
  title: string;
  description?: string;
  url?: string;
  platform: string;
  instructor?: string;
  estimatedHours?: number;
  cost?: number;
  difficulty?: string;
  score: number;
  scoreBreakdown: {
    difficulty: number;
    instructor: number;
    platform: number;
    skillCoverage: number;
  };
  reasons: string[];
  skillsCovered: string[];
}

interface CRIBreakdown {
  currentCRI: number;
  targetCRI: number;
  criGap: number;
  skillContributions: Record<string, number>;
  skillGaps: Array<{
    skill: string;
    currentLevel: number;
    targetLevel: number;
    gap: number;
  }>;
  recommendations: Array<{
    skill: string;
    recommendedAction: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: number;
  }>;
  courseContributions: any[];
  lastCalculated: string;
  completedCoursesCount: number;
}

// Export types for other components (updated to match existing usage)
export interface DiscoveredCourse {
  id: string;
  title: string;
  platform: string;
  url?: string;
  analysis?: any;
  // Additional properties expected by existing code
  queueId?: string;
  difficulty?: number;
  duration_hours?: number;
  description?: string;
  skill_tags?: string[];
  priorityScore?: number;
  has_projects?: boolean;
}

export interface LearningPath {
  id: string;
  name: string;
  description?: string;
  courses: CourseRecommendation[];
  // Additional properties expected by existing code
  path_name?: string;
  path_description?: string;
  average_outcome_score?: number;
  target_career?: string;
  skill_level?: string;
  estimated_duration_weeks?: number;
  course_sequence?: any[];
  completion_rate?: number;
  market_demand_score?: number;
  ai_confidence?: number;
}

export interface CurationQueueItem {
  id: string;
  courseId: string;
  title: string;
  platform: string;
  status: string;
  // Additional properties expected by existing code
  course_id?: string;
  course_discovery_queue?: any;
  ai_analysis?: any;
  confidence_score?: number;
  mentor_validation_status?: string;
  pipeline_stage?: string;
}

export const useCourseIntelligence = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // New spec-compliant methods
  const getCRI = useCallback(async (
    userId: UUID, 
    trackId: UUID, 
    forceRecompute: boolean = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('course-cri-calculator', {
        body: { userId, trackId, forceRecompute }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'CRI calculation failed');
      
      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to calculate CRI';
      setError(errorMsg);
      console.error('CRI calculation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecommendations = useCallback(async (
    userId: UUID,
    trackId: UUID,
    limit: number = 6,
    strategy: "gap_fill" | "foundations" | "accelerate" = "gap_fill",
    excludeCourseIds: UUID[] = []
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('course-intelligence-recommendations', {
        body: { userId, trackId, limit, strategy, excludeCourseIds }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Recommendations failed');
      
      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to get recommendations';
      setError(errorMsg);
      console.error('Course recommendations error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Legacy methods for backward compatibility
  const getCourseRecommendations = useCallback(async (
    userId: string,
    trackId?: string,
    skillGaps: string[] = [],
    limit: number = 5
  ): Promise<CourseRecommendation[]> => {
    if (!trackId) return [];

    try {
      const result = await getRecommendations(userId, trackId, limit, 'gap_fill', []);
      
      // Transform spec format to legacy format
      return result.recommendations.map((rec: CIRecommendation) => ({
        courseId: rec.course.id,
        title: rec.course.title,
        description: '',
        url: rec.course.url,
        platform: rec.course.platform.name,
        instructor: rec.course.instructor?.name,
        estimatedHours: rec.course.durationHours,
        difficulty: rec.course.difficulty.toString(),
        score: rec.score,
        scoreBreakdown: {
          difficulty: 0.8,
          instructor: rec.course.instructor ? 0.8 : 0.5,
          platform: 0.7,
          skillCoverage: 0.6
        },
        reasons: [rec.reason],
        skillsCovered: rec.covers.map(c => c.skillId)
      }));
    } catch (err) {
      return [];
    }
  }, [getRecommendations]);

  const calculateCRI = useCallback(async (
    userId: string,
    trackId?: string,
    targetCRI: number = 80
  ): Promise<CRIBreakdown | null> => {
    if (!trackId) return null;

    try {
      const result = await getCRI(userId, trackId, false);
      
      // Transform spec format to legacy format
      return {
        currentCRI: result.cri,
        targetCRI,
        criGap: targetCRI - result.cri,
        skillContributions: {},
        skillGaps: [],
        recommendations: [],
        courseContributions: [],
        lastCalculated: result.computedAt,
        completedCoursesCount: 0
      };
    } catch (err) {
      return null;
    }
  }, [getCRI]);

  const recordCourseEvent = useCallback(async (
    userId: string,
    courseId: string,
    eventType: 'enrolled' | 'in_progress' | 'completed' | 'assessed' | 'dropped',
    score?: number,
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('user_course_events')
        .insert({
          user_id: userId,
          course_id: courseId,
          event_type: eventType,
          score,
          notes,
          completion_date: eventType === 'completed' ? new Date().toISOString().split('T')[0] : undefined
        });

      if (error) throw error;

      toast({
        title: 'Course event recorded',
        description: `Marked course as ${eventType}`,
      });

      return true;
    } catch (err: any) {
      console.error('Error recording course event:', err);
      toast({
        title: 'Error',
        description: 'Failed to record course event',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const getUserCRI = useCallback(async (userId: string, trackId?: string) => {
    try {
      if (trackId) {
        const { data, error } = await supabase
          .from('track_cri_cache')
          .select('*')
          .eq('user_id', userId)
          .eq('track_id', trackId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching CRI cache:', error);
          return null;
        }

        return data;
      }

      // If no trackId, calculate fresh CRI
      return await calculateCRI(userId);
    } catch (err: any) {
      console.error('Error getting user CRI:', err);
      return null;
    }
  }, [calculateCRI]);

  // Placeholder functions for backward compatibility (updated signatures)
  const discoverCourses = useCallback(async (
    keywords?: string,
    skillGaps?: string[],
    career?: string,
    platform?: string
  ): Promise<DiscoveredCourse[]> => {
    console.log('discoverCourses: Feature not yet implemented', { keywords, skillGaps, career, platform });
    return [];
  }, []);

  const getLearningPaths = useCallback(async (
    userId?: string,
    trackId?: string
  ): Promise<LearningPath[]> => {
    console.log('getLearningPaths: Feature not yet implemented', { userId, trackId });
    return [];
  }, []);

  const getMentorCurationQueue = useCallback(async (
    mentorId?: string,
    limit?: number
  ): Promise<CurationQueueItem[]> => {
    console.log('getMentorCurationQueue: Feature not yet implemented', { mentorId, limit });
    return [];
  }, []);

  const submitMentorCuration = useCallback(async (
    userId?: string,
    courseId?: string,
    curationData?: any
  ) => {
    console.log('submitMentorCuration: Feature not yet implemented', { userId, courseId, curationData });
    return null;
  }, []);

  return {
    // New spec-compliant methods
    getCRI,
    getRecommendations,
    
    // Legacy methods for backward compatibility
    loading,
    error,
    getCourseRecommendations,
    calculateCRI,
    recordCourseEvent,
    getUserCRI,
    discoverCourses,
    getLearningPaths,
    getMentorCurationQueue,
    submitMentorCuration,
    clearError: () => setError(null),
  };
};