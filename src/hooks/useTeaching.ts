import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeachingCourse {
  id: string;
  educator_id: string;
  title: string;
  description: string | null;
  course_code: string | null;
  enrollment_capacity: number;
  enrollment_count: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  skill_tags: string[];
  difficulty_level: string;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  status: string;
  progress_percentage: number;
  final_grade: number | null;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_points: number;
  assignment_type: string;
  created_at: string;
  updated_at: string;
}

export const useTeaching = () => {
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('teaching_courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError(err.message);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (courseData: Partial<TeachingCourse>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Authentication required");
      }

      const { data, error } = await supabase
        .from('teaching_courses')
        .insert([{
          educator_id: user.id,
          title: courseData.title || '',
          ...courseData
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Course created successfully!");
      await fetchCourses();
      return { success: true, data };
    } catch (err: any) {
      console.error('Error creating course:', err);
      toast.error(err.message || "Failed to create course");
      return { success: false, error: err.message };
    }
  };

  const updateCourse = async (courseId: string, updates: Partial<TeachingCourse>) => {
    try {
      const { error } = await supabase
        .from('teaching_courses')
        .update(updates)
        .eq('id', courseId);

      if (error) throw error;
      
      toast.success("Course updated successfully!");
      await fetchCourses();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating course:', err);
      toast.error(err.message || "Failed to update course");
      return { success: false, error: err.message };
    }
  };

  const deleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('teaching_courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      
      toast.success("Course deleted successfully!");
      await fetchCourses();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting course:', err);
      toast.error(err.message || "Failed to delete course");
      return { success: false, error: err.message };
    }
  };

  const fetchEnrollments = async (courseId?: string) => {
    try {
      let query = supabase
        .from('course_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEnrollments(data || []);
    } catch (err: any) {
      console.error('Error fetching enrollments:', err);
      toast.error("Failed to load enrollments");
    }
  };

  const createAssignment = async (assignmentData: Partial<Assignment> & { course_id: string; title: string }) => {
    try {
      const { data, error } = await supabase
        .from('course_assignments')
        .insert([assignmentData])
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Assignment created successfully!");
      await fetchAssignments(assignmentData.course_id);
      return { success: true, data };
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      toast.error(err.message || "Failed to create assignment");
      return { success: false, error: err.message };
    }
  };

  const fetchAssignments = async (courseId?: string) => {
    try {
      let query = supabase
        .from('course_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssignments(data || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      toast.error("Failed to load assignments");
    }
  };

  const getCourseAnalytics = async (courseId: string) => {
    try {
      const { data: enrollmentsData, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId);

      if (enrollError) throw enrollError;

      const { data: assignmentsData, error: assignError } = await supabase
        .from('course_assignments')
        .select('*')
        .eq('course_id', courseId);

      if (assignError) throw assignError;

      const totalStudents = enrollmentsData?.length || 0;
      const activeStudents = enrollmentsData?.filter(e => e.status === 'active').length || 0;
      const avgProgress = enrollmentsData?.length > 0 
        ? enrollmentsData.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollmentsData.length 
        : 0;

      return {
        totalStudents,
        activeStudents,
        averageProgress: Math.round(avgProgress),
        totalAssignments: assignmentsData?.length || 0,
        enrollments: enrollmentsData || [],
        assignments: assignmentsData || []
      };
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    enrollments,
    assignments,
    loading,
    error,
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    fetchEnrollments,
    createAssignment,
    fetchAssignments,
    getCourseAnalytics
  };
};