import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketplaceCourse {
  id: string;
  title: string;
  platform: string;
  url?: string;
  description?: string;
  skill_tags?: string[];
  difficulty?: string;
  duration_hours?: number;
  cost?: number;
  instructor_name?: string;
  instructor_rating?: number;
  has_projects?: boolean;
  validation_score: number;
  cri_prediction: number;
  mentor_endorsed: boolean;
  mentor_endorsement_count: number;
  completion_rate?: number;
  job_placement_rate?: number;
  ai_confidence: number;
  market_alignment_score?: number;
  created_at: string;
  updated_at: string;
  mentor_notes?: string[];
  pipeline_stage: string;
}

export interface MarketplaceStats {
  totalCourses: number;
  mentorEndorsed: number;
  averageValidationScore: number;
  averageCriPrediction: number;
  recentlyAdded: number;
}

export function useCourseMarketplace() {
  const [courses, setCourses] = useState<MarketplaceCourse[]>([]);
  const [stats, setStats] = useState<MarketplaceStats>({
    totalCourses: 0,
    mentorEndorsed: 0,
    averageValidationScore: 0,
    averageCriPrediction: 0,
    recentlyAdded: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMarketplaceCourses = useCallback(async (filters?: {
    search?: string;
    platform?: string;
    difficulty?: string;
    minValidationScore?: number;
    mentorEndorsedOnly?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🛒 Loading marketplace courses with filters:', filters);

      // Query validated courses from the pipeline
      let query = supabase
        .from('course_intelligence_pipeline')
        .select(`
          *,
          course_discovery_queue (
            id,
            source_platform,
            course_url,
            discovery_data
          )
        `)
        .eq('pipeline_stage', 'completed')
        .eq('mentor_validation_status', 'approved')
        .order('confidence_score', { ascending: false });

      const { data: pipelineData, error: pipelineError } = await query;

      if (pipelineError) throw pipelineError;

      console.log('📊 Pipeline data loaded:', pipelineData?.length || 0, 'courses');

      // Get mentor endorsements
      const { data: mentorData, error: mentorError } = await supabase
        .from('mentor_course_curations')
        .select('*')
        .eq('endorsement_level', 'highly_recommended');

      if (mentorError) {
        console.warn('Failed to load mentor data:', mentorError);
      }

        // Transform data to marketplace format
        const marketplaceCourses: MarketplaceCourse[] = (pipelineData || []).map(item => {
          const courseData = item.course_discovery_queue?.discovery_data as any || {};
          const mentorEndorsements = (mentorData || []).filter(m => m.course_id === item.course_id);
          
          return {
            id: item.course_id,
            title: courseData.title || 'Untitled Course',
            platform: item.course_discovery_queue?.source_platform || 'Unknown',
            url: item.course_discovery_queue?.course_url,
            description: courseData.description,
            skill_tags: courseData.skill_tags || [],
            difficulty: courseData.difficulty || 'intermediate',
            duration_hours: courseData.duration_hours,
            cost: courseData.cost,
            instructor_name: courseData.instructor_name,
            instructor_rating: courseData.instructor_rating,
            has_projects: courseData.has_projects || false,
            validation_score: Math.round(item.confidence_score * 100),
            cri_prediction: Math.round(((item.cri_predictions as any)?.overall || 0.75) * 100),
            mentor_endorsed: mentorEndorsements.length > 0,
            mentor_endorsement_count: mentorEndorsements.length,
            completion_rate: Math.round(70 + Math.random() * 25), // Placeholder
            job_placement_rate: Math.round(60 + Math.random() * 30), // Placeholder
            ai_confidence: item.confidence_score,
            market_alignment_score: item.market_alignment_score,
            created_at: item.created_at,
            updated_at: item.updated_at,
            mentor_notes: mentorEndorsements.map(m => m.mentor_notes).filter(Boolean),
            pipeline_stage: item.pipeline_stage
          };
        });

      // Apply filters
      let filteredCourses = marketplaceCourses;

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredCourses = filteredCourses.filter(course =>
          course.title.toLowerCase().includes(searchTerm) ||
          course.skill_tags?.some(skill => skill.toLowerCase().includes(searchTerm)) ||
          course.description?.toLowerCase().includes(searchTerm)
        );
      }

      if (filters?.platform && filters.platform !== 'all') {
        filteredCourses = filteredCourses.filter(course =>
          course.platform.toLowerCase() === filters.platform?.toLowerCase()
        );
      }

      if (filters?.difficulty && filters.difficulty !== 'all') {
        filteredCourses = filteredCourses.filter(course =>
          course.difficulty?.toLowerCase() === filters.difficulty?.toLowerCase()
        );
      }

      if (filters?.minValidationScore) {
        filteredCourses = filteredCourses.filter(course =>
          course.validation_score >= filters.minValidationScore!
        );
      }

      if (filters?.mentorEndorsedOnly) {
        filteredCourses = filteredCourses.filter(course => course.mentor_endorsed);
      }

      setCourses(filteredCourses);

      // Calculate stats
      const totalCourses = marketplaceCourses.length;
      const mentorEndorsed = marketplaceCourses.filter(c => c.mentor_endorsed).length;
      const avgValidation = totalCourses > 0 
        ? Math.round(marketplaceCourses.reduce((sum, c) => sum + c.validation_score, 0) / totalCourses)
        : 0;
      const avgCri = totalCourses > 0
        ? Math.round(marketplaceCourses.reduce((sum, c) => sum + c.cri_prediction, 0) / totalCourses)
        : 0;
      const recentlyAdded = marketplaceCourses.filter(c => 
        new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      setStats({
        totalCourses,
        mentorEndorsed,
        averageValidationScore: avgValidation,
        averageCriPrediction: avgCri,
        recentlyAdded
      });

      console.log('✅ Marketplace loaded:', filteredCourses.length, 'courses displayed');

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load marketplace courses';
      console.error('Marketplace error:', err);
      setError(errorMsg);
      
      toast({
        title: 'Failed to Load Marketplace',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addToLearningPath = useCallback(async (courseId: string, userId: string) => {
    try {
      console.log('📚 Adding course to learning path:', courseId);

      const { error } = await supabase
        .from('saved_courses')
        .insert({
          user_id: userId,
          course_id: courseId,
          save_type: 'learning_path'
        });

      if (error) throw error;

      toast({
        title: 'Added to Learning Path',
        description: 'Course has been added to your learning path'
      });

    } catch (err: any) {
      console.error('Failed to add to learning path:', err);
      toast({
        title: 'Failed to Add Course',
        description: err.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  const getPlatforms = useCallback(() => {
    const platforms = [...new Set(courses.map(c => c.platform))];
    return platforms.sort();
  }, [courses]);

  const getDifficultyLevels = useCallback(() => {
    const levels = [...new Set(courses.map(c => c.difficulty).filter(Boolean))];
    return levels.sort();
  }, [courses]);

  // Load courses on mount
  useEffect(() => {
    loadMarketplaceCourses();
  }, [loadMarketplaceCourses]);

  return {
    courses,
    stats,
    loading,
    error,
    loadMarketplaceCourses,
    addToLearningPath,
    getPlatforms,
    getDifficultyLevels,
    clearError: () => setError(null)
  };
}