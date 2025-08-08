import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/types/json';

// Minimal, focused type definitions for database queries
export interface InstructorProfile {
  id: string;
  name: string;
  prestige_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  average_rating: number;
  verification_status: 'verified' | 'unverified';
  years_experience?: number | null;
  total_students?: number | null;
}

// Core course row from database
interface CourseRow {
  id: string;
  title: string;
  description?: string | null;
  platform?: string | null;
  category?: string | null;
  is_active: boolean;
  cost_usd?: number | null;
  estimated_hours?: number | null;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | null;
  verification_status?: 'verified' | 'unverified' | null;
  course_url?: string | null;
  instructor_id?: string | null;
  instructor_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnhancedCourse extends CourseRow {
  instructor_profile: InstructorProfile | null;
  difficulty_rating: { normalized_difficulty: number } | null;
  cri_score: CourseCRIScore | null;
  skill_mappings: CourseSkillMapping[] | null;
}

export interface CourseDifficultyRating {
  normalized_difficulty: number;
  ai_difficulty_score?: number;
  user_average_difficulty?: number;
  confidence_score?: number;
  total_user_ratings?: number;
}

export interface CourseCRIScore {
  overall_cri_score: number;
  difficulty_score?: number;
  skill_coverage_score?: number;
  project_rigor_score?: number;
  outcome_conversion_score?: number;
  instructor_prestige_score?: number;
  platform_credibility_score?: number;
  market_relevance_score?: number;
  calculation_version?: string;
  calculation_data?: Json;
  historical_scores?: Json;
}

export interface CourseSkillMapping {
  id?: string;
  skill_name: string;
  skill_depth?: number | string;
  relevance_score?: number;
  skill_category?: string;
}

export interface InstructorRating {
  instructor_id: string;
  user_id: string;
  course_id: string;
  teaching_quality?: number;
  content_expertise?: number;
  engagement_level?: number;
  overall_rating?: number;
  review_text?: string;
  would_recommend?: boolean;
}

export interface UserCourseRating {
  user_id: string;
  course_id: string;
  rating?: number;
  difficulty_rating: number;
  review_text?: string;
  difficulty_feedback?: number;
  completion_status?: string;
  learning_outcome_rating?: number;
  instructor_rating?: number;
  time_to_complete_hours?: number;
  would_recommend?: boolean;
}

export interface CourseFilters {
  platform?: string;
  difficulty?: string;
  mentor_endorsed_only?: boolean;
  search_term?: string;
  cri_range?: [number, number];
  prestige_tier?: string;
  skills?: string[];
  page?: number;
  pageSize?: number;
}

// Enhanced course marketplace hook with intelligence features
export function useEnhancedCourses(filters?: CourseFilters) {
  return useQuery({
    queryKey: ['enhanced-courses', filters],
    queryFn: async () => {
      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 24;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Minimal, focused select for performance
      const baseSelect = `
        id, title, description, platform, category, is_active, cost_usd, estimated_hours, 
        difficulty_level, verification_status, course_url, instructor_id, instructor_name,
        created_at, updated_at,
        instructor_profile:instructor_profiles (
          id, name, prestige_tier, average_rating, verification_status, years_experience, total_students
        ),
        difficulty_rating:course_difficulty_ratings ( normalized_difficulty ),
        cri_score:course_cri_scores (
          overall_cri_score, difficulty_score, skill_coverage_score, project_rigor_score,
          outcome_conversion_score, instructor_prestige_score, platform_credibility_score, market_relevance_score
        ),
        skill_mappings:course_skill_mappings ( skill_name, skill_depth, relevance_score )
      `;

      let query = supabase
        .from('courses')
        .select(baseSelect, { count: 'exact' })
        .eq('is_active', true);

      // Apply database-level filters for performance
      if (filters?.platform) {
        query = query.eq('platform', filters.platform);
      }
      
      if (filters?.difficulty) {
        query = query.eq('difficulty_level', filters.difficulty);
      }
      
      if (filters?.search_term) {
        query = query.or(`title.ilike.%${filters.search_term}%,description.ilike.%${filters.search_term}%`);
      }

      // Add pagination
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      
      if (error) throw error;
      
      // Post-process for enhanced filters that require joins
      let filtered = data || [];
      
      if (filters?.cri_range) {
        filtered = filtered.filter(course => {
          const criScore = course.cri_score?.overall_cri_score;
          return typeof criScore === 'number' && criScore >= filters.cri_range![0] && criScore <= filters.cri_range![1];
        });
      }
      
      if (filters?.prestige_tier) {
        filtered = filtered.filter(course => 
          course.instructor_profile?.prestige_tier === filters.prestige_tier
        );
      }
      
      if (filters?.skills?.length) {
        filtered = filtered.filter(course =>
          course.skill_mappings?.some(skill =>
            filters.skills!.some(filterSkill =>
              skill.skill_name.toLowerCase().includes(filterSkill.toLowerCase())
            )
          )
        );
      }
      
      return { 
        courses: filtered as unknown as EnhancedCourse[], 
        totalCount: count || 0,
        hasMore: (count || 0) > to + 1
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Instructor profiles with prestige ranking
export function useInstructorProfiles(verified_only = false) {
  return useQuery({
    queryKey: ['instructor-profiles', verified_only],
    queryFn: async () => {
      let query = supabase
        .from('instructor_profiles')
        .select('id, name, prestige_tier, average_rating, verification_status, years_experience, total_students');
      
      if (verified_only) {
        query = query.eq('verification_status', 'verified');
      }

      const { data, error } = await query.order('average_rating', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Enhanced course details with full intelligence breakdown
export function useCourseDetails(courseId: string) {
  return useQuery({
    queryKey: ['course-details', courseId],
    queryFn: async () => {
      const detailedSelect = `
        id, title, description, platform, category, is_active, cost_usd, estimated_hours, 
        difficulty_level, verification_status, course_url, instructor_id, instructor_name,
        created_at, updated_at,
        instructor_profile:instructor_profiles (
          id, name, prestige_tier, average_rating, verification_status, years_experience, total_students
        ),
        difficulty_rating:course_difficulty_ratings (
          normalized_difficulty, ai_difficulty_score, user_average_difficulty,
          confidence_score, total_user_ratings
        ),
        cri_score:course_cri_scores (
          overall_cri_score, difficulty_score, skill_coverage_score,
          project_rigor_score, outcome_conversion_score, instructor_prestige_score,
          platform_credibility_score, market_relevance_score, calculation_version,
          historical_scores
        ),
        skill_mappings:course_skill_mappings (
          skill_name, skill_depth, relevance_score, skill_category
        ),
        user_ratings:user_course_ratings (
          rating, review_text, difficulty_feedback, completion_status,
          learning_outcome_rating, instructor_rating, created_at
        )
      `;

      const { data, error } = await supabase
        .from('courses')
        .select(detailedSelect)
        .eq('id', courseId)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as EnhancedCourse | null;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Course rating mutation
export function submitCourseRating() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rating: UserCourseRating) => {
      const { data, error } = await supabase
        .from('user_course_ratings')
        .upsert(rating)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-details', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-courses'] });
      toast.success('Course rating submitted successfully!');
    },
    onError: (error) => {
      console.error('Error submitting course rating:', error);
      toast.error('Failed to submit course rating');
    }
  });
}

// Instructor rating mutation
export function submitInstructorRating() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rating: InstructorRating) => {
      const { data, error } = await supabase
        .from('instructor_ratings')
        .upsert(rating)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-details', data.course_id] });
      queryClient.invalidateQueries({ queryKey: ['instructor-profiles'] });
      toast.success('Instructor rating submitted successfully!');
    },
    onError: (error) => {
      console.error('Error submitting instructor rating:', error);
      toast.error('Failed to submit instructor rating');
    }
  });
}

// Utility functions for styling and formatting
export function getPrestigeBadgeColor(tier: string) {
  const colors = {
    bronze: 'bg-amber-100 text-amber-800 border-amber-200',
    silver: 'bg-gray-100 text-gray-800 border-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    platinum: 'bg-blue-100 text-blue-800 border-blue-200',
    diamond: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  return colors[tier as keyof typeof colors] || colors.bronze;
}

export function getDifficultyColor(level: string | number) {
  if (typeof level === 'number') {
    if (level <= 2) return 'text-green-600';
    if (level <= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  const colors = {
    beginner: 'text-green-600',
    intermediate: 'text-yellow-600',
    advanced: 'text-red-600'
  };
  return colors[level as keyof typeof colors] || 'text-muted-foreground';
}

export function getCRIColor(score?: number) {
  if (!score) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

export function formatStars(rating?: number) {
  if (!rating) return '☆☆☆☆☆';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
}

export default function useCourseIntelligenceEngine() {
  return {
    useEnhancedCourses,
    useInstructorProfiles,
    useCourseDetails,
    submitCourseRating,
    submitInstructorRating,
    getPrestigeBadgeColor,
    getDifficultyColor,
    getCRIColor,
    formatStars
  };
}