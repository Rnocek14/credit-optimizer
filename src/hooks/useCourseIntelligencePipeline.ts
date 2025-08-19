import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QUERY_KEYS } from '@/lib/queryKeys';

export interface CourseAnalysis {
  id: string;
  source_url: string;
  course_title: string;
  platform: string;
  skills_taught: string[];
  difficulty: string;
  estimated_duration: string;
  quality_score?: number;
  quality_factors?: {
    comprehensiveness: number;
    practical_application: number;
    structure: number;
    platform_rating: number;
  };
  processing_status: 'pending' | 'processed' | 'failed';
  parsed_at: string;
}

export interface CourseRecommendation {
  course_id: string;
  title: string;
  platform: string;
  skills: string[];
  quality_grade: 'A' | 'B' | 'C' | 'D';
  cri_impact: number;
  category: 'career_aligned' | 'skill_gaps' | 'trending' | 'personalized';
}

export function useCourseIntelligencePipeline(userId: string, trackId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch course history (simplified for now - using dummy data)
  const courseHistoryQuery = useQuery({
    queryKey: QUERY_KEYS.COURSE_HISTORY(userId, trackId),
    queryFn: async () => {
      // For now, return empty array since the table structure is not ready
      return [];
    },
    enabled: !!userId,
  });

  const courseHistory = courseHistoryQuery.data || [];
  const isLoadingHistory = courseHistoryQuery.isLoading;

  // Parse course from URL
  const parseCourse = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'parse_course',
          userId,
          url,
          trackId
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_HISTORY(userId, trackId) });
      toast({
        title: "Course Parsed Successfully",
        description: "Course has been analyzed and added to your history",
      });
    },
    onError: (error) => {
      console.error('Error parsing course:', error);
      toast({
        title: "Parse Failed",
        description: "Unable to parse the course URL. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  // Analyze course quality
  const analyzeQuality = useMutation({
    mutationFn: async (courseData: Partial<CourseAnalysis>) => {
      const { data, error } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'analyze_quality',
          userId,
          courseData,
          trackId
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_HISTORY(userId, trackId) });
      toast({
        title: "Quality Analysis Complete",
        description: "Course quality factors have been analyzed",
      });
    },
    onError: (error) => {
      console.error('Error analyzing quality:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze course quality. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Extract skills from course
  const extractSkills = useMutation({
    mutationFn: async (courseData: Partial<CourseAnalysis>) => {
      const { data, error } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'extract_skills',
          userId,
          courseData,
          trackId
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_HISTORY(userId, trackId) });
      toast({
        title: "Skills Extracted",
        description: "Skills have been identified and categorized",
      });
    },
    onError: (error) => {
      console.error('Error extracting skills:', error);
      toast({
        title: "Extraction Failed",
        description: "Unable to extract skills from course. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get course recommendations
  const recommendationsQuery = useQuery({
    queryKey: ['course-recommendations', userId, trackId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('course-intelligence-pipeline', {
        body: {
          action: 'generate_recommendations',
          userId,
          trackId,
          careerPath: 'full_stack_developer' // This could be dynamic based on user profile
        }
      });
      
      if (error) throw error;
      return data?.recommendations || [];
    },
    enabled: !!userId,
  });

  const recommendations = recommendationsQuery.data || [];
  const isLoadingRecommendations = recommendationsQuery.isLoading;

  // Add course to plan
  const addToPlan = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from('course_progress')
        .insert({
          user_id: userId,
          course_id: courseId,
          status: 'planned',
          progress_percentage: 0,
          track_id: trackId
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COURSE_PROGRESS(userId, trackId) });
      toast({
        title: "Added to Plan",
        description: "Course has been added to your learning plan",
      });
    },
    onError: (error) => {
      console.error('Error adding to plan:', error);
      toast({
        title: "Failed to Add",
        description: "Unable to add course to plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    courseHistory,
    isLoadingHistory,
    recommendations,
    isLoadingRecommendations,
    parseCourse: parseCourse.mutate,
    isParsing: parseCourse.isPending,
    analyzeQuality: analyzeQuality.mutate,
    isAnalyzing: analyzeQuality.isPending,
    extractSkills: extractSkills.mutate,
    isExtracting: extractSkills.isPending,
    addToPlan: addToPlan.mutate,
    isAddingToPlan: addToPlan.isPending,
  };
}