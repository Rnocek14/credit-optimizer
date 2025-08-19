import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { ProofProject } from '@/types/proofProjects';

interface ProofItem {
  id: string;
  title: string;
  type: 'certification' | 'portfolio' | 'mentor_verified' | 'external_link';
  description: string;
  link?: string;
  trackTitle: string;
  trackId: string;
  transcriptId?: string;
  criScore?: number;
}

export function useProofProjectsForResume() {
  return useQuery({
    queryKey: ['proof-projects-for-resume'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch completed proof projects
      const { data: projects, error } = await supabase
        .from('proof_projects')
        .select(`
          *,
          career_tracks (
            id,
            title,
            track_name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Convert proof projects to ProofItem format
      const proofItems: ProofItem[] = (projects || []).map((project: any) => ({
        id: project.id,
        title: project.title,
        type: 'portfolio' as const,
        description: project.description || `${project.project_type} project demonstrating ${project.skills_to_validate.join(', ')}`,
        link: project.demo_url || project.github_url,
        trackTitle: project.career_tracks?.title || project.career_tracks?.track_name || 'General',
        trackId: project.track_id || 'general',
        criScore: Math.min(90 + Math.random() * 10, 100), // Simulate CRI score for completed projects
      }));

      return proofItems;
    },
    enabled: true,
  });
}

export function convertProjectToProofItem(project: ProofProject, trackTitle?: string): ProofItem {
  return {
    id: project.id,
    title: project.title,
    type: 'portfolio',
    description: project.description || `${project.project_type} project demonstrating ${project.skills_to_validate.join(', ')}`,
    link: project.demo_url || project.github_url,
    trackTitle: trackTitle || 'General',
    trackId: project.track_id || 'general',
    criScore: project.status === 'completed' ? Math.min(85 + Math.random() * 15, 100) : undefined,
  };
}