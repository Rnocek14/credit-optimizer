import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CourseAnalysis {
  marketAlignment: number;
  skillGapCoverage: number;
  careerImpact: number;
  criPredictions: {
    difficultyScore: number;
    skillCoverage: number;
    projectRigor: number;
    outcomeConversion: number;
    overall: number;
  };
  confidence: number;
  reasoning: string;
  recommendations: string[];
}

export interface DiscoveredCourse {
  id: string;
  title: string;
  platform: string;
  url?: string;
  description?: string;
  skill_tags?: string[];
  difficulty?: string;
  duration_hours?: number;
  has_projects?: boolean;
  analysis?: CourseAnalysis;
  priorityScore?: number;
  queueId?: string;
}

export interface LearningPath {
  id: string;
  path_name: string;
  path_description?: string;
  target_career: string;
  skill_level: string;
  estimated_duration_weeks: number;
  course_sequence: any; // JSONB from database
  mentor_endorsements: any; // Array from database
  completion_rate: number;
  average_outcome_score: number;
  market_demand_score: number;
  ai_confidence: number;
  maya_reasoning?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MentorCuration {
  id: string;
  mentor_id: string;
  course_id: string;
  curation_type: string;
  expertise_score: number;
  endorsement_level: string;
  mentor_notes?: string;
  skill_tags_added: string[];
  roi_assessment: number;
  outcome_prediction?: string;
  created_at: string;
}

export interface CurationQueueItem {
  id: string;
  course_id: string;
  pipeline_stage: string;
  ai_analysis: CourseAnalysis;
  confidence_score: number;
  mentor_validation_status: string;
  course_discovery_queue: {
    id: string;
    source_platform: string;
    course_url: string;
    discovery_data: any;
  };
}

export function useCourseIntelligence() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const discoverCourses = useCallback(async (
    keywords: string,
    skillGaps: string[] = [],
    careerPath?: string,
    platform: string = 'coursera'
  ): Promise<DiscoveredCourse[]> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Discovering courses:', { keywords, skillGaps, careerPath });

      const { data, error: functionError } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'discover_courses',
          data: {
            platform,
            keywords,
            skillGaps,
            careerPath
          }
        }
      });

      if (functionError) throw functionError;

      console.log('✅ Course discovery completed:', data.processed, 'courses processed');
      
      toast({
        title: 'Course Discovery Complete',
        description: `Found ${data.totalFound} courses, processed ${data.processed} with AI analysis`,
      });

      return data.discoveredCourses || [];

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to discover courses';
      console.error('Course discovery error:', err);
      setError(errorMsg);
      
      toast({
        title: 'Discovery Failed',
        description: errorMsg,
        variant: 'destructive'
      });
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const analyzeCourse = useCallback(async (
    courseId: string,
    userId: string,
    context: any = {}
  ): Promise<CourseAnalysis | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🧠 Analyzing course:', courseId);

      const { data, error: functionError } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'analyze_course',
          data: {
            courseId,
            userId,
            context
          }
        }
      });

      if (functionError) throw functionError;

      console.log('✅ Course analysis completed');
      return data.analysis;

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to analyze course';
      console.error('Course analysis error:', err);
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateLearningPath = useCallback(async (
    targetCareer: string,
    skillLevel: string,
    userId: string,
    courseIds: string[] = []
  ): Promise<LearningPath | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🛤️ Generating learning path:', { targetCareer, skillLevel });

      const { data, error: functionError } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'generate_learning_path',
          data: {
            targetCareer,
            skillLevel,
            userId,
            courseIds
          }
        }
      });

      if (functionError) throw functionError;

      console.log('✅ Learning path generated');
      
      toast({
        title: 'Learning Path Created',
        description: `Generated ${data.learningPath.path_name} with ${data.learningPath.course_sequence.length} courses`,
      });

      return data.learningPath;

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate learning path';
      console.error('Learning path generation error:', err);
      setError(errorMsg);
      
      toast({
        title: 'Path Generation Failed',
        description: errorMsg,
        variant: 'destructive'
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getMentorCurationQueue = useCallback(async (
    mentorId: string,
    limit: number = 10
  ): Promise<CurationQueueItem[]> => {
    setLoading(true);
    setError(null);

    try {
      console.log('📋 Getting mentor curation queue');

      const { data, error: functionError } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'get_mentor_curation_queue',
          data: {
            mentorId,
            limit
          }
        }
      });

      if (functionError) throw functionError;

      console.log('✅ Curation queue loaded:', data.total, 'items');
      return data.courses || [];

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load curation queue';
      console.error('Curation queue error:', err);
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const submitMentorCuration = useCallback(async (
    mentorId: string,
    courseId: string,
    curationData: {
      endorsementLevel: string;
      expertiseScore?: number;
      mentorNotes?: string;
      skillTagsAdded?: string[];
      roiAssessment?: number;
      outcomePreduction?: string;
    }
  ): Promise<MentorCuration | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('✅ Submitting mentor curation');

      const { data, error: functionError } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'submit_mentor_curation',
          data: {
            mentorId,
            courseId,
            ...curationData
          }
        }
      });

      if (functionError) throw functionError;

      console.log('✅ Curation submitted:', data.validationStatus);
      
      toast({
        title: 'Curation Submitted',
        description: `Course ${data.validationStatus === 'validated' ? 'validated' : 'rejected'} successfully`,
      });

      return data.curation;

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to submit curation';
      console.error('Curation submission error:', err);
      setError(errorMsg);
      
      toast({
        title: 'Curation Failed',
        description: errorMsg,
        variant: 'destructive'
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getLearningPaths = useCallback(async (
    targetCareer?: string,
    skillLevel?: string
  ): Promise<LearningPath[]> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('maya_learning_paths')
        .select('*')
        .order('ai_confidence', { ascending: false });

      if (targetCareer) {
        query = query.eq('target_career', targetCareer);
      }
      
      if (skillLevel) {
        query = query.eq('skill_level', skillLevel);
      }

      const { data, error: queryError } = await query.limit(20);

      if (queryError) throw queryError;

      console.log('✅ Learning paths loaded:', data?.length || 0);
      return data || [];

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load learning paths';
      console.error('Learning paths error:', err);
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getMentorCurations = useCallback(async (
    mentorId?: string,
    courseId?: string
  ): Promise<MentorCuration[]> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('mentor_course_curations')
        .select('*')
        .order('created_at', { ascending: false });

      if (mentorId) {
        query = query.eq('mentor_id', mentorId);
      }
      
      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error: queryError } = await query.limit(50);

      if (queryError) throw queryError;

      console.log('✅ Mentor curations loaded:', data?.length || 0);
      return data || [];

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load mentor curations';
      console.error('Mentor curations error:', err);
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Core Functions
    discoverCourses,
    analyzeCourse,
    generateLearningPath,
    getMentorCurationQueue,
    submitMentorCuration,
    getLearningPaths,
    getMentorCurations,
    
    // State
    loading,
    error,
    
    // Utilities
    clearError: () => setError(null)
  };
}