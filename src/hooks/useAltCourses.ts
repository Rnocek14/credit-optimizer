import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { safeOpenExternal } from '@/components/ui/SafeExternalLink';

export interface AlternativeCourse {
  id: string;
  title: string;
  provider: string;
  url: string;
  difficulty: number | null;
  estimated_hours: number | null;
  cri_score: number | null;
  created_at: string;
}

export function useAltCourses(trackId: string | null) {
  const catalog = useQuery({
    queryKey: ['alt-catalog', trackId],
    queryFn: async (): Promise<AlternativeCourse[]> => {
      const { data, error } = await supabase
        .from('alternative_courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!trackId
  });

  const clickCourse = (url: string, id: string) => {
    trackTelemetryEvent({ 
      task: 'alt_course_clicked', 
      complexity: { alt_course_id: id } 
    });
    // Use safe open with allowlisted mode (default)
    safeOpenExternal(url);
  };

  return { 
    catalog: catalog.data ?? [], 
    isLoading: catalog.isLoading, 
    clickCourse 
  };
}