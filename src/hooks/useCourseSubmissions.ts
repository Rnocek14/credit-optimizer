import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CourseSubmission {
  id: string;
  title: string;
  description: string;
  platform: string;
  duration_hours: number;
  difficulty: string;
  cost: number;
  skill_tags: string[];
  instructor_name: string;
  instructor_rating: number;
  has_projects: boolean;
  cri_score: number;
  cri_breakdown: any;
  status: string;
  submitted_at: string;
  user_id: string;
}

export const useCourseSubmissions = () => {
  const [submissions, setSubmissions] = useState<CourseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('course_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Error fetching course submissions:', err);
      setError(err.message);
      toast.error("Failed to load course submissions");
    } finally {
      setLoading(false);
    }
  };

  const submitCourse = async (courseData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Authentication required");
      }

      const { error } = await supabase
        .from('course_submissions')
        .insert([{
          user_id: user.id,
          ...courseData
        }]);

      if (error) throw error;
      
      toast.success("Course submitted successfully!");
      await fetchSubmissions();
      return { success: true };
    } catch (err: any) {
      console.error('Error submitting course:', err);
      toast.error(err.message || "Failed to submit course");
      return { success: false, error: err.message };
    }
  };

  const getUserSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('course_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching user submissions:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  return {
    submissions,
    loading,
    error,
    fetchSubmissions,
    submitCourse,
    getUserSubmissions
  };
};