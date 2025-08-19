import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProofProject, ProjectSkill, ProjectMilestone } from '@/types/proofProjects';
import { getCurrentUser } from '@/lib/authHelper';

export function useProofProjects(trackId?: string) {
  const queryClient = useQueryClient();

  // Fetch projects for user/track
  const projectsQuery = useQuery({
    queryKey: ['proof-projects', trackId],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('proof_projects')
        .select(`
          *,
          proof_project_skills (*),
          proof_project_milestones (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (trackId) {
        query = query.eq('track_id', trackId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: true,
  });

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (projectData: Omit<ProofProject, 'id' | 'created_at' | 'updated_at'>) => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('proof_projects')
        .insert({ ...projectData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proof-projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    },
  });

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProofProject> }) => {
      const { data, error } = await supabase
        .from('proof_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proof-projects'] });
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
    },
  });

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proof_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proof-projects'] });
      toast.success('Project deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    },
  });

  // Add skill to project
  const addProjectSkill = useMutation({
    mutationFn: async (skillData: Omit<ProjectSkill, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('proof_project_skills')
        .insert(skillData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proof-projects'] });
    },
  });

  // Add milestone to project
  const addProjectMilestone = useMutation({
    mutationFn: async (milestoneData: Omit<ProjectMilestone, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('proof_project_milestones')
        .insert(milestoneData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proof-projects'] });
    },
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    createProject,
    updateProject,
    deleteProject,
    addProjectSkill,
    addProjectMilestone,
    isCreating: createProject.isPending,
    isUpdating: updateProject.isPending,
    isDeleting: deleteProject.isPending,
  };
}